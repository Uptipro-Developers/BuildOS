import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface NotificationRule {
  id: string;
  event: string;
  conditions: any[];
  actions: string[];
  isActive: boolean;
}

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create notification rule
   */
  async createNotificationRule(ruleData: any) {
    return this.prisma.notificationRule.create({
      data: {
        event: ruleData.event,
        description: ruleData.description,
        conditions: ruleData.conditions || [],
        actions: ruleData.actions || [],
        isActive: ruleData.isActive ?? true,
      },
    });
  }

  /**
   * Get all notification rules
   */
  async getNotificationRules(event?: string) {
    const where: any = {};
    if (event) where.event = event;

    return this.prisma.notificationRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update notification rule
   */
  async updateNotificationRule(id: string, updateData: any) {
    const data: any = {};
    if (updateData.event) data.event = updateData.event;
    if (updateData.description) data.description = updateData.description;
    if (updateData.conditions) data.conditions = updateData.conditions;
    if (updateData.actions) data.actions = updateData.actions;
    if (updateData.isActive !== undefined) data.isActive = updateData.isActive;

    return this.prisma.notificationRule.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete notification rule
   */
  async deleteNotificationRule(id: string) {
    return this.prisma.notificationRule.delete({ where: { id } });
  }

  /**
   * Trigger notification based on event
   */
  async triggerNotification(
    event: string,
    userId: string,
    data: any,
  ) {
    // Find matching rules
    const rules = await this.prisma.notificationRule.findMany({
      where: { event, isActive: true },
    });

    const notifications: any[] = [];

    for (const rule of rules) {
      // Evaluate conditions
      const conditions = (rule.conditions as any) || [];
      if (this.evaluateConditions(conditions, data)) {
        // Execute actions
        const actions = rule.actions || [];
        for (const action of actions) {
          const notification = await this.createNotification(userId, event, data, action);
          notifications.push(notification);

          // Execute action callbacks
          await this.executeAction(action, notification, userId, data);
        }
      }
    }

    return notifications;
  }

  /**
   * Create notification
   */
  async createNotification(
    userId: string,
    event: string,
    data: any,
    action?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: event,
        title: this.getNotificationTitle(event),
        message: this.getNotificationMessage(event, data),
      },
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    limit = 20,
    skip = 0,
    unreadOnly = false,
  ) {
    const where: any = { userId };
    if (unreadOnly) where.status = 'unread';

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { notifications, pagination: { total, limit, skip } };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'read' },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId },
      data: { status: 'read' },
    });
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: {
          userId,
          emailOnApproval: true,
          emailOnPayroll: true,
          smsOnUrgent: false,
          pushNotifications: true,
          digestFrequency: 'daily',
        },
      });
    }

    return prefs;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(userId: string, preferences: any) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...preferences },
      update: preferences,
    });
  }

  /**
   * Get notification templates
   */
  async getNotificationTemplates(eventType?: string) {
    const where: any = {};
    if (eventType) where.eventType = eventType;

    return this.prisma.notificationTemplate.findMany({ where });
  }

  /**
   * Create/Update notification template
   */
  async saveNotificationTemplate(data: any) {
    if (data.id) {
      return this.prisma.notificationTemplate.update({
        where: { id: data.id },
        data,
      });
    }

    return this.prisma.notificationTemplate.create({ data });
  }

  /**
   * Delete old notifications (retention policy)
   */
  async deleteOldNotifications(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: 'read', // Only delete read notifications
      },
    });
  }

  // ── Helper Methods ──

  private evaluateConditions(conditions: any[], data: any): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every((condition) => {
      const { field, operator, value } = condition;
      const dataValue = this.getNestedValue(data, field);

      switch (operator) {
        case 'equals':
          return dataValue === value;
        case 'notEquals':
          return dataValue !== value;
        case 'greaterThan':
          return dataValue > value;
        case 'lessThan':
          return dataValue < value;
        case 'contains':
          return String(dataValue).includes(value);
        case 'in':
          return Array.isArray(value) && value.includes(dataValue);
        default:
          return true;
      }
    });
  }

  private getNestedValue(obj: any, path: string) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  private getNotificationTitle(event: string): string {
    const titles: Record<string, string> = {
      leave_approved: 'Leave Request Approved',
      leave_rejected: 'Leave Request Rejected',
      payroll_processed: 'Payroll Processed',
      task_assigned: 'New Task Assigned',
      approval_needed: 'Action Required: Approval Needed',
      deadline_approaching: 'Deadline Approaching',
      project_status_update: 'Project Status Update',
      resource_conflict: 'Resource Conflict Detected',
    };

    return titles[event] || 'Notification';
  }

  private getNotificationMessage(event: string, data: any): string {
    switch (event) {
      case 'leave_approved':
        return `Your leave request for ${data.leaveType} has been approved.`;
      case 'leave_rejected':
        return `Your leave request has been rejected. Reason: ${data.reason || 'Not specified'}`;
      case 'payroll_processed':
        return `Payroll for period ${data.period} has been processed.`;
      case 'task_assigned':
        return `You have been assigned task: ${data.taskName}`;
      case 'approval_needed':
        return `Approval required for ${data.documentType}: ${data.documentId}`;
      case 'deadline_approaching':
        return `Deadline approaching for ${data.itemName}: ${data.daysRemaining} days remaining`;
      case 'resource_conflict':
        return `Resource allocation conflict detected on ${data.date}`;
      default:
        return 'You have a new notification.';
    }
  }

  private async executeAction(action: string, notification: any, userId: string, data: any) {
    switch (action) {
      case 'email':
        // Placeholder for email service
        console.log(`[EMAIL] Sending notification to user ${userId}`);
        break;
      case 'sms':
        // Placeholder for SMS service
        console.log(`[SMS] Sending SMS to user ${userId}`);
        break;
      case 'webhook':
        // Placeholder for webhook service
        console.log(`[WEBHOOK] Posting to webhook for user ${userId}`);
        break;
      default:
        break;
    }
  }
}
