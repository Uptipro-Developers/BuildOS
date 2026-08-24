import 'reflect-metadata';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(json({ limit: '10mb' }));
    app.use(urlencoded({ limit: '10mb', extended: true }));

    app.use(helmet());

    // Compatibility rewrites for legacy frontend bundles using deprecated endpoint prefixes.
    app.use((req, _res, next) => {
        const rewritePrefix = (from: string, to: string) => {
            if (req.url === from) {
                req.url = to || '/';
                return true;
            }
            if (req.url.startsWith(`${from}/`)) {
                req.url = `${to}${req.url.slice(from.length)}`;
                return true;
            }
            return false;
        };

        rewritePrefix('/api/admin-extras', '/api/admin') ||
            rewritePrefix('/admin-extras', '/admin') ||
            rewritePrefix('/api/finance-extras', '/api') ||
            rewritePrefix('/finance-extras', '') ||
            rewritePrefix('/api/hr-extras', '/api') ||
            rewritePrefix('/hr-extras', '');

        next();
    });

    const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'https://build-os-delta.vercel.app',
        'https://buildos-dev-suite.vercel.app',
    ]
        .map((origin) => String(origin).trim().replace(/\/$/, ''))
        .filter(Boolean);

    const vercelPreviewPatterns = [
        /^https:\/\/buildos[-a-z0-9]*\.vercel\.app$/i,
        /^https:\/\/build-os[-a-z0-9]*\.vercel\.app$/i,
    ];

    app.enableCors({
        origin: (origin, callback) => {
            const normalizedOrigin = String(origin || '').trim().replace(/\/$/, '');
            const isAllowedVercelPreview = vercelPreviewPatterns.some((pattern) =>
                pattern.test(normalizedOrigin),
            );

            if (!origin || allowedOrigins.includes(normalizedOrigin) || isAllowedVercelPreview) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: origin ${origin} not allowed`));
            }
        },
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 8080;
    await app.listen(port);
    console.log(`BuildOS API running on http://localhost:${port}/api`);
}
bootstrap();
