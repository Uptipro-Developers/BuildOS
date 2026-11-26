import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, Query, Req,
} from '@nestjs/common';
import { ServiceAuth } from '../auth/decorators';
import { ProcurementRequestsService } from './procurement-requests.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller()
export class ProcurementRequestsController {
    constructor(
        private readonly svc: ProcurementRequestsService,
    ) { }

    // ── Purchase Requests ──
    @Get('purchase-requests')
    getAllPRs(@Query('status') status?: string) { return this.svc.findAllPRs(status); }
    // Service-accessible for the same reason as the RFQ read: the PATCH below is
    // service-accessible, so the portal must be able to fetch the request it is
    // mirroring a decision onto.
    @Get('purchase-requests/:id')
    @ServiceAuth()
    getPR(@Param('id') id: string) { return this.svc.findPR(id); }
    @Post('purchase-requests')
    createPR(@Body() body: any) { return this.svc.createPR(body); }
    @Put('purchase-requests/:id')
    async updatePR(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        return this.svc.updatePR(id, body);
    }
    // Service-accessible: the SabiQuot supplier portal mirrors a supplier's
    // accept/decline back onto the originating purchase request.
    @Patch('purchase-requests/:id')
    @ServiceAuth()
    async patchPR(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        return this.svc.updatePR(id, body);
    }
    @Delete('purchase-requests/:id')
    @RequiresProcess('p_purchase_requests', 'delete')
    deletePR(@Param('id') id: string) { return this.svc.deletePR(id); }

    // ── Purchase Invoices ──
    @Get('purchase-invoices')
    getAllInvoices(@Query('status') status?: string) { return this.svc.findAllInvoices(status); }
    @Get('purchase-invoices/:id')
    getInvoice(@Param('id') id: string) { return this.svc.findInvoice(id); }
    // Purchase invoices belong to BuildOS's internal PO → Finance workflow.
    // Supplier integrations record negotiation responses on the quote instead
    // of creating an unlinked invoice directly.
    @Post('purchase-invoices')
    createInvoice(@Body() body: any) { return this.svc.createInvoice(body); }
    @Put('purchase-invoices/:id')
    updateInvoice(@Param('id') id: string, @Body() body: any) { return this.svc.updateInvoice(id, body); }
    @Patch('purchase-invoices/:id')
    patchInvoice(@Param('id') id: string, @Body() body: any) { return this.svc.updateInvoice(id, body); }
    @Post('purchase-invoices/:id/payments')
    @RequiresProcess('p_purchase_invoices', 'approve')
    recordInvoicePayment(@Param('id') id: string, @Body() body: any) {
        return this.svc.recordInvoicePayment(id, body);
    }
    // Moves a Pending Review invoice to Pending Approval, where the Purchase
    // Invoices workflow (Settings › Approvals) takes over. The posting draft
    // (date/method/GL lines) is decided here, up front.
    @Post('purchase-invoices/:id/send-for-approval')
    @RequiresProcess('p_purchase_invoices', 'edit')
    sendInvoiceForApproval(@Param('id') id: string, @Body() body: any) {
        return this.svc.sendInvoiceForApproval(id, body?.postingDraft);
    }
    /**
     * Cancels an invoice instead of deleting it.
     *
     * Deleting breaks the chain: the invoice is the link between a purchase
     * order and its payment, so removing it leaves the order in Procurement
     * pointing at nothing and the payment with no document behind it. The Delete
     * endpoint is gone; this is what replaces it.
     */
    @Post('purchase-invoices/:id/cancel')
    @RequiresProcess('p_purchase_invoices', 'edit')
    cancelInvoice(@Param('id') id: string, @Body() body: any) {
        return this.svc.cancelInvoice(id, body?.reason);
    }

    // ── Sent RFQs ──
    @Get('sent-rfqs')
    getAllRFQs(@Query('status') status?: string) { return this.svc.findAllRFQs(status); }
    // Service-accessible: the portal has to read the RFQ before it can show the
    // supplier what they are being asked to quote for. The PATCH below was
    // already service-accessible, so the portal could acknowledge an RFQ it was
    // never able to fetch.
    @Get('sent-rfqs/:id')
    @ServiceAuth()
    getRFQ(@Param('id') id: string) { return this.svc.findRFQ(id); }
    @Post('sent-rfqs')
    createRFQ(@Body() body: any) { return this.svc.createRFQ(body); }
    // Service-accessible: the portal mirrors RFQ status when a supplier
    // acknowledges or declines.
    @Patch('sent-rfqs/:id')
    @ServiceAuth()
    updateRFQ(@Param('id') id: string, @Body() body: any) { return this.svc.updateRFQ(id, body); }
    @Delete('sent-rfqs/:id')
    @RequiresProcess('p_rfqs', 'delete')
    deleteRFQ(@Param('id') id: string) { return this.svc.deleteRFQ(id); }

    // ── Received Quotes ──
    @Get('received-quotes')
    getAllQuotes(@Query('status') status?: string) { return this.svc.findAllQuotes(status); }
    @Get('received-quotes/:id')
    getQuote(@Param('id') id: string) { return this.svc.findQuote(id); }
    // Service-accessible: this is how a supplier's quote gets back into BuildOS
    // at all. Returning a quote is the whole point of sending an RFQ, and it was
    // the one portal-facing write with no service access — so RFQs went out and
    // nothing could ever come back.
    @Post('received-quotes')
    @ServiceAuth()
    createQuote(@Body() body: any) { return this.svc.createQuote(body); }
    // Service-accessible: a supplier revising a quote before it is accepted.
    @Patch('received-quotes/:id')
    @ServiceAuth()
    async updateQuote(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        return this.svc.updateQuote(id, body);
    }
    // A supplier accepting or declining a buyer counter-offer is not the same
    // as Procurement approving or rejecting the quote. Keep that boundary
    // explicit: service callers may record the supplier's response here, while
    // the PATCH above continues to reserve final approval for a signed-in buyer.
    @Post('received-quotes/:id/supplier-response')
    @ServiceAuth()
    recordSupplierResponse(@Param('id') id: string, @Body() body: any) {
        return this.svc.recordSupplierResponse(id, body);
    }
    @Delete('received-quotes/:id')
    deleteQuote(@Param('id') id: string) { return this.svc.deleteQuote(id); }
}
