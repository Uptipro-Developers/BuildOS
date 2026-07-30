/**
 * The system process catalog — the Layer 3 (VCEAD) permission surface.
 *
 * Extracted from AdminExtrasService so PermissionsService can resolve a process
 * to its owning app without depending on the Admin module, which would be
 * circular: Admin needs permission resolution in turn. Admin still merges any
 * admin-created custom processes over these defaults; this file holds only the
 * ones derived from developed modules.
 */
export interface ProcessCatalogItem {
    id: string;
    label: string;
    app: string;
    description: string;
    requiresApproval: boolean;
}

export const DEFAULT_PROCESS_CATALOG: ProcessCatalogItem[] = [
        // ── Procurement ──────────────────────────────────────────────────────
    { id: 'p_create_pr', label: 'Create Purchase Request', app: 'procurement', description: 'Initiate a request to procure materials or services', requiresApproval: true },
    { id: 'p_approve_pr', label: 'Approve Purchase Request', app: 'procurement', description: 'Review and authorize a purchase request', requiresApproval: true },
    { id: 'p_create_po', label: 'Create Purchase Order', app: 'procurement', description: 'Raise a purchase order from an approved request', requiresApproval: true },
    { id: 'p_approve_po', label: 'Approve Purchase Order', app: 'procurement', description: 'Authorize a purchase order before sending to supplier', requiresApproval: true },
    { id: 'p_send_rfq', label: 'Send RFQ to Supplier', app: 'procurement', description: 'Dispatch a request for quotation to selected vendors', requiresApproval: false },
    { id: 'p_goods_receipt', label: 'Goods Receipt', app: 'procurement', description: 'Record delivery and confirm goods match the purchase order', requiresApproval: false },
    { id: 'p_issue_mat', label: 'Issue Materials', app: 'procurement', description: 'Release materials from inventory against a request', requiresApproval: false },
    { id: 'p_supplier_compliance', label: 'Supplier Compliance Review', app: 'procurement', description: 'Validate supplier documents and compliance status', requiresApproval: true },

        // ── Finance ──────────────────────────────────────────────────────────
    { id: 'p_create_exp', label: 'Create Expense', app: 'finance', description: 'Record a new expense entry', requiresApproval: false },
    { id: 'p_approve_exp', label: 'Approve Expense', app: 'finance', description: 'Authorize employee expense claims and reimbursements', requiresApproval: true },
    { id: 'p_journal_entry', label: 'Post Journal Entry', app: 'finance', description: 'Post manual accounting entries to the ledger', requiresApproval: true },
    { id: 'p_record_income', label: 'Record Income', app: 'finance', description: 'Capture income and receipts into the ledger', requiresApproval: false },
    { id: 'p_budget_alloc', label: 'Budget Allocation', app: 'finance', description: 'Set and distribute budget lines across departments', requiresApproval: true },
    { id: 'p_approve_payment', label: 'Approve Payment', app: 'finance', description: 'Authorize disbursement of funds to a payee', requiresApproval: true },
    { id: 'p_process_claim', label: 'Process Claim', app: 'finance', description: 'Review and settle staff or vendor claims', requiresApproval: true },
    { id: 'p_purchase_invoice', label: 'Process Purchase Invoice', app: 'finance', description: 'Match and process supplier invoices against POs', requiresApproval: true },
    { id: 'p_bank_recon', label: 'Bank Reconciliation', app: 'finance', description: 'Match system records against the bank statement', requiresApproval: false },

        // ── HR ───────────────────────────────────────────────────────────────
    { id: 'p_create_pay', label: 'Create Payroll', app: 'hr', description: 'Generate a payroll run for a pay period', requiresApproval: true },
    { id: 'p_process_payroll', label: 'Process Payroll', app: 'hr', description: 'Validate, compute, and finalize the payroll run', requiresApproval: true },
    { id: 'p_approve_lv', label: 'Approve Leave Request', app: 'hr', description: 'Approve or reject employee time-off applications', requiresApproval: true },
    { id: 'p_salary_advance', label: 'Salary Advance', app: 'hr', description: 'Process employee requests for advance salary payments', requiresApproval: true },
    { id: 'p_employee_onboard', label: 'Employee Onboarding', app: 'hr', description: 'Initiate and track new hire onboarding steps', requiresApproval: false },
    { id: 'p_workforce_alloc', label: 'Workforce Allocation', app: 'hr', description: 'Assign employees to departments, roles, or projects', requiresApproval: false },
    { id: 'p_attendance_approve', label: 'Approve Attendance', app: 'hr', description: 'Review and approve attendance and timesheet records', requiresApproval: true },
    { id: 'p_appraisal', label: 'Appraisal Review', app: 'hr', description: 'Manage performance review cycles and ratings', requiresApproval: true },

        // ── Employee Self-Service (ESS) ──────────────────────────────────────
    { id: 'p_ess_submit_request', label: 'Submit Request', app: 'ess', description: 'Raise a self-service request to the relevant department', requiresApproval: true },
    { id: 'p_ess_expense_claim', label: 'Expense Claim', app: 'ess', description: 'Submit and track out-of-pocket expense claims', requiresApproval: true },
    { id: 'p_ess_leave_request', label: 'Leave Request', app: 'ess', description: 'Apply for leave and track approval status', requiresApproval: true },
    { id: 'p_ess_log_issue', label: 'Log Issue', app: 'ess', description: 'Report an issue or grievance for follow-up', requiresApproval: false },

        // ── Construction / Projects ──────────────────────────────────────────
    { id: 'p_create_proj', label: 'Create Project', app: 'construction', description: 'Register a new project with scope, budget, and timeline', requiresApproval: true },
    { id: 'p_approve_bud', label: 'Approve Project Budget', app: 'construction', description: 'Authorize total project expenditure limits', requiresApproval: true },
    { id: 'p_assign_wf', label: 'Assign Workforce', app: 'construction', description: 'Allocate personnel to project tasks and sites', requiresApproval: false },
    { id: 'p_daily_report', label: 'Submit Daily Report', app: 'construction', description: 'Capture daily site progress, labour, and materials', requiresApproval: false },
    { id: 'p_milestone_approve', label: 'Approve Milestone / Progress', app: 'construction', description: 'Sign off on completion of project milestones', requiresApproval: true },
    { id: 'p_change_request', label: 'Approve Change Request', app: 'construction', description: 'Review and approve project change requests', requiresApproval: true },
    { id: 'p_resolve_issue', label: 'Resolve Site Issue', app: 'construction', description: 'Track and resolve issues raised on site', requiresApproval: false },
    { id: 'p_quality_ncr', label: 'Approve Quality NCR', app: 'construction', description: 'Review and close non-conformance reports', requiresApproval: true },
    { id: 'p_hse_incident', label: 'Log HSE Incident', app: 'construction', description: 'Report and track health, safety, and environment incidents', requiresApproval: false },
    { id: 'p_doc_approve', label: 'Approve Document', app: 'construction', description: 'Review and approve project documents and drawings', requiresApproval: true },
    { id: 'p_funding_release', label: 'Approve Funding Release', app: 'construction', description: 'Authorize release of project funding and disbursements', requiresApproval: true },

        // ── Storefront ───────────────────────────────────────────────────────
    { id: 'p_material_transfer', label: 'Material Transfer', app: 'storefront', description: 'Move materials between store locations or to site', requiresApproval: false },
    { id: 'p_stock_adjust', label: 'Stock Adjustment', app: 'storefront', description: 'Reconcile physical count with system stock levels', requiresApproval: true },
    { id: 'p_issue_to_site', label: 'Issue to Site', app: 'storefront', description: 'Record material issues from store to construction site', requiresApproval: false },
    { id: 'p_material_return', label: 'Material Return', app: 'storefront', description: 'Process returns of unused materials back to store', requiresApproval: true },
    { id: 'p_store_to_procurement', label: 'Send for Procurement', app: 'storefront', description: 'Trigger a procurement request for low or out-of-stock items', requiresApproval: false },

        // ── Admin ────────────────────────────────────────────────────────────
    { id: 'p_gen_rpt', label: 'Generate Reports', app: 'admin', description: 'Build and export operational and financial reports', requiresApproval: false },
    { id: 'p_manage_usr', label: 'Manage Users', app: 'admin', description: 'Create, invite, and manage platform users', requiresApproval: false },
    { id: 'p_manage_roles', label: 'Manage Roles & Permissions', app: 'admin', description: 'Define roles and assign process-level permissions', requiresApproval: false },
];
