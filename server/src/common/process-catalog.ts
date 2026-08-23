/**
 * The system process catalog — the Layer 3 permission surface, and the list
 * Admin → Process Configuration manages.
 *
 * A process is a **major activity within an application**, named after the thing
 * it acts on: "Expenses", "Purchase Orders", "Leave Requests". The VCEAD verbs are
 * the *permissions under* a process, not processes in their own right — so
 * Expenses carries View / Create / Edit / Approve / Delete, rather than "Create
 * Expense" and "Approve Expense" being separate entries with a full matrix row
 * each.
 *
 * `actions` declares which of those permissions a process actually supports, and
 * anything omitted is left out of the permission table entirely rather than shown
 * as an unticked box an admin could grant to no effect. Approve appears only where
 * an approval workflow exists; Delete only where a record may legitimately be
 * removed — audit-bearing records like Goods Receipt and Stock Movements
 * deliberately have none. When a workflow is later defined for an action, adding it
 * to `actions` makes that permission appear everywhere at once.
 *
 * Extracted from AdminExtrasService so PermissionsService can resolve a process to
 * its owning app without depending on the Admin module, which would be circular:
 * Admin needs permission resolution in turn. Admin still merges any admin-created
 * custom processes over these defaults.
 *
 * EVERY ENTRY MUST BE SOMETHING THE SYSTEM ACTUALLY DOES. The catalog is what roles
 * are configured against, what approval workflows route, and what the API guards
 * enforce, so an entry with no implementation is a permission that governs nothing,
 * and a missing entry is an operation nobody can restrict. `backedBy` records the
 * module and page each process corresponds to, and the `process catalog` tests in
 * e2e assert those still exist.
 */

export type ProcessAction = 'view' | 'create' | 'edit' | 'approve' | 'delete';

/** The full lifecycle, for processes that support every permission. */
const FULL: ProcessAction[] = ['view', 'create', 'edit', 'approve', 'delete'];
/** Managed records and reference data: no approval step. */
const MANAGED: ProcessAction[] = ['view', 'create', 'edit', 'delete'];
/** Audit-bearing postings: recorded and authorised, never edited or removed. */
const POSTED: ProcessAction[] = ['view', 'create', 'approve'];

export interface ProcessCatalogItem {
    id: string;
    label: string;
    app: string;
    description: string;
    /**
     * The permissions this process supports. Actions absent here are omitted from
     * the permission matrices — there is no workflow behind them yet.
     */
    actions: ProcessAction[];
    /** True when the process routes through an approval workflow. */
    requiresApproval: boolean;
    /**
     * The implementation this process names — the server module and the route that
     * performs it. Kept so the catalog can be audited against the code rather than
     * drifting into aspirational entries.
     */
    backedBy: { module: string; route: string };
}

const define = (
    id: string,
    label: string,
    app: string,
    description: string,
    actions: ProcessAction[],
    module: string,
    route: string,
): ProcessCatalogItem => ({
    id,
    label,
    app,
    description,
    actions,
    requiresApproval: actions.includes('approve'),
    backedBy: { module, route },
});

