import type {
  Project, Task, Vendor, DailyReport, Issue, ChangeRequest, Delay,
  DocumentFolder, DocumentFile, Stakeholder, QualityNCR, HSEMatrix,
  DailyManpower, DailyEquipment, DailyMaterial, DailyScope,
  ProjectBaseline, ProjectCalendar, EarnedValueData, ResourceAllocation, ProjectSetupData,
  Sector, ProjectStructureItem,
  HumanResource, MaterialResource, EquipmentResource, ResourceAssignment,
  DailyExpense, CommunicationLogEntry, Disbursement,
  FundingAllocation, FundingRelease,
  ScheduleLevelConfig, WeatherConfig, VendorRepresentative, ProjectTypeSetting,
} from "./types";

export const projects: Project[] = [
  { id: "PRJ-001", name: "Lekki Tower A", siteAddress: "12B Admiralty Road, Lekki Phase 1", client: "Lekki Gardens Ltd", projectManager: "Emeka Okafor", mainContractor: "Princess Forge Construction", contractType: "Remeasurable", plannedStartDate: "2026-01-15", plannedEndDate: "2026-12-31", description: "22-storey commercial tower with retail podium and basement parking", clusterId: "Lekki-VI", status: "Active", ragStatus: "on-track", budget: 1_250_000_000, spent: 812_000_000, location: "Lekki, Lagos", createdAt: "2026-01-10", lastReportDate: "2026-05-29", setupComplete: true, setupProgress: 100, sector: "Building & Construction" as Sector, category: "Commercial (office building)", descriptor: "22-storey tower", structure: [{ id: "STR-001", name: "Ground Floor", type: "floor", level: 0, parentId: null, attributes: { floors: 22, unitsPerFloor: 4, unitType: "Open Plan" } }, { id: "STR-002", name: "Tower Floors 1-22", type: "floor", level: 0, parentId: null, attributes: { floors: 22, unitsPerFloor: 4, unitType: "Open Plan" } }] },
  { id: "PRJ-002", name: "Riverside Estate Phase 2", siteAddress: "23 River Road, Ibeju-Lekki", client: "HomeKey Developers", projectManager: "Sarah Adeyemi", mainContractor: "JBN Construction Ltd", contractType: "Lump Sum", plannedStartDate: "2026-02-01", plannedEndDate: "2026-09-30", description: "120-unit residential estate with community amenities", clusterId: "Lekki-VI", status: "Active", ragStatus: "at-risk", budget: 820_000_000, spent: 410_000_000, location: "Ibeju-Lekki, Lagos", createdAt: "2026-01-28", lastReportDate: "2026-05-26", setupComplete: false, setupProgress: 80, sector: "Building & Construction" as Sector, category: "Residential (multi-unit / estate)", descriptor: "120-unit estate", structure: [{ id: "STR-003", name: "Block A", type: "building", level: 0, parentId: null, attributes: { floors: 4, unitsPerFloor: 10, unitType: "2-Bedroom" } }, { id: "STR-004", name: "Block B", type: "building", level: 0, parentId: null, attributes: { floors: 4, unitsPerFloor: 10, unitType: "3-Bedroom" } }, { id: "STR-005", name: "Block C", type: "building", level: 0, parentId: null, attributes: { floors: 4, unitsPerFloor: 10, unitType: "2-Bedroom" } }] },
  { id: "PRJ-003", name: "Ikeja Mall Expansion", siteAddress: "42 Obafemi Awolowo Way, Ikeja", client: "RetailCo Nigeria", projectManager: "Tunde Balogun", mainContractor: "Cappa & D'Alberto", contractType: "Cost Plus", plannedStartDate: "2025-11-20", plannedEndDate: "2026-06-30", description: "Mall expansion with new food court and cinema complex", clusterId: "Ikeja", status: "Active", ragStatus: "delayed", budget: 1_840_000_000, spent: 1_656_000_000, location: "Ikeja, Lagos", createdAt: "2025-11-15", lastReportDate: "2026-05-25", setupComplete: false, setupProgress: 20, sector: "Building & Construction" as Sector, category: "Commercial (retail / shopping)", descriptor: "Mall expansion", structure: [{ id: "STR-006", name: "Food Court Floor", type: "floor", level: 0, parentId: null, attributes: { floors: 2, shopsPerFloor: 15 } }, { id: "STR-007", name: "Cinema Floor", type: "floor", level: 0, parentId: null, attributes: { floors: 1, shopsPerFloor: 8 } }] },
  { id: "PRJ-004", name: "Apapa Port Access Road", siteAddress: "Apapa Port Road, Lagos", client: "Lagos State Govt", projectManager: "Chidi Nwosu", mainContractor: "Julius Berger", contractType: "Remeasurable", plannedStartDate: "2026-01-01", plannedEndDate: "2027-03-31", description: "3-layer highway interchange to decongest Apapa traffic", clusterId: "Apapa", status: "Active", ragStatus: "on-track", budget: 3_200_000_000, spent: 1_120_000_000, location: "Apapa, Lagos", createdAt: "2025-12-20", lastReportDate: "2026-05-27", setupComplete: false, setupProgress: 40, sector: "Civil & Infrastructure" as Sector, category: "Road construction", descriptor: "3-layer interchange", structure: [{ id: "STR-008", name: "Section A", type: "section", level: 0, parentId: null, attributes: { lengthKm: 2.5, segments: 5 } }, { id: "STR-009", name: "Section B", type: "section", level: 0, parentId: null, attributes: { lengthKm: 3.0, segments: 6 } }] },
  { id: "PRJ-005", name: "Banana Island Luxury Villas", siteAddress: "Plot 7-12, Banana Island", client: "Eko Atlantic Properties", projectManager: "Yemi Lawson", mainContractor: "Princess Forge Construction", contractType: "Lump Sum", plannedStartDate: "2026-05-01", plannedEndDate: "2028-04-30", description: "6 luxury waterfront villas with private jetties", clusterId: "Lekki-VI", status: "On Hold", ragStatus: "at-risk", budget: 2_400_000_000, spent: 480_000_000, location: "Banana Island, Lagos", createdAt: "2026-04-15", setupComplete: false, setupProgress: 20, sector: "Building & Construction" as Sector, category: "Residential (single dwelling)", descriptor: "6 waterfront villas", structure: [{ id: "STR-010", name: "Villa 1", type: "building", level: 0, parentId: null, attributes: { rooms: 5, roomType: "4-Bedroom" } }, { id: "STR-011", name: "Villa 2", type: "building", level: 0, parentId: null, attributes: { rooms: 5, roomType: "4-Bedroom" } }] },
  { id: "PRJ-006", name: "UNILAG Science Block", siteAddress: "University of Lagos, Akoka", client: "UNILAG", projectManager: "Dr. Ngozi Eze", mainContractor: "ITB Nigeria Ltd", contractType: "Lump Sum", plannedStartDate: "2026-03-01", plannedEndDate: "2027-01-31", description: "New 5-storey science faculty building with labs", clusterId: "Ikeja", status: "Active", ragStatus: "on-track", budget: 950_000_000, spent: 285_000_000, location: "Akoka, Lagos", createdAt: "2026-02-20", setupComplete: false, setupProgress: 80, sector: "Building & Construction" as Sector, category: "Institutional (school, hospital, church, government)", descriptor: "5-storey science block", structure: [{ id: "STR-012", name: "Main Wing", type: "building", level: 0, parentId: null, attributes: { floors: 5, roomsPerFloor: 8, function: "Classroom" } }] },
  { id: "PRJ-007", name: "Lekki Free Zone Warehouse", siteAddress: "Lekki Free Trade Zone", client: "LogiPark Ltd", projectManager: "Mike Ogun", mainContractor: "JBN Construction Ltd", contractType: "Cost Plus", plannedStartDate: "2026-03-10", plannedEndDate: "2027-02-28", description: "50,000 sqft logistics warehouse with cold storage", clusterId: "Lekki-VI", status: "Active", ragStatus: "on-track", budget: 580_000_000, spent: 87_000_000, location: "Lekki, Lagos", createdAt: "2026-03-05", setupComplete: false, setupProgress: 20, sector: "Industrial & Facilities" as Sector, category: "Warehouse construction", descriptor: "50,000 sqft warehouse", structure: [{ id: "STR-013", name: "Warehouse A", type: "section", level: 0, parentId: null, attributes: { capacity: 25, bays: 8 } }, { id: "STR-014", name: "Cold Storage", type: "section", level: 0, parentId: null, attributes: { capacity: 15, bays: 4 } }] },
  { id: "PRJ-008", name: "Third Mainland Bridge Repairs", siteAddress: "Third Mainland Bridge", client: "FMW Works", projectManager: "Kunle Adesina", mainContractor: "CCECC Nigeria", contractType: "Remeasurable", plannedStartDate: "2025-06-01", plannedEndDate: "2026-02-28", description: "Structural rehabilitation of bridge deck and pillars", clusterId: "Apapa", status: "Completed", ragStatus: "on-track", budget: 6_200_000_000, spent: 6_014_000_000, location: "Lagos Mainland", createdAt: "2025-05-15", setupComplete: true, setupProgress: 100, sector: "Civil & Infrastructure" as Sector, category: "Bridge", descriptor: "Bridge deck rehabilitation", structure: [{ id: "STR-015", name: "Span 1-3", type: "span", level: 0, parentId: null, attributes: { length: 120, deckSections: 6 } }] },
];

