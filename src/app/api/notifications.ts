import { apiFetch } from "./client";

export interface NotificationTemplate {
  id: string;
  eventType: string;
  module: string;
  subject: string;
  body: string;
  recipients: string | null;
  cc: string | null;
  isActive: boolean;
}

export async function getNotificationTemplates(eventType?: string) {
  const query = eventType ? `?eventType=${encodeURIComponent(eventType)}` : "";
  const res = await apiFetch<{ success: boolean; data: NotificationTemplate[] }>(
    `/notifications/templates${query}`,
  );
  return res.data;
}

export async function saveNotificationTemplate(data: Partial<NotificationTemplate>) {
  const res = await apiFetch<{ success: boolean; data: NotificationTemplate }>(
    "/notifications/templates",
    { method: "POST", body: JSON.stringify(data) },
  );
  return res.data;
}

export function deleteNotificationTemplate(id: string) {
  return apiFetch<{ success: boolean }>(`/notifications/templates/${id}`, {
    method: "DELETE",
  });
}
