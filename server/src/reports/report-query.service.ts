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
    source: string;
    fields?: string[];
    filters?: Array<{ field: string; operator: FilterOperator; value?: string; valueTo?: string }>;
    sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
    limit?: number;
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

    async run(request: ReportRunRequest) {
        const source = this.sourceOrThrow(String(request?.source ?? ''));

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
