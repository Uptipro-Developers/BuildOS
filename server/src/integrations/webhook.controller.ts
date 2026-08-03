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
} from '@nestjs/common';
import { Roles, RequireApp } from '../auth/decorators';
import { WebhookService } from './webhook.service';

@Controller('webhooks')
export class WebhookController {
  constructor(private webhookService: WebhookService) {}

  // ── Webhook Management ──
  @Post()
  @Roles('admin')
  @RequireApp('admin')
  async registerWebhook(@Body() data: any) {
    const webhook = await this.webhookService.registerWebhook(data);
    return { success: true, data: webhook, message: 'Webhook registered' };
  }

  @Get()
  @Roles('admin')
  @RequireApp('admin')
  async getWebhooks(@Query('isActive') isActive?: string) {
    const webhooks = await this.webhookService.getWebhooks(
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );
    return { success: true, data: webhooks };
  }

  @Put(':id')
  @Roles('admin')
  @RequireApp('admin')
  async updateWebhook(@Param('id') id: string, @Body() data: any) {
    const webhook = await this.webhookService.updateWebhook(id, data);
    return { success: true, data: webhook, message: 'Webhook updated' };
  }

  @Delete(':id')
  @Roles('admin')
  @RequireApp('admin')
  async deleteWebhook(@Param('id') id: string) {
    await this.webhookService.deleteWebhook(id);
    return { success: true, message: 'Webhook deleted' };
  }

  // ── Webhook Testing & Monitoring ──
  @Post(':id/test')
  @Roles('admin')
  @RequireApp('admin')
  async testWebhook(@Param('id') id: string) {
    const result = await this.webhookService.testWebhook(id);
    return { success: result.success, ...result };
  }

  @Get(':id/history')
  @Roles('admin')
  @RequireApp('admin')
  async getWebhookHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const history = await this.webhookService.getWebhookHistory(
      id,
      limit ? parseInt(limit) : 50,
    );
    return { success: true, data: history };
  }

  @Post(':id/retry')
  @Roles('admin')
  @RequireApp('admin')
  async retryDelivery(@Param('id') deliveryId: string) {
    const result = await this.webhookService.retryWebhookDelivery(deliveryId);
    return { success: true, data: result, message: 'Delivery retry initiated' };
  }

  // ── External System Integration ──
  @Post('sync/:systemType')
  @Roles('admin', 'finance-manager')
  async syncWithExternalSystem(
    @Param('systemType') systemType: string,
    @Body() data: any,
  ) {
    const result = await this.webhookService.syncWithExternalHR(systemType, data);
    return { success: true, data: result };
  }
}
