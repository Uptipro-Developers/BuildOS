export type ProjectStatus = "Active" | "On Hold" | "Completed" | "Cancelled";
export type RAGStatus = "on-track" | "at-risk" | "delayed";
export type ContractType = "Lump Sum" | "Remeasurable" | "Cost Plus";
export type ContractingModel = "developer" | "contractor" | "gc";
export type Weather = "Sunny" | "Cloudy" | "Drizzle" | "Rainy";

export type Sector =
  | "Building & Construction"
  | "Civil & Infrastructure"
  | "Industrial & Facilities"
  | "Interior & Fit-out"
  | "Renovation & Maintenance"
  | "Other";

export const SECTOR_CATEGORIES: Record<Sector, string[]> = {
  "Building & Construction": [
    "Residential (single dwelling)",
    "Residential (multi-unit / estate)",
    "Commercial (office building)",
    "Commercial (retail / shopping)",
    "Mixed-use development",
    "Institutional (school, hospital, church, government)",
    "Industrial (warehouse, factory)",
    "Hospitality (hotel, shortlet, event centre)",
  ],
  "Civil & Infrastructure": [
    "Road construction",
    "Bridge",
    "Drainage & stormwater",
    "Borehole & water supply",
    "Fencing & external works",
  ],
  "Industrial & Facilities": [
    "Factory fit-out",
    "Warehouse construction",
    "Plant installation",
  ],
  "Interior & Fit-out": [
    "Office fit-out",
    "Residential interior",
    "Retail fit-out",
    "Shortlet apartment fit-out",
  ],
  "Renovation & Maintenance": [
    "Full renovation (structural)",
    "Cosmetic renovation (finishing only)",
    "Planned maintenance",
    "Emergency repair",
  ],
  "Other": ["Other"],
};

export function getBlockLabel(sector: Sector | string, category: string): string {
  if (!sector) return "Blocks / Units";
  if (category.includes("multi-unit") || category.includes("estate")) return "Units";
  if (category.includes("single dwelling")) return "Blocks";
  if (sector === "Building & Construction") return "Blocks";
  if (sector === "Civil & Infrastructure") return "Sections / Zones";
  if (sector === "Interior & Fit-out") return "Units";
  if (sector === "Renovation & Maintenance") return "Sections";
  return "Blocks / Units";
}

// ── WBS Level Definition (configurable) ─────────────────────
export interface WBSLevelDefinition {
  id: string;
  name: string;
  prefix: string;
  position: number;
  parentLevelId: string | null;
  canAssignResources: boolean;
  canHaveChildren: boolean;
}

export const DEFAULT_WBS_LEVELS: WBSLevelDefinition[] = [
  { id: "lvl-1", name: "Stage / Phase", prefix: "ST", position: 1, parentLevelId: null, canAssignResources: true, canHaveChildren: true },
  { id: "lvl-2", name: "Summary Task", prefix: "SM", position: 2, parentLevelId: "lvl-1", canAssignResources: true, canHaveChildren: true },
  { id: "lvl-3", name: "Sub-summary Task", prefix: "SS", position: 3, parentLevelId: "lvl-2", canAssignResources: true, canHaveChildren: true },
  { id: "lvl-4", name: "Work Package", prefix: "WP", position: 4, parentLevelId: "lvl-3", canAssignResources: true, canHaveChildren: false },
];

export interface Project {
  id: string;
  name: string;
  siteAddress: string;
  client: string;
  projectManager: string;
  mainContractor: string;
  mainContractorId?: string;
  contractType: ContractType;
  plannedStartDate: string;
  plannedEndDate: string;
  description: string;
  blockCount?: number;
  clusterId: string;
  status: ProjectStatus;
  ragStatus: RAGStatus;
  budget: number;
  spent: number;
  location: string;
  createdAt: string;
  lastReportDate?: string;
  setupComplete?: boolean;
  setupProgress?: number;
  sector?: Sector;
  category?: string;
  descriptor?: string;
  structure?: ProjectStructureItem[];
  contractingModel?: ContractingModel;
  // Setup lock/unlock
  setupLocked?: boolean;
  setupAuditLog?: SetupAuditLog[];
  // Daily reporting config
  dailyReportingConfig?: DailyReportingConfig;
  // Recurring tasks
  recurringReportTasks?: RecurringReportTask[];
  // Project roles
  projectRoles?: ProjectRole[];
  humanResourceRoles?: HumanResourceRole[];
}

