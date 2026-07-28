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

export const materialInventory: InventoryMaterial[] = [
  { id: "INV-MAT-001", name: "Cement (Grade 42.5)", category: "Concrete", unit: "bags", defaultUnitCost: 5500, inStock: 2000 },
  { id: "INV-MAT-002", name: "Reinforcement Steel (16mm)", category: "Reinforcement", unit: "tonnes", defaultUnitCost: 850000, inStock: 45 },
  { id: "INV-MAT-003", name: "Sharp Sand", category: "Aggregates", unit: "tonnes", defaultUnitCost: 12000, inStock: 300 },
  { id: "INV-MAT-004", name: "Granite (3/4 inch)", category: "Aggregates", unit: "tonnes", defaultUnitCost: 18000, inStock: 200 },
  { id: "INV-MAT-005", name: "PVC Pipes (4 inch)", category: "Plumbing", unit: "pieces", defaultUnitCost: 4500, inStock: 150 },
  { id: "INV-MAT-006", name: "PVC Pipes (2 inch)", category: "Plumbing", unit: "pieces", defaultUnitCost: 2800, inStock: 300 },
  { id: "INV-MAT-007", name: "Electrical Cable (2.5mm)", category: "Electrical", unit: "rolls", defaultUnitCost: 85000, inStock: 20 },
  { id: "INV-MAT-008", name: "Electrical Cable (4mm)", category: "Electrical", unit: "rolls", defaultUnitCost: 120000, inStock: 15 },
  { id: "INV-MAT-009", name: "Paint (Emulsion, 20L)", category: "Paint & Coatings", unit: "pails", defaultUnitCost: 45000, inStock: 40 },
  { id: "INV-MAT-010", name: "Paint (Gloss, 4L)", category: "Paint & Coatings", unit: "litres", defaultUnitCost: 8500, inStock: 60 },
  { id: "INV-MAT-011", name: "Ceramic Tiles (600x600mm)", category: "Finishing", unit: "m²", defaultUnitCost: 8500, inStock: 500 },
  { id: "INV-MAT-012", name: "Waterproof Membrane", category: "Waterproofing", unit: "rolls", defaultUnitCost: 65000, inStock: 25 },
  { id: "INV-MAT-013", name: "Plywood (12mm)", category: "Lumber / Formwork", unit: "sheets", defaultUnitCost: 9500, inStock: 200 },
  { id: "INV-MAT-014", name: "Plywood (18mm)", category: "Lumber / Formwork", unit: "sheets", defaultUnitCost: 12500, inStock: 150 },
  { id: "INV-MAT-015", name: "Nails (3 inch)", category: "Hardware", unit: "kg", defaultUnitCost: 1200, inStock: 80 },
];

export const equipmentInventory: InventoryEquipment[] = [
  { id: "INV-EQ-001", name: "Excavator (20 ton)", category: "Earthwork", defaultInternalCostPerDay: 120000, status: "Available" },
  { id: "INV-EQ-002", name: "Excavator (30 ton)", category: "Earthwork", defaultInternalCostPerDay: 160000, status: "Available" },
  { id: "INV-EQ-003", name: "Bulldozer D6", category: "Earthwork", defaultInternalCostPerDay: 180000, status: "Assigned" },
  { id: "INV-EQ-004", name: "Concrete Mixer (1m³)", category: "Concreting", defaultInternalCostPerDay: 45000, status: "Available" },
  { id: "INV-EQ-005", name: "Concrete Pump", category: "Concreting", defaultInternalCostPerDay: 95000, status: "Available" },
  { id: "INV-EQ-006", name: "Vibratory Roller", category: "Compaction", defaultInternalCostPerDay: 80000, status: "Available" },
  { id: "INV-EQ-007", name: "Tower Crane (50m)", category: "Lifting", defaultInternalCostPerDay: 250000, status: "Assigned" },
  { id: "INV-EQ-008", name: "Mobile Crane (25 ton)", category: "Lifting", defaultInternalCostPerDay: 180000, status: "Available" },
  { id: "INV-EQ-009", name: "Generator (100 KVA)", category: "Generators / Power", defaultInternalCostPerDay: 35000, status: "Available" },
  { id: "INV-EQ-010", name: "Generator (250 KVA)", category: "Generators / Power", defaultInternalCostPerDay: 65000, status: "Under Maintenance" },
  { id: "INV-EQ-011", name: "Water Pump (3 inch)", category: "Pumping", defaultInternalCostPerDay: 15000, status: "Available" },
  { id: "INV-EQ-012", name: "Dump Truck (20 ton)", category: "Transport", defaultInternalCostPerDay: 75000, status: "Available" },
  { id: "INV-EQ-013", name: "Forklift (3 ton)", category: "Transport", defaultInternalCostPerDay: 55000, status: "Available" },
  { id: "INV-EQ-014", name: "Pile Driver", category: "Piling", defaultInternalCostPerDay: 200000, status: "Available" },
  { id: "INV-EQ-015", name: "Safety Scaffolding Set", category: "Safety", defaultInternalCostPerDay: 8000, status: "Available" },
];

// ── Lookup helpers ──────────────────────────────────────────────────────────
// The current project is read from the live project store (populated by the
// project list/detail pages after fetching). The other helpers filter over the
// (now empty) arrays; pages fetch their own project-scoped data from the API.
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
