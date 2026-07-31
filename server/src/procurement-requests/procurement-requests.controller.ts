import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, Query,
} from '@nestjs/common';
import { ServiceAuth } from '../auth/decorators';
import { ProcurementRequestsService } from './procurement-requests.service';

@Controller()
export class ProcurementRequestsController {
    constructor(private readonly svc: ProcurementRequestsService) { }

    // ── Purchase Requests ──
    @Get('purchase-requests')
    getAllPRs(@Query('status') status?: string) { return this.svc.findAllPRs(status); }
    @Get('purchase-requests/:id')
    getPR(@Param('id') id: string) { return this.svc.findPR(id); }
    @Post('purchase-requests')
    createPR(@Body() body: any) { return this.svc.createPR(body); }
    @Put('purchase-requests/:id')
    updatePR(@Param('id') id: string, @Body() body: any) { return this.svc.updatePR(id, body); }
    // Service-accessible: the SabiQuot supplier portal mirrors a supplier's
    // accept/decline back onto the originating purchase request.
    @Patch('purchase-requests/:id')
    @ServiceAuth()
    patchPR(@Param('id') id: string, @Body() body: any) { return this.svc.updatePR(id, body); }
    @Delete('purchase-requests/:id')
    deletePR(@Param('id') id: string) { return this.svc.deletePR(id); }

    // ── Purchase Invoices ──
    @Get('purchase-invoices')
    getAllInvoices(@Query('status') status?: string) { return this.svc.findAllInvoices(status); }
    @Get('purchase-invoices/:id')
    getInvoice(@Param('id') id: string) { return this.svc.findInvoice(id); }
    // Service-accessible: raised by the portal when a supplier's counter-offer
    // is accepted.
    @Post('purchase-invoices')
    @ServiceAuth()
    createInvoice(@Body() body: any) { return this.svc.createInvoice(body); }
    @Put('purchase-invoices/:id')
    updateInvoice(@Param('id') id: string, @Body() body: any) { return this.svc.updateInvoice(id, body); }
    @Patch('purchase-invoices/:id')
    patchInvoice(@Param('id') id: string, @Body() body: any) { return this.svc.updateInvoice(id, body); }
    @Delete('purchase-invoices/:id')
    deleteInvoice(@Param('id') id: string) { return this.svc.deleteInvoice(id); }

    // ── Sent RFQs ──
    @Get('sent-rfqs')
    getAllRFQs(@Query('status') status?: string) { return this.svc.findAllRFQs(status); }
    @Get('sent-rfqs/:id')
    getRFQ(@Param('id') id: string) { return this.svc.findRFQ(id); }
    @Post('sent-rfqs')
    createRFQ(@Body() body: any) { return this.svc.createRFQ(body); }
    // Service-accessible: the portal mirrors RFQ status when a supplier
    // acknowledges or declines.
    @Patch('sent-rfqs/:id')
    @ServiceAuth()
    updateRFQ(@Param('id') id: string, @Body() body: any) { return this.svc.updateRFQ(id, body); }
    @Delete('sent-rfqs/:id')
    deleteRFQ(@Param('id') id: string) { return this.svc.deleteRFQ(id); }

    // ── Received Quotes ──
    @Get('received-quotes')
    getAllQuotes(@Query('status') status?: string) { return this.svc.findAllQuotes(status); }
    @Get('received-quotes/:id')
    getQuote(@Param('id') id: string) { return this.svc.findQuote(id); }
    @Post('received-quotes')
    createQuote(@Body() body: any) { return this.svc.createQuote(body); }
    @Patch('received-quotes/:id')
    updateQuote(@Param('id') id: string, @Body() body: any) { return this.svc.updateQuote(id, body); }
    @Delete('received-quotes/:id')
    deleteQuote(@Param('id') id: string) { return this.svc.deleteQuote(id); }
}