export interface Task {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  level: number;
  wbsLevelId?: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  plannedDuration: number;
  actualDuration: number | null;
  percentComplete: number;
  predecessorId: string | null;
  dependencyType: "FS" | "FF" | "SS" | "SF" | null;
  lagDays: number;
  vendorId: string | null;
  subVendorIds?: string[];
  structureEntryId?: string;
  ragStatus: RAGStatus;
  ragOverride: boolean;
  notes: string;
  expanded?: boolean;
  isMilestone?: boolean;
  wbsNumber?: string;
  totalFloat?: number;
  freeFloat?: number;
  isCritical?: boolean;
  baselinePlannedStart?: string;
  baselinePlannedEnd?: string;
}

export interface Vendor {
  id: string;
  projectId: string;
  name: string;
  trade: string;
  contractType: "Labor-only" | "Supply & Install" | "Nominated Subcontractor";
  isNominated: boolean;
  contractSum: number;
  assignedWorkPackages: string[];
  blockAssignment: string;
  skilledCount: number;
  unskilledCount: number;
  mandaysEstimate: number;
  status: "Awarded" | "Active" | "Completed" | "Terminated";
  // Rate benchmarking
  skilledDays?: number;
  skilledRate?: number;
  unskilledDays?: number;
  unskilledRate?: number;
  vendorMargin?: number;
  // Organization model (items 43-44)
  isMainContractor?: boolean;
  subcontractorIds?: string[];
  parentContractorId?: string;
  representatives?: VendorRepresentative[];
}

export interface VendorRepresentative {
  id: string;
  vendorId: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  isActive: boolean;
  isReviewer?: boolean;
}

export interface ProjectRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export const DAILY_REPORT_SECTIONS = [
  { key: "daily-manpower", label: "Manpower", description: "Labour & workforce tracking" },
  { key: "daily-equipment", label: "Equipment", description: "Equipment usage & maintenance" },
  { key: "daily-materials", label: "Materials", description: "Material stock & usage" },
  { key: "daily-scope", label: "Scope & Delivery", description: "Work progress & deliverables" },
  { key: "daily-expenses", label: "Expenses", description: "Daily expenditure tracking" },
  { key: "daily-communications", label: "Communications", description: "Communication log entries" },
] as const;

export const ALL_PERMISSIONS = [
  { key: "daily-all", label: "All Daily Reports", description: "Full access to all daily report sections", group: "Daily Reports" },
  { key: "daily-read", label: "Read Only", description: "View-only access to all daily report sections", group: "Daily Reports" },
  ...DAILY_REPORT_SECTIONS.map(s => ({ key: s.key, label: s.label, description: s.description, group: "Daily Reports" as const })),
  { key: "setup-all", label: "Full Setup Access", description: "Full access to project setup", group: "Project Setup" },
  { key: "setup-read", label: "Setup Read Only", description: "View project setup configuration", group: "Project Setup" },
  { key: "finance-all", label: "Full Finance Access", description: "Full access to project finances", group: "Finance" },
] as const;

export const DEFAULT_PROJECT_ROLES: ProjectRole[] = [
  { id: "role-pm",  name: "Project Manager (PM)",       description: "Overall project leadership",                    permissions: ["daily-all", "setup-all", "finance-all"] },
  { id: "role-apm", name: "Assistant Project Manager",  description: "Support PM in execution",                      permissions: ["daily-all", "setup-read"] },
  { id: "role-ss",  name: "Site Supervisor",             description: "Day-to-day site supervision",                  permissions: ["daily-manpower", "daily-scope", "daily-equipment"] },
  { id: "role-hse", name: "HSE Officer",                 description: "Health, safety & environment",                permissions: ["daily-equipment"] },
  { id: "role-qa",  name: "Quality Assurance Officer",   description: "Quality control & inspections",               permissions: ["daily-scope"] },
  { id: "role-qs",  name: "Quantity Surveyor",           description: "Cost & measurement",                         permissions: ["daily-materials", "daily-expenses"] },
  { id: "role-se",  name: "Site Engineer",               description: "Technical execution",                        permissions: ["daily-scope", "daily-materials"] },
  { id: "role-pe",  name: "Planning Engineer",           description: "Schedule & planning",                        permissions: ["daily-scope"] },
  { id: "role-pc",  name: "Procurement Coordinator",     description: "Material procurement",                       permissions: ["daily-materials"] },
  { id: "role-dc",  name: "Document Controller",         description: "Document management",                        permissions: ["daily-read"] },
  { id: "role-cr",  name: "Contractor Representative",   description: "Contractor site representative",             permissions: ["daily-manpower", "daily-scope"] },
  { id: "role-cl",  name: "Client Representative",       description: "Client-side oversight",                      permissions: ["daily-read"] },
];

