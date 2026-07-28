import { useParams } from "react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Calendar,
  Building2,
  Users,
  Layers,
  FileText,
  Package,
  Wrench,
  Plus,
  X,
  Trash2,
  ChevronRight,
  ChevronDown,
  Tags,
  Download,
  Upload,
} from "lucide-react";
import {
  tradeTypes,
  fmtDate,
  defaultScheduleLevels,
} from "./mockData";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
  formatDateTimeByGeneralSettings,
} from "../../utils/generalSettings";
import type {
  Task,
  Vendor,
  VendorRepresentative,
  ProjectCalendar,
  Sector,
  HumanResource,
  HumanResourceSource,
  MaterialResource,
  EquipmentResource,
  ResourceAssignment,
  HumanResourceRole,
} from "./types";
import { useRoles } from "../../contexts/RolesContext";
import {
  SECTOR_CATEGORIES,
  getBlockLabel,
  getStructureConfig,
} from "./types";
import { useResources } from "../../contexts/ResourceContext";
import { SearchableMultiSelect } from "../../components/SearchableMultiSelect";
import { getProject } from "../../api/projects";
import { fetchEmployees } from "../../api/employees";
import { fetchSuppliers } from "../../api/suppliers";
import { getMaterials } from "../../api/materials";
import { getTasks } from "../../api/tasks";
import { getClusters } from "../../api/clusters";
import { getEquipment } from "../../api/equipment";
import {
  getProjectSetup,
  saveProjectSetup,
  lockProjectSetup,
  unlockProjectSetup,
} from "../../api/project-setup";
import { useNumbering } from "../../stores/numberingStore";

const STEPS = [
  { id: "basic", label: "Basic Information", icon: FileText },
  { id: "project-type", label: "Project Type", icon: Tags },
  { id: "human-resources", label: "Human Resources", icon: Users },
  { id: "daily-reporting", label: "Daily Reporting", icon: FileText },
  { id: "materials", label: "Materials", icon: Package },
  { id: "equipment", label: "Equipment", icon: Wrench },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "schedule", label: "Schedule Builder", icon: Layers },
  { id: "summary", label: "Summary", icon: Lock },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0];

const SECTORS: Sector[] = [
  "Building & Construction",
  "Civil & Infrastructure",
  "Industrial & Facilities",
  "Interior & Fit-out",
  "Renovation & Maintenance",
  "Other",
];

const LEVEL_NAMES: Record<number, string> = {};
const LEVEL_PREFIX: Record<number, string> = {};
defaultScheduleLevels.forEach((l) => {
  LEVEL_NAMES[l.level] = l.name;
  LEVEL_PREFIX[l.level] = l.prefix;
});

