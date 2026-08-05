import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { TimelineService } from './timeline.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('timelines')
export class TimelineController {
  constructor(private timelineService: TimelineService) {}

  // NOTE: Basic timeline CRUD (GET/POST /timelines, GET/PUT/DELETE
  // /timelines/:id) is served by ConstructionExtrasController, which is
  // registered first. The equivalent handlers that used to live here were
  // unreachable dead code and have been removed. This controller keeps the
  // richer, service-backed routes below.

  @Get('project/:projectId')
  @Roles('admin', 'project-manager', 'team-lead')
  async getProjectTimelines(@Param('projectId') projectId: string) {
    const timelines = await this.timelineService.getProjectTimelines(projectId);
    return { success: true, data: timelines };
  }

  // ── Phase Management ──
  @Post(':timelineId/phases')
  @RequiresProcess('p_projects', 'edit')
  @Roles('admin', 'project-manager')
  async addPhase(@Param('timelineId') timelineId: string, @Body() phaseDto: any) {
    const timeline = await this.timelineService.addPhase(timelineId, phaseDto);
    return { success: true, data: timeline, message: 'Phase added' };
  }

  @Put(':timelineId/phases/:phaseId')
  @RequiresProcess('p_projects', 'edit')
  @Roles('admin', 'project-manager')
  async updatePhase(
    @Param('timelineId') timelineId: string,
    @Param('phaseId') phaseId: string,
    @Body() updateDto: any,
  ) {
    const timeline = await this.timelineService.updatePhase(timelineId, phaseId, updateDto);
    return { success: true, data: timeline, message: 'Phase updated' };
  }

  @Delete(':timelineId/phases/:phaseId')
  @RequiresProcess('p_projects', 'edit')
  @Roles('admin', 'project-manager')
  async removePhase(
    @Param('timelineId') timelineId: string,
    @Param('phaseId') phaseId: string,
  ) {
    const timeline = await this.timelineService.removePhase(timelineId, phaseId);
    return { success: true, data: timeline, message: 'Phase removed' };
  }

  // ── Progress & Status ──
  @Get(':id/progress')
  @Roles('admin', 'project-manager', 'team-lead')
  async getProgress(@Param('id') id: string) {
    const progress = await this.timelineService.getTimelineProgress(id);
    return { success: true, data: progress };
  }

  @Get('project/:projectId/milestones')
  @Roles('admin', 'project-manager', 'team-lead')
  async getMilestones(@Param('projectId') projectId: string) {
    const milestones = await this.timelineService.getMilestones(projectId);
    return { success: true, data: milestones };
  }
}
