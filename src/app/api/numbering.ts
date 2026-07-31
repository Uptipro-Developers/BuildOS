import { apiFetch } from "./client";

export interface NumberingConfig {
  module: string;
  app: string;
  prefix: string;
  separator: string;
  padLength: number;
  /** The value the next allocation will use. */
  nextNumber: number;
  description: string;
}

export const getNumberingConfigs = (app?: string) =>
  apiFetch<NumberingConfig[]>(
    `/numbering/configs${app ? `?app=${encodeURIComponent(app)}` : ""}`,
  );

/**
 * Reserves the next reference for a module.
 *
 * Consuming: each call advances the sequence, so only call it when a record is
 * actually being created. Use {@link peekNumbering} for previews.
 */
export const allocateNumber = (module: string) =>
  apiFetch<{ module: string; reference: string; value: number }>(
    `/numbering/allocate/${encodeURIComponent(module)}`,
    { method: "POST" },
  );

/** The reference a module would produce next, without consuming it. */
export const peekNumbering = (module: string) =>
  apiFetch<{ module: string; reference: string }>(
    `/numbering/peek/${encodeURIComponent(module)}`,
  );

export const createNumberingConfig = (data: NumberingConfig) =>
  apiFetch<NumberingConfig>("/numbering/configs", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateNumberingConfig = (
  module: string,
  data: Partial<Omit<NumberingConfig, "module" | "app">>,
) =>
  apiFetch<NumberingConfig>(`/numbering/configs/${encodeURIComponent(module)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const resetNumberingConfig = (module: string) =>
  apiFetch<NumberingConfig>(
    `/numbering/configs/${encodeURIComponent(module)}/reset`,
    { method: "POST" },
  );

export const deleteNumberingConfig = (module: string) =>
  apiFetch<{ deleted: boolean }>(
    `/numbering/configs/${encodeURIComponent(module)}`,
    { method: "DELETE" },
  );