export const clusters = ["Lekki-VI", "Ikeja", "Apapa"];

export const tradeTypes = [
  "Masonry", "Concreting labor", "Carpentry (formwork)", "Carpentry (roofing)",
  "Iron benders / steel fixers", "Tiling", "Plumbing", "Electrical",
  "Painting", "Glazing / aluminum works", "General operations / laboring",
  "Equipment operation", "Scaffolding", "Welding",
];

export const vendors: Vendor[] = [
  { id: "V-001", projectId: "PRJ-001", name: "Alhaji Masonry Services", trade: "Masonry", contractType: "Labor-only", isNominated: false, contractSum: 45_000_000, assignedWorkPackages: ["WP-001", "WP-002"], blockAssignment: "Tower A", skilledCount: 12, unskilledCount: 24, mandaysEstimate: 540, status: "Active", skilledDays: 180, skilledRate: 12000, unskilledDays: 360, unskilledRate: 7000, vendorMargin: 30, isMainContractor: true, representatives: [
    { id: "VR-001", vendorId: "V-001", fullName: "Alhaji Musa", email: "musa@alhajimasonry.com", phone: "+234-802-111-0001", position: "Site Manager", isActive: true },
    { id: "VR-002", vendorId: "V-001", fullName: "Ibrahim Danjuma", email: "ibrahim@alhajimasonry.com", phone: "+234-802-111-0002", position: "Foreman", isActive: true },
  ]},
  { id: "V-002", projectId: "PRJ-001", name: "Chike Tiling Experts", trade: "Tiling", contractType: "Labor-only", isNominated: false, contractSum: 28_000_000, assignedWorkPackages: ["WP-005"], blockAssignment: "Tower A", skilledCount: 8, unskilledCount: 12, mandaysEstimate: 300, status: "Active", skilledDays: 120, skilledRate: 15000, unskilledDays: 180, unskilledRate: 7000, vendorMargin: 25, subcontractorIds: ["V-003"], representatives: [
    { id: "VR-003", vendorId: "V-002", fullName: "Chike Okafor", email: "chike@chiketiling.com", phone: "+234-802-111-0003", position: "Managing Director", isActive: true },
  ]},
  { id: "V-003", projectId: "PRJ-001", name: "Steel Fixers United", trade: "Iron benders / steel fixers", contractType: "Nominated Subcontractor", isNominated: true, contractSum: 62_000_000, assignedWorkPackages: ["WP-003"], blockAssignment: "Tower A", skilledCount: 15, unskilledCount: 30, mandaysEstimate: 675, status: "Active", skilledDays: 225, skilledRate: 14000, unskilledDays: 450, unskilledRate: 7000, vendorMargin: 30, parentContractorId: "V-002", representatives: [
    { id: "VR-004", vendorId: "V-003", fullName: "Musa Bello", email: "musa@steelfixers.com", phone: "+234-802-111-0004", position: "Project Coordinator", isActive: true },
    { id: "VR-005", vendorId: "V-003", fullName: "Ahmed Lawal", email: "ahmed@steelfixers.com", phone: "+234-802-111-0005", position: "Quality Supervisor", isActive: true },
  ]},
  { id: "V-004", projectId: "PRJ-002", name: "De Renaissance Painters", trade: "Painting", contractType: "Supply & Install", isNominated: false, contractSum: 18_500_000, assignedWorkPackages: ["WP-010"], blockAssignment: "Blocks 1-4", skilledCount: 6, unskilledCount: 8, mandaysEstimate: 210, status: "Awarded", vendorMargin: 25 },
  { id: "V-005", projectId: "PRJ-002", name: "Ade Plumbing Services", trade: "Plumbing", contractType: "Labor-only", isNominated: false, contractSum: 32_000_000, assignedWorkPackages: ["WP-008"], blockAssignment: "All blocks", skilledCount: 10, unskilledCount: 15, mandaysEstimate: 375, status: "Active", skilledDays: 150, skilledRate: 13000, unskilledDays: 225, unskilledRate: 7000, vendorMargin: 30 },
];

