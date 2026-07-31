import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { RolesGuard } from '../auth/roles.guard';
import { NumberingService } from './numbering.service';

/**
 * Module numbering.
 *
 * Reading and allocating are open to any authenticated user, because every module
 * that creates a record needs a reference — gating those on `admin` would break
 * record creation for exactly the non-admin users who do it. Changing a format is
 * admin-only, since it governs every reference the system issues.
 */
@Controller('numbering')
@UseGuards(RolesGuard)
export class NumberingController {
    constructor(private readonly svc: NumberingService) {}

    @Get('configs')
    findAll(@Query('app') app?: string) {
        return this.svc.findAll(app?.trim() || undefined);
    }

    /** Consumes the next reference for a module. */
    @Post('allocate/:module')
    allocate(@Param('module') module: string) {
        return this.svc.allocate(module);
    }

    /** The next reference without consuming it — for previews and placeholders. */
    @Get('peek/:module')
    async peek(@Param('module') module: string) {
        return { module, reference: await this.svc.peek(module) };
    }

    @Post('configs')
    @Roles('admin')
    create(@Body() body: any) {
        return this.svc.create(body);
    }

    @Patch('configs/:module')
    @Roles('admin')
    update(@Param('module') module: string, @Body() body: any) {
        return this.svc.update(module, body);
    }

    @Post('configs/:module/reset')
    @Roles('admin')
    reset(@Param('module') module: string) {
        return this.svc.reset(module);
    }

    @Delete('configs/:module')
    @Roles('admin')
    remove(@Param('module') module: string) {
        return this.svc.remove(module);
    }
}
