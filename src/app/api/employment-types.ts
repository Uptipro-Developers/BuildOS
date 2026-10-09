import { apiFetch } from './client';

export type SalaryType = 'Monthly' | 'Annual';

export interface EmploymentTypeConfig {
    id: string;
    name: string;
    defaultSalaryType: SalaryType;
}

export interface SalaryGradeOption {
    id: string;
    gradeName: string;
    gradeLevel: string;
    department: string;
    salaryType: SalaryType;
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