export const tasks: Task[] = [
  // PRJ-001 — Lekki Tower A
  { id: "ST-001", projectId: "PRJ-001", parentTaskId: null, level: 1, name: "Substructure Works", plannedStart: "2026-01-15", plannedEnd: "2026-04-15", actualStart: "2026-01-15", actualEnd: null, plannedDuration: 90, actualDuration: null, percentComplete: 75, predecessorId: null, dependencyType: null, lagDays: 0, vendorId: null, ragStatus: "on-track", ragOverride: false, notes: "", expanded: true },
  { id: "ST-002", projectId: "PRJ-001", parentTaskId: null, level: 1, name: "Superstructure Works", plannedStart: "2026-04-16", plannedEnd: "2026-09-30", actualStart: null, actualEnd: null, plannedDuration: 165, actualDuration: null, percentComplete: 0, predecessorId: "ST-001", dependencyType: "FS", lagDays: 1, vendorId: null, ragStatus: "on-track", ragOverride: false, notes: "", expanded: true },
  { id: "ST-003", projectId: "PRJ-001", parentTaskId: null, level: 1, name: "Finishing Works", plannedStart: "2026-10-01", plannedEnd: "2026-12-31", actualStart: null, actualEnd: null, plannedDuration: 90, actualDuration: null, percentComplete: 0, predecessorId: "ST-002", dependencyType: "FS", lagDays: 0, vendorId: null, ragStatus: "on-track", ragOverride: false, notes: "" },
  // Level 2
  { id: "SM-001", projectId: "PRJ-001", parentTaskId: "ST-001", level: 2, name: "Foundation Works", plannedStart: "2026-01-15", plannedEnd: "2026-03-15", actualStart: "2026-01-15", actualEnd: null, plannedDuration: 60, actualDuration: null, percentComplete: 85, predecessorId: null, dependencyType: null, lagDays: 0, vendorId: null, ragStatus: "on-track", ragOverride: false, notes: "" },
  { id: "SM-002", projectId: "PRJ-001", parentTaskId: "ST-001", level: 2, name: "Basement Works", plannedStart: "2026-03-01", plannedEnd: "2026-04-15", actualStart: null, actualEnd: null, plannedDuration: 45, actualDuration: null, percentComplete: 40, predecessorId: "SM-001", dependencyType: "FS", lagDays: 0, vendorId: null, ragStatus: "on-track", ragOverride: false, notes: "" },
  // Level 3
  { id: "SS-001", projectId: "PRJ-001", parentTaskId: "SM-001", level: 3, name: "Strip Foundation", plannedStart: "2026-01-15", plannedEnd: "2026-02-28", actualStart: "2026-01-15", actualEnd: "2026-02-25", plannedDuration: 45, actualDuration: 41, percentComplete: 100, predecessorId: null, dependencyType: null, lagDays: 0, vendorId: "V-001", ragStatus: "on-track", ragOverride: false, notes: "" },
  { id: "SS-002", projectId: "PRJ-001", parentTaskId: "SM-001", level: 3, name: "Raft Foundation", plannedStart: "2026-03-01", plannedEnd: "2026-03-15", actualStart: "2026-02-26", actualEnd: null, plannedDuration: 15, actualDuration: null, percentComplete: 65, predecessorId: "SS-001", dependencyType: "FS", lagDays: 0, vendorId: "V-001", ragStatus: "on-track", ragOverride: false, notes: "" },
  // Level 4 — Work Packages
  { id: "WP-001", projectId: "PRJ-001", parentTaskId: "SS-001", level: 4, name: "Excavation to formation level", plannedStart: "2026-01-15", plannedEnd: "2026-02-05", actualStart: "2026-01-15", actualEnd: "2026-02-03", plannedDuration: 21, actualDuration: 19, percentComplete: 100, predecessorId: null, dependencyType: null, lagDays: 0, vendorId: "V-001", ragStatus: "on-track", ragOverride: false, notes: "Completed ahead of schedule" },
  { id: "WP-002", projectId: "PRJ-001", parentTaskId: "SS-001", level: 4, name: "Blinding concrete & reinforcement", plannedStart: "2026-02-06", plannedEnd: "2026-02-28", actualStart: "2026-02-04", actualEnd: "2026-02-25", plannedDuration: 22, actualDuration: 21, percentComplete: 100, predecessorId: "WP-001", dependencyType: "FS", lagDays: 1, vendorId: "V-001", ragStatus: "on-track", ragOverride: false, notes: "" },
  { id: "WP-003", projectId: "PRJ-001", parentTaskId: "SS-002", level: 4, name: "Steel reinforcement fixing", plannedStart: "2026-03-01", plannedEnd: "2026-03-10", actualStart: "2026-02-26", actualEnd: null, plannedDuration: 9, actualDuration: null, percentComplete: 70, predecessorId: "WP-002", dependencyType: "FS", lagDays: 0, vendorId: "V-003", ragStatus: "on-track", ragOverride: false, notes: "" },
  { id: "WP-004", projectId: "PRJ-001", parentTaskId: "SS-002", level: 4, name: "Concrete pour & curing", plannedStart: "2026-03-11", plannedEnd: "2026-03-15", actualStart: null, actualEnd: null, plannedDuration: 5, actualDuration: null, percentComplete: 0, predecessorId: "WP-003", dependencyType: "FS", lagDays: 0, vendorId: "V-001", ragStatus: "on-track", ragOverride: false, notes: "" },
  { id: "WP-005", projectId: "PRJ-001", parentTaskId: "SM-002", level: 4, name: "Basement wall waterproofing", plannedStart: "2026-03-01", plannedEnd: "2026-03-20", actualStart: null, actualEnd: null, plannedDuration: 20, actualDuration: null, percentComplete: 30, predecessorId: null, dependencyType: null, lagDays: 0, vendorId: "V-002", ragStatus: "on-track", ragOverride: false, notes: "" },
];

export const dailyReports: DailyReport[] = [
  {
    id: "DR-001", projectId: "PRJ-001", reportDate: "2026-05-28", weather: "Sunny",
    submittedBy: "Emeka Okafor", submittedAt: "2026-05-28T16:30:00", status: "submitted",
    unlockedBy: null, unlockReason: null,
    manpower: [
      { id: "DM-001", vendorId: "V-001", vendorName: "Alhaji Masonry Services", trade: "Masonry", block: "Tower A", summaryTaskId: "SM-001", workPackageId: "WP-003", skilledCount: 10, unskilledCount: 20, mandays: 30, outputDescription: "150", outputUnit: "blocks laid", comments: "" },
      { id: "DM-002", vendorId: "V-003", vendorName: "Steel Fixers United", trade: "Iron benders / steel fixers", block: "Tower A", summaryTaskId: "SM-001", workPackageId: "WP-003", skilledCount: 12, unskilledCount: 25, mandays: 37, outputDescription: "2.5", outputUnit: "tonnes fixed", comments: "Making good progress" },
    ],
    equipment: [
      { id: "DE-001", category: "Earthwork", equipmentType: "Excavator", ownership: "Hired", makeModel: "CAT 320D", tagNumber: "EX-001", inUse: true, maintenanceStatus: "Usable", maintenanceRequired: false, activity: "Foundation excavation", comments: "" },
      { id: "DE-002", category: "Concreting", equipmentType: "Concrete Mixer", ownership: "Company-owned", makeModel: "Liebherr 1.5m³", tagNumber: "CM-003", inUse: true, maintenanceStatus: "Usable", maintenanceRequired: false, activity: "Concrete mixing", comments: "" },
    ],
    materials: [
      { id: "DMT-001", category: "Reinforcement", materialType: "Rebars Y16", unit: "tonnes", openingStock: 12.5, receivedQty: 5, issuedQty: 3.2, closingStock: 14.3, reorderLevel: 5, requestedBy: "Emeka Okafor", taskId: "WP-003", varianceReason: "" },
      { id: "DMT-002", category: "Aggregates", materialType: "Sharp sand", unit: "tonnes", openingStock: 20, receivedQty: 10, issuedQty: 8, closingStock: 22, reorderLevel: 10, requestedBy: "Site Store", taskId: "WP-004", varianceReason: "" },
    ],
    scope: [
      { id: "DS-001", taskId: "WP-003", yesterdayPlanned: "Complete steel fixing to grid B", yesterdayActual: "Grid B steel fixing 90% complete", todayPlanned: "Complete grid B, start grid C", todayActual: "Grid C steel fixing commenced", pctPlanned: 70, pctActual: 75, varianceExplanation: "" },
    ],
  },
  {
    id: "DR-002", projectId: "PRJ-001", reportDate: "2026-05-29", weather: "Cloudy",
    submittedBy: "Emeka Okafor", submittedAt: "2026-05-29T16:45:00", status: "draft",
    unlockedBy: null, unlockReason: null,
    manpower: [
      { id: "DM-003", vendorId: "V-001", vendorName: "Alhaji Masonry Services", trade: "Masonry", block: "Tower A", summaryTaskId: "SM-001", workPackageId: "WP-003", skilledCount: 11, unskilledCount: 22, mandays: 33, outputDescription: "180", outputUnit: "blocks laid", comments: "" },
    ],
    equipment: [
      { id: "DE-003", category: "Earthwork", equipmentType: "Excavator", ownership: "Hired", makeModel: "CAT 320D", tagNumber: "EX-001", inUse: true, maintenanceStatus: "Usable", maintenanceRequired: false, activity: "Foundation excavation", comments: "" },
    ],
    materials: [
      { id: "DMT-003", category: "Reinforcement", materialType: "Rebars Y16", unit: "tonnes", openingStock: 14.3, receivedQty: 0, issuedQty: 4.1, closingStock: 10.2, reorderLevel: 5, requestedBy: "Emeka Okafor", taskId: "WP-003", varianceReason: "" },
    ],
    scope: [
      { id: "DS-002", taskId: "WP-003", yesterdayPlanned: "Complete grid B, start grid C", yesterdayActual: "Grid C started, 40% done", todayPlanned: "Complete grid C reinforcement", todayActual: "Grid C reinforcement 60% complete", pctPlanned: 75, pctActual: 80, varianceExplanation: "" },
    ],
  },
];

