/**
 * Shared HR configuration store.
 *
 * Both HR (configuration pages) and ESS (submit-request forms) import
 * from this module so that claim types and leave types defined in HR
 * automatically appear in ESS — no hardcoding required.
 *
 * React hooks (useHRConfig) are provided for reactive reads; the
 * imperative helpers (getHRConfig / setHRConfig) are available for
 * non-component callers.
 */

import { useState, useEffect } from "react";

// ─── Leave Types ──────────────────────────────────────────────────────────────

export type LeaveGender = "All" | "Male" | "Female";

export interface LeaveType {
  id: string;
  name: string;
  daysAllowed: number;
  carryOver: boolean;
  maxCarryOver: number;
  paid: boolean;
  approvalsRequired: 1 | 2;
  color: string;
  gender: LeaveGender;
}

// ─── Claim Types ──────────────────────────────────────────────────────────────

export interface ClaimType {
  id: string;
  name: string;
  /** If true: ESS claim form shows a Project selector for this type */
  projectBased: boolean;
  description?: string;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  { id: "lt1", name: "Annual Leave",        daysAllowed: 21, carryOver: true,  maxCarryOver: 10, paid: true,  approvalsRequired: 1, color: "bg-blue-100 text-blue-700",   gender: "All"    },
  { id: "lt2", name: "Sick Leave",          daysAllowed: 10, carryOver: false, maxCarryOver: 0,  paid: true,  approvalsRequired: 1, color: "bg-red-100 text-red-700",     gender: "All"    },
  { id: "lt3", name: "Emergency Leave",     daysAllowed: 3,  carryOver: false, maxCarryOver: 0,  paid: true,  approvalsRequired: 1, color: "bg-orange-100 text-orange-700",gender: "All"    },
  { id: "lt4", name: "Maternity Leave",     daysAllowed: 90, carryOver: false, maxCarryOver: 0,  paid: true,  approvalsRequired: 2, color: "bg-pink-100 text-pink-700",   gender: "Female" },
  { id: "lt5", name: "Paternity Leave",     daysAllowed: 14, carryOver: false, maxCarryOver: 0,  paid: true,  approvalsRequired: 2, color: "bg-purple-100 text-purple-700",gender: "Male"   },
  { id: "lt6", name: "Study Leave",         daysAllowed: 5,  carryOver: false, maxCarryOver: 0,  paid: false, approvalsRequired: 2, color: "bg-amber-100 text-amber-700", gender: "All"    },
  { id: "lt7", name: "Compassionate Leave", daysAllowed: 3,  carryOver: false, maxCarryOver: 0,  paid: true,  approvalsRequired: 1, color: "bg-gray-100 text-gray-700",   gender: "All"    },
];

export const DEFAULT_CLAIM_TYPES: ClaimType[] = [
  { id: "ct1", name: "Travel Claim",       projectBased: true,  description: "Fuel, transport, flights for project-related travel" },
  { id: "ct2", name: "Medical Claim",      projectBased: false, description: "Medical bills, prescriptions, hospital expenses" },
  { id: "ct3", name: "Site Expense Claim", projectBased: true,  description: "On-site petty cash and site-operations expenses" },
  { id: "ct4", name: "Meal Allowance",     projectBased: false, description: "Daily meal allowance for overtime or remote work" },
  { id: "ct5", name: "Accommodation",      projectBased: true,  description: "Hotel or lodging costs for project assignments" },
];

// ─── In-memory singleton ──────────────────────────────────────────────────────

interface HRConfig {
  leaveTypes: LeaveType[];
  claimTypes: ClaimType[];
}

let _config: HRConfig = {
  leaveTypes: DEFAULT_LEAVE_TYPES,
  claimTypes: DEFAULT_CLAIM_TYPES,
};

/** Listeners subscribed via useHRConfig */
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach(l => l());
}

/** Read current config (non-reactive) */
export function getHRConfig(): HRConfig {
  return _config;
}

/** Replace the entire config and notify all subscribers */
export function setHRConfig(next: HRConfig) {
  _config = next;
  notify();
}

/** Update only leaveTypes */
export function setLeaveTypes(types: LeaveType[]) {
  setHRConfig({ ..._config, leaveTypes: types });
}

/** Update only claimTypes */
export function setClaimTypes(types: ClaimType[]) {
  setHRConfig({ ..._config, claimTypes: types });
}

// ─── React hook ───────────────────────────────────────────────────────────────

/**
 * Reactive hook — re-renders the consuming component whenever HRConfig changes.
 */
export function useHRConfig(): HRConfig {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  return _config;
}