export interface HumanResourceRole {
  humanResourceId: string;
  projectRoleId: string;
}

export type DailyReportContributorMode = "employees-only" | "contractors-only" | "both";

export interface DailyReportingConfig {
  contributorMode: DailyReportContributorMode;
  assignedEmployeeIds: string[];
  assignedContractorRepIds: string[];
}

export interface RecurringReportTask {
  id: string;
  projectId: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly" | "custom";
  customIntervalDays?: number;
  assignedTo: string; // employeeId or contractorRepId
  lastGenerated: string | null;
  nextDue: string;
  isActive: boolean;
  sections: string[];
}

export interface SetupAuditLog {
  id: string;
  projectId: string;
  action: "locked" | "unlocked";
  performedBy: string;
  performedAt: string;
  reason: string;
}

export interface DailyReport {
  id: string;
  projectId: string;
  reportDate: string;
  weather: Weather;
  submittedBy: string;
  submittedAt: string;
  status: "draft" | "pending-review" | "submitted";
  unlockedBy: string | null;
  unlockReason: string | null;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  manpower: DailyManpower[];
  equipment: DailyEquipment[];
  materials: DailyMaterial[];
  scope: DailyScope[];
  expenses: DailyExpense[];
  communicationLog: CommunicationLogEntry[];
}

export interface DailyManpower {
  id: string;
  vendorId: string;
  vendorName: string;
  trade: string;
  block: string;
  summaryTaskId: string;
  workPackageId: string;
  skilledCount: number;
  unskilledCount: number;
  mandays: number;
  outputDescription: string;
  outputUnit: string;
  comments: string;
}

export interface DailyEquipment {
  id: string;
  category: string;
  equipmentType: string;
  ownership: "Company-owned" | "Hired" | "Client-supplied";
  makeModel: string;
  tagNumber: string;
  inUse: boolean;
  maintenanceStatus: "Usable" | "Under Repair" | "Unusable";
  maintenanceRequired: boolean;
  activity: string;
  comments: string;
}

export interface DailyMaterial {
  id: string;
  category: string;
  materialType: string;
  unit: string;
  openingStock: number;
  receivedQty: number;
  issuedQty: number;
  closingStock: number;
  reorderLevel: number;
  requestedBy: string;
  taskId: string;
  varianceReason: string;
}

export interface DailyScope {
  id: string;
  taskId: string;
  yesterdayPlanned: string;
  yesterdayActual: string;
  todayPlanned: string;
  todayActual: string;
  pctPlanned: number;
  pctActual: number;
  varianceExplanation: string;
}

export interface Issue {
  id: string;
  projectId: string;
  issueNumber: string;
  dateRaised: string;
  raisedBy: string;
  title: string;
  description: string;
  taskId: string;
  impactTypes: string[];
  rootCause: string;
  targetDate: string;
  actions: string;
  ownerId: string;
  status: "Open" | "Under Investigation" | "In Progress" | "Escalated" | "Resolved" | "Closed";
  resolutionNotes: string;
  closedAt: string | null;
}

export interface ChangeRequest {
  id: string;
  projectId: string;
  crNumber: string;
  dateRaised: string;
  raisedBy: string;
  changeTypes: string[];
  description: string;
  reason: string;
  summaryTaskId: string;
  taskId: string;
  scopeImpact: string;
  scheduleImpactDays: number;
  costImpact: number;
  qualityImpact: string;
  stakeholderImpact: string;
  recommendedAction: string;
  status: "Proposed" | "Under Review" | "Approved" | "Rejected" | "Implemented" | "Closed";
  approverId: string | null;
  approvedAt: string | null;
  approvalNotes: string;
}