export const issues: Issue[] = [
  { id: "ISS-001", projectId: "PRJ-001", issueNumber: "ISS-0042", dateRaised: "2026-05-20", raisedBy: "Emeka Okafor", title: "Steel delivery delay from supplier", description: "Expected Y16 rebars not delivered on 19 May. Impacting steel fixing work package WP-003.", taskId: "WP-003", impactTypes: ["Schedule", "Cost"], rootCause: "Supplier logistics breakdown", targetDate: "2026-05-30", actions: "Escalated to procurement. Alternative supplier identified.", ownerId: "Tunde Balogun", status: "In Progress", resolutionNotes: "", closedAt: null },
  { id: "ISS-002", projectId: "PRJ-001", issueNumber: "ISS-0043", dateRaised: "2026-05-22", raisedBy: "Sarah Adeyemi", title: "Water seepage in basement excavation", description: "Groundwater ingress detected at basement level B2. Needs dewatering plan.", taskId: "WP-005", impactTypes: ["Quality", "Schedule"], rootCause: "Higher than anticipated water table", targetDate: "2026-06-05", actions: "Engaged geotechnical consultant for dewatering design.", ownerId: "Emeka Okafor", status: "Under Investigation", resolutionNotes: "", closedAt: null },
  { id: "ISS-003", projectId: "PRJ-002", issueNumber: "ISS-0044", dateRaised: "2026-05-25", raisedBy: "Chidi Nwosu", title: "Concrete block shortage", description: "Block manufacturer unable to meet demand for Block 5-8 works.", taskId: "WP-010", impactTypes: ["Cost", "Schedule"], rootCause: "Manufacturer capacity constraint", targetDate: "2026-06-10", actions: "Sourcing alternative block supplier.", ownerId: "Mike Ogun", status: "Open", resolutionNotes: "", closedAt: null },
];

export const changeRequests: ChangeRequest[] = [
  { id: "CR-001", projectId: "PRJ-001", crNumber: "CR-0018", dateRaised: "2026-05-15", raisedBy: "Emeka Okafor", changeTypes: ["Scope", "Cost"], description: "Client requests addition of rooftop helipad", reason: "Client decision for premium office tower amenity", summaryTaskId: "ST-003", taskId: "WP-010", scopeImpact: "Additional helipad structure on roof (200m²)", scheduleImpactDays: 45, costImpact: 85_000_000, qualityImpact: "Requires specialist aviation engineering", stakeholderImpact: "Approval needed from aviation authority", recommendedAction: "Proceed with feasibility study before full approval", status: "Under Review", approverId: "Leadership", approvedAt: null, approvalNotes: "" },
  { id: "CR-002", projectId: "PRJ-002", crNumber: "CR-0019", dateRaised: "2026-05-18", raisedBy: "Sarah Adeyemi", changeTypes: ["Design", "Schedule"], description: "Revised block layout for Blocks 3-4 to improve views", reason: "Market feedback indicating premium on units with lagoon view", summaryTaskId: "ST-002", taskId: "WP-008", scopeImpact: "Rotate Blocks 3 and 4 by 15 degrees", scheduleImpactDays: 21, costImpact: 12_500_000, qualityImpact: "Improved unit desirability", stakeholderImpact: "Architect has confirmed feasibility", recommendedAction: "Approve design revision", status: "Approved", approverId: "Leadership", approvedAt: "2026-05-22", approvalNotes: "Approved with condition that foundation redesign cost is capped at ₦12.5M" },
];

export const delays: Delay[] = [
  { id: "DL-001", projectId: "PRJ-003", taskId: "WP-015", taskName: "Food court structural steel", stagePhase: "Superstructure Works", plannedEndDate: "2026-05-15", daysDelayed: 15, rootCause: "Steel import customs delay", recoveryPlan: "Expedite customs clearance, mobilize additional welding crew", recoveryActions: "Engaged clearing agent; requested priority inspection", ownerId: "Tunde Balogun", revisedEndDate: "2026-06-05", status: "Recovery Underway" },
];

export const documentFolders: DocumentFolder[] = [
  { id: "DF-001", projectId: "PRJ-001", parentFolderId: null, name: "Drawings", createdBy: "Emeka Okafor" },
  { id: "DF-002", projectId: "PRJ-001", parentFolderId: null, name: "Bill of Quantities", createdBy: "Emeka Okafor" },
  { id: "DF-003", projectId: "PRJ-001", parentFolderId: null, name: "Contracts", createdBy: "Emeka Okafor" },
  { id: "DF-004", projectId: "PRJ-001", parentFolderId: null, name: "Reports", createdBy: "Emeka Okafor" },
  { id: "DF-005", projectId: "PRJ-001", parentFolderId: null, name: "Correspondence", createdBy: "Emeka Okafor" },
  { id: "DF-006", projectId: "PRJ-001", parentFolderId: null, name: "Site Photos", createdBy: "Emeka Okafor" },
  { id: "DF-007", projectId: "PRJ-001", parentFolderId: null, name: "Permits & Approvals", createdBy: "Emeka Okafor" },
  { id: "DF-008", projectId: "PRJ-001", parentFolderId: "DF-001", name: "Architectural", createdBy: "Emeka Okafor" },
  { id: "DF-009", projectId: "PRJ-001", parentFolderId: "DF-001", name: "Structural", createdBy: "Emeka Okafor" },
];

export const documentFiles: DocumentFile[] = [
  { id: "DCF-001", folderId: "DF-008", projectId: "PRJ-001", name: "Ground Floor Plan Rev C.pdf", fileUrl: "#", version: 3, uploadedBy: "Emeka Okafor", uploadedAt: "2026-05-20" },
  { id: "DCF-002", folderId: "DF-008", projectId: "PRJ-001", name: "Elevations North-South.pdf", fileUrl: "#", version: 2, uploadedBy: "Sarah Adeyemi", uploadedAt: "2026-05-18" },
  { id: "DCF-003", folderId: "DF-009", projectId: "PRJ-001", name: "Foundation Layout.pdf", fileUrl: "#", version: 1, uploadedBy: "Emeka Okafor", uploadedAt: "2026-05-10" },
];

export const stakeholders: Stakeholder[] = [
  { id: "SH-001", projectId: "PRJ-001", name: "Babatunde Raji", organization: "Lekki Gardens Ltd", role: "Client", influenceLevel: "High", impactLevel: "High", notes: "Main client contact. Monthly progress meetings." },
  { id: "SH-002", projectId: "PRJ-001", name: "Arch. Femi Adekunle", organization: "Adekunle & Associates", role: "Consultant", influenceLevel: "Medium", impactLevel: "High", notes: "Lead architect for the project." },
  { id: "SH-003", projectId: "PRJ-001", name: "Lagos State Building Control", organization: "LASBCA", role: "Regulator", influenceLevel: "High", impactLevel: "Medium", notes: "Inspection approvals required at each stage." },
];

export const qualityNCRs: QualityNCR[] = [
  { id: "NCR-001", projectId: "PRJ-001", ncrId: "NCR-0023", date: "2026-05-22", description: "Concrete cube test failed at 28 days for column C12 pour", taskId: "WP-004", raisedBy: "QAQC Officer", correctiveAction: "Core drill and test existing column; if below spec, remove and recast", responsiblePerson: "Emeka Okafor", targetCloseDate: "2026-06-10", status: "Open" },
];

export const hseMatrix: HSEMatrix[] = [
  { id: "HSE-001", projectId: "PRJ-001", staffMember: "James Okafor", competency: "First Aid at Work", dateObtained: "2025-01-15", expiryDate: "2027-01-15", status: "Valid" },
  { id: "HSE-002", projectId: "PRJ-001", staffMember: "Sarah Adeyemi", competency: "Fire Marshal Training", dateObtained: "2024-03-10", expiryDate: "2026-03-10", status: "Expired" },
];

