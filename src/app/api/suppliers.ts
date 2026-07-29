import { apiFetch } from './client';

function mapSupplier(s: any) {
    return {
        id: s.id,
        name: s.name,
        contactPerson: s.contactPerson ?? '',
        phone: s.phone ?? '',
        email: s.email ?? '',
        city: s.city ?? '',
        // The column is `categories` (plural) on the backend; the UI field is
        // `category`. Reading only `s.category` meant categories never loaded.
        category: s.categories ?? s.category ?? [],
        rating: s.rating ?? 0,
        onTimeDeliveryRate: s.onTimeDeliveryRate ?? 0,
        rejectRate: s.rejectRate ?? 0,
        activePOs: s.activePOs ?? 0,
        totalSpend: s.totalSpend ?? 0,
        lastOrder: s.lastOrder ?? '',
        status: s.status ?? 'active',
        materials: (s.materials ?? []).map((m: any) => ({
            name: m.name,
            unit: m.unit,
            lastPrice: m.lastPrice ?? 0,
        })),
        notes: s.notes ?? '',
    };
}

export async function fetchSuppliers() {
    const data = await apiFetch<any[]>('/suppliers');
    return data.map(mapSupplier);
}

export interface SupplierInput {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    city?: string;
    category?: string[];
    notes?: string;
    status?: string;
}

/** Maps the UI's supplier form onto the backend column names. */
function toSupplierPayload(data: SupplierInput) {
    const { category, ...rest } = data;
    return {
        ...rest,
        contactPerson: data.contactPerson ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        city: data.city ?? '',
        ...(category ? { categories: category } : {}),
    };
}

export async function createSupplier(data: SupplierInput) {
    const created = await apiFetch<any>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(toSupplierPayload(data)),
    });
    return mapSupplier(created);
}

export async function updateSupplier(id: string, data: Partial<SupplierInput>) {
    const updated = await apiFetch<any>(`/suppliers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(toSupplierPayload(data as SupplierInput)),
    });
    return mapSupplier(updated);
}

export function deleteSupplier(id: string) {
    return apiFetch<void>(`/suppliers/${id}`, { method: 'DELETE' });
}
