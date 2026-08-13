import { apiFetch } from "./client";

export interface Signatory {
    id: string;
    department: string;
    role: string;
    userId: string;
    user?: { id: string; name: string; email: string; department?: string; role?: string };
    createdAt: string;
    updatedAt: string;
}

export const getSignatories = () => apiFetch<Signatory[]>("/signatories");

export const createSignatory = (data: { department: string; role: string; userId: string }) =>
    apiFetch<Signatory>("/signatories", { method: "POST", body: JSON.stringify(data) });

export const updateSignatory = (
    id: string,
    data: Partial<{ department: string; role: string; userId: string }>,
) => apiFetch<Signatory>(`/signatories/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteSignatory = (id: string) =>
    apiFetch<void>(`/signatories/${id}`, { method: "DELETE" });