export const baselines: ProjectBaseline[] = [
  { id: "BL-001", projectId: "PRJ-001", version: 1, label: "Original Baseline", lockedAt: "2026-01-15", lockedBy: "Emeka Okafor",
    taskSnapshots: tasks.filter(t => t.projectId === "PRJ-001").map(t => ({ taskId: t.id, plannedStart: t.plannedStart, plannedEnd: t.plannedEnd })) },
];
export const calendars: ProjectCalendar[] = [
  { id: "CAL-001", projectId: "PRJ-001", workingDays: [1, 2, 3, 4, 5], workingHoursStart: "08:00", workingHoursEnd: "17:00",
    holidays: [{ date: "2026-01-01", label: "New Year" }, { date: "2026-05-01", label: "Workers Day" }, { date: "2026-10-01", label: "Independence Day" }, { date: "2026-12-25", label: "Christmas" }, { date: "2026-12-26", label: "Boxing Day" }],
    shutdowns: [{ start: "2026-12-20", end: "2026-12-31", label: "End of Year Shutdown" }] },
  { id: "CAL-002", projectId: "PRJ-002", workingDays: [1, 2, 3, 4, 5, 6], workingHoursStart: "07:00", workingHoursEnd: "18:00",
    holidays: [{ date: "2026-01-01", label: "New Year" }, { date: "2026-05-01", label: "Workers Day" }, { date: "2026-10-01", label: "Independence Day" }],
    shutdowns: [] },
];
export const earnedValueHistory: EarnedValueData[] = [
  { period: "Jan 2026", plannedValue: 0, earnedValue: 0, actualCost: 0 },
  { period: "Feb 2026", plannedValue: 85_000_000, earnedValue: 78_000_000, actualCost: 72_000_000 },
  { period: "Mar 2026", plannedValue: 210_000_000, earnedValue: 195_000_000, actualCost: 188_000_000 },
  { period: "Apr 2026", plannedValue: 380_000_000, earnedValue: 360_000_000, actualCost: 350_000_000 },
  { period: "May 2026", plannedValue: 520_000_000, earnedValue: 490_000_000, actualCost: 510_000_000 },
  { period: "Jun 2026", plannedValue: 680_000_000, earnedValue: 0, actualCost: 0 },
  { period: "Jul 2026", plannedValue: 810_000_000, earnedValue: 0, actualCost: 0 },
  { period: "Aug 2026", plannedValue: 950_000_000, earnedValue: 0, actualCost: 0 },
  { period: "Sep 2026", plannedValue: 1_080_000_000, earnedValue: 0, actualCost: 0 },
  { period: "Oct 2026", plannedValue: 1_200_000_000, earnedValue: 0, actualCost: 0 },
];
export const resourceAllocations: ResourceAllocation[] = [
  { vendorId: "V-001", weekStart: "2026-05-25", plannedMandays: 30, actualMandays: 28, capacity: 35, isOverloaded: false },
  { vendorId: "V-001", weekStart: "2026-06-01", plannedMandays: 35, actualMandays: 0, capacity: 35, isOverloaded: false },
  { vendorId: "V-001", weekStart: "2026-06-08", plannedMandays: 40, actualMandays: 0, capacity: 35, isOverloaded: true },
  { vendorId: "V-002", weekStart: "2026-05-25", plannedMandays: 15, actualMandays: 12, capacity: 20, isOverloaded: false },
  { vendorId: "V-002", weekStart: "2026-06-01", plannedMandays: 20, actualMandays: 0, capacity: 20, isOverloaded: false },
  { vendorId: "V-003", weekStart: "2026-05-25", plannedMandays: 37, actualMandays: 35, capacity: 40, isOverloaded: false },
  { vendorId: "V-003", weekStart: "2026-06-01", plannedMandays: 45, actualMandays: 0, capacity: 40, isOverloaded: true },
];
export const setupProgress: Record<string, ProjectSetupData> = {
  "PRJ-001": { basicInfoDone: true, scheduleBuilt: true, vendorsAdded: true, calendarConfigured: true, baselineLocked: true },
  "PRJ-002": { basicInfoDone: true, scheduleBuilt: true, vendorsAdded: true, calendarConfigured: true, baselineLocked: false },
  "PRJ-003": { basicInfoDone: true, scheduleBuilt: false, vendorsAdded: false, calendarConfigured: false, baselineLocked: false },
  "PRJ-004": { basicInfoDone: true, scheduleBuilt: true, vendorsAdded: false, calendarConfigured: false, baselineLocked: false },
  "PRJ-005": { basicInfoDone: true, scheduleBuilt: false, vendorsAdded: false, calendarConfigured: false, baselineLocked: false },
  "PRJ-006": { basicInfoDone: true, scheduleBuilt: true, vendorsAdded: true, calendarConfigured: true, baselineLocked: false },
  "PRJ-007": { basicInfoDone: true, scheduleBuilt: false, vendorsAdded: false, calendarConfigured: false, baselineLocked: false },
  "PRJ-008": { basicInfoDone: true, scheduleBuilt: true, vendorsAdded: true, calendarConfigured: true, baselineLocked: true },
};

export const staffList = [
  "Emeka Okafor", "Sarah Adeyemi", "Tunde Balogun", "Chidi Nwosu",
  "Yemi Lawson", "Dr. Ngozi Eze", "Mike Ogun", "Kunle Adesina",
  "James Okafor", "Aisha Bello",
];

export interface ProjectEmployee {
  id: string; firstName: string; lastName: string; role: string; department: string;
  status: string; dailyRate: number; employmentType: string;
}

export const hrEmployees: ProjectEmployee[] = [
  { id: "EMP-001", firstName: "Emeka", lastName: "Okafor", role: "Project Manager", department: "Project Management", status: "active", dailyRate: 80000, employmentType: "Full-time" },
  { id: "EMP-002", firstName: "Sarah", lastName: "Adeyemi", role: "Site Supervisor", department: "Site Operations", status: "active", dailyRate: 55000, employmentType: "Full-time" },
  { id: "EMP-003", firstName: "Tunde", lastName: "Balogun", role: "Quantity Surveyor", department: "Commercial", status: "active", dailyRate: 60000, employmentType: "Full-time" },
  { id: "EMP-004", firstName: "Chidi", lastName: "Nwosu", role: "HSE Officer", department: "Safety", status: "active", dailyRate: 45000, employmentType: "Full-time" },
  { id: "EMP-005", firstName: "Yemi", lastName: "Lawson", role: "Structural Engineer", department: "Engineering", status: "on_leave", dailyRate: 70000, employmentType: "Full-time" },
  { id: "EMP-006", firstName: "Aisha", lastName: "Bello", role: "QA/QC Inspector", department: "Quality", status: "active", dailyRate: 50000, employmentType: "Contract" },
];

export function getProjectById(id: string): Project | undefined {
  return projects.find(p => p.id === id);
}

export function getTasksByProject(projectId: string): Task[] {
  return tasks.filter(t => t.projectId === projectId);
}

export function getVendorsByProject(projectId: string): Vendor[] {
  return vendors.filter(v => v.projectId === projectId);
}

export function getReportsByProject(projectId: string): DailyReport[] {
  return dailyReports.filter(r => r.projectId === projectId);
}

export function getIssuesByProject(projectId: string): Issue[] {
  return issues.filter(i => i.projectId === projectId);
}

export function getChildTasks(parentId: string): Task[] {
  return tasks.filter(t => t.parentTaskId === parentId);
}

export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(n);
}

export function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function pctCompleteColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-orange-500";
}

export function ragColor(rag: string): string {
  switch (rag) {
    case "on-track": return "bg-green-500";
    case "at-risk": return "bg-amber-500";
    case "delayed": return "bg-red-500";
    default: return "bg-gray-400";
  }
}

