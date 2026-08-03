import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Roles, RequireApp } from '../auth/decorators';
import { OverrideState, PermissionsService } from './permissions.service';

/** The JWT signs the user id as `sub`; older tokens used `id`. */
function actingUserId(req: Request): string {
    const user = req.user as any;
    return String(user?.sub ?? user?.id ?? '');
}

@Controller()
export class PermissionsController {
    constructor(private readonly permissions: PermissionsService) {}

    /**
     * The caller's own effective permissions.
     *
     * Deliberately open to any authenticated user: the client needs this to know
     * which apps, nav items and actions to show, and it only ever describes the
     * caller.
     */
    @Get('me/permissions')
    getMine(@Req() req: Request) {
        return this.permissions.resolveForUser(actingUserId(req));
    }

    @Get('admin/users/:id/permissions')
    @Roles('admin')
    @RequireApp('admin')
    getForUser(@Param('id') id: string) {
        return this.permissions.resolveForUser(id);
    }

    /**
     * Replaces a user's permission overrides — the grants added beyond their role,
     * the permissions revoked from it, and any extra navigation.
     */
    @Put('admin/users/:id/permissions')
    @Roles('admin')
    @RequireApp('admin')
    setForUser(
        @Param('id') id: string,
        @Body()
        body: {
            navIds?: string[];
            processOverrides?: Record<string, Record<string, OverrideState>>;
            processPermissions?: Record<string, Record<string, boolean>>;
        },
    ) {
        return this.permissions.setUserOverrides(id, body ?? {});
    }
}
