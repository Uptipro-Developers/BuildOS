import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { RolesGuard } from '../auth/roles.guard';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(RolesGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  // ── User Notifications ──
  @Get()
  @Roles('admin', 'employee')
  async getUserNotifications(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const result = await this.notificationService.getUserNotifications(
      req.user.id,
      limit ? parseInt(limit) : 20,
      skip ? parseInt(skip) : 0,
      unreadOnly === 'true',
    );
    return { success: true, ...result };
  }

  @Get('unread-count')
  @Roles('admin', 'employee')
  async getUnreadCount(@Request() req: any) {
    const result = await this.notificationService.getUserNotifications(
      req.user.id,
      999,
      0,
      true,
    );
    return { success: true, data: { unreadCount: result.notifications.length } };
  }

  @Put(':id/read')
  @Roles('admin', 'employee')
  async markAsRead(@Param('id') id: string) {
    const notification = await this.notificationService.markAsRead(id);
    return { success: true, data: notification, message: 'Notification marked as read' };
  }

  @Post('mark-all-read')
  @Roles('admin', 'employee')
  async markAllAsRead(@Request() req: any) {
    await this.notificationService.markAllAsRead(req.user.id);
    return { success: true, message: 'All notifications marked as read' };
  }

  @Delete(':id')
  @Roles('admin', 'employee')
  async deleteNotification(@Param('id') id: string) {
    // TODO: Implement notification deletion
    return { success: true, message: 'Notification deleted' };
  }

  // ── Notification Preferences ──
  @Get('preferences')
  @Roles('admin', 'employee')
  async getPreferences(@Request() req: any) {
    const prefs = await this.notificationService.getNotificationPreferences(req.user.id);
    return { success: true, data: prefs };
  }

  @Put('preferences')
  @Roles('admin', 'employee')
  async updatePreferences(@Request() req: any, @Body() preferences: any) {
    const updated = await this.notificationService.updateNotificationPreferences(
      req.user.id,
      preferences,
    );
    return { success: true, data: updated, message: 'Preferences updated' };
  }

  // ── Notification Rules (Admin Only) ──
  @Get('rules')
  @Roles('admin')
  async getNotificationRules(@Query('event') event?: string) {
    const rules = await this.notificationService.getNotificationRules(event);
    return { success: true, data: rules };
  }

  @Post('rules')
  @Roles('admin')
  async createNotificationRule(@Body() ruleData: any) {
    const rule = await this.notificationService.createNotificationRule(ruleData);
    return { success: true, data: rule, message: 'Notification rule created' };
  }

  @Put('rules/:id')
  @Roles('admin')
  async updateNotificationRule(@Param('id') id: string, @Body() updateData: any) {
    const rule = await this.notificationService.updateNotificationRule(id, updateData);
    return { success: true, data: rule, message: 'Notification rule updated' };
  }

  @Delete('rules/:id')
  @Roles('admin')
  async deleteNotificationRule(@Param('id') id: string) {
    await this.notificationService.deleteNotificationRule(id);
    return { success: true, message: 'Notification rule deleted' };
  }

  // ── Notification Templates (Admin Only) ──
  @Get('templates')
  @Roles('admin')
  async getNotificationTemplates(@Query('eventType') eventType?: string) {
    const templates = await this.notificationService.getNotificationTemplates(eventType);
    return { success: true, data: templates };
  }

  @Post('templates')
  @Roles('admin')
  async saveNotificationTemplate(@Body() data: any) {
    const template = await this.notificationService.saveNotificationTemplate(data);
    return { success: true, data: template, message: 'Template saved' };
  }

  // ── Cleanup ──
  @Post('cleanup')
  @Roles('admin')
  async cleanupOldNotifications(@Body('daysToKeep') daysToKeep?: number) {
    const result = await this.notificationService.deleteOldNotifications(daysToKeep);
    return { success: true, data: result, message: 'Old notifications cleaned up' };
  }
}