export function ragText(rag: string): string {
  switch (rag) {
    case "on-track": return "text-green-700";
    case "at-risk": return "text-amber-700";
    case "delayed": return "text-red-700";
    default: return "text-gray-700";
  }
}

export function ragBg(rag: string): string {
  switch (rag) {
    case "on-track": return "bg-green-100";
    case "at-risk": return "bg-amber-100";
    case "delayed": return "bg-red-100";
    default: return "bg-gray-100";
  }
}

export function ragLabel(rag: string): string {
  switch (rag) {
    case "on-track": return "On Track";
    case "at-risk": return "At Risk";
    case "delayed": return "Delayed";
    default: return rag;
  }
}

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

// ── Human Resources (mock) ──────────────────────
export const humanResources: HumanResource[] = [
  { id: "HR-001", projectId: "PRJ-001", source: "vendor", name: "Alhaji Masonry Services", trade: "Masonry", contractType: "Labor-only", isNominated: false, contractSum: 45_000_000, vendorId: "V-001", vendorMargin: 30, status: "Active", assignedWorkPackages: ["WP-001", "WP-002"], blockAssignment: "Tower A", mandaysEstimate: 540 },
  { id: "HR-002", projectId: "PRJ-001", source: "individual-contractor", name: "Babatunde Welder", trade: "Welding", payRate: 25000, payRateUnit: "daily", skilledCount: 1, unskilledCount: 2, status: "Active", assignedWorkPackages: ["WP-003"], blockAssignment: "Tower A", mandaysEstimate: 45 },
  { id: "HR-003", projectId: "PRJ-002", source: "employee", name: "Sarah Adeyemi", trade: "Project Management", employeeId: "EMP-002", dailyRate: 45000, status: "Active", assignedWorkPackages: [], blockAssignment: "All", mandaysEstimate: 0 },
  { id: "HR-004", projectId: "PRJ-001", source: "vendor", name: "Chike Tiling Experts", trade: "Tiling", contractType: "Labor-only", contractSum: 28_000_000, vendorId: "V-002", vendorMargin: 25, status: "Active", assignedWorkPackages: ["WP-005"], blockAssignment: "Tower A", mandaysEstimate: 300 },
];

// ── Material Resources (mock) ───────────────────
export const materialResources: MaterialResource[] = [
  { id: "MR-001", projectId: "PRJ-001", name: "Cement (Grade 42.5)", category: "Aggregates", unit: "bags", estimatedQty: 5000, estimatedUnitCost: 5500, totalEstimatedCost: 27_500_000, procurementSource: "purchase" },
  { id: "MR-002", projectId: "PRJ-001", name: "Rebars Y16", category: "Reinforcement", unit: "tonnes", estimatedQty: 120, estimatedUnitCost: 850_000, totalEstimatedCost: 102_000_000, procurementSource: "purchase" },
  { id: "MR-003", projectId: "PRJ-001", name: "Sharp Sand", category: "Aggregates", unit: "tonnes", estimatedQty: 800, estimatedUnitCost: 3500, totalEstimatedCost: 2_800_000, procurementSource: "internal" },
];

// ── Equipment Resources (mock) ──────────────────
export const equipmentResources: EquipmentResource[] = [
  { id: "ER-001", projectId: "PRJ-001", name: "Tower Crane", category: "Lifting", ownership: "company-owned", internalCostPerDay: 150_000, estimatedDays: 180, totalEstimatedCost: 27_000_000, status: "Assigned" },
  { id: "ER-002", projectId: "PRJ-001", name: "Excavator CAT 320D", category: "Earthwork", ownership: "rented", rentalCostPerDay: 120_000, rentalSupplier: "Mario Equipment Ltd", estimatedDays: 90, totalEstimatedCost: 10_800_000, status: "Available" },
  { id: "ER-003", projectId: "PRJ-001", name: "Concrete Mixer", category: "Concreting", ownership: "company-owned", internalCostPerDay: 35_000, estimatedDays: 150, totalEstimatedCost: 5_250_000, status: "Available" },
];

// ── Resource Assignments (mock) ─────────────────
export const resourceAssignments: ResourceAssignment[] = [
  { id: "RA-001", taskId: "WP-001", projectId: "PRJ-001", resourceType: "human", humanResourceId: "HR-001", plannedQty: 30, plannedCost: 1_200_000, actualQty: 28, actualCost: 1_100_000 },
  { id: "RA-002", taskId: "WP-003", projectId: "PRJ-001", resourceType: "human", humanResourceId: "HR-002", plannedQty: 15, plannedCost: 375_000 },
  { id: "RA-003", taskId: "WP-003", projectId: "PRJ-001", resourceType: "material", materialResourceId: "MR-002", plannedQty: 10, plannedCost: 8_500_000 },
  { id: "RA-004", taskId: "ST-001", projectId: "PRJ-001", resourceType: "equipment", equipmentResourceId: "ER-002", plannedQty: 45, plannedCost: 5_400_000 },
  { id: "RA-005", taskId: "SS-002", projectId: "PRJ-001", resourceType: "human", humanResourceId: "HR-001", plannedQty: 20, plannedCost: 800_000 },
];

// ── Daily Expenses (mock) ───────────────────────
export const dailyExpenses: DailyExpense[] = [
  { id: "DE-001", projectId: "PRJ-001", reportDate: "2026-05-28", category: "human", description: "Masonry labor day rate", amount: 450_000, paidBy: "project-cash" },
  { id: "DE-002", projectId: "PRJ-001", reportDate: "2026-05-28", category: "material", description: "Emergency cement purchase", amount: 275_000, paidBy: "petty-cash", receiptRef: "RCT-001" },
  { id: "DE-003", projectId: "PRJ-001", reportDate: "2026-05-29", category: "equipment", description: "Excavator hire day rate", amount: 120_000, paidBy: "project-cash" },
];

// ── Communication Log (mock) ────────────────────
export const communicationLog: CommunicationLogEntry[] = [
  { id: "CL-001", projectId: "PRJ-001", date: "2026-05-20", from: "Emeka Okafor", to: "Tunde Balogun", channel: "email", subject: "Steel delivery delay", summary: "Email notification re: delayed Y16 rebars from supplier", followUpDate: "2026-05-30", status: "sent", createdBy: "Emeka Okafor", createdAt: "2026-05-20T10:30:00" },
  { id: "CL-002", projectId: "PRJ-001", date: "2026-05-22", from: "Sarah Adeyemi", to: "All Site Supervisors", channel: "meeting", subject: "Weekly site coordination", summary: "Discussed basement dewatering plan and revised sequence for Block A", status: "action-required", createdBy: "Emeka Okafor", createdAt: "2026-05-22T14:00:00", followUpDate: "2026-05-29" },
  { id: "CL-003", projectId: "PRJ-002", date: "2026-05-25", from: "Lagos State Govt Inspector", to: "Chidi Nwosu", channel: "letter", subject: "Road quality inspection notice", summary: "Formal notice of upcoming quality inspection for Section A of Apapa Road", followUpDate: "2026-06-01", status: "received", createdBy: "Chidi Nwosu", createdAt: "2026-05-25T09:00:00" },
];

// ── Disbursements (mock) ────────────────────────
// ── Funding (mock) ─────────────────────────────
export const fundingAllocations: FundingAllocation[] = [
  { id: "FA-001", projectId: "PRJ-001", source: "Lekki Gardens Ltd (Client)", totalAllocated: 1_250_000_000, dateAllocated: "2025-12-15", reference: "FIN-ALLOC-001", notes: "Full project budget allocation" },
  { id: "FA-002", projectId: "PRJ-002", source: "HomeKey Developers", totalAllocated: 820_000_000, dateAllocated: "2026-01-20", reference: "FIN-ALLOC-002", notes: "Phase 2 budget" },
  { id: "FA-003", projectId: "PRJ-003", source: "RetailCo Nigeria", totalAllocated: 1_840_000_000, dateAllocated: "2025-10-01", reference: "FIN-ALLOC-003", notes: "Mall expansion allocation" },
];

