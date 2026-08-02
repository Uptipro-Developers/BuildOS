// Construction module shared utilities, configuration defaults, and reference
// catalogues.
//
// Business records (projects, vendors, tasks, daily reports, issues, change
// requests, etc.) are NO LONGER hard-coded here — every page fetches them from
// the backend API. The arrays below remain as typed, EMPTY defaults so existing
// imports keep resolving and pages render clean empty states until real data
// loads. `getProjectById` reads the live project store that the project pages
// populate after fetching from the backend.
import {
  formatCurrencyByGeneralSettings,
  formatDateByGeneralSettings,
} from "../../utils/generalSettings";
import type {
  Project,
  Task,
  Vendor,
  DailyReport,
  Issue,
  ChangeRequest,
  Delay,
  DocumentFolder,
  DocumentFile,
  Stakeholder,
  QualityNCR,
  HSEMatrix,
  ProjectBaseline,
  ProjectCalendar,
  EarnedValueData,
  ResourceAllocation,
  ProjectSetupData,
  Sector,
  HumanResource,
  MaterialResource,
  EquipmentResource,
  ResourceAssignment,
  DailyExpense,
  CommunicationLogEntry,
  Disbursement,
  FundingAllocation,
  FundingRelease,
  ScheduleLevelConfig,
  WeatherConfig,
} from "./types";
import { getCachedProject } from "./projectStore";

// ── Business records (backend-sourced; empty defaults) ──────────────────────
export const projects: Project[] = [];
export const vendors: Vendor[] = [];
export const tasks: Task[] = [];
export const dailyReports: DailyReport[] = [];
export const issues: Issue[] = [];
export const changeRequests: ChangeRequest[] = [];
export const delays: Delay[] = [];
export const documentFolders: DocumentFolder[] = [];
export const documentFiles: DocumentFile[] = [];
export const stakeholders: Stakeholder[] = [];
export const qualityNCRs: QualityNCR[] = [];
export const hseMatrix: HSEMatrix[] = [];
export const baselines: ProjectBaseline[] = [];
export const calendars: ProjectCalendar[] = [];
export const earnedValueHistory: EarnedValueData[] = [];
export const resourceAllocations: ResourceAllocation[] = [];
export const setupProgress: Record<string, ProjectSetupData> = {};
export const hrEmployees: ProjectEmployee[] = [];
export const humanResources: HumanResource[] = [];
export const materialResources: MaterialResource[] = [];
export const equipmentResources: EquipmentResource[] = [];
export const resourceAssignments: ResourceAssignment[] = [];
export const dailyExpenses: DailyExpense[] = [];
export const communicationLog: CommunicationLogEntry[] = [];
export const fundingAllocations: FundingAllocation[] = [];
export const fundingReleases: FundingRelease[] = [];
export const disbursements: Disbursement[] = [];
export const stubMaterials: MaterialResource[] = [];
export const stubEquipment: EquipmentResource[] = [];
export const clusters: string[] = [];
export const staffList: string[] = [];

export interface ProjectEmployee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  status: string;
  dailyRate: number;
  employmentType: string;
}

// ── Reference catalogues & configuration defaults (ship-with defaults) ──────
export const tradeTypes = [
  "Masonry",
  "Concreting labor",
  "Carpentry (formwork)",
  "Carpentry (roofing)",
  "Iron benders / steel fixers",
  "Tiling",
  "Plumbing",
  "Electrical",
  "Painting",
  "Glazing / aluminum works",
  "General operations / laboring",
  "Equipment operation",
  "Scaffolding",
  "Welding",
];

// ── Schedule Level Config (default) ─────────────
export const defaultScheduleLevels: ScheduleLevelConfig[] = [
  { level: 1, name: "Stage / Phase", prefix: "ST", canAssignResources: true, parentLevel: null },
  { level: 2, name: "Summary Task", prefix: "SM", canAssignResources: true, parentLevel: 1 },
  { level: 3, name: "Sub-summary Task", prefix: "SS", canAssignResources: true, parentLevel: 2 },
  { level: 4, name: "Work Package", prefix: "WP", canAssignResources: true, parentLevel: 3 },
];