export interface Delay {
  id: string;
  projectId: string;
  taskId: string;
  taskName: string;
  stagePhase: string;
  plannedEndDate: string;
  daysDelayed: number;
  rootCause: string;
  recoveryPlan: string;
  recoveryActions: string;
  ownerId: string;
  revisedEndDate: string;
  status: "Open" | "Recovery Underway" | "Resolved";
}

export interface DocumentFolder {
  id: string;
  projectId: string;
  parentFolderId: string | null;
  name: string;
  createdBy: string;
}

export interface DocumentFile {
  id: string;
  folderId: string;
  projectId: string;
  name: string;
  fileUrl: string;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Stakeholder {
  id: string;
  projectId: string;
  name: string;
  organization: string;
  role: string;
  email?: string;
  phone?: string;
  influenceLevel: "High" | "Medium" | "Low";
  impactLevel: "High" | "Medium" | "Low";
  notes: string;
}

export interface StakeholderCommPlan {
  id: string;
  stakeholderId: string;
  commType: string;
  frequency: string;
  responsibleId: string;
  method: string;
}

export interface StakeholderEngagementLog {
  id: string;
  stakeholderId: string;
  date: string;
  commType: string;
  summary: string;
  outcome: string;
  followupAction: string;
  followupOwnerId: string;
}

export interface VisitorLog {
  id: string;
  projectId: string;
  date: string;
  visitorName: string;
  organization: string;
  purpose: string;
  accompaniedById: string;
}

export interface ProjectBaseline {
  id: string;
  projectId: string;
  version: 1 | 2 | 3;
  label: string;
  lockedAt: string;
  lockedBy: string;
  taskSnapshots: { taskId: string; plannedStart: string; plannedEnd: string }[];
}

export interface ProjectCalendar {
  id: string;
  projectId: string;
  workingDays: number[]; // 0=Sun, 1=Mon ... 6=Sat
  workingHoursStart: string; // e.g. "08:00"
  workingHoursEnd: string; // e.g. "17:00"
  holidays: { date: string; label: string }[];
  shutdowns: { start: string; end: string; label: string }[];
}

export interface EarnedValueData {
  period: string;
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
}

export interface ResourceAllocation {
  vendorId: string;
  weekStart: string;
  plannedMandays: number;
  actualMandays: number;
  capacity: number;
  isOverloaded: boolean;
}

export interface SetupStep {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
}

export function generateWBS(task: Task, parentWbs: string | null): string {
  if (task.level === 1) return String(parseInt(task.id.replace(/\D/g, ""), 10));
  const p = parentWbs ? `${parentWbs}.` : "";
  return `${p}${parseInt(task.id.replace(/\D/g, ""), 10)}`;
}

export function calcFloat(tasks: Task[]): Task[] {
  const updated = tasks.map(t => ({ ...t, totalFloat: 0, freeFloat: 0, isCritical: false }));
  const l4 = updated.filter(t => t.level === 4);
  const byId = new Map(updated.map(t => [t.id, t]));
  const successors = new Map<string, string[]>();
  l4.forEach(t => { if (t.predecessorId) { const arr = successors.get(t.predecessorId) || []; arr.push(t.id); successors.set(t.predecessorId, arr); } });

  // Forward pass
  const ef = new Map<string, number>();
  l4.sort((a, b) => new Date(a.plannedStart).getTime() - new Date(b.plannedStart).getTime());
  l4.forEach(t => {
    let es = new Date(t.plannedStart).getTime();
    if (t.predecessorId && ef.has(t.predecessorId)) {
      const pred = byId.get(t.predecessorId);
      let lag = t.lagDays || 0;
      if (t.dependencyType === "FS") es = ef.get(t.predecessorId)! + lag * 86400000;
      else if (t.dependencyType === "SS") es = new Date(pred!.plannedStart).getTime() + lag * 86400000;
      else if (t.dependencyType === "FF") es = ef.get(t.predecessorId)! - t.plannedDuration * 86400000 + lag * 86400000;
      else if (t.dependencyType === "SF") es = new Date(pred!.plannedStart).getTime() - t.plannedDuration * 86400000 + lag * 86400000;
    }
    ef.set(t.id, es + t.plannedDuration * 86400000);
  });

  // Backward pass
  const projectEnd = Math.max(...Array.from(ef.values()), 0);
  const lf = new Map<string, number>();
  const ls = new Map<string, number>();
  l4.reverse().forEach(t => {
    const succs = successors.get(t.id) || [];
    let lft = succs.length > 0 ? Math.min(...succs.map(s => ls.get(s) || projectEnd)) : projectEnd;
    lf.set(t.id, lft);
    ls.set(t.id, lft - t.plannedDuration * 86400000);
  });

  l4.forEach(t => {
    const lft = lf.get(t.id) || projectEnd;
    const eft = ef.get(t.id) || projectEnd;
    const idx = updated.findIndex(u => u.id === t.id);
    if (idx >= 0) {
      updated[idx].totalFloat = Math.round((lft - eft) / 86400000);
      updated[idx].freeFloat = Math.round(((successors.get(t.id) || []).length > 0 ? Math.min(...(successors.get(t.id) || []).map(s => new Date(byId.get(s)?.plannedStart || "").getTime())) - eft : 0) / 86400000);
      updated[idx].isCritical = (updated[idx].totalFloat || 0) <= 0;
    }
  });
  return updated;
}

export function calcEarnedValue(tasks: Task[], budget: number, spent: number): { pv: number; ev: number; ac: number; sv: number; cv: number; spi: number; cpi: number; eac: number; vac: number } {
  const ev = tasks.filter(t => t.level === 4).reduce((s, t) => s + (t.percentComplete / 100) * (budget / (tasks.filter(x => x.level === 4).length || 1)), 0);
  const pv = (new Date().getTime() - new Date(tasks[0]?.plannedStart || "").getTime()) / (new Date(tasks[tasks.length - 1]?.plannedEnd || "").getTime() - new Date(tasks[0]?.plannedStart || "").getTime() || 1) * budget;
  const ac = spent;
  const sv = ev - pv;
  const cv = ev - ac;
  const spi = pv > 0 ? ev / pv : 0;
  const cpi = ac > 0 ? ev / ac : 0;
  const eac = cpi > 0 ? budget / cpi : budget;
  const vac = budget - eac;
  return { pv: Math.round(pv), ev: Math.round(ev), ac, sv: Math.round(sv), cv: Math.round(cv), spi: Math.round(spi * 100) / 100, cpi: Math.round(cpi * 100) / 100, eac: Math.round(eac), vac: Math.round(vac) };
}

export interface ProjectSetupData {
  basicInfoDone: boolean;
  scheduleBuilt: boolean;
  vendorsAdded: boolean;
  calendarConfigured: boolean;
  baselineLocked: boolean;
}

export interface ProjectStructureItem {
  id: string;
  name: string;
  type: string;
  level: number;
  parentId: string | null;
  attributes: Record<string, string | number>;
}

export interface StructureField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
}