export const fundingReleases: FundingRelease[] = [
  { id: "FR-001", allocationId: "FA-001", projectId: "PRJ-001", amount: 500_000_000, dateReleased: "2026-01-10", reference: "FIN-REL-001", releasedTo: "Project Account" },
  { id: "FR-002", allocationId: "FA-001", projectId: "PRJ-001", amount: 300_000_000, dateReleased: "2026-03-01", reference: "FIN-REL-002", releasedTo: "Project Account" },
  { id: "FR-003", allocationId: "FA-001", projectId: "PRJ-001", amount: 200_000_000, dateReleased: "2026-05-15", reference: "FIN-REL-003", releasedTo: "Project Account" },
  { id: "FR-004", allocationId: "FA-002", projectId: "PRJ-002", amount: 410_000_000, dateReleased: "2026-02-01", reference: "FIN-REL-004", releasedTo: "Project Account" },
  { id: "FR-005", allocationId: "FA-003", projectId: "PRJ-003", amount: 1_000_000_000, dateReleased: "2025-11-01", reference: "FIN-REL-005", releasedTo: "Project Account" },
];

export const disbursements: Disbursement[] = [
  { id: "DB-001", projectId: "PRJ-001", amount: 50_000_000, date: "2026-01-20", source: "finance", reference: "FIN-DIS-001", notes: "Initial project mobilization", allocatedTo: ["ST-001"] },
  { id: "DB-002", projectId: "PRJ-001", amount: 25_000_000, date: "2026-03-15", source: "finance", reference: "FIN-DIS-002", notes: "Foundation works drawdown", allocatedTo: ["SM-001", "SM-002"] },
  { id: "DB-003", projectId: "PRJ-001", amount: 5_000_000, date: "2026-05-10", source: "project-cash", reference: "PETTY-001", notes: "Site petty cash top-up", allocatedTo: ["ST-001", "ST-002"] },
];

