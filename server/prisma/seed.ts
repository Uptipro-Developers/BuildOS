import {
  PrismaClient,
  ProjectStatus,
  ProjectType,
  EmployeeStatus,
  EmploymentType,
  LeaveStatus,
  ClaimStatus,
  POStatus,
  ExpenseStatus,
  IncomeStatus,
  BudgetScope,
  BudgetStatus,
  PaymentType,
  PaymentStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedConstruction } from './seed-construction';

const prisma = new PrismaClient();

async function clearDatabase() {
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations'
      )
      LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END
    $$;
  `);
}

async function main() {
  console.log('Seeding database...');
  
  // Skip clearing database to avoid connection timeout
  // Database should be cleaned before seed if needed

  const departments = [
    { name: 'Engineering', description: 'Engineering teams', location: 'HQ Floor 3', budget: 45000000 },
    { name: 'Operations', description: 'Project execution teams', location: 'HQ Floor 2', budget: 38000000 },
    { name: 'Finance', description: 'Finance and reporting teams', location: 'HQ Floor 4', budget: 28000000 },
    { name: 'Human Resources', description: 'HR and payroll teams', location: 'HQ Floor 1', budget: 22000000 },
    { name: 'Procurement', description: 'Procurement and supplier teams', location: 'HQ Floor 2', budget: 18000000 },
    { name: 'Administration', description: 'Admin and support teams', location: 'HQ Floor 1', budget: 12000000 },
  ];

  const deptRecords = new Map<string, { id: string }>();
  for (const d of departments) {
    const rec = await prisma.department.upsert({
      where: { name: d.name },
      update: d,
      create: d,
    });
    deptRecords.set(d.name, { id: rec.id });
  }

  const employees = [
    {
      firstName: 'Chukwudi',
      lastName: 'Eze',
      email: 'c.eze@buildos.ng',
      phone: '+2348012345001',
      dateHired: new Date('2022-03-15'),
      status: EmployeeStatus.active,
      employmentType: EmploymentType.FullTime,
      projectCount: 2,
      projects: ['Lekki Tower A', 'Airport Bridge'],
      departmentId: deptRecords.get('Engineering')?.id,
    },
    {
      firstName: 'Amaka',
      lastName: 'Osei',
      email: 'a.osei@buildos.ng',
      phone: '+2348023456002',
      dateHired: new Date('2021-07-01'),
      status: EmployeeStatus.active,
      employmentType: EmploymentType.FullTime,
      projectCount: 2,
      projects: ['Lekki Tower A', 'Riverside Residential'],
      departmentId: deptRecords.get('Operations')?.id,
    },
    {
      firstName: 'Sola',
      lastName: 'Adeleke',
      email: 's.adeleke@buildos.ng',
      phone: '+2348067890006',
      dateHired: new Date('2019-09-15'),
      status: EmployeeStatus.active,
      employmentType: EmploymentType.FullTime,
      projectCount: 0,
      projects: [],
      departmentId: deptRecords.get('Finance')?.id,
    },
    {
      firstName: 'Ngozi',
      lastName: 'Okafor',
      email: 'n.okafor@buildos.ng',
      phone: '+2348045678004',
      dateHired: new Date('2020-05-20'),
      status: EmployeeStatus.active,
      employmentType: EmploymentType.FullTime,
      projectCount: 0,
      projects: [],
      departmentId: deptRecords.get('Human Resources')?.id,
    },
    {
      firstName: 'Musa',
      lastName: 'Ibrahim',
      email: 'm.ibrahim@buildos.ng',
      phone: '+2348034567003',
      dateHired: new Date('2023-01-10'),
      status: EmployeeStatus.active,
      employmentType: EmploymentType.FullTime,
      projectCount: 1,
      projects: ['Industrial Warehouse'],
      departmentId: deptRecords.get('Procurement')?.id,
    },
    {
      firstName: 'Kemi',
      lastName: 'Adeyemi',
      email: 'k.adeyemi@buildos.ng',
      phone: '+2348112345011',
      dateHired: new Date('2021-02-15'),
      status: EmployeeStatus.active,
      employmentType: EmploymentType.FullTime,
      projectCount: 0,
      projects: [],
      departmentId: deptRecords.get('Administration')?.id,
    },
  ];

  const employeeRecords = new Map<string, { id: string }>();
  for (const e of employees) {
    const rec = await prisma.employee.upsert({
      where: { email: e.email },
      update: e,
      create: e,
    });
    employeeRecords.set(`${e.firstName} ${e.lastName}`, { id: rec.id });
  }

  const engineeringHead = employeeRecords.get('Chukwudi Eze');
  if (engineeringHead) {
    await prisma.department.update({
      where: { id: deptRecords.get('Engineering')!.id },
      data: { headId: engineeringHead.id },
    });
  }

  const projects = [
    {
      id: 'lekki-tower-a',
      name: 'Lekki Tower A',
      client: 'Orbit Developments',
      location: 'Lekki Phase 1',
      state: 'Lagos',
      city: 'Lagos',
      status: ProjectStatus.Active,
      type: ProjectType.Commercial,
      budget: 12_500_000,
      spent: 8_125_000,
      progress: 65,
      startDate: new Date('2025-01-15'),
      endDate: new Date('2026-12-31'),
      manager: 'Amaka Osei',
      teamSize: 24,
    },
    {
      id: 'riverside-residential',
      name: 'Riverside Residential',
      client: 'ClearWater Properties',
      location: 'Trans-Amadi',
      state: 'Rivers',
      city: 'Port Harcourt',
      status: ProjectStatus.Active,
      type: ProjectType.Residential,
      budget: 8_200_000,
      spent: 3_444_000,
      progress: 42,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2026-09-30'),
      manager: 'Chukwudi Eze',
      teamSize: 18,
    },
    {
      id: 'industrial-warehouse',
      name: 'Industrial Warehouse',
      client: 'Dangote Logistics',
      location: 'Apapa',
      state: 'Lagos',
      city: 'Lagos',
      status: ProjectStatus.Planning,
      type: ProjectType.Industrial,
      budget: 5_800_000,
      spent: 870_000,
      progress: 15,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2027-01-31'),
      manager: 'Musa Ibrahim',
      teamSize: 12,
    },
  ];

  const projectRecords = new Map<string, { id: string }>();
  for (const p of projects) {
    const rec = await prisma.project.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
    projectRecords.set(p.name, { id: rec.id });
  }

  const leaveTypes = [
    { name: 'Annual Leave', daysAllowed: 21, carryOver: true, maxCarryOver: 5, paid: true, approvalsRequired: 1, color: '#3B82F6', gender: 'All' },
    { name: 'Sick Leave', daysAllowed: 14, carryOver: false, maxCarryOver: 0, paid: true, approvalsRequired: 1, color: '#F59E0B', gender: 'All' },
    { name: 'Maternity Leave', daysAllowed: 90, carryOver: false, maxCarryOver: 0, paid: true, approvalsRequired: 2, color: '#EC4899', gender: 'Female' },
  ];

  const leaveTypeRecords = new Map<string, { id: string }>();
  for (const lt of leaveTypes) {
    const rec = await prisma.leaveType.create({ data: lt });
    leaveTypeRecords.set(lt.name, { id: rec.id });
  }

  const claimTypes = [
    { name: 'Medical', description: 'Medical reimbursement', isProjectBased: false },
    { name: 'Travel', description: 'Business travel claims', isProjectBased: true },
    { name: 'Professional Development', description: 'Training and certifications', isProjectBased: false },
  ];

  const claimTypeRecords = new Map<string, { id: string }>();
  for (const ct of claimTypes) {
    const rec = await prisma.claimType.create({ data: ct });
    claimTypeRecords.set(ct.name, { id: rec.id });
  }

  await prisma.leaveRequest.create({
    data: {
      refId: 'LV-2026-001',
      employeeId: employeeRecords.get('Chukwudi Eze')!.id,
      leaveTypeId: leaveTypeRecords.get('Annual Leave')!.id,
      days: 5,
      startDate: new Date('2026-06-02'),
      endDate: new Date('2026-06-06'),
      status: LeaveStatus.approved,
      approvedBy: 'Ngozi Okafor',
      approvedAt: new Date('2026-05-30'),
      notes: 'Family vacation',
    },
  });

  await prisma.claim.create({
    data: {
      amount: 45_000,
      description: 'Hospital bill reimbursement',
      date: new Date('2026-04-11'),
      status: ClaimStatus.UnderReview,
      employeeId: employeeRecords.get('Kemi Adeyemi')!.id,
      claimTypeId: claimTypeRecords.get('Medical')!.id,
    },
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: 'Dangote Cement PLC',
      contactPerson: 'Aliko Dangote Jr',
      phone: '+2348011110001',
      email: 'supplies@dangote-cement.com',
      city: 'Lagos',
      categories: ['Concrete', 'Aggregates'],
      rating: 4.8,
      onTimeDeliveryRate: 96,
      rejectRate: 1.2,
      totalSpend: 12_500_000,
      lastOrder: new Date('2026-04-10'),
      status: 'active',
      notes: 'Preferred cement supplier',
      materials: {
        create: [
          { name: 'OPC Cement', unit: 'bags', lastPrice: 8500 },
          { name: 'Ready Mix Concrete', unit: 'm3', lastPrice: 45000 },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      id: 'PO-0027',
      supplierId: supplier.id,
      prRef: 'PR-2026-0041',
      mrRef: 'MR-2026-0039',
      poRef: 'PO-0027',
      status: POStatus.confirmation_requested,
      sentToFinance: true,
      financeRef: 'PI-001',
      createdBy: 'Musa Ibrahim',
      expectedDate: new Date('2026-04-20'),
      totalValue: 4_690_000,
      receivedValue: 3_100_000,
      items: {
        create: [
          { material: 'OPC Cement', qty: 500, unit: 'bags', unitCost: 8500, received: 300 },
          { material: 'Sharp Sand', qty: 20, unit: 'tonnes', unitCost: 22000, received: 20 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      id: 'EXP-0051',
      category: 'Materials',
      amount: 245_000,
      description: 'Cement and steel',
      createdBy: 'Chukwudi Eze',
      date: new Date('2026-04-12'),
      status: ExpenseStatus.Submitted,
      projectId: projectRecords.get('Lekki Tower A')!.id,
    },
  });

  await prisma.income.create({
    data: {
      id: 'INC-0021',
      source: 'Contract Milestone',
      amount: 1_250_000,
      description: 'Phase 2 completion milestone',
      date: new Date('2026-04-12'),
      status: IncomeStatus.Received,
      projectId: projectRecords.get('Lekki Tower A')!.id,
    },
  });

  await prisma.budget.create({
    data: {
      id: 'BUD-001',
      name: 'Lekki Tower A',
      scope: BudgetScope.Project,
      totalBudget: 12_500_000,
      spent: 8_125_000,
      committed: 1_200_000,
      period: 'FY2026',
      status: BudgetStatus.OnTrack,
      projectId: projectRecords.get('Lekki Tower A')!.id,
    },
  });

  await prisma.payment.create({
    data: {
      id: 'PAY-0041',
      type: PaymentType.Contractor,
      reference: 'EXP-0051',
      recipient: 'Dangote Cement PLC',
      amount: 620_000,
      method: 'Bank Transfer',
      bank: 'Access Bank',
      date: new Date('2026-04-12'),
      status: PaymentStatus.PaymentCompleted,
      completedAt: new Date('2026-04-13T09:14:00'),
    },
  });

  const store = await prisma.store.create({
    data: {
      name: 'General Store',
      type: 'General',
      manager: 'Musa Ibrahim',
      location: 'Lagos HQ',
    },
  });

  await prisma.material.create({
    data: {
      name: 'OPC Cement',
      category: 'Concrete',
      unit: 'bags',
      totalQty: 1200,
      availableQty: 900,
      reservedQty: 300,
      unitCost: 8500,
      reorderLevel: 200,
      materialType: 'Consumable',
      allocationStatus: 'Available',
    },
  });

  await prisma.storeItem.create({
    data: {
      storeId: store.id,
      materialName: 'OPC Cement',
      category: 'Concrete',
      unit: 'bags',
      qty: 900,
      reorderLevel: 200,
      unitCost: 8500,
      lastReceived: new Date('2026-04-10'),
      bin: 'A-12',
    },
  });

  await prisma.cluster.createMany({
    data: [
      { name: 'Lagos Cluster', description: 'Projects in Lagos region' },
      { name: 'Abuja Cluster', description: 'Projects in Abuja / FCT region' },
      { name: 'Port Harcourt Cluster', description: 'Projects in Rivers region' },
      { name: 'Kano Cluster', description: 'Projects in Kano region' },
    ],
    skipDuplicates: true,
  });

  await prisma.equipment.createMany({
    data: [
      { name: 'Excavator (20 ton)', category: 'Earthwork', defaultInternalCostPerDay: 120000, status: 'Available' },
      { name: 'Bulldozer D6', category: 'Earthwork', defaultInternalCostPerDay: 180000, status: 'Assigned' },
      { name: 'Concrete Mixer (1m³)', category: 'Concreting', defaultInternalCostPerDay: 45000, status: 'Available' },
      { name: 'Concrete Pump', category: 'Concreting', defaultInternalCostPerDay: 95000, status: 'Available' },
      { name: 'Tower Crane (50m)', category: 'Lifting', defaultInternalCostPerDay: 250000, status: 'Assigned' },
      { name: 'Mobile Crane (25 ton)', category: 'Lifting', defaultInternalCostPerDay: 180000, status: 'Available' },
      { name: 'Generator (100 KVA)', category: 'Generators / Power', defaultInternalCostPerDay: 35000, status: 'Available' },
      { name: 'Dump Truck (20 ton)', category: 'Transport', defaultInternalCostPerDay: 75000, status: 'Available' },
    ],
  });

  await prisma.materialRequest.create({
    data: {
      reference: 'MR-2026-0039',
      materialName: 'OPC Cement',
      unit: 'bags',
      qty: 100,
      storeName: 'General Store',
      storeId: store.id,
      projectName: 'Lekki Tower A',
      projectId: projectRecords.get('Lekki Tower A')!.id,
      purpose: 'Concrete casting',
      priority: 'Normal',
      status: 'Pending',
      requestedBy: 'Chukwudi Eze',
    },
  });

  await prisma.purchaseRequest.create({
    data: {
      prRef: 'PR-2026-0041',
      title: 'Cement supply for Lekki Tower A',
      projectId: projectRecords.get('Lekki Tower A')!.id,
      projectName: 'Lekki Tower A',
      status: 'Approved',
      priority: 'Normal',
      requestedBy: 'Musa Ibrahim',
      items: [{ material: 'OPC Cement', qty: 500, unit: 'bags' }],
      notes: 'Urgent replenishment for slab works',
    },
  });

  // Full chart of accounts matching the design — upsert by code so the seed is
  // safe to re-run; parentId is wired in a second pass once all IDs are known.
  const coaRows = [
    // Root accounts
    { code: '1000', name: 'Assets',              type: 'Assets',      description: 'All asset accounts' },
    { code: '2000', name: 'Liabilities',         type: 'Liabilities', description: 'All liability accounts' },
    { code: '3000', name: 'Equity',              type: 'Equity',      description: "Owner's equity" },
    { code: '4000', name: 'Income',              type: 'Income',      description: 'All income accounts' },
    { code: '5000', name: 'Expenses',            type: 'Expenses',    description: 'All expense accounts' },
    // Assets — level 1
    { code: '1100', name: 'Current Assets',      type: 'Assets',      description: 'Short-term assets',              parentCode: '1000' },
    { code: '1200', name: 'Fixed Assets',        type: 'Assets',      description: 'Long-term physical assets',       parentCode: '1000' },
    // Assets — level 2
    { code: '1110', name: 'Cash & Bank',         type: 'Assets',      description: 'Cash on hand and bank balances',  parentCode: '1100' },
    { code: '1120', name: 'Accounts Receivable', type: 'Assets',      description: 'Amounts owed by customers',       parentCode: '1100' },
    { code: '1210', name: 'Plant & Equipment',   type: 'Assets',      description: 'Machinery and equipment',         parentCode: '1200' },
    // Liabilities — level 1
    { code: '2100', name: 'Current Liabilities', type: 'Liabilities', description: 'Short-term obligations',          parentCode: '2000' },
    // Liabilities — level 2
    { code: '2110', name: 'Accounts Payable',    type: 'Liabilities', description: 'Amounts owed to suppliers',       parentCode: '2100' },
    { code: '2120', name: 'Accrued Expenses',    type: 'Liabilities', description: 'Expenses incurred but not yet paid', parentCode: '2100' },
    // Equity — level 1
    { code: '3100', name: 'Retained Earnings',   type: 'Equity',      description: 'Accumulated profits',             parentCode: '3000' },
    // Income — level 1
    { code: '4100', name: 'Contract Revenue',    type: 'Income',      description: 'Revenue from construction contracts', parentCode: '4000' },
    { code: '4200', name: 'Service Income',      type: 'Income',      description: 'Revenue from services rendered',  parentCode: '4000' },
    // Expenses — level 1
    { code: '5100', name: 'Labour Costs',        type: 'Expenses',    description: 'Wages and salaries',              parentCode: '5000' },
    { code: '5200', name: 'Material Costs',      type: 'Expenses',    description: 'Raw materials and supplies',      parentCode: '5000' },
    { code: '5300', name: 'Equipment Costs',     type: 'Expenses',    description: 'Equipment hire and maintenance',  parentCode: '5000' },
    { code: '5400', name: 'Overhead',            type: 'Expenses',    description: 'General overhead costs',          parentCode: '5000' },
  ];

  // First pass: upsert all rows without parentId so every record exists.
  for (const { parentCode: _pc, ...row } of coaRows) {
    await prisma.chartAccount.upsert({
      where: { code: row.code },
      create: { ...row, category: row.type },
      update: { name: row.name, type: row.type, category: row.type },
    });
  }
  // Second pass: wire parentId now that all IDs exist.
  const allAccounts = await prisma.chartAccount.findMany({ select: { id: true, code: true } });
  const codeToId = new Map(allAccounts.map((a) => [a.code, a.id]));
  for (const { code, parentCode } of coaRows) {
    if (!parentCode) continue;
    const parentId = codeToId.get(parentCode);
    if (parentId) {
      await prisma.chartAccount.update({ where: { code }, data: { parentId } });
    }
  }

  const report = await prisma.reportDefinition.create({
    data: {
      name: 'Project Financial Summary',
      type: 'financial',
      module: 'finance',
      description: 'Summary of budget, income, and expense by project',
      isScheduled: false,
      createdBy: 'system',
    },
  });

  await prisma.reportRun.create({
    data: {
      reportId: report.id,
      status: 'completed',
      startedAt: new Date('2026-06-01T09:00:00'),
      completedAt: new Date('2026-06-01T09:00:30'),
      outputUrl: '/reports/project-financial-summary-20260601.pdf',
    },
  });

  await prisma.appRole.create({
    data: {
      name: 'Admin',
      description: 'System administrator with unrestricted access',
      isSuper: true,
      appScope: ['admin', 'finance', 'hr', 'procurement', 'construction', 'ess', 'storefront'],
    },
  });

  // ─────────────── CONSTRUCTION MODULE SEED ───────────────
  await seedConstruction(prisma, projectRecords);

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@buildos.ng').trim().toLowerCase();
  const adminName = (process.env.SEED_ADMIN_NAME || 'Admin User').trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'BuildOS@2025';
  const adminAssignedApps = ['construction', 'finance', 'hr', 'procurement', 'admin', 'ess', 'storefront'];
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: 'admin',
      assignedApps: adminAssignedApps,
      password: hashedPassword,
      status: 'Active',
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      role: 'admin',
      assignedApps: adminAssignedApps,
      status: 'Active',
    },
  });

  console.log('Seed completed successfully!');
  console.log(`Admin user seeded: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
