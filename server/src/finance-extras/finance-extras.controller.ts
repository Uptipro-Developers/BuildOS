import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, Query, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FinanceExtrasService } from './finance-extras.service';
import { PayrollPostingService } from './payroll-posting.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

/** Who is acting, for the posting trail. The JWT signs the name alongside the id. */
function actingUser(req: Request): string | undefined {
    const user = req.user as any;
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return name || user?.name || user?.email || undefined;
}

@Controller()
export class FinanceExtrasController {
    constructor(
        private readonly svc: FinanceExtrasService,
        private readonly payrollPosting: PayrollPostingService,
    ) { }

    // ── Payroll Overview (HR-approved runs, and their route to the ledger) ──
    @Get('payroll-overview')
    getPayrollOverview() { return this.payrollPosting.overview(); }

    @Get('payroll-overview/:id/posting-preview')
    getPayrollPostingPreview(@Param('id') id: string) { return this.payrollPosting.preview(id); }

    @Post('payroll-overview/:id/send-for-posting-approval')
    sendPayrollForPostingApproval(@Param('id') id: string, @Req() req: Request, @Body() body: any) {
        return this.payrollPosting.sendForPostingApproval(id, body?.by ?? actingUser(req));
    }

    @Post('payroll-overview/:id/approve-posting')
    approvePayrollPosting(@Param('id') id: string, @Req() req: Request, @Body() body: any) {
        return this.payrollPosting.approvePosting(id, body?.by ?? actingUser(req));
    }

    @Post('payroll-overview/:id/post')
    postPayroll(@Param('id') id: string, @Req() req: Request, @Body() body: any) {
        return this.payrollPosting.post(id, body?.by ?? actingUser(req));
    }

    // ── Transactions ──
    @Get('transactions')
    getAllTransactions(@Query('type') type?: string, @Query('status') status?: string) {
        return this.svc.findAllTransactions(type, status);
    }

    // ── Finance Reports (aggregated data for the Financial Reports page) ──
    @Get('finance-reports')
    getFinanceReports(@Query('from') from?: string, @Query('to') to?: string) {
        return this.svc.buildFinanceReports(from, to);
    }
    @Get('transactions/:id')
    getTransaction(@Param('id') id: string) { return this.svc.findTransaction(id); }
    @Post('transactions')
    createTransaction(@Body() body: any) { return this.svc.createTransaction(body); }
    @Put('transactions/:id')
    updateTransaction(@Param('id') id: string, @Body() body: any) { return this.svc.updateTransaction(id, body); }
    @Delete('transactions/:id')
    deleteTransaction(@Param('id') id: string) { return this.svc.deleteTransaction(id); }

    // ── Journal Entries ──
    @Get('journal-entries')
    getAllJournals(@Query('status') status?: string) { return this.svc.findAllJournals(status); }
    @Get('journal-entries/:id')
    getJournal(@Param('id') id: string) { return this.svc.findJournal(id); }
    @Post('journal-entries')
    createJournal(@Body() body: any) { return this.svc.createJournal(body); }
    @Put('journal-entries/:id')
    updateJournal(@Param('id') id: string, @Body() body: any) { return this.svc.updateJournal(id, body); }
    @Post('journal-entries/:id/post')
    postJournal(@Param('id') id: string, @Body() body: any) { return this.svc.postJournal(id, body ?? {}); }
    @Post('journal-entries/:id/reverse')
    reverseJournal(@Param('id') id: string, @Body() body: any) { return this.svc.reverseJournal(id, body ?? {}); }
    @Delete('journal-entries/:id')
    deleteJournal(@Param('id') id: string) { return this.svc.deleteJournal(id); }

    // ── General Ledger ──
    @Get('general-ledger')
    getGeneralLedger(
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('accountCode') accountCode?: string,
        @Query('sourceModule') sourceModule?: string,
    ) {
        return this.svc.buildGeneralLedger({ from, to, accountCode, sourceModule });
    }

    // ── Chart of Accounts ──
    @Get('chart-accounts')
    getAllAccounts(@Query('type') type?: string) { return this.svc.findAllAccounts(type); }
    /**
     * Rebuilds every balance from the posted journal lines. Accounts that
     * predate the posting engine never had their balances maintained, and this
     * is also the reconciliation to reach for if one is ever doubted.
     */
    @Post('chart-accounts/recompute-balances')
    recomputeBalances() { return this.svc.recomputeAccountBalances(); }
    @Get('chart-accounts/:id')
    getAccount(@Param('id') id: string) { return this.svc.findAccount(id); }
    @Post('chart-accounts')
    createAccount(@Body() body: any) { return this.svc.createAccount(body); }
    @Put('chart-accounts/:id')
    updateAccount(@Param('id') id: string, @Body() body: any) { return this.svc.updateAccount(id, body); }
    @Delete('chart-accounts/:id')
    @RequiresProcess('p_chart_of_accounts', 'delete')
    deleteAccount(@Param('id') id: string) { return this.svc.deleteAccount(id); }

