import { createContext, useContext, useState, type ReactNode } from "react";

// ─── Leave Types ──────────────────────────────────────────────────────────────

export type LeaveGender = "all" | "male" | "female";

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

const INITIAL_LEAVE_TYPES: LeaveType[] = [
  { id: "lt1", name: "Annual Leave",        daysAllowed: 21, carryOver: true,  maxCarryOver: 10, paid: true,  approvalsRequired: 1, color: "bg-blue-100 text-blue-700",   gender: "all"    },
  { id: "lt2", name: "Sick Leave",          daysAllowed: 10, carryOver: false, maxCarryOver: 0,  paid: true,  approvalsRequired: 1, color: "bg-red-100 text-red-700",     gender: "all"    },
  { id: "lt3", name: "Emergency Leave",     daysAllowed: 3,  carryOver: false, maxCarryOver: 0,  paid: true,  approvalsRequired: 1, color: "bg-orange-100 text-orange-700",gender: "all"    },
  { id: "lt4", name: "Maternity Leave",     daysAllowed: 90, carryOver: false, maxCarryOver: 0,  paid: true,  approvalsRequired: 2, color: "bg-pink-100 text-pink-700",   gender: "female" },
  { id: "lt5", name: "Paternity Leave",     daysAllowed: 14, carryOver: false, maxCarryOver: 0,  paid: true,  approvalsRequired: 2, color: "bg-purple-100 text-purple-700",gender: "male"   },
  { id: "lt6", name: "Study Leave",         daysAllowed: 5,  carryOver: false, maxCarryOver: 0,  paid: false, approvalsRequired: 2, color: "bg-amber-100 text-amber-700", gender: "all"    },
  { id: "lt7", name: "Compassionate Leave", daysAllowed: 3,  carryOver: false, maxCarryOver: 0,  paid: true,  approvalsRequired: 1, color: "bg-gray-100 text-gray-700",   gender: "all"    },
];

// ─── Claim Types ──────────────────────────────────────────────────────────────

export interface ClaimType {
  id: string;
  name: string;
  description: string;
  isProjectBased: boolean;
}

const INITIAL_CLAIM_TYPES: ClaimType[] = [
  { id: "ct1", name: "Travel Claim",        description: "Transport, fuel, and travel-related reimbursements",           isProjectBased: true  },
  { id: "ct2", name: "Medical Claim",       description: "Medical bills, prescriptions, and health-related expenses",    isProjectBased: false },
  { id: "ct3", name: "Site Expense Claim",  description: "On-site consumables and incidental project expenses",          isProjectBased: true  },
  { id: "ct4", name: "Meal Allowance",      description: "Daily meal and subsistence allowances",                       isProjectBased: false },
  { id: "ct5", name: "Accommodation Claim", description: "Hotel and lodging expenses during work trips",                 isProjectBased: true  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

export interface OrgLevelConfig {
  name: string;
  description: string;
}

interface HRConfigContextValue {
  leaveTypes: LeaveType[];
  setLeaveTypes: React.Dispatch<React.SetStateAction<LeaveType[]>>;
  claimTypes: ClaimType[];
  setClaimTypes: React.Dispatch<React.SetStateAction<ClaimType[]>>;
  orgLevels: OrgLevelConfig[];
  setOrgLevels: React.Dispatch<React.SetStateAction<OrgLevelConfig[]>>;
}

const HRConfigContext = createContext<HRConfigContextValue | null>(null);

export function HRConfigProvider({ children }: { children: ReactNode }) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(INITIAL_LEAVE_TYPES);
  const [claimTypes, setClaimTypes] = useState<ClaimType[]>(INITIAL_CLAIM_TYPES);
  const [orgLevels, setOrgLevels] = useState<OrgLevelConfig[]>([
    { name: "Collegium", description: "Executive leadership body overseeing strategy and governance" },
    { name: "Cluster", description: "Operational management level managing related projects and regions" },
    { name: "Crew", description: "Execution-level teams performing project work" },
  ]);

  return (
    <HRConfigContext.Provider value={{ leaveTypes, setLeaveTypes, claimTypes, setClaimTypes, orgLevels, setOrgLevels }}>
      {children}
    </HRConfigContext.Provider>
  );
}

export function useHRConfig() {
  const ctx = useContext(HRConfigContext);
  if (!ctx) throw new Error("useHRConfig must be used within HRConfigProvider");
  return ctx;
}
