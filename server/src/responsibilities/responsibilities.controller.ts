import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ResponsibilitiesService } from './responsibilities.service';

@Controller('responsibilities')
export class ResponsibilitiesController {
    constructor(private readonly responsibilities: ResponsibilitiesService) {}

    @Get('apps')
    listApps() { return this.responsibilities.listApps(); }

    @Get('me')
    myAccess(@Req() req: any) { return this.responsibilities.accessForUser(this.actor(req).userId); }

    @Get('apps/:app/owners')
    listOwners(@Param('app') app: string) { return this.responsibilities.listOwners(app); }

    @Get('apps/:app/processes')
    listProcesses(@Param('app') app: string, @Req() req: any) {
        return this.responsibilities.listProcesses(app, this.actor(req));
    }

    @Get('apps/:app/users')
    listAssignableUsers(@Param('app') app: string, @Req() req: any) {
        return this.responsibilities.listAssignableUsers(app, this.actor(req));
    }

    @Get('apps/:app/resources/:scopeType')
    listResources(@Param('app') app: string, @Param('scopeType') scopeType: string, @Req() req: any) {
        return this.responsibilities.listResources(app, scopeType, this.actor(req));
    }

    @Post('apps/:app/owners')
    appointOwner(@Param('app') app: string, @Body() body: any, @Req() req: any) {
        return this.responsibilities.appointOwner(app, body, this.actor(req));
    }

    @Delete('owners/:id')
    revokeOwner(@Param('id') id: string, @Req() req: any) {
        return this.responsibilities.revokeOwner(id, this.actor(req));
    }

    @Get('apps/:app/assignments')
    listAssignments(@Param('app') app: string, @Req() req: any) {
        return this.responsibilities.listAssignments(app, this.actor(req));
    }

    @Post('apps/:app/assignments')
    createAssignment(@Param('app') app: string, @Body() body: any, @Req() req: any) {
        return this.responsibilities.createAssignment(app, body, this.actor(req));
    }

    @Patch('assignments/:id')
    updateAssignment(@Param('id') id: string, @Body() body: any, @Req() req: any) {
        return this.responsibilities.updateAssignment(id, body, this.actor(req));
    }

    @Delete('assignments/:id')
    revokeAssignment(@Param('id') id: string, @Req() req: any) {
        return this.responsibilities.revokeAssignment(id, this.actor(req));
    }

    private actor(req: any) {
        const user = req?.user ?? {};
        return {
            userId: String(user.sub ?? user.id ?? user.userId ?? ''),
            name: user.name ?? user.fullName,
            email: user.email,
        };
    }
}