export const DEFAULT_PROCESS_CATALOG: ProcessCatalogItem[] = [
    // ── Procurement ──────────────────────────────────────────────────────────
    define('p_material_requests', 'Material Requests', 'procurement',
        'Requisitions for materials from store or for procurement',
        FULL, 'materials', '/apps/procurement/material-requests'),
    define('p_purchase_requests', 'Purchase Requests', 'procurement',
        'Requisitions to procure materials or services',
        FULL, 'procurement-requests', '/apps/procurement/purchase-requests'),
    define('p_purchase_orders', 'Purchase Orders', 'procurement',
        'Orders raised against approved requests and sent to suppliers',
        FULL, 'purchase-orders', '/apps/procurement/purchase-orders'),
    define('p_rfqs', 'Requests for Quotation', 'procurement',
        'Quotation requests dispatched to selected vendors',
        // An RFQ is sent, not authorised — no approval workflow exists.
        MANAGED, 'procurement-requests', '/apps/procurement/sent-requests'),
    define('p_supplier_quotes', 'Supplier Quotes', 'procurement',
        'Quotations received from suppliers, and their evaluation',
        ['view', 'create', 'edit', 'approve'], 'procurement-requests', '/apps/procurement/received-quotes'),
    define('p_goods_receipt', 'Goods Receipt', 'procurement',
        'Recording deliveries and confirming goods against the purchase order',
        // A receipt is evidence of delivery: corrected if wrong, never deleted.
        // Accepting one — which posts to stock — is a decision the configured
        // approver makes, not whoever recorded the delivery.
        ['view', 'create', 'edit', 'approve'], 'goods-receipts', '/apps/procurement/goods-receipt'),
    define('p_suppliers', 'Suppliers', 'procurement',
        'Supplier records and the materials they supply',
        MANAGED, 'suppliers', '/apps/procurement/suppliers'),
    define('p_supplier_compliance', 'Supplier Compliance', 'procurement',
        'Supplier documents and their compliance status',
        ['view', 'create', 'edit', 'approve'], 'compliance-documents', '/apps/procurement/supplier-compliance'),
    define('p_procurement_tasks', 'Procurement Tasks', 'procurement',
        'Tasks raised and assigned within Procurement',
        MANAGED, 'tasks', '/apps/procurement/tasks'),

    // ── Finance ──────────────────────────────────────────────────────────────
    define('p_expenses', 'Expenses', 'finance',
        'Expense entries, claims and reimbursements',
        FULL, 'expenses', '/apps/finance/expenses'),
    define('p_income', 'Income', 'finance',
        'Income and receipts captured into the ledger',
        MANAGED, 'income', '/apps/finance/income'),
    define('p_journal_entries', 'Journal Entries', 'finance',
        'Manual accounting entries posted to the ledger',
        ['view', 'create', 'edit', 'approve'], 'finance-extras', '/apps/finance/journal'),
    define('p_accruals', 'Accruals', 'finance',
        'Period-end accruals, their lines and reversals',
        FULL, 'accruals', '/apps/finance/accruals'),
    define('p_budgets', 'Budgets', 'finance',
        'Budget lines and their allocation across departments and projects',
        FULL, 'budgets', '/apps/finance/budget'),
    define('p_payments', 'Payments', 'finance',
        'Payment records and their authorisation',
        ['view', 'create', 'edit', 'approve'], 'payments', '/apps/finance/payments'),
    define('p_disbursements', 'Disbursements', 'finance',
        'Release of approved funds to a payee',
        POSTED, 'disbursements', '/apps/finance/payments'),
    define('p_claims', 'Claims', 'finance',
        'Staff and vendor claims, and their settlement',
        ['view', 'create', 'edit', 'approve'], 'claims', '/apps/finance/claims'),
    define('p_purchase_invoices', 'Purchase Invoices', 'finance',
        'Supplier invoices matched against purchase orders',
        // No delete: an invoice is the record that a purchase order reached
        // Finance, and a paid one is the record that money left. Cancellation
        // replaces it, which keeps the trail the workflow is built on.
        ['view', 'create', 'edit', 'approve'], 'procurement-requests', '/apps/finance/purchase-invoice'),
    define('p_chart_of_accounts', 'Chart of Accounts', 'finance',
        'Ledger accounts and their parent hierarchy',
        MANAGED, 'finance-extras', '/apps/finance/chart-of-accounts'),
    define('p_finance_tasks', 'Finance Tasks', 'finance',
        'Tasks raised and assigned within Finance',
        MANAGED, 'tasks', '/apps/finance/tasks'),

    // ── HR ───────────────────────────────────────────────────────────────────
    define('p_employees', 'Employees', 'hr',
        'Employee records and onboarding',
        MANAGED, 'employees', '/apps/hr/employees'),
    define('p_departments', 'Departments & Structure', 'hr',
        'Departments, branches, crafts and circles',
        MANAGED, 'departments', '/apps/hr/departments'),
    define('p_leave_requests', 'Leave Requests', 'hr',
        'Employee time-off applications and their approval',
        FULL, 'leave-requests', '/apps/hr/leave-requests'),
    define('p_attendance', 'Attendance', 'hr',
        'Attendance and timesheet records',
        ['view', 'create', 'edit', 'approve'], 'hr-extras', '/apps/hr/attendance'),
    define('p_payroll', 'Payroll', 'hr',
        'Payroll runs, processing and payslips',
        ['view', 'create', 'edit', 'approve'], 'hr-extras', '/apps/hr/payroll'),
    define('p_workforce_allocation', 'Workforce Allocation', 'hr',
        'Assignment of employees to departments, roles and projects',
        MANAGED, 'workforce-allocation', '/apps/hr/workforce'),
    define('p_appraisals', 'Appraisals', 'hr',
        'Performance review cycles and ratings',
        ['view', 'create', 'edit', 'approve'], 'hr-extras', '/apps/ess/appraisals'),
    define('p_hr_tasks', 'HR Tasks', 'hr',
        'Tasks raised and assigned within HR',
        MANAGED, 'tasks', '/apps/hr/hr-tasks'),

    // ── Employee Self-Service (ESS) ──────────────────────────────────────────
    define('p_ess_requests', 'Self-Service Requests', 'ess',
        'Requests an employee raises for themselves',
        // No Approve: an employee cannot authorise their own request. Approval
        // belongs to the owning module's process.
        ['view', 'create', 'edit', 'delete'], 'admin-extras', '/apps/ess/submit'),
    define('p_ess_issues', 'Logged Issues', 'ess',
        'Issues an employee reports',
        ['view', 'create', 'edit'], 'construction-issues', '/apps/ess/log-issues'),
    define('p_ess_payslips', 'Payslips', 'ess',
        'An employee viewing and downloading their own payslips',
        ['view'], 'hr-extras', '/apps/ess/payslips'),

    // ── Construction / Projects ──────────────────────────────────────────────
    define('p_projects', 'Projects', 'construction',
        'Project records, setup and their budgets',
        FULL, 'projects', '/apps/construction/projects'),
    define('p_daily_reports', 'Daily Reports', 'construction',
        'Daily site progress reports',
        ['view', 'create', 'edit', 'approve'], 'daily-reports', '/apps/construction/daily-reports'),
    define('p_site_issues', 'Site Issues', 'construction',
        'Site issues and their resolution',
        FULL, 'construction-issues', '/apps/construction/issues'),
    define('p_change_requests', 'Change Requests', 'construction',
        'Scope, cost and schedule changes and their approval',
        FULL, 'change-requests', '/apps/construction/change-requests'),
    define('p_delays', 'Delays', 'construction',
        'Delay events and their impact on the schedule',
        MANAGED, 'delays', '/apps/construction/delays'),
    define('p_quality_ncrs', 'Quality NCRs', 'construction',
        'Non-conformance reports and their closure',
        ['view', 'create', 'edit', 'approve'], 'quality-ncrs', '/apps/construction/quality'),
    define('p_hse_records', 'HSE Records', 'construction',
        'Health, safety and environment incidents',
        ['view', 'create', 'edit', 'approve'], 'hse-records', '/apps/construction/hse'),
    define('p_documents', 'Documents', 'construction',
        'Project documents and their approval',
        FULL, 'document-files', '/apps/construction/documents'),
    define('p_project_funding', 'Project Funding', 'construction',
        'Funding allocations and release of project funds',
        POSTED, 'funding-releases', '/apps/construction/finance'),
    define('p_resources', 'Resources', 'construction',
        'Workforce, equipment and material allocation to projects',
        MANAGED, 'resource-planning', '/apps/construction/resources'),
    define('p_stakeholders', 'Stakeholders', 'construction',
        'The project stakeholder register',
        MANAGED, 'stakeholders', '/apps/construction/stakeholders'),
    define('p_construction_tasks', 'Project Tasks', 'construction',
        'Tasks raised and assigned within Projects',
        MANAGED, 'tasks', '/apps/construction/tasks'),

    // ── Storefront ───────────────────────────────────────────────────────────
    define('p_materials', 'Materials', 'storefront',
        'The material catalogue and stock levels',
        MANAGED, 'materials', '/apps/storefront/all-materials'),
    define('p_stock_movements', 'Stock Movements', 'storefront',
        'Transfers, adjustments and issues between stores and sites',
        // Movements are the stock audit trail: recorded and authorised, not edited.
        POSTED, 'materials', '/apps/storefront/stock-movement'),
    define('p_store_requests', 'Incoming Store Requests', 'storefront',
        'Requests from sites for materials to be issued',
        // Raised elsewhere, so there is nothing to create here.
        ['view', 'edit', 'approve'], 'materials', '/apps/storefront/incoming-requests'),
    define('p_storefront_tasks', 'Store Tasks', 'storefront',
        'Tasks raised and assigned within the Storefront',
        MANAGED, 'tasks', '/apps/storefront/tasks'),

    // ── Admin ────────────────────────────────────────────────────────────────
    define('p_users', 'Users', 'admin',
        'Platform users, their invitations and app access',
        MANAGED, 'admin-extras', '/apps/admin/users'),
    define('p_roles', 'Roles & Permissions', 'admin',
        'Roles and the permissions assigned to them',
        MANAGED, 'admin-extras', '/apps/admin/roles'),
    define('p_reports', 'Reports', 'admin',
        'Report templates, generation and scheduling',
        MANAGED, 'reports', '/apps/admin/report-builder'),
    define('p_company_profile', 'Company Profile', 'admin',
        'Company details, branding and directors',
        ['view', 'edit'], 'admin-extras', '/apps/admin/company-profile'),
    define('p_system_config', 'System Configuration', 'admin',
        'General settings, process configuration and integrations',
        ['view', 'edit'], 'admin-extras', '/apps/admin/general-settings'),
];
