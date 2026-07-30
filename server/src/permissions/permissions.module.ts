import { Global, Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { ProcessPermissionGuard } from './require-permission.decorator';

/**
 * Global so any module can enforce permissions without importing this one —
 * enforcement is cross-cutting and would otherwise mean editing every module's
 * imports to guard a single endpoint.
 */
@Global()
@Module({
    imports: [PrismaModule],
    controllers: [PermissionsController],
    providers: [PermissionsService, ProcessPermissionGuard],
    exports: [PermissionsService, ProcessPermissionGuard],
})
export class PermissionsModule implements OnModuleInit {
    constructor(private readonly permissions: PermissionsService) {}

    /**
     * Roles configured before enforcement existed have app access but no process
     * permissions. Seeding them on boot gives admins a real starting point to
     * tighten instead of an empty matrix. Idempotent, and it never overwrites a
     * role an admin has already configured.
     */
    async onModuleInit() {
        await this.permissions.seedRoleProcessDefaults().catch(() => undefined);
    }
}
