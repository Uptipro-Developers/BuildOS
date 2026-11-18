import { apiFetch } from './client';

export type SalaryType = string;
export type PaymentSource = 'company' | 'project';

export interface SalaryFrequencyConfig {
    id: string;
    name: string;
}

export interface EmploymentTypeConfig {
    id: string;
    name: string;
    defaultSalaryType: SalaryType;
    defaultSalaryFrequencyId: string;
    paysSalary: boolean;
    defaultPaymentSource: PaymentSource;
}

export interface SalaryGradeOption {
    id: string;
    gradeName: string;
    gradeLevel: string;
    department: string;
    salaryType: SalaryType;
    salaryFrequencyId?: string | null;
    basicSalary: number;
}

export const getEmploymentTypes = () => apiFetch<EmploymentTypeConfig[]>('/employment-types');
export const createEmploymentType = (data: Omit<EmploymentTypeConfig, 'id'>) =>
    apiFetch<EmploymentTypeConfig>('/employment-types', { method: 'POST', body: JSON.stringify(data) });
export const updateEmploymentType = (id: string, data: Partial<Omit<EmploymentTypeConfig, 'id'>>) =>
    apiFetch<EmploymentTypeConfig>(`/employment-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteEmploymentType = (id: string) =>
    apiFetch<{ id: string; deleted: boolean }>(`/employment-types/${id}`, { method: 'DELETE' });

export const getSalaryGrades = () => apiFetch<SalaryGradeOption[]>('/salary-bands');

export const getSalaryFrequencies = () => apiFetch<SalaryFrequencyConfig[]>('/salary-frequencies');
export const createSalaryFrequency = (data: { name: string }) =>
    apiFetch<SalaryFrequencyConfig>('/salary-frequencies', { method: 'POST', body: JSON.stringify(data) });
export const updateSalaryFrequency = (id: string, data: { name: string }) =>
    apiFetch<SalaryFrequencyConfig>(`/salary-frequencies/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteSalaryFrequency = (id: string) =>
    apiFetch<{ id: string; deleted: boolean }>(`/salary-frequencies/${id}`, { method: 'DELETE' });
