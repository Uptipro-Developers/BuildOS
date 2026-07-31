import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_SETTINGS_KEY = 'admin-settings';

/** How long a loaded key set is trusted before re-reading the settings blob. */
const CACHE_TTL_MS = 30_000;

/** Minimum gap between `lastUsed` writes for the same key. */
const LAST_USED_THROTTLE_MS = 60_000;

export interface ServiceKeyRecord {
    id: string;
    name: string;
    /** SHA-256 hex of the plaintext key. Absent on rows created before hashing. */
    keyHash?: string;
    /** Plaintext, only on legacy rows. Never written for new keys. */
    key?: string;
    /** Non-secret display fragments, e.g. "sk_live" and the last 4 characters. */
    keyPrefix?: string;
    keyLast4?: string;
    status?: string;
    created?: string;
    lastUsed?: string | null;
}

/**
 * Hash a service key for storage and comparison.
 *
 * A single SHA-256 is the right primitive here, not bcrypt/argon2: these keys
 * are 36 hex characters of CSPRNG output (144 bits), so they are not
 * guessable from the digest the way a human-chosen password is. A deliberately
 * slow KDF would buy nothing and would add its cost to *every* authenticated
 * API call.
 */
export function hashServiceKey(plaintext: string): string {
    return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

/** Generate a new service key. The plaintext is returned to the caller once. */
export function generateServiceKey(): string {
    return `sk_live_${randomBytes(18).toString('hex')}`;
}

/** Non-secret preview for listing keys after the plaintext is discarded. */
export function serviceKeyPreview(record: { keyPrefix?: string; keyLast4?: string }): string {
    const prefix = record.keyPrefix || 'sk_live';
    const last4 = record.keyLast4 || '';
    return last4 ? `${prefix}_…${last4}` : `${prefix}_…`;
}

/**
 * Validates machine-to-machine API keys issued from Admin › API Keys.
 *
 * The keys were already generated and stored by AdminExtrasService but nothing
 * ever authenticated against them — the admin screen created credentials that
 * no request path honoured. This service is the enforcement half, consumed by
 * JwtAuthGuard for routes marked `@ServiceAuth()`.
 */
@Injectable()
export class ServiceKeyService {
    private readonly logger = new Logger(ServiceKeyService.name);
    private cache: { keys: ServiceKeyRecord[]; loadedAt: number } | null = null;
    private lastUsedWrites = new Map<string, number>();

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Resolve a presented key to its record, or null when it does not match an
     * active key. Comparison is constant-time over the digests.
     */
    async verify(presented: string | undefined | null): Promise<ServiceKeyRecord | null> {
        const candidate = String(presented ?? '').trim();
        if (!candidate) return null;

        const presentedDigest = Buffer.from(hashServiceKey(candidate), 'hex');
        const keys = await this.loadKeys();

        for (const record of keys) {
            if ((record.status ?? 'active') !== 'active') continue;

            // Rows written before hashing landed still hold the plaintext.
            // Hash it on read so those keys keep working until rotated.
            const storedHex = record.keyHash ?? (record.key ? hashServiceKey(record.key) : null);
            if (!storedHex) continue;

            const storedDigest = Buffer.from(storedHex, 'hex');
            if (storedDigest.length !== presentedDigest.length) continue;
            if (!timingSafeEqual(storedDigest, presentedDigest)) continue;

            this.touchLastUsed(record.id);
            return record;
        }

        return null;
    }

    /** Drop the cached key set so a rotation takes effect immediately. */
    invalidate(): void {
        this.cache = null;
    }

    private async loadKeys(): Promise<ServiceKeyRecord[]> {
        const now = Date.now();
        if (this.cache && now - this.cache.loadedAt < CACHE_TTL_MS) {
            return this.cache.keys;
        }

        let keys: ServiceKeyRecord[] = [];
        try {
            const row = await this.prisma.systemSetting.findUnique({
                where: { key: ADMIN_SETTINGS_KEY },
            });
            const value = (row?.value ?? {}) as { apiKeys?: unknown };
            keys = Array.isArray(value.apiKeys) ? (value.apiKeys as ServiceKeyRecord[]) : [];
        } catch (error) {
            this.logger.error(
                `Failed to load service keys, rejecting service auth: ${(error as Error).message}`,
            );
            // Do not cache a failed read — the next request retries. Returning
            // an empty set fails closed.
            return [];
        }

        this.cache = { keys, loadedAt: now };
        return keys;
    }

    /**
     * Best-effort `lastUsed` stamp, throttled per key.
     *
     * This is read-modify-write on a shared JSON settings document, so a
     * concurrent admin edit could drop a stamp. That is acceptable for usage
     * telemetry and is never load-bearing for authentication.
     */
    private touchLastUsed(keyId: string): void {
        const now = Date.now();
        const previous = this.lastUsedWrites.get(keyId) ?? 0;
        if (now - previous < LAST_USED_THROTTLE_MS) return;
        this.lastUsedWrites.set(keyId, now);

        void (async () => {
            try {
                const row = await this.prisma.systemSetting.findUnique({
                    where: { key: ADMIN_SETTINGS_KEY },
                });
                if (!row) return;
                const value = (row.value ?? {}) as { apiKeys?: ServiceKeyRecord[] };
                if (!Array.isArray(value.apiKeys)) return;

                const updated = {
                    ...value,
                    apiKeys: value.apiKeys.map((item) =>
                        item?.id === keyId ? { ...item, lastUsed: new Date().toISOString() } : item,
                    ),
                };
                await this.prisma.systemSetting.update({
                    where: { key: ADMIN_SETTINGS_KEY },
                    data: { value: updated as any },
                });
                this.invalidate();
            } catch (error) {
                this.logger.debug(`lastUsed stamp skipped: ${(error as Error).message}`);
            }
        })();
    }
}
