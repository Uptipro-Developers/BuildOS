import { apiFetch } from "./client";

export type DeliverySplit = "pre_delivery" | "post_delivery";
export type TrancheTiming = "on_po_approval" | "on_delivery" | "net_30" | "net_60";

export interface PaymentTermTranche {
    title: string;
    percent: number;
    timing: TrancheTiming;
}

export interface PaymentTerm {
    id: string;
    name: string;
    description: string;
    deliverySplit: DeliverySplit;
    tranches: PaymentTermTranche[];
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export const getPaymentTerms = () => apiFetch<PaymentTerm[]>("/payment-terms");

export const createPaymentTerm = (data: {
    name: string;
    description?: string;
    deliverySplit: DeliverySplit;
    tranches: PaymentTermTranche[];
}) => apiFetch<PaymentTerm>("/payment-terms", { method: "POST", body: JSON.stringify(data) });

export const updatePaymentTerm = (
    id: string,
    data: Partial<{
        name: string;
        description: string;
        deliverySplit: DeliverySplit;
        tranches: PaymentTermTranche[];
    }>,
) => apiFetch<PaymentTerm>(`/payment-terms/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deletePaymentTerm = (id: string) =>
    apiFetch<void>(`/payment-terms/${id}`, { method: "DELETE" });

export const setDefaultPaymentTerm = (id: string) =>
    apiFetch<PaymentTerm>(`/payment-terms/${id}/set-default`, { method: "POST" });
