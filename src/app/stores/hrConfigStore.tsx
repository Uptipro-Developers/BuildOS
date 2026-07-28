import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { fetchLeaveTypes } from "../api/leave-types";
import { fetchClaimTypes } from "../api/claim-types";

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

// ─── Claim Types ──────────────────────────────────────────────────────────────

export interface ClaimType {
  id: string;
  name: string;
  description: string;
  isProjectBased: boolean;
}

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
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [claimTypes, setClaimTypes] = useState<ClaimType[]>([]);
  const [orgLevels, setOrgLevels] = useState<OrgLevelConfig[]>([
    {
      name: "Collegium",
      description: "Executive leadership body overseeing strategy and governance",
    },
    {
      name: "Cluster",
      description: "Operational management level managing related projects and regions",
    },
    { name: "Crew", description: "Execution-level teams performing project work" },
  ]);

  useEffect(() => {
    fetchLeaveTypes()
      .then((items) =>
        setLeaveTypes(
          items.map((t) => ({
            ...t,
            approvalsRequired: t.approvalsRequired === 2 ? 2 : 1,
            gender:
              t.gender === "male" || t.gender === "female" || t.gender === "all"
                ? (t.gender as LeaveGender)
                : "all",
          })),
        ),
      )
      .catch(console.error);
    fetchClaimTypes().then(setClaimTypes).catch(console.error);
  }, []);

  return (
    <HRConfigContext.Provider
      value={{ leaveTypes, setLeaveTypes, claimTypes, setClaimTypes, orgLevels, setOrgLevels }}
    >
      {children}
    </HRConfigContext.Provider>
  );
}

export function useHRConfig() {
  const ctx = useContext(HRConfigContext);
  if (!ctx) throw new Error("useHRConfig must be used within HRConfigProvider");
  return ctx;
}