export function ProjectSetupPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);

  // Reference lookups loaded from the API (replacing mock reference data).
  // tradeTypes stays static intentionally (kept as reference data).
  const [staffList, setStaffList] = useState<string[]>([]);
  const [hrEmployees, setHrEmployees] = useState<any[]>([]);
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [materialInventory, setMaterialInventory] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);
  const [equipmentInventory, setEquipmentInventory] = useState<any[]>([]);

  const { getNextId } = useNumbering();
  const { contractors: individualContractors } = useResources();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Step 0 — Basic Information
  const [basicInfo, setBasicInfo] = useState({
    name: project?.name || "",
    client: project?.client || "",
    projectManager: project?.projectManager || "",
    plannedStartDate: project?.plannedStartDate || "",
    plannedEndDate: project?.plannedEndDate || "",
    contractType:
      project?.contractType ||
      ("Lump Sum" as "Lump Sum" | "Remeasurable" | "Cost Plus"),
    clusterId: project?.clusterId || "",
    location: project?.location || "",
    siteAddress: project?.siteAddress || "",
    description: project?.description || "",
    contractingModel:
      project?.contractingModel ||
      ("developer" as "developer" | "contractor" | "gc"),
  });

  // Step 1 — Project Type
  const [projectSector, setProjectSector] = useState<Sector | "">(
    project?.sector || "",
  );
  const [projectCategory, setProjectCategory] = useState(
    project?.category || "",
  );
  const [projectDescriptor, setProjectDescriptor] = useState(
    project?.descriptor || "",
  );

  const blockLabel = useMemo(
    () => getBlockLabel(projectSector as Sector, projectCategory),
    [projectSector, projectCategory],
  );
  const structureConfig = useMemo(
    () => (projectCategory ? getStructureConfig(projectCategory) : null),
    [projectCategory],
  );

  const [structureEntries, setStructureEntries] = useState<
    Array<{
      id: string;
      name: string;
      innerUnitCount: number;
      attributes: Record<string, string | number>;
      innerAttributes: Record<string, string | number>;
    }>
  >([]);

  const addStructureEntry = () => {
    const config = structureConfig;
    if (!config) return;
    const newEntry = {
      id: getNextId("Structure"),
      name: "",
      innerUnitCount: 1,
      attributes: {} as Record<string, string | number>,
      innerAttributes: {} as Record<string, string | number>,
    };
    config.subUnitFields.forEach((f) => {
      newEntry.attributes[f.key] = f.type === "number" ? 0 : "";
    });
    config.innerFields.forEach((f) => {
      newEntry.innerAttributes[f.key] =
        f.type === "number" ? 0 : (f.options?.[0] ?? "");
    });
    setStructureEntries((prev) => [...prev, newEntry]);
  };

  const updateStructureEntry = (
    id: string,
    field: string,
    value: string | number,
  ) => {
    setStructureEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  const updateStructureEntryAttr = (
    id: string,
    key: string,
    value: string | number,
  ) => {
    setStructureEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, attributes: { ...e.attributes, [key]: value } }
          : e,
      ),
    );
  };

  const updateStructureEntryInnerAttr = (
    id: string,
    key: string,
    value: string | number,
  ) => {
    setStructureEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, innerAttributes: { ...e.innerAttributes, [key]: value } }
          : e,
      ),
    );
  };

  const removeStructureEntry = (id: string) => {
    setStructureEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const totalSubUnits = structureEntries.length;
  const totalInnerUnits = structureEntries.reduce(
    (sum, e) => sum + (e.innerUnitCount || 0),
    0,
  );

  // Step 2 — Schedule Builder
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    name: "",
    level: 4 as 1 | 2 | 3 | 4,
    parentTaskId: "",
    plannedStart: "",
    plannedEnd: "",
    structureEntryId: "",
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [structureFilter, setStructureFilter] = useState("");

  // Resource assignments for Schedule Builder
  const [resourceAssignments, setResourceAssignments] = useState<
    ResourceAssignment[]
  >([]);
  const [assignModalTaskId, setAssignModalTaskId] = useState<string | null>(
    null,
  );
  const [assignForm, setAssignForm] = useState({
    resourceType: "human" as "human" | "material" | "equipment",
    resourceId: "",
    plannedQty: 0,
    plannedCost: 0,
  });
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const assignModalRef = useRef<HTMLDivElement>(null);
  const prevAssignModalRef = useRef(assignModalTaskId);
  useEffect(() => {
    if (assignModalTaskId && assignModalTaskId !== prevAssignModalRef.current) {
      setTimeout(
        () => assignModalRef.current?.scrollTo({ top: 0, behavior: "smooth" }),
        50,
      );
    }
    prevAssignModalRef.current = assignModalTaskId;
  }, [assignModalTaskId]);

  // Step 3 — Vendor Registration
  const [projectVendors, setProjectVendors] = useState<Vendor[]>([]);
  const [humanSubType, setHumanSubType] =
    useState<HumanResourceSource>("vendor");

  const [projectStaff, setProjectStaff] = useState<HumanResource[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  const EMPTY_CONTRACTOR_FORM = {
    name: "",
    trade: "",
    payRate: 0,
    payRateUnit: "daily" as "daily" | "weekly" | "monthly" | "lump-sum",
    skilledCount: 0,
    unskilledCount: 0,
    mandaysEstimate: 0,
    status: "Active" as "Active" | "Completed" | "Terminated",
  };
  const [contractorForm, setContractorForm] = useState(EMPTY_CONTRACTOR_FORM);
  const [projectContractors, setProjectContractors] = useState<HumanResource[]>(
    [],
  );
  const [selectedContractorIds, setSelectedContractorIds] = useState<string[]>(
    [],
  );
  const [isNewContractor, setIsNewContractor] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);

  const [projectMaterials, setProjectMaterials] = useState<MaterialResource[]>(
    [],
  );
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

  const EMPTY_EQUIPMENT_FORM = {
    name: "",
    category: "",
    ownership: "company-owned" as
      | "company-owned"
      | "rented"
      | "client-supplied",
    internalCostPerDay: 0,
    rentalCostPerDay: 0,
    rentalSupplier: "",
    estimatedDays: 0,
    status: "Available" as "Available" | "Assigned" | "Under Maintenance",
  };
  const [equipmentForm, setEquipmentForm] = useState(EMPTY_EQUIPMENT_FORM);
  const [projectEquipment, setProjectEquipment] = useState<EquipmentResource[]>(
    [],
  );
  const [selectedFleetEquipmentIds, setSelectedFleetEquipmentIds] = useState<
    string[]
  >([]);
  const [showProcurementModal, setShowProcurementModal] = useState(false);
  const [procurementQuery, setProcurementQuery] = useState("");
  const [showExternalEquipmentModal, setShowExternalEquipmentModal] =
    useState(false);
  const [externalEquipType, setExternalEquipType] = useState<
    "client-supplied" | "rented" | "external"
  >("client-supplied");

  // HR list UI state
  const [hrSearch, setHrSearch] = useState("");
  const [hrSectionOpen, setHrSectionOpen] = useState({
    employee: true,
    contractor: true,
    vendor: true,
  });

  // Vendor representatives UI state
  const [repExpandedVendorId, setRepExpandedVendorId] = useState<string | null>(
    null,
  );
  const [newRepForm, setNewRepForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    position: "",
  });

  // Main contractor selection — toggle on/off, allow multiple
  const assignMainContractor = (vendorId: string) => {
    setProjectVendors((prev) =>
      prev.map((v) =>
        v.id === vendorId ? { ...v, isMainContractor: !v.isMainContractor } : v,
      ),
    );
  };

  // Project roles (defined globally in Settings, assigned per-project)
  const { roles: projectRoles } = useRoles();
  const [humanResourceRoles, setHumanResourceRoles] = useState<
    HumanResourceRole[]
  >([]);
  const assignRoleToResource = (
    humanResourceId: string,
    projectRoleId: string,
  ) => {
    setHumanResourceRoles((prev) => {
      const existing = prev.find((r) => r.humanResourceId === humanResourceId);
      if (existing)
        return prev.map((r) =>
          r.humanResourceId === humanResourceId ? { ...r, projectRoleId } : r,
        );
      return [...prev, { humanResourceId, projectRoleId }];
    });
  };
  const removeRoleFromResource = (humanResourceId: string) => {
    setHumanResourceRoles((prev) =>
      prev.filter((r) => r.humanResourceId !== humanResourceId),
    );
  };
  const getRoleName = (roleId: string) =>
    projectRoles.find((r) => r.id === roleId)?.name || "Unknown";
  const getResourceRole = (resourceId: string) => {
    const ass = humanResourceRoles.find(
      (r) => r.humanResourceId === resourceId,
    );
    return ass ? getRoleName(ass.projectRoleId) : null;
  };

  // Daily reporting config
  const [reportContributorMode, setReportContributorMode] = useState<
    "employees-only" | "contractors-only" | "both"
  >("both");
  const [reportContributorEmployeeIds, setReportContributorEmployeeIds] =
    useState<string[]>([]);
  const [reportContributorRepIds, setReportContributorRepIds] = useState<
    string[]
  >([]);

  // Recurring report tasks
  const [recurringReportTasks, setRecurringReportTasks] = useState<
    {
      id: string;
      name: string;
      frequency: "daily" | "weekly" | "monthly";
      assignedTo: string;
      isActive: boolean;
    }[]
  >([]);
  const [newRecurringTask, setNewRecurringTask] = useState({
    name: "",
    frequency: "daily" as "daily" | "weekly" | "monthly",
    assignedTo: "",
  });
  const addRecurringTask = () => {
    if (!newRecurringTask.name.trim() || !newRecurringTask.assignedTo) return;
    setRecurringReportTasks((prev) => [
      ...prev,
      { id: `rt-${Date.now()}`, ...newRecurringTask, isActive: true },
    ]);
    setNewRecurringTask({ name: "", frequency: "daily", assignedTo: "" });
  };
  const removeRecurringTask = (id: string) =>
    setRecurringReportTasks((prev) => prev.filter((t) => t.id !== id));
  const toggleRecurringTask = (id: string) =>
    setRecurringReportTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)),
    );

  // Step 4 — Calendar
  const emptyCalendar: ProjectCalendar = {
    id: "",
    projectId: projectId || "",
    workingDays: [1, 2, 3, 4, 5],
    workingHoursStart: "08:00",
    workingHoursEnd: "17:00",
    holidays: [],
    shutdowns: [],
  };
  const [calendarData, setCalendarData] =
    useState<ProjectCalendar>(emptyCalendar);
  const [newHoliday, setNewHoliday] = useState({ date: "", label: "" });
  const [newShutdown, setNewShutdown] = useState({
    start: "",
    end: "",
    label: "",
  });

  // Step 5 — Baseline
  const [baselineLocked, setBaselineLocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [setupAuditLog, setSetupAuditLog] = useState<
    {
      action: "locked" | "unlocked";
      performedBy: string;
      performedAt: string;
      reason: string;
    }[]
  >([]);
  const performLock = () => {
    setBaselineLocked(true);
    setSetupAuditLog((prev) => [
      ...prev,
      {
        action: "locked",
        performedBy: "Project Manager",
        performedAt: new Date().toISOString(),
        reason: "Baseline locked",
      },
    ]);
    if (projectId) {
      saveProjectSetup(projectId, buildSetupPayload())
        .then(() => lockProjectSetup(projectId))
        .catch((err) => console.error("Failed to lock project setup", err));
    }
  };
  const performUnlock = () => {
    if (!unlockReason.trim()) return;
    setBaselineLocked(false);
    setSetupAuditLog((prev) => [
      ...prev,
      {
        action: "unlocked",
        performedBy: "Project Manager",
        performedAt: new Date().toISOString(),
        reason: unlockReason,
      },
    ]);
    if (projectId) {
      unlockProjectSetup(projectId, unlockReason).catch((err) =>
        console.error("Failed to unlock project setup", err),
      );
    }
    setShowUnlockModal(false);
    setUnlockReason("");
  };

  // ─── Backend persistence (load existing setup, save on progress) ──────────
  const buildSetupPayload = () => ({
    basicInfo,
    projectType: {
      sector: projectSector,
      category: projectCategory,
      descriptor: projectDescriptor,
      structureEntries,
    },
    humanResources: {
      staff: projectStaff,
      contractors: projectContractors,
      vendors: projectVendors,
      humanResourceRoles,
    },
    dailyReporting: {
      contributorMode: reportContributorMode,
      contributorEmployeeIds: reportContributorEmployeeIds,
      contributorRepIds: reportContributorRepIds,
      recurringReportTasks,
    },
    materials: projectMaterials,
    equipment: projectEquipment,
    calendar: calendarData,
    schedule: { tasks: projectTasks, resourceAssignments },
    setupComplete: completedSteps.has(STEPS.length - 1),
    setupLocked: baselineLocked,
    currentStep,
    completedSteps: [...completedSteps],
    auditLog: setupAuditLog,
  });

  const saveSetup = async () => {
    if (!projectId) return;
    try {
      await saveProjectSetup(projectId, buildSetupPayload());
    } catch (err) {
      console.error("Failed to save project setup", err);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    getProject(projectId)
      .then((p) => {
        if (!active || !p) return;
        setProject(p);
        // Seed Basic Information from the real project record. Only fill fields
        // that are still empty so a previously saved setup payload always wins,
        // regardless of which request resolves first.
        setBasicInfo((prev) => ({
          ...prev,
          name: prev.name || (p.name ?? ""),
          client: prev.client || (p.client ?? ""),
          projectManager: prev.projectManager || (p.manager ?? ""),
          plannedStartDate:
            prev.plannedStartDate ||
            (p.startDate
              ? new Date(p.startDate).toISOString().split("T")[0]
              : ""),
          plannedEndDate:
            prev.plannedEndDate ||
            (p.endDate ? new Date(p.endDate).toISOString().split("T")[0] : ""),
          location: prev.location || (p.location ?? ""),
        }));
      })
      .catch((err) => console.error("Failed to load project", err));
    getProjectSetup(projectId)
      .then((data) => {
        if (!active || !data) return;
        if (data.basicInfo)
          setBasicInfo((prev) => ({ ...prev, ...(data.basicInfo as any) }));
        if (data.projectType) {
          const pt = data.projectType as any;
          if (pt.sector !== undefined) setProjectSector(pt.sector);
          if (pt.category !== undefined) setProjectCategory(pt.category);
          if (pt.descriptor !== undefined) setProjectDescriptor(pt.descriptor);
          if (Array.isArray(pt.structureEntries))
            setStructureEntries(pt.structureEntries);
        }
        if (data.humanResources) {
          const hr = data.humanResources as any;
          if (Array.isArray(hr.staff)) setProjectStaff(hr.staff);
          if (Array.isArray(hr.contractors))
            setProjectContractors(hr.contractors);
          if (Array.isArray(hr.vendors)) setProjectVendors(hr.vendors);
          if (Array.isArray(hr.humanResourceRoles))
            setHumanResourceRoles(hr.humanResourceRoles);
        }
        if (data.dailyReporting) {
          const dr = data.dailyReporting as any;
          if (dr.contributorMode) setReportContributorMode(dr.contributorMode);
          if (Array.isArray(dr.contributorEmployeeIds))
            setReportContributorEmployeeIds(dr.contributorEmployeeIds);
          if (Array.isArray(dr.contributorRepIds))
            setReportContributorRepIds(dr.contributorRepIds);
          if (Array.isArray(dr.recurringReportTasks))
            setRecurringReportTasks(dr.recurringReportTasks);
        }
        if (Array.isArray(data.materials)) setProjectMaterials(data.materials);
        if (Array.isArray(data.equipment)) setProjectEquipment(data.equipment);
        if (data.calendar)
          setCalendarData((prev) => ({ ...prev, ...(data.calendar as any) }));
        if (data.schedule) {
          const sc = data.schedule as any;
          if (Array.isArray(sc.tasks)) setProjectTasks(sc.tasks);
          if (Array.isArray(sc.resourceAssignments))
            setResourceAssignments(sc.resourceAssignments);
        }
        if (typeof data.setupLocked === "boolean")
          setBaselineLocked(data.setupLocked);
        if (Array.isArray(data.auditLog))
          setSetupAuditLog(data.auditLog as any);
        if (typeof data.currentStep === "number")
          setCurrentStep(data.currentStep);
        if (Array.isArray(data.completedSteps))
          setCompletedSteps(new Set(data.completedSteps));
      })
      .catch((err) => console.error("Failed to load project setup", err));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Load reference lookups (staff, employees, vendors, materials, tasks) from
  // the API. Each call falls back to an empty list so the wizard stays usable
  // even when an endpoint is unavailable.
  useEffect(() => {
    let active = true;
    (async () => {
      const [emps, sups, mats, tsk, cls, eqp] = await Promise.all([
        fetchEmployees().catch(() => [] as any[]),
        fetchSuppliers().catch(() => [] as any[]),
        getMaterials().catch(() => [] as any[]),
        getTasks().catch(() => [] as any[]),
        getClusters().catch(() => [] as any[]),
        getEquipment().catch(() => [] as any[]),
      ]);
      if (!active) return;
      setHrEmployees(emps);
      setStaffList(
        emps
          .map((e: any) => `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim())
          .filter(Boolean),
      );
      setAllVendors(
        (sups as any[]).map((s) => ({
          id: s.id,
          name: s.name,
          trade: Array.isArray(s.category)
            ? (s.category[0] ?? "")
            : (s.category ?? ""),
          contractType: "Labor-only",
          isNominated: false,
          contractSum: 0,
          blockAssignment: "",
          skilledCount: 0,
          unskilledCount: 0,
          mandaysEstimate: 0,
          status: "Awarded",
          isMainContractor: false,
        })),
      );
      setMaterialInventory(
        (mats as any[]).map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          unit: m.unit,
          defaultUnitCost: m.unitCost ?? 0,
          inStock: m.availableQty ?? 0,
        })),
      );
      setAllTasks(tsk as any[]);
      setClusters((cls as any[]).map((c) => c.name).filter(Boolean));
      setEquipmentInventory(
        (eqp as any[]).map((e) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          defaultInternalCostPerDay: e.defaultInternalCostPerDay ?? 0,
          status: e.status ?? "Available",
        })),
      );
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggleDay = (dayIdx: number) => {
    setCalendarData((prev) => {
      const days = prev.workingDays.includes(dayIdx)
        ? prev.workingDays.filter((d) => d !== dayIdx)
        : [...prev.workingDays, dayIdx].sort((a, b) => {
            const order = [1, 2, 3, 4, 5, 6, 0];
            return order.indexOf(a) - order.indexOf(b);
          });
      return { ...prev, workingDays: days };
    });
  };

  const addHoliday = () => {
    if (!newHoliday.date || !newHoliday.label) return;
    setCalendarData((prev) => ({
      ...prev,
      holidays: [
        ...prev.holidays,
        { date: newHoliday.date, label: newHoliday.label },
      ],
    }));
    setNewHoliday({ date: "", label: "" });
  };

  const removeHoliday = (idx: number) => {
    setCalendarData((prev) => ({
      ...prev,
      holidays: prev.holidays.filter((_, i) => i !== idx),
    }));
  };

  const addShutdown = () => {
    if (!newShutdown.start || !newShutdown.end || !newShutdown.label) return;
    setCalendarData((prev) => ({
      ...prev,
      shutdowns: [
        ...prev.shutdowns,
        {
          start: newShutdown.start,
          end: newShutdown.end,
          label: newShutdown.label,
        },
      ],
    }));
    setNewShutdown({ start: "", end: "", label: "" });
  };

  const removeShutdown = (idx: number) => {
    setCalendarData((prev) => ({
      ...prev,
      shutdowns: prev.shutdowns.filter((_, i) => i !== idx),
    }));
  };

  // Task helpers
  const rootTasks = useMemo(
    () => projectTasks.filter((t) => t.level === 1),
    [projectTasks],
  );

  const maxTaskId = useMemo(() => {
    const max = allTasks.reduce((m, t) => {
      const num = parseInt(t.id.replace(/^\D+/, ""), 10);
      return num > m ? num : m;
    }, 0);
    return max + projectTasks.length + 1;
  }, [projectTasks.length, allTasks]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addTask = () => {
    if (!taskForm.name.trim()) return;
    const prefix = LEVEL_PREFIX[taskForm.level];
    const newId = `${prefix}-${String(maxTaskId).padStart(3, "0")}`;
    const s = taskForm.plannedStart || new Date().toISOString().split("T")[0];
    const e =
      taskForm.plannedEnd ||
      new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const dur = Math.max(
      1,
      Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400000) +
        1,
    );
    const task: Task = {
      id: newId,
      projectId: projectId!,
      parentTaskId: taskForm.parentTaskId || null,
      level: taskForm.level,
      name: taskForm.name.trim(),
      plannedStart: s,
      plannedEnd: e,
      actualStart: null,
      actualEnd: null,
      plannedDuration: dur,
      actualDuration: null,
      percentComplete: 0,
      predecessorId: null,
      dependencyType: null,
      lagDays: 0,
      vendorId: null,
      ragStatus: "on-track",
      ragOverride: false,
      notes: "",
      structureEntryId: taskForm.parentTaskId
        ? projectTasks.find((t) => t.id === taskForm.parentTaskId)
            ?.structureEntryId
        : undefined,
    };
    setProjectTasks((prev) => [...prev, task]);
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(task.id);
      if (task.parentTaskId) next.add(task.parentTaskId);
      return next;
    });
    setTaskForm({
      name: "",
      level: 4,
      parentTaskId: "",
      plannedStart: "",
      plannedEnd: "",
      structureEntryId: "",
    });
    setShowAddTask(false);
  };

  const removeTask = (id: string) => {
    const idsToRemove = new Set<string>();
    const collect = (taskId: string) => {
      idsToRemove.add(taskId);
      projectTasks
        .filter((t) => t.parentTaskId === taskId)
        .forEach((t) => collect(t.id));
    };
    collect(id);
    setProjectTasks((prev) => prev.filter((t) => !idsToRemove.has(t.id)));
    setResourceAssignments((prev) =>
      prev.filter((a) => !idsToRemove.has(a.taskId)),
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadExcelTemplate = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const data = [
      ["Level", "Task Name", "Parent Task ID", "Planned Start", "Planned End"],
      [1, "Substructure Works", "", "2026-01-15", "2026-03-15"],
      [2, "Excavation", "TSK-001", "2026-01-15", "2026-02-01"],
      [2, "Foundation", "TSK-001", "2026-02-02", "2026-03-15"],
      [1, "Superstructure Works", "", "2026-03-16", "2026-09-30"],
      [2, "Column & Slab", "TSK-004", "2026-03-16", "2026-06-30"],
      [3, "Ground Floor Slab", "TSK-005", "2026-03-16", "2026-04-30"],
      [3, "First Floor Slab", "TSK-005", "2026-05-01", "2026-06-30"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Tasks");
    XLSX.writeFile(wb, "project_schedule_template.xlsx");
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx");
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
        const newTasks: Task[] = [];
        let maxLvl = maxTaskId;
        for (let i = 1; i < rows.length; i++) {
          const [levelStr, name, parentId, start, end] = rows[i];
          const level = Number(levelStr);
          if (!name || isNaN(level) || level < 1 || level > 4) continue;
          maxLvl++;
          const prefix = LEVEL_PREFIX[level as 1 | 2 | 3 | 4];
          const id = `${prefix}-${String(maxLvl).padStart(3, "0")}`;
          const s = start || new Date().toISOString().split("T")[0];
          const e =
            end ||
            new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
          const dur = Math.max(
            1,
            Math.round(
              (new Date(e).getTime() - new Date(s).getTime()) / 86400000,
            ) + 1,
          );
          newTasks.push({
            id,
            projectId: projectId!,
            parentTaskId: parentId || null,
            level: level as 1 | 2 | 3 | 4,
            name: String(name).trim(),
            plannedStart: s,
            plannedEnd: e,
            actualStart: null,
            actualEnd: null,
            plannedDuration: dur,
            actualDuration: null,
            percentComplete: 0,
            predecessorId: null,
            dependencyType: null,
            lagDays: 0,
            vendorId: null,
            subVendorIds: [],
            ragStatus: "on-track",
            ragOverride: false,
            notes: "",
            structureEntryId: undefined,
          });
        }
        if (newTasks.length > 0) {
          setProjectTasks((prev) => [...prev, ...newTasks]);
          setExpanded((prev) => {
            const next = new Set(prev);
            newTasks.forEach((t) => {
              next.add(t.id);
              if (t.parentTaskId) next.add(t.parentTaskId);
            });
            return next;
          });
        }
      } catch (err) {
        console.error("Excel import failed", err);
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Vendor helpers
  const uniqueVendors = useMemo(() => {
    const seen = new Set<string>();
    return allVendors.filter((v) => {
      const key = v.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allVendors]);

  const addVendor = () => {
    if (selectedVendorIds.length === 0) return;
    const existingNames = new Set(projectVendors.map((v) => v.name));
    const newV: Vendor[] = selectedVendorIds
      .filter((id) => {
        const v = allVendors.find((x) => x.id === id);
        return v && !existingNames.has(v.name);
      })
      .map((id) => {
        const v = allVendors.find((x) => x.id === id);
        return {
          id: getNextId("Vendor"),
          projectId: projectId!,
          assignedWorkPackages: [],
          name: v?.name || "",
          trade: v?.trade || "",
          contractType: v?.contractType || "Labor-only",
          isNominated: v?.isNominated || false,
          contractSum: v?.contractSum || 0,
          blockAssignment: v?.blockAssignment || "",
          skilledCount: v?.skilledCount || 0,
          unskilledCount: v?.unskilledCount || 0,
          mandaysEstimate: v?.mandaysEstimate || 0,
          status: v?.status || "Awarded",
          isMainContractor: v?.isMainContractor || false,
          subcontractorIds: v?.subcontractorIds || [],
          parentContractorId: v?.parentContractorId || undefined,
        };
      });
    setProjectVendors((prev) => [...prev, ...newV]);
    setSelectedVendorIds([]);
  };

  const removeVendor = (id: string) => {
    setProjectVendors((prev) => prev.filter((v) => v.id !== id));
  };

  // Vendor representatives
  const addRepresentative = (vendorId: string) => {
    if (!newRepForm.fullName.trim()) return;
    const repId = `VR-${vendorId}-${Date.now()}`;
    const rep: VendorRepresentative = {
      id: repId,
      vendorId,
      ...newRepForm,
      isActive: true,
    };
    setProjectVendors((prev) =>
      prev.map((v) =>
        v.id === vendorId
          ? { ...v, representatives: [...(v.representatives || []), rep] }
          : v,
      ),
    );
    setNewRepForm({ fullName: "", email: "", phone: "", position: "" });
  };
  const removeRepresentative = (vendorId: string, repId: string) => {
    setProjectVendors((prev) =>
      prev.map((v) =>
        v.id === vendorId
          ? {
              ...v,
              representatives: (v.representatives || []).filter(
                (r) => r.id !== repId,
              ),
            }
          : v,
      ),
    );
  };
  const toggleRepresentativeActive = (vendorId: string, repId: string) => {
    setProjectVendors((prev) =>
      prev.map((v) =>
        v.id === vendorId
          ? {
              ...v,
              representatives: (v.representatives || []).map((r) =>
                r.id === repId ? { ...r, isActive: !r.isActive } : r,
              ),
            }
          : v,
      ),
    );
  };

  // Staff helpers
  const addStaff = () => {
    if (selectedEmployeeIds.length === 0) return;
    const existingIds = new Set(projectStaff.map((s) => s.employeeId));
    const newStaff: HumanResource[] = selectedEmployeeIds
      .filter((id) => !existingIds.has(id))
      .map((id) => {
        const emp = hrEmployees.find((e) => e.id === id);
        return {
          id: getNextId("Staff"),
          projectId: projectId!,
          source: "employee" as const,
          name: `${emp?.firstName || ""} ${emp?.lastName || ""}`,
          trade: emp?.role || "",
          employeeId: emp?.id || "",
          dailyRate: emp?.dailyRate || 0,
          status: "Active" as const,
          assignedWorkPackages: [],
          blockAssignment: "",
          mandaysEstimate: 0,
        };
      });
    setProjectStaff((prev) => [...prev, ...newStaff]);
    setSelectedEmployeeIds([]);
  };
  const removeStaff = (id: string) =>
    setProjectStaff((prev) => prev.filter((s) => s.id !== id));

  const addContractor = () => {
    if (selectedContractorIds.length === 0) return;
    const existingNames = new Set(projectContractors.map((c) => c.name));
    const newC: HumanResource[] = selectedContractorIds
      .filter((id) => {
        const c = individualContractors.find((x) => x.id === id);
        return c && !existingNames.has(c.name);
      })
      .map((id) => {
        const c = individualContractors.find((x) => x.id === id);
        return {
          id: getNextId("Contractor"),
          projectId: projectId!,
          source: "individual-contractor" as const,
          name: c?.name || "",
          trade: c?.trade || "",
          payRate: c?.payRate || undefined,
          payRateUnit: c?.payRateUnit || "daily",
          skilledCount: c?.skilledCount || 0,
          unskilledCount: c?.unskilledCount || 0,
          mandaysEstimate: c?.manDays || 0,
          status: c?.status || "Awarded",
          assignedWorkPackages: [],
          blockAssignment: "",
        };
      });
    setProjectContractors((prev) => [...prev, ...newC]);
    setSelectedContractorIds([]);
  };
  const removeContractor = (id: string) =>
    setProjectContractors((prev) => prev.filter((c) => c.id !== id));

  // Material helpers
  const addMaterial = () => {
    if (selectedMaterialIds.length === 0) return;
    const newMats: MaterialResource[] = selectedMaterialIds.map((id) => {
      const inv = materialInventory.find((x) => x.id === id);
      return {
        id: getNextId("Material"),
        projectId: projectId!,
        name: inv?.name || "Unknown",
        category: inv?.category || "",
        unit: inv?.unit || "",
        estimatedQty: 1,
        estimatedUnitCost: inv?.defaultUnitCost || 0,
        totalEstimatedCost: inv?.defaultUnitCost || 0,
        procurementSource: "internal" as const,
      };
    });
    setProjectMaterials((prev) => [...prev, ...newMats]);
    setSelectedMaterialIds([]);
  };
  const removeMaterial = (id: string) =>
    setProjectMaterials((prev) => prev.filter((m) => m.id !== id));

  // Equipment helpers
  const addEquipment = () => {
    // Add fleet equipment (multi-select)
    if (selectedFleetEquipmentIds.length > 0) {
      const newEquips: EquipmentResource[] = selectedFleetEquipmentIds.map(
        (id) => {
          const inv = equipmentInventory.find((e) => e.id === id);
          return {
            id: getNextId("Equipment"),
            projectId: projectId!,
            name: inv?.name || "Unknown",
            category: inv?.category || "",
            ownership: "company-owned" as const,
            internalCostPerDay: inv?.defaultInternalCostPerDay,
            estimatedDays: 1,
            totalEstimatedCost: inv?.defaultInternalCostPerDay || 0,
            status: (inv?.status === "Available" ? "Available" : "Assigned") as
              | "Available"
              | "Assigned"
              | "Under Maintenance",
          };
        },
      );
      setProjectEquipment((prev) => [...prev, ...newEquips]);
      setSelectedFleetEquipmentIds([]);
      return;
    }
  };
  const removeEquipment = (id: string) =>
    setProjectEquipment((prev) => prev.filter((e) => e.id !== id));

  // Navigation
  const goNext = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    void saveSetup();
  };

  const goBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const goToStep = (step: number) => {
    if (step < currentStep || completedSteps.has(step)) {
      setCurrentStep(step);
    }
  };

  const handleCompleteSetup = () => {
    setCompletedSteps((prev) => new Set([...prev, STEPS.length - 1]));
    performLock();
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  if (!project && basicInfo.name) {
    // Allow creating a new project — show setup even without existing project
  }

  // Progress indicator rendering
  const renderProgress = () => (
    <div className="overflow-x-auto -mx-6 px-6 mb-8">
      <div className="flex items-center justify-center min-w-max">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = completedSteps.has(idx);
          const isCurrent = currentStep === idx;
          const isClickable = idx < currentStep || completedSteps.has(idx);

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => isClickable && goToStep(idx)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-1.5 transition-opacity ${isClickable ? "cursor-pointer" : "cursor-default"} ${!isClickable ? "opacity-50" : ""}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isCurrent
                        ? "text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                  style={
                    isCurrent && !isCompleted
                      ? { backgroundColor: "#E8973A" }
                      : {}
                  }
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isCompleted
                      ? "text-green-600"
                      : isCurrent
                        ? "font-semibold"
                        : "text-gray-400"
                  }`}
                  style={isCurrent && !isCompleted ? { color: "#E8973A" } : {}}
                >
                  {step.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-12 sm:w-16 lg:w-24 h-0.5 mx-1.5 sm:mx-2 rounded-full ${
                    completedSteps.has(idx) ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Step 1 — Project Type Classification
  const renderProjectType = () => {
    const categories = projectSector
      ? SECTOR_CATEGORIES[projectSector as Sector]
      : [];
    return (
      <div
        className="rounded-xl border p-6 space-y-6"
        style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
      >
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#1A202C" }}>
            Project Type Classification
          </h2>
          <p className="text-sm mt-1" style={{ color: "#718096" }}>
            Classify your project so the system can suggest the right schedule
            template, quality tests, HSE requirements, and vendor trades.
          </p>
        </div>

        {/* Level 1 — Sector */}
        <div>
          <label
            className="block text-sm font-semibold mb-3"
            style={{ color: "#1A202C" }}
          >
            Level 1 — Sector
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SECTORS.map((s) => {
              const selected = projectSector === s;
              return (
                <button
                  key={s}
                  onClick={() => {
                    setProjectSector(s);
                    setProjectCategory("");
                  }}
                  className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    selected
                      ? "text-white border-transparent"
                      : "hover:border-gray-300"
                  }`}
                  style={{
                    backgroundColor: selected ? "#E8973A" : "white",
                    borderColor: selected ? "#E8973A" : "#E2E8F0",
                    color: selected ? "white" : "#1A202C",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Level 2 — Category */}
        {projectSector && categories.length > 0 && (
          <div>
            <label
              className="block text-sm font-semibold mb-3"
              style={{ color: "#1A202C" }}
            >
              Level 2 — Project Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((c) => {
                const selected = projectCategory === c;
                return (
                  <button
                    key={c}
                    onClick={() => setProjectCategory(c)}
                    className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${
                      selected
                        ? "text-white border-transparent"
                        : "hover:bg-gray-50"
                    }`}
                    style={{
                      backgroundColor: selected ? "#E8973A" : "white",
                      borderColor: selected ? "#E8973A" : "#E2E8F0",
                      color: selected ? "white" : "#1A202C",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Level 3 — Descriptor */}
        {projectCategory && (
          <div>
            <label
              className="block text-sm font-semibold mb-1"
              style={{ color: "#1A202C" }}
            >
              Level 3 — Specific Descriptor{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={projectDescriptor}
              onChange={(e) => setProjectDescriptor(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
              placeholder="e.g. 22-storey commercial tower, 120-unit estate"
            />
          </div>
        )}

        {projectSector && projectCategory && (
          <div
            className="rounded-lg p-4 text-sm"
            style={{ backgroundColor: "#FEF6E6", border: "1px solid #F4A623" }}
          >
            <p className="font-semibold" style={{ color: "#B0780F" }}>
              Selected Classification
            </p>
            <p style={{ color: "#B0780F" }}>
              {projectSector} &rarr; {projectCategory}
              {projectDescriptor ? ` — ${projectDescriptor}` : ""}
            </p>
          </div>
        )}

        {/* Level 4 — Structure Breakdown */}
        {structureConfig && (
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
          >
            <div>
              <h3 className="text-base font-bold" style={{ color: "#1A202C" }}>
                Level 4 — Physical Structure Breakdown
              </h3>
              <p className="text-sm mt-1" style={{ color: "#718096" }}>
                Define the {structureConfig.subUnitLabel}s and{" "}
                {structureConfig.innerUnitLabel}s that make up this project.
              </p>
            </div>

            {structureEntries.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  No {structureConfig.subUnitLabel.toLowerCase()}s defined yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {structureEntries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#1A202C" }}
                      >
                        {structureConfig.subUnitLabel} {idx + 1}
                      </span>
                      <button
                        onClick={() => removeStructureEntry(entry.id)}
                        className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {structureConfig.subUnitItemLabel}
                        </label>
                        <input
                          type="text"
                          value={entry.name}
                          onChange={(e) =>
                            updateStructureEntry(
                              entry.id,
                              "name",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{
                            borderColor: "#E2E8F0",
                            backgroundColor: "#F7F8FA",
                          }}
                          placeholder={`e.g. ${structureConfig.subUnitLabel} A`}
                        />
                      </div>
                      {structureConfig.subUnitFields.map((f) => (
                        <div key={f.key}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            {f.label}
                          </label>
                          {f.type === "number" ? (
                            <input
                              type="number"
                              value={entry.attributes[f.key] ?? ""}
                              onChange={(e) =>
                                updateStructureEntryAttr(
                                  entry.id,
                                  f.key,
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                                )
                              }
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={{
                                borderColor: "#E2E8F0",
                                backgroundColor: "#F7F8FA",
                              }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={entry.attributes[f.key] ?? ""}
                              onChange={(e) =>
                                updateStructureEntryAttr(
                                  entry.id,
                                  f.key,
                                  e.target.value,
                                )
                              }
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={{
                                borderColor: "#E2E8F0",
                                backgroundColor: "#F7F8FA",
                              }}
                            />
                          )}
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Number of {structureConfig.innerUnitLabel}s
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={entry.innerUnitCount}
                          onChange={(e) =>
                            updateStructureEntry(
                              entry.id,
                              "innerUnitCount",
                              Math.max(1, Number(e.target.value)),
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{
                            borderColor: "#E2E8F0",
                            backgroundColor: "#F7F8FA",
                          }}
                        />
                      </div>
                      {structureConfig.innerFields.map((f) => (
                        <div key={f.key}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            {f.label} (per {structureConfig.innerUnitLabel})
                          </label>
                          {f.type === "select" && f.options ? (
                            <select
                              value={entry.innerAttributes[f.key] ?? ""}
                              onChange={(e) =>
                                updateStructureEntryInnerAttr(
                                  entry.id,
                                  f.key,
                                  e.target.value,
                                )
                              }
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={{
                                borderColor: "#E2E8F0",
                                backgroundColor: "#F7F8FA",
                              }}
                            >
                              {f.options.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={f.type === "number" ? "number" : "text"}
                              value={entry.innerAttributes[f.key] ?? ""}
                              onChange={(e) =>
                                updateStructureEntryInnerAttr(
                                  entry.id,
                                  f.key,
                                  f.type === "number"
                                    ? e.target.value === ""
                                      ? ""
                                      : Number(e.target.value)
                                    : e.target.value,
                                )
                              }
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={{
                                borderColor: "#E2E8F0",
                                backgroundColor: "#F7F8FA",
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={addStructureEntry}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium w-fit"
              style={{
                color: "#E8973A",
                border: "1px dashed #E8973A",
                backgroundColor: "#FFF8F0",
              }}
            >
              <Plus className="w-4 h-4" /> Add {structureConfig.subUnitLabel}
            </button>

            {structureEntries.length > 0 && (
              <div
                className="rounded-lg p-3 border text-sm"
                style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
              >
                <p className="font-medium text-gray-900">
                  {totalSubUnits} {structureConfig.subUnitLabel}(s) &middot;{" "}
                  {totalInnerUnits} Total {structureConfig.innerUnitLabel}s
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Step 0 — Basic Information
  const renderBasicInfo = () => (
    <div
      className="rounded-xl border p-6 space-y-5"
      style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
    >
      <h2 className="text-lg font-bold" style={{ color: "#1A202C" }}>
        Basic Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Name
          </label>
          <input
            type="text"
            value={basicInfo.name}
            onChange={(e) =>
              setBasicInfo({ ...basicInfo, name: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
            placeholder="e.g. Lekki Tower A"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client
          </label>
          <input
            type="text"
            value={basicInfo.client}
            onChange={(e) =>
              setBasicInfo({ ...basicInfo, client: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
            placeholder="e.g. Lekki Gardens Ltd"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Manager
          </label>
          <select
            value={basicInfo.projectManager}
            onChange={(e) =>
              setBasicInfo({ ...basicInfo, projectManager: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
          >
            <option value="">Select PM</option>
            {staffList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {individualContractors.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} (Contractor)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contract Type
          </label>
          <select
            value={basicInfo.contractType}
            onChange={(e) =>
              setBasicInfo({
                ...basicInfo,
                contractType: e.target.value as
                  | "Lump Sum"
                  | "Remeasurable"
                  | "Cost Plus",
              })
            }
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
          >
            <option value="Lump Sum">Lump Sum</option>
            <option value="Remeasurable">Remeasurable</option>
            <option value="Cost Plus">Cost Plus</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contracting Model
          </label>
          <div className="flex gap-2">
            {[
              {
                value: "developer" as const,
                label: "Developer",
                desc: "We hire a main contractor who manages subs",
              },
              {
                value: "contractor" as const,
                label: "Contractor",
                desc: "We self-perform and hire subs directly",
              },
              {
                value: "gc" as const,
                label: "General Contractor",
                desc: "We manage trade contractors directly",
              },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  setBasicInfo({ ...basicInfo, contractingModel: opt.value })
                }
                className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors ${
                  basicInfo.contractingModel === opt.value
                    ? "bg-amber-50 border-amber-400 text-amber-700"
                    : "hover:bg-gray-50 text-gray-600"
                }`}
              >
                <span className="block font-semibold">{opt.label}</span>
                <span className="block mt-0.5 font-normal opacity-70">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Planned Start Date
          </label>
          <input
            type="date"
            value={basicInfo.plannedStartDate}
            onChange={(e) =>
              setBasicInfo({ ...basicInfo, plannedStartDate: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Planned End Date
          </label>
          <input
            type="date"
            value={basicInfo.plannedEndDate}
            onChange={(e) =>
              setBasicInfo({ ...basicInfo, plannedEndDate: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cluster
          </label>
          <select
            value={basicInfo.clusterId}
            onChange={(e) =>
              setBasicInfo({ ...basicInfo, clusterId: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
          >
            <option value="">Select cluster</option>
            {clusters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            value={basicInfo.location}
            onChange={(e) =>
              setBasicInfo({ ...basicInfo, location: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
            placeholder="e.g. Lekki, Lagos"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Site Address
          </label>
          <input
            type="text"
            value={basicInfo.siteAddress}
            onChange={(e) =>
              setBasicInfo({ ...basicInfo, siteAddress: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
            placeholder="e.g. 12B Admiralty Road, Lekki Phase 1"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          rows={3}
          value={basicInfo.description}
          onChange={(e) =>
            setBasicInfo({ ...basicInfo, description: e.target.value })
          }
          className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
          style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
          placeholder="Project description..."
        />
      </div>
    </div>
  );

  // Step 2 — Schedule Builder
  const renderTaskTree = (
    parentId: string | null,
    depth: number,
  ): React.ReactNode => {
    const children = projectTasks.filter(
      (t) =>
        t.parentTaskId === parentId &&
        (!structureFilter || t.structureEntryId === structureFilter),
    );
    if (children.length === 0 && depth === 0) {
      const filteredRoots = rootTasks.filter(
        (t) => !structureFilter || t.structureEntryId === structureFilter,
      );
      return filteredRoots.map((t) => renderTaskTree(t.id, 1));
    }
    return children.flatMap((task) => {
      const isExpanded = expanded.has(task.id);
      const hasChildren = projectTasks.some((t) => t.parentTaskId === task.id);
      const paddingLeft = (task.level - 1) * 24 + 12;
      const isLevel1 = task.level === 1;
      const primaryVendor = task.vendorId
        ? projectVendors.find((v) => v.id === task.vendorId)
        : null;
      const subVendors = task.subVendorIds
        ?.map((id) => projectVendors.find((v) => v.id === id))
        .filter(Boolean) as Vendor[] | undefined;

      return (
        <div key={task.id}>
          <div
            className="flex items-center gap-2 px-3 py-2.5 text-sm group"
            style={{
              paddingLeft: `${paddingLeft}px`,
              backgroundColor: isLevel1 ? "#1C2333" : "transparent",
              color: isLevel1 ? "white" : "#1A202C",
              borderBottom: "1px solid #E2E8F0",
            }}
          >
            <span className="w-3.5 flex items-center justify-center flex-shrink-0">
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(task.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-3.5" />
              )}
            </span>
            <span className="text-xs font-mono opacity-60 w-16 flex-shrink-0">
              {task.id}
            </span>
            <span className="flex-1 truncate font-medium flex items-center gap-2">
              {task.name}
              {task.structureEntryId &&
                (() => {
                  const se = structureEntries.find(
                    (e) => e.id === task.structureEntryId,
                  );
                  return se ? (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: isLevel1
                          ? "rgba(232,151,58,0.2)"
                          : "#FFF3E0",
                        color: isLevel1 ? "#E8973A" : "#E8973A",
                      }}
                    >
                      {se.name}
                    </span>
                  ) : null;
                })()}
              {task.level === 1 && task.vendorId && (
                <span
                  className="inline-flex items-center gap-1 text-xs"
                  style={{
                    color: isLevel1 ? "rgba(255,255,255,0.7)" : "#6B7280",
                  }}
                >
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  <span>{primaryVendor?.name || "—"}</span>
                  {subVendors && subVendors.length > 0 && (
                    <span className="text-[10px] opacity-60 ml-0.5">
                      +{subVendors.length}
                    </span>
                  )}
                </span>
              )}
            </span>
            <span className="text-xs opacity-60 hidden sm:inline w-28 flex-shrink-0">
              {LEVEL_NAMES[task.level]}
            </span>
            <span className="text-xs opacity-60 hidden sm:inline w-40 flex-shrink-0">
              {fmtDate(task.plannedStart)} — {fmtDate(task.plannedEnd)}
            </span>
            <div className="w-[140px] flex-shrink-0 flex justify-center">
              <button
                onClick={() => setAssignModalTaskId(task.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors opacity-70 hover:opacity-100"
                style={{
                  color: isLevel1 ? "#E8973A" : "#E8973A",
                  backgroundColor: isLevel1
                    ? "rgba(232,151,58,0.15)"
                    : "rgba(232,151,58,0.1)",
                }}
              >
                <Users className="w-3.5 h-3.5" /> Assign
                {resourceAssignments.filter((a) => a.taskId === task.id)
                  .length > 0 && (
                  <span
                    className="bg-white text-orange-700 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border"
                    style={{ borderColor: "#E8973A" }}
                  >
                    {
                      resourceAssignments.filter((a) => a.taskId === task.id)
                        .length
                    }
                  </span>
                )}
              </button>
            </div>
            <div className="w-[80px] flex-shrink-0 flex justify-center">
              <button
                onClick={() => removeTask(task.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors opacity-50 hover:opacity-100 hover:bg-red-50"
                style={{ color: "#EF4444" }}
              >
                <Trash2 className="w-3 h-3" />{" "}
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
          {hasChildren && isExpanded && renderTaskTree(task.id, depth + 1)}
        </div>
      );
    });
  };

  const renderScheduleBuilder = () => (
    <div className="space-y-4">
      {/* Schedule Import Center */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#FFF3E0" }}
          >
            <FileText className="w-4 h-4" style={{ color: "#E8973A" }} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: "#1A202C" }}>
              Schedule Import Center
            </h3>
          </div>
        </div>

        {/* Info panel */}
        <div
          className="mb-5 p-4 rounded-lg"
          style={{ backgroundColor: "#F7F8FA", border: "1px solid #E2E8F0" }}
        >
          <p className="text-sm font-medium text-gray-700 mb-2">
            Schedule Import Guide
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Download the template and use the provided structure.
          </p>
          <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
            <li>Do not modify column names.</li>
            <li>Maintain task hierarchy relationships.</li>
            <li>Use supported date formats (YYYY-MM-DD).</li>
            <li>Review validation errors before final import.</li>
            <li>Parent-child mappings are already configured.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={downloadExcelTemplate}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors hover:bg-gray-50 flex-1"
            style={{ borderColor: "#E2E8F0", color: "#4A5568" }}
          >
            <Download className="w-4 h-4" style={{ color: "#E8973A" }} />
            Download Template
          </button>
          <label
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:opacity-90 flex-1 text-white"
            style={{ backgroundColor: "#E8973A" }}
          >
            <Upload className="w-4 h-4" />
            Upload Completed Template
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: "#1A202C" }}>
            Task Hierarchy Builder
          </h2>
          <div className="flex items-center gap-2">
            {structureEntries.length > 0 && (
              <button
                onClick={() => {
                  const newTasks: Task[] = [];
                  let nextId = maxTaskId;
                  structureEntries.forEach((se) => {
                    nextId++;
                    const s =
                      basicInfo.plannedStartDate ||
                      new Date().toISOString().split("T")[0];
                    const e =
                      basicInfo.plannedEndDate ||
                      new Date(Date.now() + 90 * 86400000)
                        .toISOString()
                        .split("T")[0];
                    newTasks.push({
                      id: getNextId("SiteTask"),
                      projectId: projectId!,
                      parentTaskId: null,
                      level: 1,
                      name: `${se.name}`,
                      plannedStart: s,
                      plannedEnd: e,
                      actualStart: null,
                      actualEnd: null,
                      plannedDuration: Math.max(
                        1,
                        Math.round(
                          (new Date(e).getTime() - new Date(s).getTime()) /
                            86400000,
                        ) + 1,
                      ),
                      actualDuration: null,
                      percentComplete: 0,
                      predecessorId: null,
                      dependencyType: null,
                      lagDays: 0,
                      vendorId: null,
                      ragStatus: "on-track",
                      ragOverride: false,
                      notes: "",
                      structureEntryId: se.id,
                    });
                  });
                  setProjectTasks((prev) => [...prev, ...newTasks]);
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    newTasks.forEach((t) => next.add(t.id));
                    return next;
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-gray-50 text-gray-600"
                style={{ borderColor: "#E2E8F0" }}
              >
                <Building2 className="w-3.5 h-3.5" /> Generate from {blockLabel}
              </button>
            )}
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: "#E8973A" }}
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
        </div>
        {structureEntries.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500 font-medium">
              Filter by {blockLabel}:
            </span>
            {(["", ...structureEntries.map((se) => se.id)] as const).map(
              (id) => {
                const se = id
                  ? structureEntries.find((e) => e.id === id)
                  : null;
                return (
                  <button
                    key={id || "all"}
                    onClick={() => setStructureFilter(id)}
                    className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                      (id ? structureFilter === id : !structureFilter)
                        ? "bg-gray-100 text-gray-700 border-gray-200"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                    style={{ borderColor: "#E2E8F0" }}
                  >
                    {id ? se?.name || id : "All"}
                  </button>
                );
              },
            )}
          </div>
        )}

        {projectTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No tasks yet</p>
            <p className="text-xs mt-1">
              Add Level 1–4 tasks to build your project schedule
            </p>
          </div>
        ) : (
          <div className="border rounded-lg" style={{ borderColor: "#E2E8F0" }}>
            <div
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider"
              style={{ borderColor: "#E2E8F0" }}
            >
              <span className="w-3.5" />
              <span className="w-16">ID</span>
              <span className="flex-1">Task Name</span>
              <span className="hidden sm:inline w-28">Level</span>
              <span className="hidden sm:inline w-40">Dates</span>
              <span className="w-[140px]" />
              <span className="w-[80px]" />
            </div>
            {renderTaskTree(null, 0)}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="rounded-xl w-full max-w-md"
            style={{ backgroundColor: "white" }}
          >
            <div
              className="flex items-center justify-between p-5 border-b"
              style={{ borderColor: "#E2E8F0" }}
            >
              <h3 className="text-base font-bold" style={{ color: "#1A202C" }}>
                Add Task
              </h3>
              <button
                onClick={() => setShowAddTask(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Name
                </label>
                <input
                  type="text"
                  value={taskForm.name}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                  placeholder="e.g. Substructure Works"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  value={taskForm.level}
                  onChange={(e) => {
                    const lvl = Number(e.target.value) as 1 | 2 | 3 | 4;
                    setTaskForm({ ...taskForm, level: lvl, parentTaskId: "" });
                  }}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                >
                  {[1, 2, 3, 4].map((l) => (
                    <option key={l} value={l}>
                      Level {l} — {LEVEL_NAMES[l]}
                    </option>
                  ))}
                </select>
              </div>
              {taskForm.level > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Task
                  </label>
                  <select
                    value={taskForm.parentTaskId}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, parentTaskId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F7F8FA",
                    }}
                  >
                    <option value="">Select parent...</option>
                    {projectTasks
                      .filter((t) => t.level < taskForm.level && t.level >= 1)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {"—".repeat(t.level)} {t.name} ({t.id})
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Planned Start
                  </label>
                  <input
                    type="date"
                    value={taskForm.plannedStart}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, plannedStart: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F7F8FA",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Planned End
                  </label>
                  <input
                    type="date"
                    value={taskForm.plannedEnd}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, plannedEnd: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F7F8FA",
                    }}
                  />
                </div>
              </div>
            </div>
            <div
              className="flex items-center justify-end gap-3 p-5 border-t"
              style={{ borderColor: "#E2E8F0" }}
            >
              <button
                onClick={() => setShowAddTask(false)}
                className="px-4 py-2 rounded-lg border text-sm text-gray-600"
                style={{ borderColor: "#E2E8F0" }}
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                className="px-4 py-2 rounded-lg text-sm text-white font-medium"
                style={{ backgroundColor: "#E8973A" }}
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Resources Modal */}
      {assignModalTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="rounded-xl w-full max-w-lg"
            style={{ backgroundColor: "white" }}
          >
            <div
              className="flex items-center justify-between p-5 border-b"
              style={{ borderColor: "#E2E8F0" }}
            >
              <h3 className="text-base font-bold" style={{ color: "#1A202C" }}>
                Assign Resources —{" "}
                {projectTasks.find((t) => t.id === assignModalTaskId)?.name}
              </h3>
              <button
                onClick={() => setAssignModalTaskId(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div
              ref={assignModalRef}
              className="p-5 space-y-4 max-h-[60vh] overflow-y-auto"
            >
              {/* ── Main Contractor ── */}
              {(() => {
                const task = projectTasks.find(
                  (t) => t.id === assignModalTaskId,
                );
                if (!task) return null;
                const currentMain = task.vendorId
                  ? projectVendors.find((v) => v.id === task.vendorId)
                  : null;
                const availableMains = projectVendors.filter(
                  (v) =>
                    v.isMainContractor &&
                    v.id !== task.vendorId &&
                    !(task.subVendorIds || []).includes(v.id),
                );
                return (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Main Contractor
                    </h4>
                    {currentMain ? (
                      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-lg text-sm border border-blue-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-blue-100 text-blue-700">
                            M
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {currentMain.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {currentMain.trade}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {availableMains.length > 0 && (
                            <select
                              value=""
                              onChange={(e) => {
                                if (!e.target.value) return;
                                const now = Date.now();
                                setProjectTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === assignModalTaskId
                                      ? {
                                          ...t,
                                          vendorId: e.target.value,
                                          subVendorIds: t.subVendorIds || [],
                                        }
                                      : t,
                                  ),
                                );
                                setResourceAssignments((prev) => [
                                  ...prev.filter(
                                    (a) =>
                                      a.taskId !== assignModalTaskId ||
                                      a.humanResourceId !== task.vendorId,
                                  ),
                                  {
                                    id: `RA-${now}`,
                                    taskId: assignModalTaskId!,
                                    projectId: projectId!,
                                    resourceType: "human",
                                    humanResourceId: e.target.value,
                                    plannedQty: 0,
                                    plannedCost: 0,
                                  },
                                ]);
                                if (task.vendorId)
                                  setResourceAssignments((prev) =>
                                    prev.filter(
                                      (a) =>
                                        !(
                                          a.taskId === assignModalTaskId &&
                                          a.humanResourceId === task.vendorId
                                        ),
                                    ),
                                  );
                              }}
                              className="text-xs px-2 py-1 rounded border bg-white text-gray-600"
                              style={{ borderColor: "#E2E8F0" }}
                            >
                              <option value="">Change…</option>
                              {availableMains.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name}
                                </option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={() => {
                              setProjectTasks((prev) =>
                                prev.map((t) =>
                                  t.id === assignModalTaskId
                                    ? { ...t, vendorId: null }
                                    : t,
                                ),
                              );
                              setResourceAssignments((prev) =>
                                prev.filter(
                                  (a) =>
                                    !(
                                      a.taskId === assignModalTaskId &&
                                      a.humanResourceId === task.vendorId
                                    ),
                                ),
                              );
                            }}
                            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : projectVendors.some((v) => v.isMainContractor) ? (
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const now = Date.now();
                          setProjectTasks((prev) =>
                            prev.map((t) =>
                              t.id === assignModalTaskId
                                ? { ...t, vendorId: e.target.value }
                                : t,
                            ),
                          );
                          setResourceAssignments((prev) => [
                            ...prev,
                            {
                              id: `RA-${now}`,
                              taskId: assignModalTaskId!,
                              projectId: projectId!,
                              resourceType: "human",
                              humanResourceId: e.target.value,
                              plannedQty: 0,
                              plannedCost: 0,
                            },
                          ]);
                        }}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          borderColor: "#E2E8F0",
                          backgroundColor: "#F7F8FA",
                        }}
                      >
                        <option value="">Set main contractor…</option>
                        {projectVendors
                          .filter((v) => v.isMainContractor)
                          .map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} — {v.trade}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No main contractors registered. Mark a contractor as
                        "Main" in the Contractors step.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* ── Subcontractors ── */}
              {(() => {
                const task = projectTasks.find(
                  (t) => t.id === assignModalTaskId,
                );
                if (!task) return null;
                const subs = (task.subVendorIds || [])
                  .map((sid) => projectVendors.find((v) => v.id === sid))
                  .filter(Boolean) as Vendor[];
                const availableSubs = projectVendors.filter(
                  (v) =>
                    v.id !== task.vendorId &&
                    !(task.subVendorIds || []).includes(v.id),
                );
                return (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Subcontractors
                      {subs.length > 0 && (
                        <span className="text-xs text-gray-400 font-normal">
                          ({subs.length})
                        </span>
                      )}
                    </h4>
                    {subs.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {subs.map((sub) => (
                          <div
                            key={sub!.id}
                            className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm border"
                            style={{ borderColor: "#E2E8F0" }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold bg-orange-100 text-orange-700">
                                S
                              </div>
                              <span className="font-medium text-gray-900">
                                {sub!.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {sub!.trade}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setProjectTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === assignModalTaskId
                                      ? {
                                          ...t,
                                          subVendorIds: (
                                            t.subVendorIds || []
                                          ).filter((sid) => sid !== sub!.id),
                                        }
                                      : t,
                                  ),
                                );
                                setResourceAssignments((prev) =>
                                  prev.filter(
                                    (a) =>
                                      !(
                                        a.taskId === assignModalTaskId &&
                                        a.humanResourceId === sub!.id
                                      ),
                                  ),
                                );
                              }}
                              className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {availableSubs.length > 0 ? (
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const now = Date.now();
                          setProjectTasks((prev) =>
                            prev.map((t) =>
                              t.id === assignModalTaskId
                                ? {
                                    ...t,
                                    subVendorIds: [
                                      ...(t.subVendorIds || []),
                                      e.target.value,
                                    ],
                                  }
                                : t,
                            ),
                          );
                          setResourceAssignments((prev) => [
                            ...prev,
                            {
                              id: `RA-${now}`,
                              taskId: assignModalTaskId!,
                              projectId: projectId!,
                              resourceType: "human",
                              humanResourceId: e.target.value,
                              plannedQty: 0,
                              plannedCost: 0,
                            },
                          ]);
                        }}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{
                          borderColor: "#E2E8F0",
                          backgroundColor: "#F7F8FA",
                        }}
                      >
                        <option value="">Add subcontractor…</option>
                        {availableSubs.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} — {v.trade}
                          </option>
                        ))}
                      </select>
                    ) : (
                      subs.length > 0 && (
                        <p className="text-xs text-gray-400 italic">
                          All vendors assigned
                        </p>
                      )
                    )}
                    {projectVendors.length === 0 && (
                      <p className="text-xs text-gray-400 italic">
                        No vendors registered. Add contractors first.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* ── Other Resources ── */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Other Resources
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Resource Type
                    </label>
                    <div className="flex gap-2">
                      {(["human", "material", "equipment"] as const).map(
                        (rt) => (
                          <button
                            key={rt}
                            onClick={() =>
                              setAssignForm({
                                ...assignForm,
                                resourceType: rt,
                                resourceId: "",
                              })
                            }
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              assignForm.resourceType === rt
                                ? rt === "human"
                                  ? "bg-blue-50 border-blue-400 text-blue-700"
                                  : rt === "material"
                                    ? "bg-green-50 border-green-400 text-green-700"
                                    : "bg-amber-50 border-amber-400 text-amber-700"
                                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {rt === "human"
                              ? "Human"
                              : rt === "material"
                                ? "Material"
                                : "Equipment"}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <div>
                    {assignForm.resourceType === "human" &&
                      projectStaff.length + projectContractors.length === 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          No employees or individual contractors registered.
                        </p>
                      )}
                    {assignForm.resourceType === "material" &&
                      projectMaterials.length === 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          No materials registered. Go to Materials step first.
                        </p>
                      )}
                    {assignForm.resourceType === "equipment" &&
                      projectEquipment.length === 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          No equipment registered. Go to Equipment step first.
                        </p>
                      )}
                    {assignForm.resourceType === "human" &&
                      projectStaff.length + projectContractors.length > 0 && (
                        <div className="mb-16">
                          <SearchableMultiSelect
                            options={[
                              ...projectStaff.map((r) => ({
                                label: `${r.name} — ${r.trade}`,
                                value: r.id,
                                group: "Employees",
                              })),
                              ...projectContractors.map((r) => ({
                                label: `${r.name} — ${r.trade}${r.payRate ? ` (${getCurrencySymbol()}${formatNumberByGeneralSettings(r.payRate)}/${r.payRateUnit})` : ""}`,
                                value: r.id,
                                group: "Contractors",
                              })),
                            ]}
                            value={selectedResourceIds}
                            onChange={setSelectedResourceIds}
                            placeholder="Select employees or individual contractors..."
                            searchPlaceholder="Search..."
                          />
                        </div>
                      )}
                    {assignForm.resourceType === "material" && (
                      <div className="mb-16">
                        <SearchableMultiSelect
                          options={projectMaterials.map((m) => ({
                            label: `${m.name} (${m.category})`,
                            value: m.id,
                            group: m.category,
                          }))}
                          value={selectedResourceIds}
                          onChange={setSelectedResourceIds}
                          placeholder="Select materials..."
                          onNotFoundAction={{
                            label: "Submit Procurement Request",
                            onClick: (q) => {
                              alert(
                                `Procurement request for "${q}" will be submitted.`,
                              );
                            },
                          }}
                        />
                      </div>
                    )}
                    {assignForm.resourceType === "equipment" && (
                      <div className="mb-16">
                        <SearchableMultiSelect
                          options={projectEquipment.map((e) => ({
                            label: `${e.name} (${e.category})`,
                            value: e.id,
                            group:
                              e.ownership === "company-owned"
                                ? "Company Owned"
                                : "External",
                          }))}
                          value={selectedResourceIds}
                          onChange={setSelectedResourceIds}
                          placeholder="Select equipment..."
                          onNotFoundAction={{
                            label: "Add External Equipment",
                            onClick: (q) => {
                              alert(
                                `External equipment form for "${q}" will be opened.`,
                              );
                            },
                          }}
                        />
                      </div>
                    )}
                  </div>
                  {(() => {
                    const rId = assignForm.resourceId;
                    if (!rId) return null;
                    let hideQty = false;
                    let hideCost = false;
                    let costLabel = `Planned Cost (${getCurrencySymbol()})`;
                    if (assignForm.resourceType === "human") {
                      const isEmployee = projectStaff.some((s) => s.id === rId);
                      if (isEmployee) {
                        hideQty = true;
                        hideCost = true;
                      }
                    }
                    if (assignForm.resourceType === "material") {
                      const mat = projectMaterials.find((m) => m.id === rId);
                      if (mat?.procurementSource === "internal")
                        hideCost = true;
                    }
                    if (assignForm.resourceType === "equipment") {
                      const eq = projectEquipment.find((e) => e.id === rId);
                      if (eq?.ownership === "company-owned") hideCost = true;
                    }
                    if (hideQty && hideCost) {
                      return (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Cost and quantity managed through existing records.
                        </p>
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        {!hideQty && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Planned Quantity
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={assignForm.plannedQty}
                              onChange={(e) =>
                                setAssignForm({
                                  ...assignForm,
                                  plannedQty: Number(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={{
                                borderColor: "#E2E8F0",
                                backgroundColor: "#F7F8FA",
                              }}
                            />
                          </div>
                        )}
                        {!hideCost && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {costLabel}
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={assignForm.plannedCost}
                              onChange={(e) =>
                                setAssignForm({
                                  ...assignForm,
                                  plannedCost: Number(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={{
                                borderColor: "#E2E8F0",
                                backgroundColor: "#F7F8FA",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => {
                      if (
                        selectedResourceIds.length === 0 ||
                        !assignModalTaskId
                      )
                        return;
                      const now = Date.now();
                      const newAssignments: ResourceAssignment[] =
                        selectedResourceIds.map((rid, i) => ({
                          id: `RA-${now + i}`,
                          taskId: assignModalTaskId,
                          projectId: projectId || "",
                          resourceType: assignForm.resourceType,
                          ...(assignForm.resourceType === "human"
                            ? { humanResourceId: rid }
                            : {}),
                          ...(assignForm.resourceType === "material"
                            ? { materialResourceId: rid }
                            : {}),
                          ...(assignForm.resourceType === "equipment"
                            ? { equipmentResourceId: rid }
                            : {}),
                          plannedQty: assignForm.plannedQty,
                          plannedCost: assignForm.plannedCost,
                        }));
                      setResourceAssignments((prev) => [
                        ...prev,
                        ...newAssignments,
                      ]);
                      setSelectedResourceIds([]);
                      setAssignForm({
                        resourceType: "human",
                        resourceId: "",
                        plannedQty: 0,
                        plannedCost: 0,
                      });
                    }}
                    disabled={selectedResourceIds.length === 0}
                    className="w-full px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-40"
                    style={{ backgroundColor: "#E8973A" }}
                  >
                    Add to Task
                  </button>
                </div>
              </div>
            </div>
            <div
              className="flex justify-end p-5 border-t"
              style={{ borderColor: "#E2E8F0" }}
            >
              <button
                onClick={() => setAssignModalTaskId(null)}
                className="px-4 py-2 rounded-lg border text-sm text-gray-600"
                style={{ borderColor: "#E2E8F0" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Step 3 — Vendor Registration
  const renderHumanResources = () => {
    const allHumanResources = [
      ...projectStaff.map((s) => ({ ...s, _subtype: "Employee" as const })),
      ...projectContractors.map((c) => ({
        ...c,
        _subtype: "Contractor" as const,
      })),
      ...projectVendors.map((v) => ({
        ...v,
        id: v.id,
        name: v.name,
        trade: v.trade,
        _subtype: "Vendor" as const,
        extra: v.contractType,
      })),
    ];

    const SubPill = ({
      label,
      value,
    }: {
      label: string;
      value: HumanResourceSource;
    }) => (
      <button
        onClick={() => setHumanSubType(value)}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
          humanSubType === value
            ? "bg-white text-gray-900 shadow-sm border"
            : "text-gray-500 hover:text-gray-700 border border-transparent"
        }`}
      >
        {label}
      </button>
    );

    return (
      <div className="space-y-4">
        {/* Sub-type pills */}
        <div className="flex gap-1.5">
          <SubPill label="Employees" value="employee" />
          <SubPill
            label="Individual Contractors"
            value="individual-contractor"
          />
          <SubPill label="Contractors" value="vendor" />
        </div>

        {/* ── Employee Form ── */}
        {humanSubType === "employee" && (
          <div
            className="rounded-xl border p-6"
            style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: "#1A202C" }}>
              {basicInfo.contractingModel === "developer"
                ? "Select Employee (Our Team)"
                : basicInfo.contractingModel === "contractor"
                  ? "Select Employee (Self-Perform)"
                  : "Select Employee (Management Team)"}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Choose Employees from HR
              </label>
              <SearchableMultiSelect
                options={hrEmployees
                  .filter(
                    (e) => !projectStaff.some((s) => s.employeeId === e.id),
                  )
                  .map((e) => ({
                    label: `${e.firstName} ${e.lastName} — ${e.role}`,
                    value: e.id,
                    group: e.role,
                  }))}
                value={selectedEmployeeIds}
                onChange={setSelectedEmployeeIds}
                placeholder="Search employees..."
              />
            </div>
            {selectedEmployeeIds.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                <span className="font-medium">
                  {selectedEmployeeIds.length}
                </span>{" "}
                employee(s) selected.
              </p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={addStaff}
                disabled={selectedEmployeeIds.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "#E8973A" }}
              >
                <Plus className="w-4 h-4" /> Assign to Project
              </button>
            </div>
          </div>
        )}

        {/* ── Individual Contractor Form ── */}
        {humanSubType === "individual-contractor" && (
          <div
            className="rounded-xl border p-6"
            style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: "#1A202C" }}>
              {basicInfo.contractingModel === "developer"
                ? "Select Individual Contractor (Direct Hires)"
                : basicInfo.contractingModel === "contractor"
                  ? "Select Individual Contractor (Self-Perform)"
                  : "Select Individual Contractor (Direct Hires)"}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Choose Contractors
              </label>
              <SearchableMultiSelect
                options={individualContractors
                  .filter(
                    (c) => !projectContractors.some((pc) => pc.name === c.name),
                  )
                  .map((c) => ({
                    label: `${c.name} — ${c.trade}`,
                    value: c.id,
                    group: c.trade,
                  }))}
                value={selectedContractorIds}
                onChange={setSelectedContractorIds}
                placeholder="Search contractors..."
              />
              <div className="mt-2">
                <button
                  onClick={() => setIsNewContractor(true)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  + Register New Contractor
                </button>
              </div>
            </div>
            {isNewContractor && (
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border mb-4"
                style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
              >
                <p className="text-sm font-medium text-gray-700 col-span-full">
                  New Contractor Details
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={contractorForm.name}
                    onChange={(e) =>
                      setContractorForm({
                        ...contractorForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
                    placeholder="e.g. Babatunde Welder"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trade
                  </label>
                  <select
                    value={contractorForm.trade}
                    onChange={(e) =>
                      setContractorForm({
                        ...contractorForm,
                        trade: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
                  >
                    <option value="">Select trade</option>
                    {tradeTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pay Rate ({getCurrencySymbol()})
                  </label>
                  <input
                    type="number"
                    value={contractorForm.payRate || ""}
                    onChange={(e) =>
                      setContractorForm({
                        ...contractorForm,
                        payRate: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
                    placeholder="e.g. 25000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate Unit
                  </label>
                  <select
                    value={contractorForm.payRateUnit}
                    onChange={(e) =>
                      setContractorForm({
                        ...contractorForm,
                        payRateUnit: e.target.value as
                          | "daily"
                          | "weekly"
                          | "monthly"
                          | "lump-sum",
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
                  >
                    <option value="daily">Per Day</option>
                    <option value="weekly">Per Week</option>
                    <option value="monthly">Per Month</option>
                    <option value="lump-sum">Lump Sum</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Skilled Workers
                    </label>
                    <input
                      type="number"
                      value={contractorForm.skilledCount || ""}
                      onChange={(e) =>
                        setContractorForm({
                          ...contractorForm,
                          skilledCount: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        borderColor: "#E2E8F0",
                        backgroundColor: "white",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unskilled Workers
                    </label>
                    <input
                      type="number"
                      value={contractorForm.unskilledCount || ""}
                      onChange={(e) =>
                        setContractorForm({
                          ...contractorForm,
                          unskilledCount: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        borderColor: "#E2E8F0",
                        backgroundColor: "white",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Man-days Estimate
                  </label>
                  <input
                    type="number"
                    value={contractorForm.mandaysEstimate || ""}
                    onChange={(e) =>
                      setContractorForm({
                        ...contractorForm,
                        mandaysEstimate: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
                  />
                </div>
                <div className="flex justify-end gap-2 col-span-full">
                  <button
                    onClick={() => setIsNewContractor(false)}
                    className="px-3 py-1.5 rounded-lg border text-xs text-gray-600"
                    style={{ borderColor: "#E2E8F0" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!contractorForm.name || !contractorForm.trade) return;
                      const newCon: HumanResource = {
                        id: getNextId("Contractor"),
                        projectId: projectId!,
                        source: "individual-contractor",
                        name: contractorForm.name,
                        trade: contractorForm.trade,
                        payRate: contractorForm.payRate || undefined,
                        payRateUnit: contractorForm.payRateUnit,
                        skilledCount: contractorForm.skilledCount,
                        unskilledCount: contractorForm.unskilledCount,
                        mandaysEstimate: contractorForm.mandaysEstimate,
                        status: contractorForm.status,
                        assignedWorkPackages: [],
                        blockAssignment: "",
                      };
                      setProjectContractors((prev) => [...prev, newCon]);
                      setContractorForm(EMPTY_CONTRACTOR_FORM);
                      setIsNewContractor(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-white font-medium"
                    style={{ backgroundColor: "#E8973A" }}
                  >
                    Add Contractor
                  </button>
                </div>
              </div>
            )}
            {selectedContractorIds.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                <span className="font-medium">
                  {selectedContractorIds.length}
                </span>{" "}
                contractor(s) selected.
              </p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={addContractor}
                disabled={selectedContractorIds.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "#E8973A" }}
              >
                <Plus className="w-4 h-4" /> Assign to Project
              </button>
            </div>
          </div>
        )}

        {/* ── Contractor Companies Form ── */}
        {humanSubType === "vendor" && (
          <div
            className="rounded-xl border p-6"
            style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: "#1A202C" }}>
              {basicInfo.contractingModel === "developer"
                ? "Select Contractor (Main + Subs)"
                : basicInfo.contractingModel === "contractor"
                  ? "Select Subcontractor"
                  : "Select Trade Contractor"}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Choose Contractors
              </label>
              <SearchableMultiSelect
                options={(
                  uniqueVendors as { id: string; name: string; trade: string }[]
                )
                  .filter(
                    (v) => !projectVendors.some((pv) => pv.name === v.name),
                  )
                  .map((v) => ({
                    label: `${v.name} — ${v.trade}`,
                    value: v.id,
                    group: v.trade,
                  }))}
                value={selectedVendorIds}
                onChange={setSelectedVendorIds}
                placeholder="Search contractors..."
              />
            </div>
            {selectedVendorIds.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                <span className="font-medium">{selectedVendorIds.length}</span>{" "}
                contractor(s) selected.
              </p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={addVendor}
                disabled={selectedVendorIds.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "#E8973A" }}
              >
                <Plus className="w-4 h-4" /> Assign to Project
              </button>
            </div>
          </div>
        )}

        {/* Registered list — show all human resources */}
        {allHumanResources.length > 0 && (
          <div
            className="rounded-xl border"
            style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
          >
            <div
              className="px-5 py-3 border-b flex items-center justify-between gap-3 flex-wrap"
              style={{ borderColor: "#E2E8F0" }}
            >
              <h3
                className="text-sm font-semibold"
                style={{ color: "#1A202C" }}
              >
                Registered Human Resources ({allHumanResources.length})
              </h3>
              <input
                type="text"
                value={hrSearch}
                onChange={(e) => setHrSearch(e.target.value)}
                placeholder="Search resources..."
                className="px-3 py-1.5 rounded-lg border text-xs"
                style={{
                  borderColor: "#E2E8F0",
                  backgroundColor: "#F7F8FA",
                  maxWidth: 200,
                }}
              />
            </div>
            <div className="divide-y" style={{ borderColor: "#E2E8F0" }}>
              {/* Section: Employees */}
              {projectStaff.filter(
                (s) =>
                  !hrSearch ||
                  s.name.toLowerCase().includes(hrSearch.toLowerCase()) ||
                  s.trade.toLowerCase().includes(hrSearch.toLowerCase()),
              ).length > 0 && (
                <div>
                  <div
                    className="px-5 py-2 bg-gray-50 flex items-center gap-2 cursor-pointer select-none"
                    onClick={() =>
                      setHrSectionOpen((prev) => ({
                        ...prev,
                        employee: !prev.employee,
                      }))
                    }
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                      <Users className="w-3 h-3" />{" "}
                      {basicInfo.contractingModel === "developer"
                        ? "Our Team"
                        : basicInfo.contractingModel === "contractor"
                          ? "Self-Perform"
                          : "Management Team"}
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                      {projectStaff.length}
                    </span>
                    {hrSectionOpen.employee ? (
                      <ChevronDown className="w-3 h-3 text-gray-400 ml-auto" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-400 ml-auto" />
                    )}
                  </div>
                  {hrSectionOpen.employee &&
                    projectStaff
                      .filter(
                        (s) =>
                          !hrSearch ||
                          s.name
                            .toLowerCase()
                            .includes(hrSearch.toLowerCase()) ||
                          s.trade
                            .toLowerCase()
                            .includes(hrSearch.toLowerCase()),
                      )
                      .map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between px-5 py-2.5 text-sm pl-10"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: "#3B82F6" }}
                            >
                              {s.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {s.name}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                {s.trade}
                                {s.dailyRate
                                  ? ` · ${getCurrencySymbol()}${formatNumberByGeneralSettings(s.dailyRate)}/day`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeStaff(s.id)}
                            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                </div>
              )}
              {/* Section: Individual Contractors */}
              {projectContractors.filter(
                (c) =>
                  !hrSearch ||
                  c.name.toLowerCase().includes(hrSearch.toLowerCase()) ||
                  c.trade.toLowerCase().includes(hrSearch.toLowerCase()),
              ).length > 0 && (
                <div>
                  <div
                    className="px-5 py-2 bg-gray-50 flex items-center gap-2 cursor-pointer select-none"
                    onClick={() =>
                      setHrSectionOpen((prev) => ({
                        ...prev,
                        contractor: !prev.contractor,
                      }))
                    }
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 flex items-center gap-1">
                      <Users className="w-3 h-3" />{" "}
                      {basicInfo.contractingModel === "developer"
                        ? "Direct Hires"
                        : basicInfo.contractingModel === "contractor"
                          ? "Self-Perform"
                          : "Direct Hires"}
                    </span>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                      {projectContractors.length}
                    </span>
                    {hrSectionOpen.contractor ? (
                      <ChevronDown className="w-3 h-3 text-gray-400 ml-auto" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-400 ml-auto" />
                    )}
                  </div>
                  {hrSectionOpen.contractor &&
                    projectContractors
                      .filter(
                        (c) =>
                          !hrSearch ||
                          c.name
                            .toLowerCase()
                            .includes(hrSearch.toLowerCase()) ||
                          c.trade
                            .toLowerCase()
                            .includes(hrSearch.toLowerCase()),
                      )
                      .map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between px-5 py-2.5 text-sm pl-10"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: "#8B5CF6" }}
                            >
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {c.name}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                {c.trade}
                                {c.payRate
                                  ? ` · ${getCurrencySymbol()}${formatNumberByGeneralSettings(c.payRate)}/${c.payRateUnit}`
                                  : ""}{" "}
                                · {(c.skilledCount ?? 0) + (c.unskilledCount ?? 0)} workers
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeContractor(c.id)}
                            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                </div>
              )}
              {/* Section: Contractor Companies */}
              {projectVendors.filter(
                (v) =>
                  !hrSearch ||
                  v.name.toLowerCase().includes(hrSearch.toLowerCase()) ||
                  v.trade.toLowerCase().includes(hrSearch.toLowerCase()),
              ).length > 0 && (
                <div>
                  <div
                    className="px-5 py-2 bg-gray-50 flex items-center gap-2 cursor-pointer select-none"
                    onClick={() =>
                      setHrSectionOpen((prev) => ({
                        ...prev,
                        vendor: !prev.vendor,
                      }))
                    }
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />{" "}
                      {basicInfo.contractingModel === "developer"
                        ? "Main + Sub Contractors"
                        : basicInfo.contractingModel === "contractor"
                          ? "Subcontractors"
                          : "Trade Contractors"}
                    </span>
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                      {projectVendors.length}
                    </span>
                    {hrSectionOpen.vendor ? (
                      <ChevronDown className="w-3 h-3 text-gray-400 ml-auto" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-400 ml-auto" />
                    )}
                  </div>
                  {hrSectionOpen.vendor &&
                    projectVendors
                      .filter(
                        (v) =>
                          !hrSearch ||
                          v.name
                            .toLowerCase()
                            .includes(hrSearch.toLowerCase()) ||
                          v.trade
                            .toLowerCase()
                            .includes(hrSearch.toLowerCase()),
                      )
                      .map((v) => {
                        const reps = v.representatives || [];
                        const repCount = reps.length;
                        return (
                          <div key={v.id}>
                            <div className="flex items-center justify-between px-5 py-2.5 text-sm pl-10">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                  style={{ backgroundColor: "#E8973A" }}
                                >
                                  {v.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                                    {v.name}
                                    {basicInfo.contractingModel ===
                                      "developer" &&
                                      v.isMainContractor && (
                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                                          Main Contractor
                                        </span>
                                      )}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    {v.trade} · {v.contractType}
                                    {v.parentContractorId &&
                                      projectVendors.find(
                                        (p) => p.id === v.parentContractorId,
                                      ) && (
                                        <span className="ml-1 text-[10px] text-gray-400">
                                          — Sub of{" "}
                                          {
                                            projectVendors.find(
                                              (p) =>
                                                p.id === v.parentContractorId,
                                            )!.name
                                          }
                                        </span>
                                      )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {basicInfo.contractingModel === "developer" && (
                                  <button
                                    onClick={() => assignMainContractor(v.id)}
                                    className={`px-2 py-1 rounded text-[10px] font-medium border hover:bg-blue-50 ${
                                      v.isMainContractor
                                        ? "bg-blue-100 text-blue-700 border-blue-200"
                                        : "text-blue-600"
                                    }`}
                                    style={{
                                      borderColor: v.isMainContractor
                                        ? "#BFDBFE"
                                        : "#E2E8F0",
                                    }}
                                    title={
                                      v.isMainContractor
                                        ? "Remove Main Contractor status"
                                        : "Designate as Main Contractor"
                                    }
                                  >
                                    {v.isMainContractor
                                      ? "★ Main"
                                      : "Set as Main"}
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    setRepExpandedVendorId(
                                      repExpandedVendorId === v.id
                                        ? null
                                        : v.id,
                                    )
                                  }
                                  className="px-2 py-1 rounded text-[10px] font-medium border hover:bg-gray-50 text-gray-600"
                                  style={{ borderColor: "#E2E8F0" }}
                                >
                                  Reps ({repCount})
                                </button>
                                <button
                                  onClick={() => removeVendor(v.id)}
                                  className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {/* Representatives section */}
                            {repExpandedVendorId === v.id && (
                              <div className="px-5 pb-3 pl-16">
                                <div
                                  className="rounded-lg border p-3 space-y-2"
                                  style={{
                                    borderColor: "#E2E8F0",
                                    backgroundColor: "#F7F8FA",
                                  }}
                                >
                                  {reps.length === 0 && (
                                    <p className="text-xs text-gray-400">
                                      No representatives added yet.
                                    </p>
                                  )}
                                  {reps.map((r) => (
                                    <div
                                      key={r.id}
                                      className="flex items-center justify-between gap-2 bg-white rounded px-3 py-2 border"
                                      style={{ borderColor: "#E2E8F0" }}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900">
                                          {r.fullName}
                                        </p>
                                        <p className="text-[10px] text-gray-500">
                                          {r.position} · {r.email} · {r.phone}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <span
                                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                                        >
                                          {r.isActive ? "Active" : "Inactive"}
                                        </span>
                                        <button
                                          onClick={() =>
                                            toggleRepresentativeActive(
                                              v.id,
                                              r.id,
                                            )
                                          }
                                          className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                          title="Toggle active status"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            removeRepresentative(v.id, r.id)
                                          }
                                          className="p-0.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                                          title="Remove representative"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {/* Add new rep form */}
                                  <div className="grid grid-cols-4 gap-2">
                                    <input
                                      type="text"
                                      value={newRepForm.fullName}
                                      onChange={(e) =>
                                        setNewRepForm((prev) => ({
                                          ...prev,
                                          fullName: e.target.value,
                                        }))
                                      }
                                      placeholder="Full name"
                                      className="px-2 py-1.5 text-xs rounded border"
                                      style={{
                                        borderColor: "#E2E8F0",
                                        backgroundColor: "white",
                                      }}
                                    />
                                    <input
                                      type="text"
                                      value={newRepForm.email}
                                      onChange={(e) =>
                                        setNewRepForm((prev) => ({
                                          ...prev,
                                          email: e.target.value,
                                        }))
                                      }
                                      placeholder="Email"
                                      className="px-2 py-1.5 text-xs rounded border"
                                      style={{
                                        borderColor: "#E2E8F0",
                                        backgroundColor: "white",
                                      }}
                                    />
                                    <input
                                      type="text"
                                      value={newRepForm.phone}
                                      onChange={(e) =>
                                        setNewRepForm((prev) => ({
                                          ...prev,
                                          phone: e.target.value,
                                        }))
                                      }
                                      placeholder="Phone"
                                      className="px-2 py-1.5 text-xs rounded border"
                                      style={{
                                        borderColor: "#E2E8F0",
                                        backgroundColor: "white",
                                      }}
                                    />
                                    <input
                                      type="text"
                                      value={newRepForm.position}
                                      onChange={(e) =>
                                        setNewRepForm((prev) => ({
                                          ...prev,
                                          position: e.target.value,
                                        }))
                                      }
                                      placeholder="Position"
                                      className="px-2 py-1.5 text-xs rounded border"
                                      style={{
                                        borderColor: "#E2E8F0",
                                        backgroundColor: "white",
                                      }}
                                    />
                                  </div>
                                  <button
                                    onClick={() => addRepresentative(v.id)}
                                    disabled={!newRepForm.fullName.trim()}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-white disabled:opacity-50"
                                    style={{ backgroundColor: "#E8973A" }}
                                  >
                                    <Plus className="w-3 h-3" /> Add
                                    Representative
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                </div>
              )}
              {/* Empty search */}
              {allHumanResources.length > 0 &&
                projectStaff.filter(
                  (s) =>
                    !hrSearch ||
                    s.name.toLowerCase().includes(hrSearch.toLowerCase()),
                ).length === 0 &&
                projectContractors.filter(
                  (c) =>
                    !hrSearch ||
                    c.name.toLowerCase().includes(hrSearch.toLowerCase()),
                ).length === 0 &&
                projectVendors.filter(
                  (v) =>
                    !hrSearch ||
                    v.name.toLowerCase().includes(hrSearch.toLowerCase()),
                ).length === 0 && (
                  <div className="px-5 py-6 text-center text-sm text-gray-400">
                    No resources match your search.
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ──── INLINE ROLE ASSIGNMENTS ──── */}
        {allHumanResources.length > 0 && (
          <>
            <div
              className="rounded-xl border"
              style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
            >
              <div
                className="px-5 py-3 border-b"
                style={{ borderColor: "#E2E8F0" }}
              >
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "#1A202C" }}
                >
                  Project Role Assignments
                </h3>
              </div>
              <div className="divide-y" style={{ borderColor: "#E2E8F0" }}>
                {projectStaff.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-5 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: "#3B82F6" }}
                      >
                        {s.name.charAt(0)}
                      </div>
                      <p className="font-medium text-gray-900 text-xs">
                        {s.name}{" "}
                        <span className="text-gray-400 font-normal">
                          (Employee)
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={
                          humanResourceRoles.find(
                            (r) => r.humanResourceId === s.id,
                          )?.projectRoleId || ""
                        }
                        onChange={(e) =>
                          e.target.value
                            ? assignRoleToResource(s.id, e.target.value)
                            : removeRoleFromResource(s.id)
                        }
                        className="px-2 py-1 text-xs rounded border"
                        style={{ borderColor: "#E2E8F0" }}
                      >
                        <option value="">No role</option>
                        {projectRoles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      {getResourceRole(s.id) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {getResourceRole(s.id)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {projectContractors.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-5 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: "#8B5CF6" }}
                      >
                        {c.name.charAt(0)}
                      </div>
                      <p className="font-medium text-gray-900 text-xs">
                        {c.name}{" "}
                        <span className="text-gray-400 font-normal">
                          (Contractor)
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={
                          humanResourceRoles.find(
                            (r) => r.humanResourceId === c.id,
                          )?.projectRoleId || ""
                        }
                        onChange={(e) =>
                          e.target.value
                            ? assignRoleToResource(c.id, e.target.value)
                            : removeRoleFromResource(c.id)
                        }
                        className="px-2 py-1 text-xs rounded border"
                        style={{ borderColor: "#E2E8F0" }}
                      >
                        <option value="">No role</option>
                        {projectRoles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      {getResourceRole(c.id) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {getResourceRole(c.id)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {projectVendors
                  .flatMap((v) =>
                    (v.representatives || []).map((r) => ({
                      ...r,
                      companyName: v.name,
                    })),
                  )
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: "#E8973A" }}
                        >
                          {r.fullName.charAt(0)}
                        </div>
                        <p className="font-medium text-gray-900 text-xs">
                          {r.fullName}{" "}
                          <span className="text-gray-400 font-normal">
                            ({r.companyName})
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={
                            humanResourceRoles.find(
                              (hr) => hr.humanResourceId === r.id,
                            )?.projectRoleId || ""
                          }
                          onChange={(e) =>
                            e.target.value
                              ? assignRoleToResource(r.id, e.target.value)
                              : removeRoleFromResource(r.id)
                          }
                          className="px-2 py-1 text-xs rounded border"
                          style={{ borderColor: "#E2E8F0" }}
                        >
                          <option value="">No role</option>
                          {projectRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        {getResourceRole(r.id) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            {getResourceRole(r.id)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMaterials = () => {
    return (
      <div className="space-y-4">
        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: "#1A202C" }}>
            Select Materials
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Material from Inventory
              </label>
              <SearchableMultiSelect
                options={materialInventory.map((i) => ({
                  label: `${i.name} (${i.inStock} ${i.unit} in stock) — ${getCurrencySymbol()}${formatNumberByGeneralSettings(i.defaultUnitCost)}/${i.unit}`,
                  value: i.id,
                  group: i.category,
                }))}
                value={selectedMaterialIds}
                onChange={setSelectedMaterialIds}
                placeholder="Search material..."
                onNotFoundAction={{
                  label: "Submit Procurement Request",
                  onClick: (q) => {
                    setProcurementQuery(q);
                    setShowProcurementModal(true);
                  },
                }}
              />
            </div>
            {selectedMaterialIds.length > 0 && (
              <p className="text-sm text-gray-500">
                <span className="font-medium">
                  {selectedMaterialIds.length}
                </span>{" "}
                material(s) selected. Click "Add Selected" to add to project.
              </p>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={addMaterial}
              disabled={selectedMaterialIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "#E8973A" }}
            >
              <Plus className="w-4 h-4" /> Add Selected to Project Materials
            </button>
          </div>
        </div>

        {projectMaterials.length > 0 && (
          <div
            className="rounded-xl border"
            style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
          >
            <div
              className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: "#E2E8F0" }}
            >
              <h3
                className="text-sm font-semibold"
                style={{ color: "#1A202C" }}
              >
                Registered Materials ({projectMaterials.length})
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: "#E2E8F0" }}>
              {projectMaterials.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: "#10B981" }}
                    >
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500">
                        {m.category} · {m.estimatedQty} {m.unit} ·{" "}
                        {getCurrencySymbol()}
                        {formatNumberByGeneralSettings(m.estimatedUnitCost)}/{m.unit}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Total: {getCurrencySymbol()}
                        {formatNumberByGeneralSettings(m.totalEstimatedCost)} ·{" "}
                        {m.procurementSource === "purchase"
                          ? "Purchased"
                          : "Internal"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMaterial(m.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Procurement Request Modal */}
        {showProcurementModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div
              className="rounded-xl w-full max-w-md"
              style={{ backgroundColor: "white" }}
            >
              <div
                className="flex items-center justify-between p-5 border-b"
                style={{ borderColor: "#E2E8F0" }}
              >
                <h3
                  className="text-base font-bold"
                  style={{ color: "#1A202C" }}
                >
                  Submit Procurement Request
                </h3>
                <button
                  onClick={() => setShowProcurementModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Material Name
                  </label>
                  <input
                    type="text"
                    value={procurementQuery}
                    disabled
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-gray-50"
                    style={{ borderColor: "#E2E8F0" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Required
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F7F8FA",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Specifications, delivery date, etc."
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F7F8FA",
                    }}
                  />
                </div>
              </div>
              <div
                className="flex items-center justify-end gap-3 p-5 border-t"
                style={{ borderColor: "#E2E8F0" }}
              >
                <button
                  onClick={() => setShowProcurementModal(false)}
                  className="px-4 py-2 rounded-lg border text-sm text-gray-600"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    alert("Procurement request submitted.");
                    setShowProcurementModal(false);
                  }}
                  className="px-4 py-2 rounded-lg text-sm text-white font-medium"
                  style={{ backgroundColor: "#E8973A" }}
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEquipment = () => {
    const equipmentCategories = [
      "Earthwork",
      "Lifting",
      "Concreting",
      "Compaction",
      "Piling",
      "Transport",
      "Generators / Power",
      "Pumping",
      "Safety",
      "Other",
    ];
    return (
      <div className="space-y-4">
        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: "#1A202C" }}>
            Select Equipment
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Equipment from Company Fleet
              </label>
              <SearchableMultiSelect
                options={equipmentInventory.map((e) => ({
                  label: `${e.name} — ${e.category} (${e.status})`,
                  value: e.id,
                  group: e.category,
                }))}
                value={selectedFleetEquipmentIds}
                onChange={setSelectedFleetEquipmentIds}
                placeholder="Search equipment..."
                onNotFoundAction={{
                  label: "Add External Equipment",
                  onClick: (q) => {
                    setEquipmentForm({
                      ...equipmentForm,
                      ownership: "client-supplied",
                      name: q,
                      category: "",
                    });
                    setExternalEquipType("client-supplied");
                    setShowExternalEquipmentModal(true);
                  },
                }}
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={addEquipment}
              disabled={selectedFleetEquipmentIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "#E8973A" }}
            >
              <Plus className="w-4 h-4" /> Add Selected to Project Equipment
            </button>
          </div>
        </div>

        {projectEquipment.length > 0 && (
          <div
            className="rounded-xl border"
            style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
          >
            <div
              className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: "#E2E8F0" }}
            >
              <h3
                className="text-sm font-semibold"
                style={{ color: "#1A202C" }}
              >
                Registered Equipment ({projectEquipment.length})
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: "#E2E8F0" }}>
              {projectEquipment.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: "#F59E0B" }}
                    >
                      {e.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{e.name}</p>
                      <p className="text-xs text-gray-500">
                        {e.category} ·{" "}
                        {e.ownership === "company-owned"
                          ? "Company-owned"
                          : e.ownership === "rented"
                            ? "Rented"
                            : "Client-supplied"}
                        {e.estimatedDays ? ` · ${e.estimatedDays} days` : ""}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {e.totalEstimatedCost
                          ? `Est. Total: ${getCurrencySymbol()}${formatNumberByGeneralSettings(e.totalEstimatedCost)}`
                          : ""}{" "}
                        · {e.status}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeEquipment(e.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External Equipment Modal */}
        {showExternalEquipmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div
              className="rounded-xl w-full max-w-md"
              style={{ backgroundColor: "white" }}
            >
              <div
                className="flex items-center justify-between p-5 border-b"
                style={{ borderColor: "#E2E8F0" }}
              >
                <h3
                  className="text-base font-bold"
                  style={{ color: "#1A202C" }}
                >
                  Add External Equipment
                </h3>
                <button
                  onClick={() => setShowExternalEquipmentModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipment Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["client-supplied", "rented", "external"] as const).map(
                      (opt) => (
                        <button
                          key={opt}
                          onClick={() => setExternalEquipType(opt)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors ${
                            externalEquipType === opt
                              ? "bg-amber-50 border-amber-400 text-amber-700"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          {opt === "client-supplied"
                            ? "Client Supplied"
                            : opt === "rented"
                              ? "Rented / Borrowed"
                              : "External"}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipment Name
                  </label>
                  <input
                    type="text"
                    value={equipmentForm.name}
                    onChange={(e) =>
                      setEquipmentForm({
                        ...equipmentForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F7F8FA",
                    }}
                    placeholder="e.g. Tower Crane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={equipmentForm.category}
                    onChange={(e) =>
                      setEquipmentForm({
                        ...equipmentForm,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F7F8FA",
                    }}
                  >
                    <option value="">Select category</option>
                    {equipmentCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {externalEquipType === "rented" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rental Cost per Day ({getCurrencySymbol()})
                    </label>
                    <input
                      type="number"
                      value={equipmentForm.rentalCostPerDay || ""}
                      onChange={(e) =>
                        setEquipmentForm({
                          ...equipmentForm,
                          rentalCostPerDay: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        borderColor: "#E2E8F0",
                        backgroundColor: "#F7F8FA",
                      }}
                      placeholder="e.g. 120000"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Days on Site
                  </label>
                  <input
                    type="number"
                    value={equipmentForm.estimatedDays || ""}
                    onChange={(e) =>
                      setEquipmentForm({
                        ...equipmentForm,
                        estimatedDays: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F7F8FA",
                    }}
                    placeholder="e.g. 180"
                  />
                </div>
              </div>
              <div
                className="flex items-center justify-end gap-3 p-5 border-t"
                style={{ borderColor: "#E2E8F0" }}
              >
                <button
                  onClick={() => setShowExternalEquipmentModal(false)}
                  className="px-4 py-2 rounded-lg border text-sm text-gray-600"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!equipmentForm.name || !equipmentForm.category) return;
                    const isRented = externalEquipType === "rented";
                    const newEquip: EquipmentResource = {
                      id: getNextId("Equipment"),
                      projectId: projectId!,
                      name: equipmentForm.name,
                      category: equipmentForm.category,
                      ownership:
                        externalEquipType === "client-supplied"
                          ? "client-supplied"
                          : externalEquipType === "rented"
                            ? "rented"
                            : "company-owned",
                      rentalCostPerDay: isRented
                        ? equipmentForm.rentalCostPerDay || undefined
                        : undefined,
                      estimatedDays: equipmentForm.estimatedDays || 1,
                      totalEstimatedCost: isRented
                        ? (equipmentForm.rentalCostPerDay || 0) *
                          (equipmentForm.estimatedDays || 1)
                        : 0,
                      status: "Available",
                    };
                    setProjectEquipment((prev) => [...prev, newEquip]);
                    setShowExternalEquipmentModal(false);
                    setEquipmentForm(EMPTY_EQUIPMENT_FORM);
                  }}
                  disabled={!equipmentForm.name || !equipmentForm.category}
                  className="px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50"
                  style={{ backgroundColor: "#E8973A" }}
                >
                  Add Equipment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Step 3 — Daily Reporting
  const renderDailyReportingSetup = () => (
    <div className="space-y-4">
      {/* ──── Daily Reporting Configuration ──── */}
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: "#1A202C" }}>
          Daily Reporting Setup
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Configure who can submit daily reports and set up recurring reporting
          tasks.
        </p>

        {/* Contributor mode */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Who can submit daily reports?
          </label>
          <div className="flex gap-2">
            {(["employees-only", "contractors-only", "both"] as const).map(
              (mode) => (
                <button
                  key={mode}
                  onClick={() => setReportContributorMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    reportContributorMode === mode
                      ? "bg-amber-50 border-amber-400 text-amber-700"
                      : "hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  {mode === "employees-only"
                    ? "Employees Only"
                    : mode === "contractors-only"
                      ? "Contractor Reps Only"
                      : "Both"}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Employee contributors */}
        {(reportContributorMode === "employees-only" ||
          reportContributorMode === "both") && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee Contributors
            </label>
            <div className="flex flex-wrap gap-1.5">
              {projectStaff.map((s) => {
                const selected = reportContributorEmployeeIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      setReportContributorEmployeeIds((prev) =>
                        prev.includes(s.id)
                          ? prev.filter((id) => id !== s.id)
                          : [...prev, s.id],
                      )
                    }
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                      selected
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
              {projectStaff.length === 0 && (
                <span className="text-[10px] text-gray-400">
                  No employees registered.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Contractor rep contributors */}
        {(reportContributorMode === "contractors-only" ||
          reportContributorMode === "both") && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contractor Representative Contributors
            </label>
            <div className="flex flex-wrap gap-1.5">
              {projectVendors
                .flatMap((v) =>
                  (v.representatives || []).map((r) => ({
                    ...r,
                    vendorName: v.name,
                  })),
                )
                .map((r) => {
                  const selected = reportContributorRepIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() =>
                        setReportContributorRepIds((prev) =>
                          prev.includes(r.id)
                            ? prev.filter((id) => id !== r.id)
                            : [...prev, r.id],
                        )
                      }
                      className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                        selected
                          ? "bg-orange-50 border-orange-300 text-orange-700"
                          : "hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      {r.fullName} ({r.vendorName})
                    </button>
                  );
                })}
              {projectVendors.reduce(
                (sum, v) => sum + (v.representatives?.length || 0),
                0,
              ) === 0 && (
                <span className="text-[10px] text-gray-400">
                  No contractor representatives registered. Add reps in
                  Resources → Human Resources → Contractors.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Recurring Reporting Tasks */}
        <div className="border-t pt-4" style={{ borderColor: "#E2E8F0" }}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Recurring Reporting Tasks
          </h3>
          {recurringReportTasks.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {recurringReportTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border text-xs"
                  style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRecurringTask(t.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center ${t.isActive ? "bg-green-500 border-green-500" : "border-gray-300"}`}
                    >
                      {t.isActive && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </button>
                    <div>
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-[10px] text-gray-500 capitalize">
                        {t.frequency} · Assigned to:{" "}
                        {projectStaff.find((s) => s.id === t.assignedTo)
                          ?.name || t.assignedTo}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeRecurringTask(t.id)}
                    className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              type="text"
              value={newRecurringTask.name}
              onChange={(e) =>
                setNewRecurringTask((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="Task name (e.g. Daily Site Report)"
              className="px-2 py-1.5 text-xs rounded border"
              style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
            />
            <select
              value={newRecurringTask.frequency}
              onChange={(e) =>
                setNewRecurringTask((prev) => ({
                  ...prev,
                  frequency: e.target.value as "daily" | "weekly" | "monthly",
                }))
              }
              className="px-2 py-1.5 text-xs rounded border"
              style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <select
              value={newRecurringTask.assignedTo}
              onChange={(e) =>
                setNewRecurringTask((prev) => ({
                  ...prev,
                  assignedTo: e.target.value,
                }))
              }
              className="px-2 py-1.5 text-xs rounded border"
              style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
            >
              <option value="">Assign to...</option>
              {projectStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              {projectVendors
                .flatMap((v) =>
                  (v.representatives || []).map((r) => ({
                    ...r,
                    vendorName: v.name,
                  })),
                )
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} ({r.vendorName})
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={addRecurringTask}
            disabled={
              !newRecurringTask.name.trim() || !newRecurringTask.assignedTo
            }
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "#E8973A" }}
          >
            <Plus className="w-3 h-3" /> Add Recurring Task
          </button>
        </div>
      </div>
    </div>
  );

  // Step 6 — Calendar
  const renderCalendar = () => (
    <div className="space-y-4">
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: "#1A202C" }}>
          Working Days & Hours
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Working Days
          </label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, i) => {
              const dayIdx = DAY_INDICES[i];
              const active = calendarData.workingDays.includes(dayIdx);
              return (
                <button
                  key={label}
                  onClick={() => toggleDay(dayIdx)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    active
                      ? "text-white border-transparent"
                      : "text-gray-500 bg-white"
                  }`}
                  style={{
                    backgroundColor: active ? "#E8973A" : undefined,
                    borderColor: active ? "#E8973A" : "#E2E8F0",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Working Hours Start
            </label>
            <input
              type="time"
              value={calendarData.workingHoursStart}
              onChange={(e) =>
                setCalendarData({
                  ...calendarData,
                  workingHoursStart: e.target.value,
                })
              }
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Working Hours End
            </label>
            <input
              type="time"
              value={calendarData.workingHoursEnd}
              onChange={(e) =>
                setCalendarData({
                  ...calendarData,
                  workingHoursEnd: e.target.value,
                })
              }
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
            />
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: "#1A202C" }}>
          Holidays
        </h2>
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={newHoliday.date}
              onChange={(e) =>
                setNewHoliday({ ...newHoliday, date: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <input
              type="text"
              value={newHoliday.label}
              onChange={(e) =>
                setNewHoliday({ ...newHoliday, label: e.target.value })
              }
              placeholder="e.g. New Year"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
            />
          </div>
          <button
            onClick={addHoliday}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: "#E8973A" }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {calendarData.holidays.length > 0 ? (
          <div className="space-y-2">
            {calendarData.holidays.map((h, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 py-2 rounded-lg border text-sm"
                style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
              >
                <span className="font-medium text-gray-900">
                  {fmtDate(h.date)}
                </span>
                <span className="text-gray-600 flex-1 ml-3">{h.label}</span>
                <button
                  onClick={() => removeHoliday(idx)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            No holidays added
          </p>
        )}
      </div>

      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: "#1A202C" }}>
          Site Shutdowns
        </h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={newShutdown.start}
              onChange={(e) =>
                setNewShutdown({ ...newShutdown, start: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={newShutdown.end}
              onChange={(e) =>
                setNewShutdown({ ...newShutdown, end: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newShutdown.label}
                onChange={(e) =>
                  setNewShutdown({ ...newShutdown, label: e.target.value })
                }
                placeholder="e.g. End of Year"
                className="flex-1 px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
              />
              <button
                onClick={addShutdown}
                className="px-3 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: "#E8973A" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {calendarData.shutdowns.length > 0 ? (
          <div className="space-y-2">
            {calendarData.shutdowns.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 py-2 rounded-lg border text-sm"
                style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
              >
                <span className="font-medium text-gray-900">
                  {fmtDate(s.start)} — {fmtDate(s.end)}
                </span>
                <span className="text-gray-600 flex-1 ml-3">{s.label}</span>
                <button
                  onClick={() => removeShutdown(idx)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            No shutdowns added
          </p>
        )}
      </div>
    </div>
  );

  // Step 8 — Summary
  const renderSummary = () => {
    const taskDates =
      projectTasks.length > 0
        ? (() => {
            const starts = projectTasks.map((t) =>
              new Date(t.plannedStart).getTime(),
            );
            const ends = projectTasks.map((t) =>
              new Date(t.plannedEnd).getTime(),
            );
            const minStart = new Date(Math.min(...starts))
              .toISOString()
              .split("T")[0];
            const maxEnd = new Date(Math.max(...ends))
              .toISOString()
              .split("T")[0];
            return `${fmtDate(minStart)} — ${fmtDate(maxEnd)}`;
          })()
        : null;
    const dateRange =
      taskDates ||
      (basicInfo.plannedStartDate && basicInfo.plannedEndDate
        ? `${fmtDate(basicInfo.plannedStartDate)} — ${fmtDate(basicInfo.plannedEndDate)}`
        : "Not set");

    return (
      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#E8973A", color: "white" }}
          >
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#1A202C" }}>
              Lock Baseline
            </h2>
            <p className="text-sm" style={{ color: "#718096" }}>
              Locking the baseline will freeze the current plan as your project
              baseline.
            </p>
          </div>
        </div>

        {/* Classification summary */}
        {projectSector && projectCategory && (
          <div
            className="mb-4 rounded-lg p-3 text-sm"
            style={{ backgroundColor: "#F7F8FA", border: "1px solid #E2E8F0" }}
          >
            <span className="font-medium text-gray-700">Project Type: </span>
            <span className="text-gray-600">
              {projectSector} &rarr; {projectCategory}
            </span>
            {projectDescriptor && (
              <span className="text-gray-400"> — {projectDescriptor}</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            className="rounded-lg border p-4 text-center"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
          >
            <p className="text-2xl font-bold" style={{ color: "#1A202C" }}>
              {projectTasks.length}
            </p>
            <p className="text-xs" style={{ color: "#718096" }}>
              Tasks
            </p>
          </div>
          <div
            className="rounded-lg border p-4 text-center"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
          >
            <p className="text-2xl font-bold" style={{ color: "#1A202C" }}>
              {projectVendors.length}
            </p>
            <p className="text-xs" style={{ color: "#718096" }}>
              Contractors
            </p>
          </div>
          <div
            className="rounded-lg border p-4 text-center"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
          >
            <p className="text-2xl font-bold" style={{ color: "#1A202C" }}>
              {calendarData.workingDays.length}/7
            </p>
            <p className="text-xs" style={{ color: "#718096" }}>
              Working Days
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div
            className="flex items-center justify-between text-sm px-4 py-3 rounded-lg border"
            style={{ borderColor: "#E2E8F0" }}
          >
            <span className="text-gray-600">Date Range</span>
            <span className="font-medium text-gray-900">{dateRange}</span>
          </div>
          <div
            className="flex items-center justify-between text-sm px-4 py-3 rounded-lg border"
            style={{ borderColor: "#E2E8F0" }}
          >
            <span className="text-gray-600">Holidays Configured</span>
            <span className="font-medium text-gray-900">
              {calendarData.holidays.length}
            </span>
          </div>
          <div
            className="flex items-center justify-between text-sm px-4 py-3 rounded-lg border"
            style={{ borderColor: "#E2E8F0" }}
          >
            <span className="text-gray-600">Shutdowns Configured</span>
            <span className="font-medium text-gray-900">
              {calendarData.shutdowns.length}
            </span>
          </div>
        </div>

        <div
          className={`rounded-lg p-4 text-sm ${baselineLocked ? "bg-green-50 border border-green-200" : ""}`}
        >
          {baselineLocked ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  Baseline has been locked successfully.
                </span>
              </div>
              <button
                onClick={() => setShowUnlockModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: "#E8973A" }}
              >
                Unlock Setup
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 text-center mb-3">
                Once locked, the planned dates and scope cannot be modified
                without a formal change request.
              </p>
            </div>
          )}
        </div>

        {/* Audit log */}
        {setupAuditLog.length > 0 && (
          <div
            className="mt-4 pt-4 border-t"
            style={{ borderColor: "#E2E8F0" }}
          >
            <h3 className="text-xs font-semibold text-gray-600 mb-2">
              Setup Audit Trail
            </h3>
            <div className="space-y-1">
              {setupAuditLog.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-[10px] text-gray-500"
                >
                  <span
                    className={`px-1.5 py-0.5 rounded font-medium ${entry.action === "locked" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {entry.action === "locked" ? "LOCKED" : "UNLOCKED"}
                  </span>
                  <span>{entry.performedBy}</span>
                  <span>·</span>
                  <span>{formatDateTimeByGeneralSettings(entry.performedAt)}</span>
                  {entry.reason && <span>· "{entry.reason}"</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unlock Modal */}
        {showUnlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div
              className="rounded-xl w-full max-w-sm p-5"
              style={{ backgroundColor: "white" }}
            >
              <h3
                className="text-base font-bold mb-2"
                style={{ color: "#1A202C" }}
              >
                Unlock Setup
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Provide a reason for unlocking the setup. This will be recorded
                in the audit trail.
              </p>
              <textarea
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Reason for unlocking..."
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: "#E2E8F0" }}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowUnlockModal(false);
                    setUnlockReason("");
                  }}
                  className="px-3 py-1.5 rounded border text-sm text-gray-600"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  Cancel
                </button>
                <button
                  onClick={performUnlock}
                  disabled={!unlockReason.trim()}
                  className="px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "#E8973A" }}
                >
                  Unlock
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBottomIndicator = () => (
    <div
      className="flex items-center justify-center gap-2 text-xs"
      style={{ color: "#718096" }}
    >
      <div className="flex items-center gap-1">
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.has(idx);
          const isCurrent = currentStep === idx;
          return (
            <span key={step.id} className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  isCompleted ? "bg-green-500" : isCurrent ? "" : "bg-gray-300"
                }`}
                style={
                  isCurrent && !isCompleted
                    ? { backgroundColor: "#E8973A" }
                    : {}
                }
              />
              {idx < STEPS.length - 1 && (
                <span
                  className={`w-3 h-px ${completedSteps.has(idx) ? "bg-green-500" : "bg-gray-300"}`}
                />
              )}
            </span>
          );
        })}
      </div>
      <span className="ml-2">
        Setup Progress: Step {currentStep + 1} of {STEPS.length}
      </span>
      {completedSteps.size === STEPS.length && (
        <span className="ml-1 text-green-600 font-medium">· Complete</span>
      )}
    </div>
  );

  return (
    <div style={{ backgroundColor: "#F7F8FA" }} className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#E8973A", color: "white" }}
          >
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#1A202C" }}>
              Project Setup
            </h1>
            <p className="text-sm" style={{ color: "#718096" }}>
              {project?.name || basicInfo.name || "New Project"} — Setup Wizard
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border p-6 mb-6"
        style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
      >
        {renderProgress()}
      </div>

      <div className="mb-6">
        {currentStep === 0 && renderBasicInfo()}
        {currentStep === 1 && renderProjectType()}
        {currentStep === 2 && renderHumanResources()}
        {currentStep === 3 && renderDailyReportingSetup()}
        {currentStep === 4 && renderMaterials()}
        {currentStep === 5 && renderEquipment()}
        {currentStep === 6 && renderCalendar()}
        {currentStep === 7 && renderScheduleBuilder()}
        {currentStep === 8 && renderSummary()}
      </div>

      <div
        className="rounded-xl border p-4 flex items-center justify-between"
        style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
      >
        <div>
          {!isFirstStep && (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium"
              style={{ borderColor: "#E2E8F0", color: "#718096" }}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "#718096" }}
        >
          <span>
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span className="w-px h-4" style={{ backgroundColor: "#E2E8F0" }} />
          <span>{STEPS[currentStep].label}</span>
        </div>
        <div>
          {isLastStep ? (
            <button
              onClick={handleCompleteSetup}
              disabled={baselineLocked}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: baselineLocked ? "#22C55E" : "#E8973A",
              }}
            >
              {baselineLocked ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Completed
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Lock Baseline
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: "#E8973A" }}
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">{renderBottomIndicator()}</div>
    </div>
  );
}
