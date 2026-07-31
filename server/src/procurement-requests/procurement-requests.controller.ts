import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, Query, Req, ForbiddenException,
} from '@nestjs/common';
import { ServiceAuth } from '../auth/decorators';
import { ProcurementRequestsService } from './procurement-requests.service';
import { AdminExtrasService } from '../admin-extras/admin-extras.service';

@Controller()
export class ProcurementRequestsController {
    constructor(
        private readonly svc: ProcurementRequestsService,
        private readonly adminExtras: AdminExtrasService,
    ) { }

    /**
     * Enforces the Workflow Approval configuration on a purchase-request decision.
     *
     * A signed-in caller must be a configured approver for Purchase Requests, and
     * may not decide a request they raised. Skipped for the service-key path, which
     * is the supplier portal mirroring a supplier's own accept/decline rather than
     * an internal approval.
     */
    private async guardPRDecision(req: any, id: string, body: any) {
        const status = String(body?.status ?? '').toLowerCase();
        if (status !== 'approved' && status !== 'cancelled' && status !== 'rejected') return;

        const user = req?.user;
        if (!user?.sub && !user?.id) return;

        const identity = {
            userId: String(user?.sub ?? user?.id ?? ''),
            name: user?.name,
            email: user?.email,
            role: user?.role,
        };
        await this.adminExtras.assertMayApprove(identity, 'p_purchase_requests');

        const existing = await this.svc.findPR(id).catch(() => null);
        const raisedBy = String((existing as any)?.requestedBy ?? '').trim().toLowerCase();
        const mine = [identity.name, identity.email]
            .map((v) => String(v ?? '').trim().toLowerCase())
            .filter(Boolean);
        if (raisedBy && mine.includes(raisedBy)) {
            throw new ForbiddenException(
                'You raised this request, so it must be approved by someone else.',
            );
        }
    }

    // ── Purchase Requests ──
    @Get('purchase-requests')
    getAllPRs(@Query('status') status?: string) { return this.svc.findAllPRs(status); }
    @Get('purchase-requests/:id')
    getPR(@Param('id') id: string) { return this.svc.findPR(id); }
    @Post('purchase-requests')
    createPR(@Body() body: any) { return this.svc.createPR(body); }
    @Put('purchase-requests/:id')
    async updatePR(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        await this.guardPRDecision(req, id, body);
        return this.svc.updatePR(id, body);
    }
    // Service-accessible: the SabiQuot supplier portal mirrors a supplier's
    // accept/decline back onto the originating purchase request.
    @Patch('purchase-requests/:id')
    @ServiceAuth()
    async patchPR(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        await this.guardPRDecision(req, id, body);
        return this.svc.updatePR(id, body);
    }
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
