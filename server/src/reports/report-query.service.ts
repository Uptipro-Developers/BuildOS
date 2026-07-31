import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ReportFieldType = 'text' | 'number' | 'date' | 'status';

interface ReportField {
    key: string;
    label: string;
    type: ReportFieldType;
    /** Prisma scalar this field reads. Omitted when `derive` supplies the value. */
    column?: string;
    /** Computed from the loaded row — for joins, concatenations and counts. */
    derive?: (row: any) => unknown;
    /** Prisma `select` fragment needed to compute this field. */
    select?: Record<string, any>;
    /** False when the column cannot be filtered or sorted in the database. */
    queryable?: boolean;
}

interface ReportSource {
    value: string;
    label: string;
    module: string;
    app: string;
    /** Prisma model name, used to look the delegate up on PrismaService. */
    model: string;
    fields: ReportField[];
}

/**
 * The report data sources — what Report Builder can actually query.
 *
 * Report Builder rendered a preview from `let rows = []` that nothing ever
 * populated, so it always showed headers with no data and its CSV export produced
 * a headers-only file. The only backend endpoint (`/reports/generate/custom`)
 * covered three of the six sources and passed the client's `filters` object
 * straight into Prisma's `where`, which let a caller query by any column and
 * traverse any relation.
 *
 * This registry fixes both problems. It is the single source of truth for which
 * sources and fields exist, so the picker can no longer offer fields the database
 * does not have — the old hardcoded frontend list offered `Expense.vendor`,
 * `PurchaseOrder.project` and `AuditLog.result`, none of which are columns. And
 * because filters and sorts are resolved through it, only listed fields can ever
 * reach Prisma.
 */
