import { apiFetch } from './client';

export interface UserNotification {
    id: string;
    title: string;
    message: string;
    type: string;
    status: 'sent' | 'read';
    actionUrl?: string | null;
    createdAt: string;
}

export const getMyNotifications = (limit = 20) =>
    apiFetch<{ success: boolean; notifications: UserNotification[] }>(`/notifications?limit=${limit}`)
        .then((result) => result.notifications ?? []);

export const markNotificationRead = (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
