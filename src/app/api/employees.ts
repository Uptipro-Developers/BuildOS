import { apiFetch } from './client';
import { formatDateByGeneralSettings } from '../utils/generalSettings';

export const EMPLOYMENT_TYPE_TO_DISPLAY: Record<string, string> = { FullTime: 'Full-time', Contract: 'Contract' };
export const EMPLOYMENT_TYPE_TO_BACKEND: Record<string, string> = { 'Full-time': 'FullTime', Contract: 'Contract' };

function toLocalDateInput(value: string | Date | null | undefined) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function mapEmployee(e: any) {
    const statusMap: Record<string, string> = { active: 'active', inactive: 'inactive', on_leave: 'on_leave' };
    const fullName = `${e.firstName ?? ''} ${e.middleName ?? ''} ${e.lastName ?? ''}`.replace(/\s+/g, ' ').trim();
    return {
        id: e.id,
        firstName: e.firstName ?? '',
        middleName: e.middleName ?? '',
        lastName: e.lastName ?? '',
        name: fullName,
        role: e.role ?? '',
        jobTitle: e.role ?? '',
        department: e.department?.name ?? '',
        departmentId: e.departmentId ?? e.department?.id ?? '',
        status: statusMap[e.status] ?? e.status,
        email: e.email ?? '',
        personalEmail: e.email ?? '',
        phone: e.phone ?? '',
        personalPhone: e.phone ?? '',
        dateHired: e.dateHired ? formatDateByGeneralSettings(e.dateHired) : '',
        dateHiredISO: toLocalDateInput(e.dateHired),
        employmentDate: toLocalDateInput(e.dateHired),
        employmentType: EMPLOYMENT_TYPE_TO_DISPLAY[e.employmentType] ?? e.employmentType,
        projectCount: e.projectCount ?? 0,
        projects: e.projects ?? [],
        dateOfBirth: toLocalDateInput(e.dateOfBirth),
        gender: e.gender ?? '',
        address: e.address ?? '',
        city: e.city ?? '',
        state: e.state ?? '',
        zipCode: e.zipCode ?? '',
        emergencyContact: e.emergencyContact ?? '',
        nextOfKin: e.emergencyContact ?? '',
        emergencyPhone: e.emergencyPhone ?? '',
        gradeLevel: e.gradeLevel ?? '',
        grade: e.gradeLevel ?? '',
        baseSalary: e.baseSalary ?? 0,
        bankName: e.bankName ?? '',
        bankAccount: e.accountNumber ?? '',
        accountNumber: e.accountNumber ?? '',
        accountHolder: e.accountHolder ?? '',
        taxId: e.taxId ?? '',
        pfa: e.pensionId ?? '',
        rsaNumber: e.pensionId ?? '',
        pensionId: e.pensionId ?? '',
        supervisorId: e.supervisorId ?? '',
        primarySupervisor: e.supervisor
            ? `${e.supervisor.firstName ?? ''} ${e.supervisor.lastName ?? ''}`.trim()
            : '',
        maritalStatus: '',
        orgLevel: '',
        nationality: '',
        // Sync state is derived from the linked login account rather than stored
        // separately: an employee with no userId is still awaiting admin sync.
        userId: e.userId ?? null,
        syncStatus: e.userId ? 'synced' : 'unsynced',
        onboardingWarning: e.onboardingWarning as string | undefined,
    };
}

export function toEmployeeCreatePayload(form: any) {
    const email = String(form.personalEmail ?? form.email ?? '').trim().toLowerCase();
    const phone = String(form.personalPhone ?? form.phone ?? '').trim();
    return {
        firstName: String(form.firstName ?? '').trim(),
        middleName: String(form.middleName ?? '').trim() || undefined,
        lastName: String(form.lastName ?? '').trim(),
        email,
        phone,
        role: String(form.jobTitle ?? form.role ?? '').trim(),
        dateHired: form.employmentDate || form.dateHiredISO || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        status: form.status ?? 'active',
        employmentType: EMPLOYMENT_TYPE_TO_BACKEND[form.employmentType] ?? form.employmentType ?? 'FullTime',
        departmentId: form.departmentId || undefined,
        department: form.department || undefined,
        supervisorId: form.supervisorId || undefined,
        baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined,
        bankName: form.bankName || undefined,
        accountNumber: form.bankAccount || form.accountNumber || undefined,
        accountHolder: form.accountHolder || undefined,
        taxId: form.taxId || undefined,
        pensionId: form.rsaNumber || form.pfa || form.pensionId || undefined,
        emergencyContact: form.nextOfKin || form.emergencyContact || undefined,
        emergencyPhone: form.emergencyPhone || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        gradeLevel: form.grade || form.gradeLevel || undefined,
    };
}

/**
 * Converts a profile-page edit draft (display-friendly values) back into the
 * shape the backend accepts (enum values + departmentId instead of names).
 */
export function toEmployeeUpdatePayload(draft: any) {
    const {
        department, dateHired, dateHiredISO, projectCount, projects, id, status,
        employmentType, departmentId, baseSalary, supervisorId,
        // Display-only aliases and derived state that must never be written back.
        syncStatus, userId, primarySupervisor, bankAccount, pfa, rsaNumber,
        maritalStatus, orgLevel, nationality, name, jobTitle, personalEmail,
        personalPhone, employmentDate, nextOfKin, grade, onboardingWarning,
        ...rest
    } = draft;
    // Convert empty-string date fields to undefined so Prisma skips them instead of
    // sending invalid DateTime values that would cause a 500 on update.
    const dateOfBirth = rest.dateOfBirth && String(rest.dateOfBirth).trim() ? rest.dateOfBirth : undefined;
    // Number inputs hand back strings; Prisma rejects a string for a Float column.
    const parsedSalary = baseSalary === '' || baseSalary === null || baseSalary === undefined
        ? undefined
        : Number(baseSalary);
    return {
        ...rest,
        dateOfBirth,
        status,
        departmentId: departmentId || undefined,
        // An empty select value must clear the relation, not be sent as an id of ''.
        supervisorId: supervisorId ? supervisorId : null,
        baseSalary: Number.isFinite(parsedSalary) ? parsedSalary : undefined,
        // Keep the canonical column name; the UI exposes pfa/rsaNumber aliases.
        pensionId: rest.pensionId ?? rsaNumber ?? pfa ?? undefined,
        employmentType: EMPLOYMENT_TYPE_TO_BACKEND[employmentType] ?? employmentType,
        dateHired: dateHiredISO && String(dateHiredISO).trim() ? dateHiredISO : undefined,
    };
}

export async function fetchEmployees(params?: { status?: string; departmentId?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.departmentId) qs.set('departmentId', params.departmentId);
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<any[]>(`/employees${query}`);
    return data.map(mapEmployee);
}

export async function fetchEmployee(id: string) {
    const data = await apiFetch<any>(`/employees/${id}`);
    return mapEmployee(data);
}

export function createEmployee(data: any) {
    return apiFetch<any>(`/employees`, { method: 'POST', body: JSON.stringify(data) }).then(mapEmployee);
}

export function updateEmployee(id: string, data: any) {
    return apiFetch(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteEmployee(id: string) {
    return apiFetch(`/employees/${id}`, { method: 'DELETE' });
}
