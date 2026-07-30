import { CacheModule, type CacheModuleOptions, type CacheStore } from '@nestjs/cache-manager';
import { Global, Logger, Module } from '@nestjs/common';
import { redisStore } from 'cache-manager-ioredis-yet';
import { getRedisConnectionOptions, isRedisEnabled } from '../redis/redis.config';
import { CacheService } from './cache.service';

const DEFAULT_TTL_MS = 30_000;

/**
 * Hard ceiling on how long the Redis store may take to come up.
 *
 * `await redisStore(...)` is inside a `useFactory`, so Nest's dependency
 * instantiation blocks on it — and with ioredis' default retry strategy an
 * unreachable Redis retries forever, meaning that promise neither resolves nor
 * rejects. Bootstrap then hangs with no error: nothing listens, so the platform
 * healthcheck reports "service unavailable" for the full window and the deploy
 * rolls back. The `catch` below cannot help, because a hang is not a rejection.
 *
 * Bounding it means the worst case is a cache that starts out in-memory.
 */
const STORE_INIT_TIMEOUT_MS = 10_000;

/** Reject if `promise` has not settled within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        timer.unref();
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });
}

/**
 * Application cache. Uses a Redis-backed store when Redis is configured and
 * falls back to a bounded in-memory store otherwise. Exposed globally so any
 * feature module can inject {@link CacheService}.
 */
@Global()
@Module({
    imports: [
        CacheModule.registerAsync({
            isGlobal: true,
            useFactory: async (): Promise<CacheModuleOptions> => {
                if (!isRedisEnabled()) {
                    return { ttl: DEFAULT_TTL_MS, max: 1000 };
                }
                try {
                    const store = await withTimeout(
                        redisStore({
                            ...getRedisConnectionOptions({
                                // Bound the connection so an unreachable Redis
                                // gives up instead of retrying forever behind the
                                // await above.
                                enableOfflineQueue: false,
                                connectTimeout: 5_000,
                                maxRetriesPerRequest: 3,
                                retryStrategy: (times: number) =>
                                    times > 5 ? null : Math.min(times * 200, 1000),
                            }),
                            ttl: DEFAULT_TTL_MS,
                        }),
                        STORE_INIT_TIMEOUT_MS,
                        'Redis cache store init',
                    );
                    return { store: store as unknown as CacheStore, ttl: DEFAULT_TTL_MS };
                } catch (error) {
                    new Logger('AppCacheModule').warn(
                        `Redis cache store init failed; using in-memory cache: ${(error as Error).message}`,
                    );
                    return { ttl: DEFAULT_TTL_MS, max: 1000 };
                }
            },
        }),
    ],
    providers: [CacheService],
    exports: [CacheModule, CacheService],
})
export class AppCacheModule {}