const REPORT_SOURCES: ReportSource[] = [
    {
        value: 'projects',
        label: 'Projects',
        module: 'Projects',
        app: 'construction',
        model: 'project',
        fields: [
            { key: 'name', label: 'Project Name', type: 'text', column: 'name' },
            { key: 'client', label: 'Client', type: 'text', column: 'client' },
            { key: 'location', label: 'Location', type: 'text', column: 'location' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            { key: 'budget', label: 'Budget', type: 'number', column: 'budget' },
            { key: 'spent', label: 'Amount Spent', type: 'number', column: 'spent' },
            { key: 'progress', label: 'Progress (%)', type: 'number', column: 'progress' },
            { key: 'start_date', label: 'Start Date', type: 'date', column: 'startDate' },
            { key: 'end_date', label: 'End Date', type: 'date', column: 'endDate' },
            { key: 'manager', label: 'Project Manager', type: 'text', column: 'manager' },
            { key: 'team_size', label: 'Team Size', type: 'number', column: 'teamSize' },
        ],
    },
    {
        value: 'expenses',
        label: 'Expenses',
        module: 'Finance',
        app: 'finance',
        model: 'expense',
        fields: [
            { key: 'date', label: 'Date', type: 'date', column: 'date' },
            { key: 'category', label: 'Category', type: 'text', column: 'category' },
            { key: 'description', label: 'Description', type: 'text', column: 'description' },
            { key: 'amount', label: 'Amount', type: 'number', column: 'amount' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            {
                key: 'project',
                label: 'Project',
                type: 'text',
                select: { project: { select: { name: true } } },
                derive: (row) => row.project?.name ?? '',
                queryable: false,
            },
            { key: 'created_by', label: 'Submitted By', type: 'text', column: 'createdBy' },
            { key: 'approved_by', label: 'Approved By', type: 'text', column: 'approvedBy' },
        ],
    },
    {
        value: 'purchase_orders',
        label: 'Purchase Orders',
        module: 'Procurement',
        app: 'procurement',
        model: 'purchaseOrder',
        fields: [
            {
                key: 'reference',
                label: 'Reference',
                type: 'text',
                // A PO has no number of its own; it carries the reference of the
                // request it came from.
                select: { prRef: true, mrRef: true, id: true },
                derive: (row) => row.prRef || row.mrRef || row.id,
                queryable: false,
            },
            {
                key: 'supplier',
                label: 'Supplier',
                type: 'text',
                select: { supplier: { select: { name: true } } },
                derive: (row) => row.supplier?.name ?? '',
                queryable: false,
            },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            { key: 'payment_status', label: 'Payment Status', type: 'status', column: 'paymentStatus' },
            { key: 'total_value', label: 'Total Value', type: 'number', column: 'totalValue' },
            { key: 'received_value', label: 'Received Value', type: 'number', column: 'receivedValue' },
            {
                key: 'items',
                label: 'Line Items',
                type: 'number',
                select: { _count: { select: { items: true } } },
                derive: (row) => row._count?.items ?? 0,
                queryable: false,
            },
            { key: 'created_date', label: 'Created Date', type: 'date', column: 'createdDate' },
            { key: 'expected_date', label: 'Expected Date', type: 'date', column: 'expectedDate' },
        ],
    },
    {
        value: 'inventory',
        label: 'Inventory',
        module: 'Procurement',
        app: 'procurement',
        model: 'material',
        fields: [
            { key: 'item_name', label: 'Material', type: 'text', column: 'name' },
            { key: 'category', label: 'Category', type: 'text', column: 'category' },
            { key: 'unit', label: 'Unit', type: 'text', column: 'unit' },
            { key: 'total_qty', label: 'Total Quantity', type: 'number', column: 'totalQty' },
            { key: 'available_qty', label: 'Available Quantity', type: 'number', column: 'availableQty' },
            { key: 'reserved_qty', label: 'Reserved Quantity', type: 'number', column: 'reservedQty' },
            { key: 'unit_cost', label: 'Unit Cost', type: 'number', column: 'unitCost' },
            {
                key: 'total_value',
                label: 'Stock Value',
                type: 'number',
                select: { totalQty: true, unitCost: true },
                derive: (row) => Number(row.totalQty ?? 0) * Number(row.unitCost ?? 0),
                queryable: false,
            },
            { key: 'reorder_level', label: 'Reorder Level', type: 'number', column: 'reorderLevel' },
            { key: 'allocation_status', label: 'Allocation', type: 'status', column: 'allocationStatus' },
        ],
    },
    {
        value: 'employees',
        label: 'Employees',
        module: 'HR',
        app: 'hr',
        model: 'employee',
        fields: [
            {
                key: 'name',
                label: 'Employee Name',
                type: 'text',
                select: { firstName: true, lastName: true },
                derive: (row) => `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim(),
                queryable: false,
            },
            { key: 'email', label: 'Email', type: 'text', column: 'email' },
            { key: 'phone', label: 'Phone', type: 'text', column: 'phone' },
            { key: 'role', label: 'Job Title', type: 'text', column: 'role' },
            {
                key: 'department',
                label: 'Department',
                type: 'text',
                select: { department: { select: { name: true } } },
                derive: (row) => row.department?.name ?? '',
                queryable: false,
            },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            { key: 'employment_type', label: 'Employment Type', type: 'status', column: 'employmentType' },
            { key: 'join_date', label: 'Date Hired', type: 'date', column: 'dateHired' },
            { key: 'salary', label: 'Base Salary', type: 'number', column: 'baseSalary' },
            { key: 'grade_level', label: 'Grade Level', type: 'text', column: 'gradeLevel' },
            { key: 'city', label: 'City', type: 'text', column: 'city' },
        ],
    },
    {
        value: 'income',
        label: 'Income',
        module: 'Finance',
        app: 'finance',
        model: 'income',
        fields: [
            { key: 'date', label: 'Date', type: 'date', column: 'date' },
            { key: 'source', label: 'Source', type: 'text', column: 'source' },
            { key: 'description', label: 'Description', type: 'text', column: 'description' },
            { key: 'amount', label: 'Amount', type: 'number', column: 'amount' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            { key: 'received_by', label: 'Received By', type: 'text', column: 'receivedBy' },
            {
                key: 'project', label: 'Project', type: 'text',
                select: { project: { select: { name: true } } },
                derive: (row) => row.project?.name ?? '', queryable: false,
            },
        ],
    },
    {
        value: 'budgets',
        label: 'Budgets',
        module: 'Finance',
        app: 'finance',
        model: 'budget',
        fields: [
            { key: 'name', label: 'Budget Name', type: 'text', column: 'name' },
            { key: 'scope', label: 'Scope', type: 'status', column: 'scope' },
            { key: 'period', label: 'Period', type: 'text', column: 'period' },
            { key: 'total_budget', label: 'Total Budget', type: 'number', column: 'totalBudget' },
            { key: 'spent', label: 'Spent', type: 'number', column: 'spent' },
            { key: 'committed', label: 'Committed', type: 'number', column: 'committed' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            {
                key: 'project', label: 'Project', type: 'text',
                select: { project: { select: { name: true } } },
                derive: (row) => row.project?.name ?? '', queryable: false,
            },
        ],
    },
    {
        value: 'accruals',
        label: 'Accruals',
        module: 'Finance',
        app: 'finance',
        model: 'accrual',
        fields: [
            { key: 'reference', label: 'Reference', type: 'text', column: 'reference' },
            { key: 'type', label: 'Type', type: 'status', column: 'type' },
            { key: 'title', label: 'Title', type: 'text', column: 'title' },
            { key: 'amount', label: 'Amount', type: 'number', column: 'amount' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            { key: 'approval_status', label: 'Approval Status', type: 'status', column: 'approvalStatus' },
            { key: 'created_by', label: 'Created By', type: 'text', column: 'createdBy' },
            { key: 'created_at', label: 'Created', type: 'date', column: 'createdAt' },
        ],
    },
    {
        value: 'payments',
        label: 'Payments',
        module: 'Finance',
        app: 'finance',
        model: 'payment',
        fields: [
            { key: 'reference', label: 'Reference', type: 'text', column: 'reference' },
            { key: 'date', label: 'Date', type: 'date', column: 'date' },
            { key: 'type', label: 'Type', type: 'status', column: 'type' },
            { key: 'recipient', label: 'Recipient', type: 'text', column: 'recipient' },
            { key: 'amount', label: 'Amount', type: 'number', column: 'amount' },
            { key: 'method', label: 'Method', type: 'text', column: 'method' },
            { key: 'bank', label: 'Bank', type: 'text', column: 'bank' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
        ],
    },
    {
        value: 'attendance',
        label: 'Attendance',
        module: 'HR',
        app: 'hr',
        model: 'attendanceRecord',
        fields: [
            { key: 'date', label: 'Date', type: 'date', column: 'date' },
            { key: 'employee_name', label: 'Employee', type: 'text', column: 'employeeName' },
            { key: 'department', label: 'Department', type: 'text', column: 'department' },
            { key: 'clock_in', label: 'Check In', type: 'text', column: 'clockIn' },
            { key: 'clock_out', label: 'Check Out', type: 'text', column: 'clockOut' },
            { key: 'hours_worked', label: 'Hours Worked', type: 'number', column: 'hoursWorked' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
        ],
    },
    {
        value: 'leave_requests',
        label: 'Leave Requests',
        module: 'HR',
        app: 'hr',
        model: 'leaveRequest',
        fields: [
            { key: 'ref_id', label: 'Reference', type: 'text', column: 'refId' },
            {
                key: 'employee', label: 'Employee', type: 'text',
                select: { employee: { select: { firstName: true, lastName: true } } },
                derive: (row) => `${row.employee?.firstName ?? ''} ${row.employee?.lastName ?? ''}`.trim(),
                queryable: false,
            },
            {
                key: 'leave_type', label: 'Leave Type', type: 'text',
                select: { leaveType: { select: { name: true } } },
                derive: (row) => row.leaveType?.name ?? '', queryable: false,
            },
            { key: 'days', label: 'Days', type: 'number', column: 'days' },
            { key: 'start_date', label: 'Start Date', type: 'date', column: 'startDate' },
            { key: 'end_date', label: 'End Date', type: 'date', column: 'endDate' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            { key: 'approved_by', label: 'Approved By', type: 'text', column: 'approvedBy' },
        ],
    },
    {
        value: 'payroll_entries',
        label: 'Payroll Entries',
        module: 'HR',
        app: 'hr',
        model: 'payrollEntry',
        fields: [
            { key: 'employee_name', label: 'Employee', type: 'text', column: 'employeeName' },
            { key: 'department', label: 'Department', type: 'text', column: 'department' },
            { key: 'gross_pay', label: 'Gross Pay', type: 'number', column: 'grossPay' },
            { key: 'allowances', label: 'Allowances', type: 'number', column: 'allowances' },
            { key: 'deductions', label: 'Deductions', type: 'number', column: 'deductions' },
            { key: 'tax', label: 'Tax', type: 'number', column: 'tax' },
            { key: 'pension', label: 'Pension', type: 'number', column: 'pension' },
            { key: 'net_pay', label: 'Net Pay', type: 'number', column: 'netPay' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
        ],
    },
    {
        value: 'purchase_requests',
        label: 'Purchase Requests',
        module: 'Procurement',
        app: 'procurement',
        model: 'purchaseRequest',
        fields: [
            { key: 'pr_ref', label: 'Reference', type: 'text', column: 'prRef' },
            { key: 'title', label: 'Title', type: 'text', column: 'title' },
            { key: 'project_name', label: 'Project', type: 'text', column: 'projectName' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            { key: 'priority', label: 'Priority', type: 'status', column: 'priority' },
            { key: 'requested_by', label: 'Requested By', type: 'text', column: 'requestedBy' },
            { key: 'days_to_deliver', label: 'Days To Deliver', type: 'number', column: 'daysToDeliver' },
            { key: 'created_at', label: 'Raised', type: 'date', column: 'createdAt' },
        ],
    },
    {
        value: 'material_requests',
        label: 'Material Requests',
        module: 'Procurement',
        app: 'procurement',
        model: 'materialRequest',
        fields: [
            { key: 'reference', label: 'Reference', type: 'text', column: 'reference' },
            { key: 'material_name', label: 'Material', type: 'text', column: 'materialName' },
            { key: 'qty', label: 'Quantity', type: 'number', column: 'qty' },
            { key: 'unit', label: 'Unit', type: 'text', column: 'unit' },
            { key: 'store_name', label: 'Store', type: 'text', column: 'storeName' },
            { key: 'project_name', label: 'Project', type: 'text', column: 'projectName' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            { key: 'priority', label: 'Priority', type: 'status', column: 'priority' },
            { key: 'requested_by', label: 'Requested By', type: 'text', column: 'requestedBy' },
            { key: 'request_date', label: 'Request Date', type: 'date', column: 'requestDate' },
        ],
    },
    {
        value: 'suppliers',
        label: 'Suppliers',
        module: 'Procurement',
        app: 'procurement',
        model: 'supplier',
        fields: [
            { key: 'name', label: 'Supplier', type: 'text', column: 'name' },
            { key: 'contact_person', label: 'Contact Person', type: 'text', column: 'contactPerson' },
            { key: 'phone', label: 'Phone', type: 'text', column: 'phone' },
            { key: 'email', label: 'Email', type: 'text', column: 'email' },
            { key: 'city', label: 'City', type: 'text', column: 'city' },
            { key: 'rating', label: 'Rating', type: 'number', column: 'rating' },
            { key: 'on_time_rate', label: 'On-Time Delivery (%)', type: 'number', column: 'onTimeDeliveryRate' },
            { key: 'reject_rate', label: 'Reject Rate (%)', type: 'number', column: 'rejectRate' },
            { key: 'total_spend', label: 'Total Spend', type: 'number', column: 'totalSpend' },
            { key: 'last_order', label: 'Last Order', type: 'date', column: 'lastOrder' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
        ],
    },
    {
        value: 'stock_movements',
        label: 'Stock Movements',
        module: 'Storefront',
        app: 'storefront',
        model: 'stockMovement',
        fields: [
            { key: 'date', label: 'Date', type: 'date', column: 'date' },
            { key: 'type', label: 'Movement Type', type: 'status', column: 'type' },
            { key: 'material_name', label: 'Material', type: 'text', column: 'materialName' },
            { key: 'qty', label: 'Quantity', type: 'number', column: 'qty' },
            { key: 'unit', label: 'Unit', type: 'text', column: 'unit' },
            { key: 'store_name', label: 'Store', type: 'text', column: 'storeName' },
            { key: 'project_name', label: 'Project', type: 'text', column: 'projectName' },
            { key: 'reference', label: 'Reference', type: 'text', column: 'reference' },
            { key: 'created_by', label: 'Recorded By', type: 'text', column: 'createdBy' },
        ],
    },
    {
        value: 'materials',
        label: 'Materials',
        module: 'Storefront',
        app: 'storefront',
        model: 'material',
        fields: [
            { key: 'name', label: 'Material', type: 'text', column: 'name' },
            { key: 'category', label: 'Category', type: 'text', column: 'category' },
            { key: 'unit', label: 'Unit', type: 'text', column: 'unit' },
            { key: 'total_qty', label: 'Total Quantity', type: 'number', column: 'totalQty' },
            { key: 'available_qty', label: 'Available', type: 'number', column: 'availableQty' },
            { key: 'reserved_qty', label: 'Reserved', type: 'number', column: 'reservedQty' },
            { key: 'unit_cost', label: 'Unit Cost', type: 'number', column: 'unitCost' },
            { key: 'reorder_level', label: 'Reorder Level', type: 'number', column: 'reorderLevel' },
            { key: 'allocation_status', label: 'Allocation', type: 'status', column: 'allocationStatus' },
        ],
    },
    {
        value: 'tasks',
        label: 'Tasks',
        module: 'Projects',
        app: 'construction',
        model: 'task',
        fields: [
            { key: 'title', label: 'Task', type: 'text', column: 'title' },
            { key: 'project_name', label: 'Project', type: 'text', column: 'projectName' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            { key: 'priority', label: 'Priority', type: 'status', column: 'priority' },
            { key: 'assigned_to', label: 'Assigned To', type: 'text', column: 'assignedTo' },
            { key: 'assigned_by', label: 'Assigned By', type: 'text', column: 'assignedBy' },
            { key: 'due_date', label: 'Due Date', type: 'date', column: 'dueDate' },
            { key: 'estimated_hours', label: 'Estimated Hours', type: 'number', column: 'estimatedHours' },
            { key: 'actual_hours', label: 'Actual Hours', type: 'number', column: 'actualHours' },
            { key: 'app', label: 'Application', type: 'status', column: 'app' },
        ],
    },
    {
        value: 'change_requests',
        label: 'Change Requests',
        module: 'Projects',
        app: 'construction',
        model: 'changeRequest',
        fields: [
            { key: 'cr_number', label: 'CR Number', type: 'text', column: 'crNumber' },
            { key: 'description', label: 'Description', type: 'text', column: 'description' },
            { key: 'raised_by', label: 'Raised By', type: 'text', column: 'raisedBy' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            { key: 'schedule_impact_days', label: 'Schedule Impact (days)', type: 'number', column: 'scheduleImpactDays' },
            { key: 'cost_impact', label: 'Cost Impact', type: 'number', column: 'costImpact' },
            { key: 'recommended_action', label: 'Recommended Action', type: 'text', column: 'recommendedAction' },
            { key: 'created_at', label: 'Raised', type: 'date', column: 'createdAt' },
        ],
    },
    {
        value: 'delays',
        label: 'Delays',
        module: 'Projects',
        app: 'construction',
        model: 'projectDelay',
        fields: [
            { key: 'task_name', label: 'Task', type: 'text', column: 'taskName' },
            { key: 'stage_phase', label: 'Stage / Phase', type: 'text', column: 'stagePhase' },
            { key: 'days_delayed', label: 'Days Delayed', type: 'number', column: 'daysDelayed' },
            { key: 'root_cause', label: 'Root Cause', type: 'text', column: 'rootCause' },
            { key: 'recovery_plan', label: 'Recovery Plan', type: 'text', column: 'recoveryPlan' },
            { key: 'status', label: 'Status', type: 'status', column: 'status' },
            { key: 'created_at', label: 'Logged', type: 'date', column: 'createdAt' },
        ],
    },
    {
        value: 'audit_logs',
        label: 'Audit Logs',
        module: 'Admin',
        app: 'admin',
        model: 'auditLog',
        fields: [
            { key: 'timestamp', label: 'Timestamp', type: 'date', column: 'timestamp' },
            {
                key: 'user',
                label: 'User',
                type: 'text',
                select: { user: { select: { name: true, email: true } } },
                derive: (row) => row.user?.name ?? row.user?.email ?? 'System',
                queryable: false,
            },
            { key: 'action', label: 'Action', type: 'status', column: 'action' },
            { key: 'entity', label: 'Entity', type: 'text', column: 'entity' },
            { key: 'record', label: 'Record Id', type: 'text', column: 'entityId' },
            { key: 'description', label: 'Description', type: 'text', column: 'description' },
            { key: 'ip_address', label: 'IP Address', type: 'text', column: 'ipAddress' },
        ],
    },
];

export type FilterOperator =
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'between'
    | 'is_empty';

export interface ReportRunRequest {
    /** Single-source form, kept for existing callers (schedules, saved templates). */
    source?: string;
    /**
     * Multi-source form. When more than one source is given, field/filter/sort
     * keys are namespaced `<source>:<fieldKey>` so a column name shared by two
     * tables (id, name, status) stays unambiguous.
     */
    sources?: string[];
    fields?: string[];
    filters?: Array<{ field: string; operator: FilterOperator; value?: string; valueTo?: string }>;
    sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
    limit?: number;
}

/** Separates the source from the field in a namespaced multi-source key. */
const SOURCE_KEY_SEPARATOR = ':';

export function namespacedFieldKey(sourceValue: string, fieldKey: string): string {
    return `${sourceValue}${SOURCE_KEY_SEPARATOR}${fieldKey}`;
}

function splitNamespacedKey(key: string): { source: string; field: string } | null {
    const cut = String(key ?? '').indexOf(SOURCE_KEY_SEPARATOR);
    if (cut <= 0) return null;
    return { source: key.slice(0, cut), field: key.slice(cut + 1) };
}

const MAX_ROWS = 1000;

@Injectable()
export class ReportQueryService {
    constructor(private prisma: PrismaService) {}

    /** The sources and fields the builder may offer. */
    listSources() {
        return REPORT_SOURCES.map((source) => ({
            value: source.value,
            label: source.label,
            module: source.module,
            app: source.app,
            fields: source.fields.map((f) => ({
                key: f.key,
                label: f.label,
                type: f.type,
                // Derived fields are computed after loading, so they cannot be
                // pushed into SQL — the UI greys them out as filter/sort targets.
                queryable: f.queryable !== false,
            })),
        }));
    }

    private sourceOrThrow(value: string): ReportSource {
        const source = REPORT_SOURCES.find((s) => s.value === value);
        if (!source) {
            throw new BadRequestException(
                `Unknown report source "${value}". Available: ${REPORT_SOURCES.map((s) => s.value).join(', ')}`,
            );
        }
        return source;
    }

    /**
     * Builds a Prisma `where` from the request.
     *
     * Every clause is constructed from a field found in the registry, so a caller
     * cannot filter on an unlisted column or reach through a relation.
     */
    private buildWhere(source: ReportSource, filters: ReportRunRequest['filters']) {
        const clauses: any[] = [];

        for (const filter of filters ?? []) {
            const field = source.fields.find((f) => f.key === filter.field);
            if (!field?.column || field.queryable === false) continue;

            const raw = String(filter.value ?? '').trim();
            const asNumber = Number(raw);
            const isNumeric = field.type === 'number' && raw !== '' && Number.isFinite(asNumber);
            const asDate = field.type === 'date' && raw ? new Date(raw) : null;
            const dateValid = asDate && !Number.isNaN(asDate.getTime());
            const typed = isNumeric ? asNumber : dateValid ? asDate : raw;

            switch (filter.operator) {
                case 'equals':
                    if (raw === '') break;
                    clauses.push({ [field.column]: typed });
                    break;
                case 'not_equals':
                    if (raw === '') break;
                    clauses.push({ NOT: { [field.column]: typed } });
                    break;
                case 'contains':
                    if (raw === '' || field.type === 'number' || field.type === 'date') break;
                    clauses.push({
                        [field.column]: { contains: raw, mode: 'insensitive' },
                    });
                    break;
                case 'greater_than':
                    if (!isNumeric && !dateValid) break;
                    clauses.push({ [field.column]: { gt: typed } });
                    break;
                case 'less_than':
                    if (!isNumeric && !dateValid) break;
                    clauses.push({ [field.column]: { lt: typed } });
                    break;
                case 'between': {
                    const toRaw = String(filter.valueTo ?? '').trim();
                    const toNumber = Number(toRaw);
                    const toDate = field.type === 'date' && toRaw ? new Date(toRaw) : null;
                    const upper =
                        field.type === 'number' && Number.isFinite(toNumber)
                            ? toNumber
                            : toDate && !Number.isNaN(toDate.getTime())
                              ? toDate
                              : null;
                    if ((!isNumeric && !dateValid) || upper === null) break;
                    clauses.push({ [field.column]: { gte: typed, lte: upper } });
                    break;
                }
                case 'is_empty':
                    clauses.push({
                        OR: [{ [field.column]: null }, ...(field.type === 'text' ? [{ [field.column]: '' }] : [])],
                    });
                    break;
                default:
                    break;
            }
        }

        return clauses.length > 0 ? { AND: clauses } : {};
    }

    /**
     * Runs a report over one or more sources.
     *
     * Multiple sources are combined by stacking their rows, not by joining them:
     * the registry describes each source as a standalone model and carries no
     * relation graph, so there is no defined key to join two arbitrary tables on.
     * Each result row therefore carries its own source's columns and nulls for
     * the others, with a leading `__source` column saying which table it came
     * from. Selecting one source behaves exactly as before.
     */
    async run(request: ReportRunRequest) {
        const requested = Array.isArray(request.sources) ? request.sources.filter(Boolean) : [];
        const values = requested.length > 0 ? requested : [String(request?.source ?? '')];
        const sources = Array.from(new Set(values)).map((v) => this.sourceOrThrow(v));

        if (sources.length === 1) {
            return this.runSingle(sources[0], {
                fields: this.stripNamespace(request.fields, sources[0].value),
                filters: (request.filters ?? []).map((f) => ({
                    ...f,
                    field: this.stripKey(f.field, sources[0].value),
                })),
                sort: (request.sort ?? []).map((s) => ({
                    ...s,
                    field: this.stripKey(s.field, sources[0].value),
                })),
                limit: request.limit,
            });
        }

        // Split the row budget across the selected sources so one large table
        // cannot crowd the others out of the result entirely.
        const budget = Math.min(Math.max(Number(request.limit) || 100, 1), MAX_ROWS);
        const perSource = Math.max(Math.floor(budget / sources.length), 1);

        const results = await Promise.all(
            sources.map((source) =>
                this.runSingle(source, {
                    fields: this.stripNamespace(request.fields, source.value),
                    filters: (request.filters ?? [])
                        .filter((f) => splitNamespacedKey(f.field)?.source === source.value)
                        .map((f) => ({ ...f, field: this.stripKey(f.field, source.value) })),
                    sort: (request.sort ?? [])
                        .filter((s) => splitNamespacedKey(s.field)?.source === source.value)
                        .map((s) => ({ ...s, field: this.stripKey(s.field, source.value) })),
                    limit: perSource,
                }).then((result) => ({ source, result })),
            ),
        );

        const columns: Array<{ key: string; label: string; type: string }> = [
            { key: '__source', label: 'Source', type: 'text' },
        ];
        for (const { source, result } of results) {
            for (const column of result.columns) {
                columns.push({
                    key: namespacedFieldKey(source.value, column.key),
                    label: `${source.label} — ${column.label}`,
                    type: column.type,
                });
            }
        }

        const rows: Record<string, unknown>[] = [];
        for (const { source, result } of results) {
            for (const row of result.rows) {
                // Every column exists on every row so the table and the CSV line
                // up; the ones belonging to other sources are simply null.
                const merged: Record<string, unknown> = Object.fromEntries(
                    columns.map((c) => [c.key, null]),
                );
                merged.__source = source.label;
                for (const [key, value] of Object.entries(row)) {
                    merged[namespacedFieldKey(source.value, key)] = value;
                }
                rows.push(merged);
            }
        }

        const total = results.reduce((sum, r) => sum + r.result.total, 0);
        return {
            source: sources.map((s) => s.value).join(','),
            sources: sources.map((s) => s.value),
            columns,
            rows,
            rowCount: rows.length,
            total,
            truncated: total > rows.length,
            generatedAt: new Date(),
        };
    }

    /** Drops the `<source>:` prefix from keys belonging to `sourceValue`. */
    private stripNamespace(keys: string[] | undefined, sourceValue: string): string[] {
        return (Array.isArray(keys) ? keys : [])
            .filter((key) => {
                const split = splitNamespacedKey(key);
                return !split || split.source === sourceValue;
            })
            .map((key) => this.stripKey(key, sourceValue));
    }

    private stripKey(key: string, sourceValue: string): string {
        const split = splitNamespacedKey(key);
        return split && split.source === sourceValue ? split.field : String(key ?? '');
    }

    private async runSingle(source: ReportSource, request: Omit<ReportRunRequest, 'source' | 'sources'>) {
        // Requested fields, filtered to the ones this source actually has. An
        // empty or unrecognised selection falls back to the whole field list so a
        // preview is never blank just because nothing was picked yet.
        const requested = Array.isArray(request.fields) ? request.fields : [];
        const chosen = requested
            .map((key) => source.fields.find((f) => f.key === key))
            .filter((f): f is ReportField => Boolean(f));
        const fields = chosen.length > 0 ? chosen : source.fields;

        // Only what the chosen fields need.
        const select: Record<string, any> = {};
        for (const field of fields) {
            if (field.column) select[field.column] = true;
            for (const [key, value] of Object.entries(field.select ?? {})) {
                select[key] =
                    key === '_count' && select._count
                        ? { select: { ...select._count.select, ...(value as any).select } }
                        : value;
            }
        }
        if (Object.keys(select).length === 0) select.id = true;

        const where = this.buildWhere(source, request.filters);

        const orderBy = (request.sort ?? [])
            .map((rule) => {
                const field = source.fields.find((f) => f.key === rule.field);
                if (!field?.column || field.queryable === false) return null;
                return { [field.column]: rule.direction === 'desc' ? 'desc' : 'asc' };
            })
            .filter(Boolean) as Record<string, 'asc' | 'desc'>[];

        const take = Math.min(Math.max(Number(request.limit) || 100, 1), MAX_ROWS);

        const delegate = (this.prisma as any)[source.model];
        if (!delegate?.findMany) {
            throw new BadRequestException(`Report source "${source.value}" is not queryable.`);
        }

        const [records, total] = await Promise.all([
            delegate.findMany({
                where,
                select,
                ...(orderBy.length > 0 ? { orderBy } : {}),
                take,
            }),
            delegate.count({ where }),
        ]);

        const rows = records.map((record: any) => {
            const row: Record<string, unknown> = {};
            for (const field of fields) {
                row[field.key] = field.derive
                    ? field.derive(record)
                    : (record[field.column as string] ?? null);
            }
            return row;
        });

        return {
            source: source.value,
            columns: fields.map((f) => ({ key: f.key, label: f.label, type: f.type })),
            rows,
            rowCount: rows.length,
            total,
            truncated: total > rows.length,
            generatedAt: new Date(),
        };
    }
}