export interface StructureSection {
  label: string;
  fields: StructureField[];
}

export interface CategoryStructureConfig {
  subUnitLabel: string;
  subUnitFields: StructureField[];
  subUnitItemLabel: string;
  innerUnitLabel: string;
  innerFields: StructureField[];
}

const structureConfigs: Record<string, CategoryStructureConfig> = {
  "Residential (multi-unit / estate)": {
    subUnitLabel: "Building",
    subUnitItemLabel: "Building Name",
    subUnitFields: [],
    innerUnitLabel: "Floor",
    innerFields: [
      { key: "unitsPerFloor", label: "Units per Floor", type: "number" },
      { key: "unitType", label: "Unit Type", type: "select", options: ["Studio", "1-Bedroom", "2-Bedroom", "3-Bedroom", "4-Bedroom", "Duplex", "Penthouse"] },
    ],
  },
  "Residential (single dwelling)": {
    subUnitLabel: "Building",
    subUnitItemLabel: "Building Name",
    subUnitFields: [],
    innerUnitLabel: "Room",
    innerFields: [
      { key: "roomCount", label: "Number of Rooms", type: "number" },
      { key: "roomType", label: "Room Type", type: "select", options: ["1-Bedroom", "2-Bedroom", "3-Bedroom", "4-Bedroom", "Studio", "Living Room", "Dining", "Kitchen"] },
    ],
  },
  "Commercial (office building)": {
    subUnitLabel: "Floor",
    subUnitItemLabel: "Floor Level",
    subUnitFields: [{ key: "label", label: "Floor Label", type: "text" }],
    innerUnitLabel: "Office Unit",
    innerFields: [
      { key: "unitCount", label: "Number of Units", type: "number" },
      { key: "unitType", label: "Unit Type", type: "select", options: ["Open Plan", "Cubicle", "Private Office", "Meeting Room"] },
    ],
  },
  "Commercial (retail / shopping)": {
    subUnitLabel: "Floor",
    subUnitItemLabel: "Floor Level",
    subUnitFields: [{ key: "label", label: "Floor Label", type: "text" }],
    innerUnitLabel: "Shop Unit",
    innerFields: [
      { key: "unitCount", label: "Number of Shops", type: "number" },
    ],
  },
  "Mixed-use development": {
    subUnitLabel: "Block",
    subUnitItemLabel: "Block Name",
    subUnitFields: [],
    innerUnitLabel: "Floor",
    innerFields: [
      { key: "unitsPerFloor", label: "Units per Floor", type: "number" },
      { key: "unitType", label: "Unit Type", type: "select", options: ["Residential", "Commercial", "Retail", "Office", "Parking"] },
    ],
  },
  "Institutional (school, hospital, church, government)": {
    subUnitLabel: "Building",
    subUnitItemLabel: "Building Name",
    subUnitFields: [],
    innerUnitLabel: "Floor",
    innerFields: [
      { key: "roomsPerFloor", label: "Rooms per Floor", type: "number" },
      { key: "function", label: "Function", type: "select", options: ["Classroom", "Laboratory", "Office", "Ward", "Lecture Hall", "Library", "Administration", "Worship Hall", "Auditorium"] },
    ],
  },
  "Industrial (warehouse, factory)": {
    subUnitLabel: "Section",
    subUnitItemLabel: "Section Name",
    subUnitFields: [{ key: "area", label: "Area (sqm)", type: "number" }],
    innerUnitLabel: "Bay",
    innerFields: [
      { key: "bayCount", label: "Number of Bays", type: "number" },
    ],
  },
  "Hospitality (hotel, shortlet, event centre)": {
    subUnitLabel: "Building",
    subUnitItemLabel: "Building Name",
    subUnitFields: [],
    innerUnitLabel: "Room",
    innerFields: [
      { key: "roomsPerFloor", label: "Rooms per Floor", type: "number" },
      { key: "roomType", label: "Room Type", type: "select", options: ["Standard", "Deluxe", "Suite", "Presidential", "Conference Room", "Event Hall"] },
    ],
  },
  "Road construction": {
    subUnitLabel: "Section",
    subUnitItemLabel: "Section Name",
    subUnitFields: [{ key: "lengthKm", label: "Length (km)", type: "number" }],
    innerUnitLabel: "Segment",
    innerFields: [
      { key: "segmentCount", label: "Number of Segments", type: "number" },
    ],
  },
  "Bridge": {
    subUnitLabel: "Span",
    subUnitItemLabel: "Span Name",
    subUnitFields: [{ key: "length", label: "Length (m)", type: "number" }],
    innerUnitLabel: "Deck Section",
    innerFields: [
      { key: "deckCount", label: "Number of Deck Sections", type: "number" },
    ],
  },
  "Drainage & stormwater": {
    subUnitLabel: "Zone",
    subUnitItemLabel: "Zone Name",
    subUnitFields: [{ key: "length", label: "Length (m)", type: "number" }],
    innerUnitLabel: "Segment",
    innerFields: [
      { key: "segmentCount", label: "Segments", type: "number" },
    ],
  },
  "Borehole & water supply": {
    subUnitLabel: "Station",
    subUnitItemLabel: "Station Name",
    subUnitFields: [{ key: "capacity", label: "Capacity (L/hr)", type: "number" }],
    innerUnitLabel: "Line",
    innerFields: [
      { key: "lineCount", label: "Distribution Lines", type: "number" },
    ],
  },
  "Fencing & external works": {
    subUnitLabel: "Section",
    subUnitItemLabel: "Section Name",
    subUnitFields: [{ key: "length", label: "Length (m)", type: "number" }],
    innerUnitLabel: "Segment",
    innerFields: [
      { key: "segmentCount", label: "Segments", type: "number" },
    ],
  },
  "Factory fit-out": {
    subUnitLabel: "Zone",
    subUnitItemLabel: "Zone Name",
    subUnitFields: [{ key: "area", label: "Area (sqm)", type: "number" }],
    innerUnitLabel: "Line",
    innerFields: [
      { key: "productionLines", label: "Production Lines", type: "number" },
    ],
  },
  "Warehouse construction": {
    subUnitLabel: "Bay",
    subUnitItemLabel: "Bay Name",
    subUnitFields: [{ key: "capacity", label: "Capacity (tons)", type: "number" }],
    innerUnitLabel: "Rack",
    innerFields: [
      { key: "rackCount", label: "Rack Count", type: "number" },
    ],
  },
  "Plant installation": {
    subUnitLabel: "Unit",
    subUnitItemLabel: "Unit Name",
    subUnitFields: [{ key: "power", label: "Power Rating (kW)", type: "number" }],
    innerUnitLabel: "Component",
    innerFields: [
      { key: "componentCount", label: "Components", type: "number" },
    ],
  },
  "Office fit-out": {
    subUnitLabel: "Floor",
    subUnitItemLabel: "Floor", subUnitFields: [],
    innerUnitLabel: "Workspace",
    innerFields: [
      { key: "workspaces", label: "Workstations", type: "number" },
    ],
  },
  "Residential interior": {
    subUnitLabel: "Room",
    subUnitItemLabel: "Room Name",
    subUnitFields: [],
    innerUnitLabel: "Finish Area",
    innerFields: [
      { key: "area", label: "Area (sqm)", type: "number" },
    ],
  },
  "Retail fit-out": {
    subUnitLabel: "Floor",
    subUnitItemLabel: "Floor", subUnitFields: [],
    innerUnitLabel: "Section",
    innerFields: [
      { key: "sectionCount", label: "Sections", type: "number" },
    ],
  },
  "Shortlet apartment fit-out": {
    subUnitLabel: "Unit",
    subUnitItemLabel: "Unit Name",
    subUnitFields: [],
    innerUnitLabel: "Room",
    innerFields: [
      { key: "roomCount", label: "Rooms", type: "number" },
      { key: "unitType", label: "Type", type: "select", options: ["Studio", "1-Bedroom", "2-Bedroom", "Penthouse"] },
    ],
  },
  "Full renovation (structural)": {
    subUnitLabel: "Area",
    subUnitItemLabel: "Area Name",
    subUnitFields: [{ key: "area", label: "Area (sqm)", type: "number" }],
    innerUnitLabel: "Scope Item",
    innerFields: [
      { key: "itemCount", label: "Items", type: "number" },
    ],
  },
  "Cosmetic renovation (finishing only)": {
    subUnitLabel: "Room",
    subUnitItemLabel: "Room Name",
    subUnitFields: [{ key: "area", label: "Area (sqm)", type: "number" }],
    innerUnitLabel: "Finish",
    innerFields: [
      { key: "finishCount", label: "Finish Types", type: "number" },
    ],
  },
  "Planned maintenance": {
    subUnitLabel: "Zone",
    subUnitItemLabel: "Zone",
    subUnitFields: [],
    innerUnitLabel: "Task",
    innerFields: [
      { key: "taskCount", label: "Scheduled Tasks", type: "number" },
    ],
  },
  "Emergency repair": {
    subUnitLabel: "Location",
    subUnitItemLabel: "Location",
    subUnitFields: [],
    innerUnitLabel: "Repair Item",
    innerFields: [
      { key: "itemCount", label: "Repair Items", type: "number" },
    ],
  },
  "Other": {
    subUnitLabel: "Section",
    subUnitItemLabel: "Section Name",
    subUnitFields: [],
    innerUnitLabel: "Sub-section",
    innerFields: [
      { key: "count", label: "Count", type: "number" },
    ],
  },
};

