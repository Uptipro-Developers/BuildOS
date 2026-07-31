import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ServiceKeyService } from './service-key.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        PassportModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get('JWT_SECRET') || 'buildos_jwt_secret_change_in_production',
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, ServiceKeyService],
    // ServiceKeyService is exported so the globally-registered JwtAuthGuard,
    // whose APP_GUARD provider is resolved in AppModule's context, can inject it.
    exports: [AuthService, ServiceKeyService, JwtModule],
})
export class AuthModule { }
