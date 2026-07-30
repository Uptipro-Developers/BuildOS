import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Capped backoff between connection attempts. */
const RECONNECT_MAX_DELAY_MS = 10_000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private shuttingDown = false;

    constructor() {
        const base = process.env.DATABASE_URL ?? '';
        // Append pool settings if not already present to avoid exhausting
        // Railway's connection limit (default Prisma pool = num_cpus*2+1 ≈ 21).
        const url = base.includes('connection_limit')
            ? base
            : `${base}${base.includes('?') ? '&' : '?'}connection_limit=5&pool_timeout=30`;
        super({ datasources: { db: { url } } });
    }

    /**
     * Starts connecting without blocking bootstrap.
     *
     * Awaiting `$connect()` here used to abort Nest's startup whenever the
     * database was unreachable for the few seconds a deploy takes. That takes the
     * whole process down, including the `/api` health endpoint — which touches no
     * database — so the platform healthcheck fails and rolls back a release that
     * would have connected on its own moments later.
     *
     * Prisma connects lazily on first query anyway, so the only thing awaiting
     * bought us was turning a transient outage into a failed deploy. Requests
     * that arrive before the pool is up fail individually, which is the honest
     * result and is visible per-request instead of as a dead container.
     */
    onModuleInit() {
        void this.connectWithRetry();
    }

    private async connectWithRetry(attempt = 1): Promise<void> {
        if (this.shuttingDown) return;

        try {
            await this.$connect();
            if (attempt > 1) {
                this.logger.log(`Database connected after ${attempt} attempts`);
            }
        } catch (error) {
            if (this.shuttingDown) return;

            const delay = Math.min(attempt * 1000, RECONNECT_MAX_DELAY_MS);
            this.logger.error(
                `Database connection failed (attempt ${attempt}), retrying in ${delay}ms: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            // unref so a pending retry never holds the process open during shutdown.
            setTimeout(() => void this.connectWithRetry(attempt + 1), delay).unref();
        }
    }

    async onModuleDestroy() {
        this.shuttingDown = true;
        await this.$disconnect();
    }
}