export function getStructureConfig(category: string): CategoryStructureConfig | null {
  return structureConfigs[category] ?? null;
}

export interface QualityNCR {
  id: string;
  projectId: string;
  ncrId: string;
  date: string;
  description: string;
  taskId: string;
  raisedBy: string;
  correctiveAction: string;
  responsiblePerson: string;
  targetCloseDate: string;
  status: "Open" | "In Progress" | "Closed";
}

export interface HSEMatrix {
  id: string;
  projectId: string;
  staffMember: string;
  competency: string;
  dateObtained: string;
  expiryDate: string;
  status: "Valid" | "Expiring Soon" | "Expired";
}

// ── Resource types ──────────────────────────────────────────
export type HumanResourceSource = "employee" | "individual-contractor" | "vendor";

export interface HumanResource {
  id: string;
  projectId: string;
  source: HumanResourceSource;
  name: string;
  trade: string;
  contractType?: string;
  isNominated?: boolean;
  contractSum?: number;
  // For individual contractors
  payRate?: number;
  payRateUnit?: "daily" | "weekly" | "monthly" | "lump-sum";
  skilledCount?: number;
  unskilledCount?: number;
  // For vendors
  vendorId?: string;
  vendorMargin?: number;
  // For employees
  employeeId?: string;
  dailyRate?: number;
  // General
  status: "Awarded" | "Active" | "Completed" | "Terminated";
  assignedWorkPackages: string[];
  blockAssignment: string;
  mandaysEstimate: number;
}

