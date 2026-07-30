import { apiFetch } from './client';

export interface AttendanceRecord {
    id: string; employeeId: string; employeeName: string; department?: string;
    date: string;
    // Nullable in the database, and null is meaningful on write: it clears a
    // recorded time when someone is re-marked absent or on leave.
    clockIn?: string | null; clockOut?: string | null; hoursWorked?: number;
    status: string; notes?: string; createdAt: string;
}
export interface PayrollPeriod {
    id: string; name: string; startDate: string; endDate: string;
    status: string; payrollRuns?: PayrollRun[]; createdAt: string;
}
export interface PayrollRun {
    id: string; periodId: string; periodName: string; month: number;
    year: number; status: string; totalGross: number; totalNet: number;
    employeeCount: number; processedBy?: string; processedAt?: string;
    entries?: PayrollEntry[]; createdAt: string;
}
export interface PayrollEntry {
    id: string; runId: string; employeeId: string; employeeName: string;
    department?: string; grossPay: number; deductions: number; netPay: number;
    tax: number; pension: number; allowances: number; status: string;
}
export interface Payslip {
    id: string; employeeId: string; employeeName: string; department?: string;
    period: string; month: number; year: number; grossPay: number;
    deductions: number; netPay: number; tax: number; pension: number;
    allowances: number; status: string; issuedAt?: string; createdAt: string;
}
export interface DepartmentPayrollSummary {
    department: string; employees: number; grossPay: number; netPay: number;
}
export interface Appraisal {
    id: string; employeeId: string; employeeName: string; department?: string;
    period: string; score?: number; rating?: string; reviewer?: string;
    reviewDate?: string; goals?: string; achievements?: string;
    comments?: string; status: string; createdAt: string;
}
export interface Issue {
    id: string; title: string; category?: string; priority?: string;
    status: string; description?: string; reportedBy?: string;
    assignedTo?: string; projectId?: string; projectName?: string;
    resolution?: string; reportedAt: string; resolvedAt?: string; createdAt: string;
}

// Attendance
export const getAttendance = (employeeId?: string, date?: string) => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employeeId', employeeId);
    if (date) params.set('date', date);
    const qs = params.toString();
    return apiFetch<AttendanceRecord[]>(qs ? `/attendance?${qs}` : '/attendance');
};
export const getAttendanceRecord = (id: string) => apiFetch<AttendanceRecord>(`/attendance/${id}`);
export const createAttendanceRecord = (data: Partial<AttendanceRecord>) =>
    apiFetch<AttendanceRecord>('/attendance', { method: 'POST', body: JSON.stringify(data) });
export const updateAttendanceRecord = (id: string, data: Partial<AttendanceRecord>) =>
    apiFetch<AttendanceRecord>(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAttendanceRecord = (id: string) =>
    apiFetch<void>(`/attendance/${id}`, { method: 'DELETE' });

// Payroll Periods
export const getPayrollPeriods = () => apiFetch<PayrollPeriod[]>('/payroll-periods');
export const getPayrollPeriod = (id: string) => apiFetch<PayrollPeriod>(`/payroll-periods/${id}`);
export const createPayrollPeriod = (data: Partial<PayrollPeriod>) =>
    apiFetch<PayrollPeriod>('/payroll-periods', { method: 'POST', body: JSON.stringify(data) });
export const updatePayrollPeriod = (id: string, data: Partial<PayrollPeriod>) =>
    apiFetch<PayrollPeriod>(`/payroll-periods/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePayrollPeriod = (id: string) =>
    apiFetch<void>(`/payroll-periods/${id}`, { method: 'DELETE' });

// Payroll Runs
export const getPayrollRuns = (periodId?: string) =>
    apiFetch<PayrollRun[]>(periodId ? `/payroll-runs?periodId=${periodId}` : '/payroll-runs');
export const getPayrollRun = (id: string) => apiFetch<PayrollRun>(`/payroll-runs/${id}`);
export const createPayrollRun = (data: Partial<PayrollRun>) =>
    apiFetch<PayrollRun>('/payroll-runs', { method: 'POST', body: JSON.stringify(data) });
export const updatePayrollRun = (id: string, data: Partial<PayrollRun>) =>
    apiFetch<PayrollRun>(`/payroll-runs/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// Payroll Entries
export const getPayrollEntries = (runId: string) =>
    apiFetch<PayrollEntry[]>(`/payroll-runs/${runId}/entries`);
export const getDepartmentPayrollSummary = () =>
    apiFetch<DepartmentPayrollSummary[]>('/payroll-summary/departments');
export const updatePayrollEntry = (id: string, data: Partial<PayrollEntry>) =>
    apiFetch<PayrollEntry>(`/payroll-entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// Payslips
export const getPayslips = (employeeId?: string) =>
    apiFetch<Payslip[]>(employeeId ? `/payslips?employeeId=${employeeId}` : '/payslips');
export const getPayslip = (id: string) => apiFetch<Payslip>(`/payslips/${id}`);
export const createPayslip = (data: Partial<Payslip>) =>
    apiFetch<Payslip>('/payslips', { method: 'POST', body: JSON.stringify(data) });
export const updatePayslip = (id: string, data: Partial<Payslip>) =>
    apiFetch<Payslip>(`/payslips/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// Appraisals
export const getAppraisals = (employeeId?: string) =>
    apiFetch<Appraisal[]>(employeeId ? `/appraisals?employeeId=${employeeId}` : '/appraisals');
export const getAppraisal = (id: string) => apiFetch<Appraisal>(`/appraisals/${id}`);
export const createAppraisal = (data: Partial<Appraisal>) =>
    apiFetch<Appraisal>('/appraisals', { method: 'POST', body: JSON.stringify(data) });
export const updateAppraisal = (id: string, data: Partial<Appraisal>) =>
    apiFetch<Appraisal>(`/appraisals/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAppraisal = (id: string) =>
    apiFetch<void>(`/appraisals/${id}`, { method: 'DELETE' });

// Issues
export const getIssues = (status?: string, projectId?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (projectId) params.set('projectId', projectId);
    const qs = params.toString();
    return apiFetch<Issue[]>(qs ? `/issues?${qs}` : '/issues');
};
export const getIssue = (id: string) => apiFetch<Issue>(`/issues/${id}`);
export const createIssue = (data: Partial<Issue>) =>
    apiFetch<Issue>('/issues', { method: 'POST', body: JSON.stringify(data) });
export const updateIssue = (id: string, data: Partial<Issue>) =>
    apiFetch<Issue>(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteIssue = (id: string) =>
    apiFetch<void>(`/issues/${id}`, { method: 'DELETE' });