// ── Default Project Types (for settings) ────────
export const defaultProjectTypes: ProjectTypeSetting[] = [
  {
    sector: "Building & Construction" as Sector,
    categories: [
      {
        name: "Residential (single dwelling)",
        structure: { unitLabel: "House", fields: [{ key: "houseName", label: "House Name", type: "text" }, { key: "bedrooms", label: "Number of Bedrooms", type: "number" }] },
        descriptorMode: "dropdown", descriptorOptions: ["Detached", "Semi-detached", "Terraced", "Bungalow", "Duplex"], description: "",
      },
      {
        name: "Residential (multi-unit / estate)",
        structure: { unitLabel: "Building", fields: [{ key: "buildingName", label: "Building Name", type: "text" }, { key: "totalFloors", label: "Total Floors", type: "number" }, { key: "unitsPerFloor", label: "Units per Floor", type: "number" }, { key: "unitType", label: "Unit Type", type: "select", options: ["Studio", "1-Bedroom", "2-Bedroom", "3-Bedroom", "4-Bedroom", "Duplex", "Penthouse"] }] },
        descriptorMode: "dropdown", descriptorOptions: ["Gated estate", "Apartment complex", "Townhouse"], description: "",
      },
      {
        name: "Commercial (office building)",
        structure: { unitLabel: "Block", fields: [{ key: "blockName", label: "Block Name", type: "text" }, { key: "totalFloors", label: "Total Floors", type: "number" }, { key: "floorArea", label: "Floor Area (sqm)", type: "number" }] },
        descriptorMode: "dropdown", descriptorOptions: ["Low-rise", "High-rise", "Mixed-use"], description: "",
      },
      {
        name: "Commercial (retail / shopping)",
        structure: { unitLabel: "Section", fields: [{ key: "sectionName", label: "Section Name", type: "text" }, { key: "retailArea", label: "Retail Area (sqm)", type: "number" }] },
        descriptorMode: "dropdown", descriptorOptions: ["Mall", "Strip mall", "Plaza", "Hypermarket"], description: "",
      },
      {
        name: "Mixed-use development",
        structure: { unitLabel: "Complex", fields: [{ key: "complexName", label: "Complex Name", type: "text" }, { key: "totalBuildings", label: "Total Buildings", type: "number" }, { key: "totalUnits", label: "Total Units", type: "number" }] },
        descriptorMode: "dropdown", descriptorOptions: ["Vertical mixed-use", "Horizontal mixed-use"], description: "",
      },
      {
        name: "Institutional (school, hospital, church, government)",
        structure: { unitLabel: "Building", fields: [{ key: "buildingName", label: "Building Name", type: "text" }, { key: "totalClassrooms", label: "Total Classrooms", type: "number" }, { key: "buildingType", label: "Building Type", type: "select", options: ["Classroom Block", "Administration", "Laboratory", "Library", "Dormitory", "Cafeteria"] }] },
        descriptorMode: "dropdown", descriptorOptions: ["Public", "Private", "Religious", "Government"], description: "",
      },
      {
        name: "Industrial (warehouse, factory)",
        structure: { unitLabel: "Hall", fields: [{ key: "hallName", label: "Hall Name", type: "text" }, { key: "floorArea", label: "Floor Area (sqm)", type: "number" }, { key: "productionLines", label: "Production Lines", type: "number" }] },
        descriptorMode: "dropdown", descriptorOptions: ["Warehouse", "Factory", "Distribution centre"], description: "",
      },
      {
        name: "Hospitality (hotel, shortlet, event centre)",
        structure: { unitLabel: "Wing", fields: [{ key: "wingName", label: "Wing Name", type: "text" }, { key: "roomCount", label: "Room Count", type: "number" }, { key: "roomType", label: "Room Type", type: "select", options: ["Standard", "Deluxe", "Suite", "Executive Suite", "Penthouse"] }] },
        descriptorMode: "dropdown", descriptorOptions: ["Hotel", "Shortlet apartment", "Event centre", "Resort", "Guest house"], description: "",
      },
    ],
  },
  {
    sector: "Civil & Infrastructure" as Sector,
    categories: [
      { name: "Road construction", structure: { unitLabel: "Section", fields: [{ key: "sectionName", label: "Section Name", type: "text" }, { key: "length", label: "Length (km)", type: "number" }, { key: "carriagewayType", label: "Carriageway Type", type: "select", options: ["Single", "Dual", "Multi-lane"] }] }, descriptorMode: "dropdown", descriptorOptions: ["New construction", "Rehabilitation", "Upgrade", "Widening"], description: "" },
      { name: "Bridge", structure: { unitLabel: "Span", fields: [{ key: "spanName", label: "Span Name", type: "text" }, { key: "spanLength", label: "Span Length (m)", type: "number" }, { key: "bridgeType", label: "Bridge Type", type: "select", options: ["Beam", "Arch", "Suspension", "Cable-stayed", "Truss"] }] }, descriptorMode: "dropdown", descriptorOptions: ["New construction", "Rehabilitation"], description: "" },
      { name: "Drainage & stormwater", structure: { unitLabel: "Segment", fields: [{ key: "segmentName", label: "Segment Name", type: "text" }, { key: "length", label: "Length (m)", type: "number" }] }, descriptorMode: "free-text", descriptorOptions: [], description: "" },
      { name: "Borehole & water supply", structure: { unitLabel: "Station", fields: [{ key: "stationName", label: "Station Name", type: "text" }, { key: "capacity", label: "Capacity (L/hr)", type: "number" }] }, descriptorMode: "free-text", descriptorOptions: [], description: "" },
      { name: "Fencing & external works", structure: { unitLabel: "Segment", fields: [{ key: "segmentName", label: "Segment Name", type: "text" }, { key: "length", label: "Length (m)", type: "number" }] }, descriptorMode: "free-text", descriptorOptions: [], description: "" },
    ],
  },
  {
    sector: "Industrial & Facilities" as Sector,
    categories: [
      { name: "Factory fit-out", structure: { unitLabel: "Zone", fields: [{ key: "zoneName", label: "Zone Name", type: "text" }, { key: "area", label: "Area (sqm)", type: "number" }, { key: "zoneType", label: "Zone Type", type: "select", options: ["Sales Floor", "Stock Room", "Fitting Room", "Checkout"] }] }, descriptorMode: "dropdown", descriptorOptions: ["Greenfield", "Brownfield", "Retrofit"], description: "" },
      { name: "Warehouse construction", structure: { unitLabel: "Warehouse", fields: [{ key: "warehouseName", label: "Warehouse Name", type: "text" }, { key: "storageCapacity", label: "Storage Capacity (sqm)", type: "number" }, { key: "bayCount", label: "Bay Count", type: "number" }] }, descriptorMode: "dropdown", descriptorOptions: ["Greenfield", "Brownfield"], description: "" },
      { name: "Plant installation", structure: { unitLabel: "Unit", fields: [{ key: "unitName", label: "Unit Name", type: "text" }, { key: "capacity", label: "Capacity (MW)", type: "number" }, { key: "fuelType", label: "Fuel Type", type: "select", options: ["Natural Gas", "Diesel", "Solar", "Wind", "Hydro", "Coal", "Nuclear"] }] }, descriptorMode: "dropdown", descriptorOptions: ["New installation", "Retrofit"], description: "" },
    ],
  },
  {
    sector: "Interior & Fit-out" as Sector,
    categories: [
      { name: "Office fit-out", structure: { unitLabel: "Floor", fields: [{ key: "floorName", label: "Floor Name", type: "text" }, { key: "totalArea", label: "Total Area (sqm)", type: "number" }, { key: "workstations", label: "Workstations", type: "number" }] }, descriptorMode: "dropdown", descriptorOptions: ["Full fit-out", "Partial fit-out", "Refresh"], description: "" },
      { name: "Residential interior", structure: { unitLabel: "Room", fields: [{ key: "roomName", label: "Room Name", type: "text" }, { key: "roomArea", label: "Room Area (sqm)", type: "number" }] }, descriptorMode: "dropdown", descriptorOptions: ["Full fit-out", "Partial fit-out"], description: "" },
      { name: "Retail fit-out", structure: { unitLabel: "Zone", fields: [{ key: "zoneName", label: "Zone Name", type: "text" }, { key: "area", label: "Area (sqm)", type: "number" }] }, descriptorMode: "dropdown", descriptorOptions: ["Full fit-out", "Refresh"], description: "" },
      { name: "Shortlet apartment fit-out", structure: { unitLabel: "Unit", fields: [{ key: "unitName", label: "Unit Name", type: "text" }, { key: "roomCount", label: "Rooms", type: "number" }, { key: "unitType", label: "Type", type: "select", options: ["Studio", "1-Bedroom", "2-Bedroom", "Penthouse"] }] }, descriptorMode: "dropdown", descriptorOptions: ["Luxury", "Standard", "Budget"], description: "" },
    ],
  },
  {
    sector: "Renovation & Maintenance" as Sector,
    categories: [
      { name: "Full renovation (structural)", structure: { unitLabel: "Area", fields: [{ key: "areaName", label: "Area Name", type: "text" }, { key: "area", label: "Area (sqm)", type: "number" }, { key: "scope", label: "Scope", type: "select", options: ["Structural", "Cosmetic", "Full overhaul"] }] }, descriptorMode: "dropdown", descriptorOptions: ["Structural", "Cosmetic", "Full overhaul"], description: "" },
      { name: "Cosmetic renovation (finishing only)", structure: { unitLabel: "Room", fields: [{ key: "roomName", label: "Room Name", type: "text" }, { key: "roomArea", label: "Room Area (sqm)", type: "number" }, { key: "scope", label: "Scope", type: "select", options: ["Full Renovation", "Partial Renovation", "Cosmetic"] }] }, descriptorMode: "dropdown", descriptorOptions: ["Cosmetic"], description: "" },
      { name: "Planned maintenance", structure: { unitLabel: "Block", fields: [{ key: "blockName", label: "Block Name", type: "text" }, { key: "area", label: "Area (sqm)", type: "number" }] }, descriptorMode: "dropdown", descriptorOptions: ["Preventive", "Routine", "Seasonal"], description: "" },
      { name: "Emergency repair", structure: { unitLabel: "Location", fields: [{ key: "locationName", label: "Location", type: "text" }, { key: "issue", label: "Issue", type: "text" }] }, descriptorMode: "free-text", descriptorOptions: [], description: "" },
    ],
  },
  {
    sector: "Other" as Sector,
    categories: [
      { name: "Other", structure: { unitLabel: "Unit", fields: [{ key: "unitName", label: "Unit Name", type: "text" }, { key: "description", label: "Description", type: "text" }] }, descriptorMode: "free-text", descriptorOptions: [], description: "" },
    ],
  },
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

export const stubMaterials: MaterialResource[] = [
  { id: "MAT-001", projectId: "", name: "Cement (Grade 42.5)", category: "Concrete", unit: "bags", estimatedQty: 5000, estimatedUnitCost: 5500, totalEstimatedCost: 27500000, procurementSource: "internal" },
  { id: "MAT-002", projectId: "", name: "Reinforcement Steel (16mm)", category: "Reinforcement", unit: "tonnes", estimatedQty: 120, estimatedUnitCost: 850000, totalEstimatedCost: 102000000, procurementSource: "purchase" },
  { id: "MAT-003", projectId: "", name: "Sharp Sand", category: "Aggregates", unit: "tonnes", estimatedQty: 800, estimatedUnitCost: 12000, totalEstimatedCost: 9600000, procurementSource: "purchase" },
  { id: "MAT-004", projectId: "", name: "Granite (3/4 inch)", category: "Aggregates", unit: "tonnes", estimatedQty: 600, estimatedUnitCost: 18000, totalEstimatedCost: 10800000, procurementSource: "internal" },
  { id: "MAT-005", projectId: "", name: "PVC Pipes (4 inch)", category: "Plumbing", unit: "pieces", estimatedQty: 200, estimatedUnitCost: 4500, totalEstimatedCost: 900000, procurementSource: "purchase" },
];

export const stubEquipment: EquipmentResource[] = [
  { id: "EQ-001", projectId: "", name: "Excavator (20 ton)", category: "Earthwork", ownership: "company-owned", internalCostPerDay: 120000, estimatedDays: 90, totalEstimatedCost: 10800000, status: "Available" },
  { id: "EQ-002", projectId: "", name: "Tower Crane", category: "Lifting", ownership: "rented", rentalCostPerDay: 250000, rentalSupplier: "CraneHire Ltd", estimatedDays: 180, totalEstimatedCost: 45000000, status: "Assigned" },
  { id: "EQ-003", projectId: "", name: "Concrete Mixer (1m³)", category: "Concreting", ownership: "company-owned", internalCostPerDay: 45000, estimatedDays: 150, totalEstimatedCost: 6750000, status: "Available" },
  { id: "EQ-004", projectId: "", name: "Compactor (Vibratory Roller)", category: "Compaction", ownership: "rented", rentalCostPerDay: 80000, rentalSupplier: "BuildEquip Co", estimatedDays: 45, totalEstimatedCost: 3600000, status: "Under Maintenance" },
  { id: "EQ-005", projectId: "", name: "Generator (100 KVA)", category: "Generators / Power", ownership: "company-owned", internalCostPerDay: 35000, estimatedDays: 365, totalEstimatedCost: 12775000, status: "Available" },
];