export interface MaterialResource {
  id: string;
  projectId: string;
  name: string;
  category: string;
  unit: string;
  estimatedQty: number;
  estimatedUnitCost: number;
  totalEstimatedCost: number;
  procurementSource: "internal" | "purchase";
  supplierId?: string;
}

export interface EquipmentResource {
  id: string;
  projectId: string;
  name: string;
  category: string;
  ownership: "company-owned" | "rented" | "client-supplied";
  // For company-owned
  internalCostPerDay?: number;
  // For rented
  rentalCostPerDay?: number;
  rentalSupplier?: string;
  // General
  estimatedDays: number;
  totalEstimatedCost: number;
  status: "Available" | "Assigned" | "Under Maintenance";
}

export interface ResourceAssignment {
  id: string;
  taskId: string;
  projectId: string;
  resourceType: "human" | "material" | "equipment";
  humanResourceId?: string;
  materialResourceId?: string;
  equipmentResourceId?: string;
  plannedQty: number;
  plannedCost: number;
  actualQty?: number;
  actualCost?: number;
  reportsToAssignmentId?: string;
}

// ── Schedule Level Config ───────────────────────────────────
export interface ScheduleLevelConfig {
  level: number;
  name: string;
  prefix: string;
  canAssignResources: boolean;
  parentLevel?: number | null;
}

