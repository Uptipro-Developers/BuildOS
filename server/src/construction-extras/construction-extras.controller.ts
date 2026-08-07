import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, Query,
} from '@nestjs/common';
import { ConstructionExtrasService } from './construction-extras.service';

@Controller()
export class ConstructionExtrasController {
    constructor(private readonly svc: ConstructionExtrasService) { }

    // ── Project Config (types + statuses) ──
    @Get('project-types')
    getProjectTypes() { return this.svc.getProjectTypes(); }
    @Put('project-types')
    saveProjectTypes(@Body() body: any) { return this.svc.saveProjectTypes(body?.types ?? body); }
    @Get('project-statuses')
    getProjectStatuses() { return this.svc.getProjectStatuses(); }
    @Put('project-statuses')
    saveProjectStatuses(@Body() body: any) { return this.svc.saveProjectStatuses(body?.statuses ?? body); }
    @Get('project-roles')
    getProjectRoles() { return this.svc.getProjectRoles(); }
    @Put('project-roles')
    saveProjectRoles(@Body() body: any) { return this.svc.saveProjectRoles(body?.roles ?? body); }

    // ── Project Documents ──
    @Get('project-documents')
    getAllDocs(@Query('projectId') projectId?: string) { return this.svc.findAllDocs(projectId); }
    @Get('project-documents/:id')
    getDoc(@Param('id') id: string) { return this.svc.findDoc(id); }
    @Post('project-documents')
    createDoc(@Body() body: any) { return this.svc.createDoc(body); }
    @Put('project-documents/:id')
    updateDoc(@Param('id') id: string, @Body() body: any) { return this.svc.updateDoc(id, body); }
    @Delete('project-documents/:id')
    deleteDoc(@Param('id') id: string) { return this.svc.deleteDoc(id); }

    // ── Construction Approvals ──
    @Get('construction-approvals')
    getAllApprovals(@Query('status') status?: string, @Query('projectId') projectId?: string) {
        return this.svc.findAllApprovals(status, projectId);
    }
    @Get('construction-approvals/:id')
    getApproval(@Param('id') id: string) { return this.svc.findApproval(id); }
    @Post('construction-approvals')
    createApproval(@Body() body: any) { return this.svc.createApproval(body); }
    @Patch('construction-approvals/:id')
    updateApproval(@Param('id') id: string, @Body() body: any) { return this.svc.updateApproval(id, body); }
    @Delete('construction-approvals/:id')
    deleteApproval(@Param('id') id: string) { return this.svc.deleteApproval(id); }

    // ── Timelines ──
    @Get('timelines')
    getAllTimelines(@Query('projectId') projectId?: string) { return this.svc.findAllTimelines(projectId); }
    @Get('timelines/:id')
    getTimeline(@Param('id') id: string) { return this.svc.findTimeline(id); }
    @Post('timelines')
    createTimeline(@Body() body: any) { return this.svc.createTimeline(body); }
    @Put('timelines/:id')
    updateTimeline(@Param('id') id: string, @Body() body: any) { return this.svc.updateTimeline(id, body); }
    @Delete('timelines/:id')
    deleteTimeline(@Param('id') id: string) { return this.svc.deleteTimeline(id); }
}