    // ── Bank Accounts ──
    @Get('bank-accounts')
    getAllBankAccounts() { return this.svc.findAllBankAccounts(); }
    @Get('bank-accounts/:id')
    getBankAccount(@Param('id') id: string) { return this.svc.findBankAccount(id); }
    @Post('bank-accounts')
    createBankAccount(@Body() body: any) { return this.svc.createBankAccount(body); }
    @Put('bank-accounts/:id')
    updateBankAccount(@Param('id') id: string, @Body() body: any) { return this.svc.updateBankAccount(id, body); }
    @Delete('bank-accounts/:id')
    deleteBankAccount(@Param('id') id: string) { return this.svc.deleteBankAccount(id); }

    // ── Tax Configs ──
    @Get('tax-configs')
    getAllTaxConfigs() { return this.svc.findAllTaxConfigs(); }
    @Get('tax-configs/:id')
    getTaxConfig(@Param('id') id: string) { return this.svc.findTaxConfig(id); }
    @Post('tax-configs')
    createTaxConfig(@Body() body: any) { return this.svc.createTaxConfig(body); }
    @Put('tax-configs/:id')
    updateTaxConfig(@Param('id') id: string, @Body() body: any) { return this.svc.updateTaxConfig(id, body); }
    @Patch('tax-configs/:id')
    patchTaxConfig(@Param('id') id: string, @Body() body: any) { return this.svc.updateTaxConfig(id, body); }
    @Delete('tax-configs/:id')
    deleteTaxConfig(@Param('id') id: string) { return this.svc.deleteTaxConfig(id); }

    // ── Scheduled Postings ──
    @Get('scheduled-postings')
    getScheduledPostings() { return this.svc.findScheduledPostings(); }
    @Post('scheduled-postings')
    createScheduledPosting(@Body() body: any) { return this.svc.createScheduledPosting(body); }
    @Delete('scheduled-postings/:id')
    deleteScheduledPosting(@Param('id') id: string) { return this.svc.deleteScheduledPosting(id); }

    // ── Payment Methods ──
    @Get('payment-methods')
    getPaymentMethods() { return this.svc.findPaymentMethods(); }
    @Post('payment-methods')
    createPaymentMethod(@Body() body: any) { return this.svc.createPaymentMethod(body); }
    @Put('payment-methods/:id')
    updatePaymentMethod(@Param('id') id: string, @Body() body: any) { return this.svc.updatePaymentMethod(id, body); }
    @Delete('payment-methods/:id')
    deletePaymentMethod(@Param('id') id: string) { return this.svc.deletePaymentMethod(id); }
    @Patch('payment-methods/:id/toggle')
    togglePaymentMethod(@Param('id') id: string) { return this.svc.togglePaymentMethod(id); }

    // ── Report Templates ──
    @Get('report-templates')
    getReportTemplates() { return this.svc.getReportTemplates(); }

    // ── Config ──
    @Get('config')
    getConfig() { return this.svc.getConfig(); }
    @Post('config')
    saveConfig(@Body() body: any) { return this.svc.saveConfig(body); }

    // ── Fiscal Years ──
    @Get('fiscal-years')
    getFiscalYears() { return this.svc.getFiscalYears(); }
    @Put('fiscal-years')
    saveFiscalYears(@Body() body: any) {
        return this.svc.saveFiscalYears(body?.fiscalYears ?? body);
    }

    // ── Process / Account Mappings ──
    @Get('process-mappings')
    getProcessMappings() { return this.svc.getProcessMappings(); }
    @Put('process-mappings')
    saveProcessMappings(@Body() body: any) {
        return this.svc.saveProcessMappings(body?.mappings ?? body);
    }

    // ── Posting Engine process categories ──
    @Get('process-categories')
    getProcessCategories() { return this.svc.getProcessCategories(); }
    @Put('process-categories')
    saveProcessCategories(@Body() body: any) {
        return this.svc.saveProcessCategories(body?.categories ?? body);
    }
}