// ── Weather Config ──────────────────────────────────────────
export interface WeatherConfig {
  value: Weather;
  label: string;
  enabled: boolean;
}

// ── Construction Settings (persisted) ───────────────────────
export interface ConstructionSetting {
  id?: string;
  scope?: string;
  scheduleLevels: ScheduleLevelConfig[];
  weatherConfig: WeatherConfig[];
  projectTypes: { sector: string; categories: string[] }[];
}

// ── Daily Expense ───────────────────────────────────────────
export interface DailyExpense {
  id: string;
  projectId: string;
  reportId?: string;
  reportDate: string;
  category: "human" | "material" | "equipment" | "other";
  resourceId?: string;
  description: string;
  amount: number;
  paidBy: "project-cash" | "finance-disbursement" | "petty-cash";
  disbursementId?: string;
  receiptRef?: string;
}

// ── Communication Log ───────────────────────────────────────
export interface CommunicationLogEntry {
  id: string;
  projectId: string;
  date: string;
  from: string;
  to: string;
  channel: "email" | "phone" | "meeting" | "letter" | "memorandum" | "other";
  subject: string;
  summary: string;
  followUpDate?: string;
  status: "sent" | "received" | "draft" | "action-required";
  createdBy: string;
  createdAt: string;
}

// ── Disbursement ────────────────────────────────────────────
export interface Disbursement {
  id: string;
  projectId: string;
  taskId?: string;
  amount: number;
  date: string;
  source: "finance" | "project-cash" | "client-direct";
  reference: string;
  notes: string;
  allocatedTo: string[];
}

// ── Project Type Setting ────────────────────────────────────
export interface ProjectTypeSetting {
  sector: Sector;
  categories: string[];
  descriptors?: string[];
}

// ── Funding ─────────────────────────────────────────────────
export interface FundingAllocation {
  id: string;
  projectId: string;
  source: string;
  totalAllocated: number;
  dateAllocated: string;
  reference: string;
  notes: string;
}

export interface FundingRelease {
  id: string;
  allocationId: string;
  projectId: string;
  amount: number;
  dateReleased: string;
  reference: string;
  releasedTo: string;
}

export interface ProjectFundingSummary {
  totalAllocated: number;
  totalReleased: number;
  totalUtilized: number;
  remainingBalance: number;
  allocations: FundingAllocation[];
  releases: FundingRelease[];
}