// ── Weather Config (default) ────────────────────
export const defaultWeatherConfig: WeatherConfig[] = [
  { value: "Sunny", label: "Sunny", enabled: true },
  { value: "Cloudy", label: "Cloudy", enabled: true },
  { value: "Drizzle", label: "Drizzle", enabled: true },
  { value: "Rainy", label: "Rainy", enabled: true },
];

// ── Default Project Types (for settings) ────────
export const defaultProjectTypes = [
  {
    sector: "Building & Construction" as Sector,
    categories: [
      "Residential (single dwelling)",
      "Residential (multi-unit / estate)",
      "Commercial (office building)",
      "Commercial (retail / shopping)",
      "Mixed-use development",
      "Institutional (school, hospital, church, government)",
      "Industrial (warehouse, factory)",
      "Hospitality (hotel, shortlet, event centre)",
    ],
  },
  {
    sector: "Civil & Infrastructure" as Sector,
    categories: [
      "Road construction",
      "Bridge",
      "Drainage & stormwater",
      "Borehole & water supply",
      "Fencing & external works",
    ],
  },
  {
    sector: "Industrial & Facilities" as Sector,
    categories: ["Factory fit-out", "Warehouse construction", "Plant installation"],
  },
  {
    sector: "Interior & Fit-out" as Sector,
    categories: [
      "Office fit-out",
      "Residential interior",
      "Retail fit-out",
      "Shortlet apartment fit-out",
    ],
  },
  {
    sector: "Renovation & Maintenance" as Sector,
    categories: [
      "Full renovation (structural)",
      "Cosmetic renovation (finishing only)",
      "Planned maintenance",
      "Emergency repair",
    ],
  },
  { sector: "Other" as Sector, categories: ["Other"] },
];

// ── Inventory Catalogues (for project resource dropdowns) ────────
export interface InventoryMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  defaultUnitCost: number;
  inStock: number;
}

export interface InventoryEquipment {
  id: string;
  name: string;
  category: string;
  defaultInternalCostPerDay: number;
  status: string;
}
export function getProjectById(id: string): Project | undefined {
  return getCachedProject(id);
}

export function getTasksByProject(projectId: string): Task[] {
  return tasks.filter((t) => t.projectId === projectId);
}

export function getVendorsByProject(projectId: string): Vendor[] {
  return vendors.filter((v) => v.projectId === projectId);
}

export function getReportsByProject(projectId: string): DailyReport[] {
  return dailyReports.filter((r) => r.projectId === projectId);
}

export function getIssuesByProject(projectId: string): Issue[] {
  return issues.filter((i) => i.projectId === projectId);
}

export function getChildTasks(parentId: string): Task[] {
  return tasks.filter((t) => t.parentTaskId === parentId);
}

// ── Formatters ──────────────────────────────────────────────────────────────
export function fmtCurrency(n: number): string {
  return formatCurrencyByGeneralSettings(n);
}

export function fmtDate(d: string): string {
  return formatDateByGeneralSettings(d);
}

export function pctCompleteColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-orange-500";
}

export function ragColor(rag: string): string {
  switch (rag) {
    case "on-track":
      return "bg-green-500";
    case "at-risk":
      return "bg-amber-500";
    case "delayed":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

export function ragText(rag: string): string {
  switch (rag) {
    case "on-track":
      return "text-green-700";
    case "at-risk":
      return "text-amber-700";
    case "delayed":
      return "text-red-700";
    default:
      return "text-gray-700";
  }
}

export function ragBg(rag: string): string {
  switch (rag) {
    case "on-track":
      return "bg-green-100";
    case "at-risk":
      return "bg-amber-100";
    case "delayed":
      return "bg-red-100";
    default:
      return "bg-gray-100";
  }
}

export function ragLabel(rag: string): string {
  switch (rag) {
    case "on-track":
      return "On Track";
    case "at-risk":
      return "At Risk";
    case "delayed":
      return "Delayed";
    default:
      return rag;
  }
}
