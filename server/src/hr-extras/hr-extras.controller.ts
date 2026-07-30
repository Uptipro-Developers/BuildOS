import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, Query, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { HrExtrasService } from './hr-extras.service';

/** The JWT signs the user id as `sub`; older tokens used `id`. */
function actingUserId(req: Request): string {
    const user = req.user as any;
    return String(user?.sub ?? user?.id ?? '');
}

@Controller()
export class HrExtrasController {
    constructor(private readonly svc: HrExtrasService) { }

    // ── Attendance ──
    @Get('attendance')
    getAll(@Query('employeeId') employeeId?: string, @Query('date') date?: string) {
        return this.svc.findAllAttendance(employeeId, date);
    }
    @Get('attendance/:id')
    getOne(@Param('id') id: string) { return this.svc.findAttendance(id); }

    // ── Self-service clock in / out ──
    // The employee is derived from the JWT, never from the body: the generic
    // POST /attendance accepts an employeeId, so accepting one here would let any
    // signed-in user record attendance for somebody else.
    @Get('attendance/me/today')
    myAttendanceToday(@Req() req: Request) {
        return this.svc.myAttendanceToday(actingUserId(req));
    }
    @Post('attendance/me/clock-in')
    clockIn(@Req() req: Request) {
        return this.svc.clockIn(actingUserId(req));
    }
    @Post('attendance/me/clock-out')
    clockOut(@Req() req: Request) {
        return this.svc.clockOut(actingUserId(req));
    }
    @Post('attendance')
    create(@Body() body: any) { return this.svc.createAttendance(body); }
    @Put('attendance/:id')
    update(@Param('id') id: string, @Body() body: any) { return this.svc.updateAttendance(id, body); }
    @Delete('attendance/:id')
    remove(@Param('id') id: string) { return this.svc.deleteAttendance(id); }

    // ── Payroll Periods ──
    @Get('payroll-periods')
    getAllPeriods() { return this.svc.findAllPeriods(); }
    @Get('payroll-periods/:id')
    getPeriod(@Param('id') id: string) { return this.svc.findPeriod(id); }
    @Post('payroll-periods')
    createPeriod(@Body() body: any) { return this.svc.createPeriod(body); }
    @Put('payroll-periods/:id')
    updatePeriod(@Param('id') id: string, @Body() body: any) { return this.svc.updatePeriod(id, body); }
    @Delete('payroll-periods/:id')
    deletePeriod(@Param('id') id: string) { return this.svc.deletePeriod(id); }

    // ── Payroll Runs ──
    @Get('payroll-runs')
    getAllRuns(@Query('periodId') periodId?: string) { return this.svc.findAllRuns(periodId); }
    @Get('payroll-runs/:id')
    getRun(@Param('id') id: string) { return this.svc.findRun(id); }
    @Post('payroll-runs')
    createRun(@Body() body: any) { return this.svc.createRun(body); }
    @Patch('payroll-runs/:id')
    updateRun(@Param('id') id: string, @Body() body: any) { return this.svc.updateRun(id, body); }

    // ── Payroll Entries ──
    @Get('payroll-summary/departments')
    getDepartmentPayrollSummary() { return this.svc.departmentPayrollSummary(); }

    @Get('payroll-runs/:runId/entries')
    getEntries(@Param('runId') runId: string) { return this.svc.findEntriesByRun(runId); }
    @Patch('payroll-entries/:id')
    updateEntry(@Param('id') id: string, @Body() body: any) { return this.svc.updateEntry(id, body); }

    // ── Payslips ──
    @Get('payslips')
    getAllPayslips(@Query('employeeId') employeeId?: string) { return this.svc.findAllPayslips(employeeId); }
    @Get('payslips/:id')
    getPayslip(@Param('id') id: string) { return this.svc.findPayslip(id); }
    @Post('payslips')
    createPayslip(@Body() body: any) { return this.svc.createPayslip(body); }
    @Patch('payslips/:id')
    updatePayslip(@Param('id') id: string, @Body() body: any) { return this.svc.updatePayslip(id, body); }

    // ── Appraisals ──
    @Get('appraisals')
    getAllAppraisals(@Query('employeeId') employeeId?: string) { return this.svc.findAllAppraisals(employeeId); }
    @Get('appraisals/:id')
    getAppraisal(@Param('id') id: string) { return this.svc.findAppraisal(id); }
    @Post('appraisals')
    createAppraisal(@Body() body: any) { return this.svc.createAppraisal(body); }
    @Put('appraisals/:id')
    updateAppraisal(@Param('id') id: string, @Body() body: any) { return this.svc.updateAppraisal(id, body); }
    @Delete('appraisals/:id')
    deleteAppraisal(@Param('id') id: string) { return this.svc.deleteAppraisal(id); }

    // ── Issues ──
    @Get('issues')
    getAllIssues(@Query('status') status?: string, @Query('projectId') projectId?: string) {
        return this.svc.findAllIssues(status, projectId);
    }
    @Get('issues/:id')
    getIssue(@Param('id') id: string) { return this.svc.findIssue(id); }
    @Post('issues')
    createIssue(@Body() body: any) { return this.svc.createIssue(body); }
    @Patch('issues/:id')
    updateIssue(@Param('id') id: string, @Body() body: any) { return this.svc.updateIssue(id, body); }
    @Delete('issues/:id')
    deleteIssue(@Param('id') id: string) { return this.svc.deleteIssue(id); }

    // ── Bank Names ──
    @Get('bank-names')
    getBankNames() { return this.svc.findBankNames(); }
    @Post('bank-names')
    createBankName(@Body() body: any) { return this.svc.createBankName(body); }
    @Patch('bank-names/:id')
    updateBankName(@Param('id') id: string, @Body() body: any) { return this.svc.updateBankName(id, body); }
    @Patch('bank-names/:id/toggle')
    toggleBankNameActive(@Param('id') id: string) { return this.svc.toggleBankNameActive(id); }
    @Delete('bank-names/:id')
    deleteBankName(@Param('id') id: string) { return this.svc.deleteBankName(id); }

    // ── Salary Bands ──
    @Get('salary-bands')
    getSalaryBands() { return this.svc.findSalaryBands(); }
    @Post('salary-bands')
    createSalaryBand(@Body() body: any) { return this.svc.createSalaryBand(body); }
    @Patch('salary-bands/:id')
    updateSalaryBand(@Param('id') id: string, @Body() body: any) { return this.svc.updateSalaryBand(id, body); }
    @Delete('salary-bands/:id')
    deleteSalaryBand(@Param('id') id: string) { return this.svc.deleteSalaryBand(id); }

    // ── Holidays ──
    @Get('holidays')
    getHolidays() { return this.svc.findHolidays(); }
    @Post('holidays')
    createHoliday(@Body() body: any) { return this.svc.createHoliday(body); }
    @Delete('holidays/:id')
    deleteHoliday(@Param('id') id: string) { return this.svc.deleteHoliday(id); }

    // ── HR Setup ──
    @Get('setup')
    getHrSetup() { return this.svc.getHrSetup(); }
    @Post('setup')
    saveHrSetup(@Body() body: any) { return this.svc.saveHrSetup(body); }
}
