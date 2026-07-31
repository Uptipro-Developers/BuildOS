/**
 * Seed values for module numbering.
 *
 * Generated from the client-side numberingStore defaults, which were the only
 * definition of these sequences before numbering was persisted. They are inserted
 * for any module missing from the database on boot, so an existing deployment
 * keeps the sequence positions it was already showing rather than restarting at 1.
 *
 * `app` groups a module under the application whose Settings page configures it.
 */
export interface NumberingSeed {
    module: string;
    app: string;
    prefix: string;
    separator: string;
    padLength: number;
    nextNumber: number;
    description: string;
}

export const NUMBERING_SEEDS: NumberingSeed[] = [
    // ── finance ──
    { module: "Expense", app: "finance", prefix: "EXP", separator: "-", padLength: 4, nextNumber: 52, description: "Expense records (e.g., EXP-0051)" },
    { module: "Income", app: "finance", prefix: "INC", separator: "-", padLength: 4, nextNumber: 22, description: "Income records (e.g., INC-0021)" },
    { module: "Budget", app: "finance", prefix: "BDG", separator: "-", padLength: 4, nextNumber: 9, description: "Budget records (e.g., BDG-0009)" },
    { module: "Claim", app: "finance", prefix: "CLM", separator: "-", padLength: 4, nextNumber: 32, description: "Claims (e.g., CLM-0031)" },
    { module: "Payment", app: "finance", prefix: "PAY", separator: "-", padLength: 4, nextNumber: 42, description: "Payment records (e.g., PAY-0041)" },
    { module: "JournalEntry", app: "finance", prefix: "JE", separator: "-", padLength: 3, nextNumber: 5, description: "Journal entries (e.g., JE-005)" },
    { module: "PayrollRun", app: "finance", prefix: "PRL", separator: "-", padLength: 3, nextNumber: 1, description: "Payroll runs (e.g., PRL-001)" },
    { module: "Accrual", app: "finance", prefix: "ACCR", separator: "-", padLength: 4, nextNumber: 5, description: "Accruals (e.g., ACCR-0004)" },
    { module: "Transaction", app: "finance", prefix: "TXN", separator: "-", padLength: 4, nextNumber: 61, description: "Ledger transactions (e.g., TXN-0060)" },
    { module: "FinanceApproval", app: "finance", prefix: "FA", separator: "-", padLength: 3, nextNumber: 19, description: "Finance approvals (e.g., FA-018)" },
    { module: "ScheduledPosting", app: "finance", prefix: "SP", separator: "-", padLength: 4, nextNumber: 11, description: "Scheduled postings (e.g., SP-0010)" },
    // ── hr ──
    { module: "Employee", app: "hr", prefix: "EMP", separator: "-", padLength: 3, nextNumber: 16, description: "Employee records (e.g., EMP-015)" },
    { module: "HRRole", app: "hr", prefix: "ROLE", separator: "-", padLength: 3, nextNumber: 15, description: "HR roles (e.g., ROLE-014)" },
    { module: "PayrollPeriod", app: "hr", prefix: "PP", separator: "-", padLength: 3, nextNumber: 5, description: "Payroll periods (e.g., PP-004)" },
    { module: "LeaveType", app: "hr", prefix: "LT", separator: "-", padLength: 3, nextNumber: 8, description: "Leave types (e.g., LT-007)" },
    { module: "ClaimType", app: "hr", prefix: "CT", separator: "-", padLength: 3, nextNumber: 6, description: "Claim types (e.g., CT-005)" },
    { module: "BankName", app: "hr", prefix: "BNK", separator: "-", padLength: 3, nextNumber: 13, description: "Bank names (e.g., BNK-012)" },
    { module: "Holiday", app: "hr", prefix: "HOL", separator: "-", padLength: 3, nextNumber: 1, description: "Holidays (e.g., HOL-001)" },
    // ── construction ──
    { module: "Project", app: "construction", prefix: "PRJ", separator: "-", padLength: 3, nextNumber: 9, description: "Projects (e.g., PRJ-008)" },
    { module: "Structure", app: "construction", prefix: "STR", separator: "-", padLength: 3, nextNumber: 16, description: "Project structures (e.g., STR-015)" },
    { module: "SiteTask", app: "construction", prefix: "ST", separator: "-", padLength: 3, nextNumber: 10, description: "Site tasks (e.g., ST-009)" },
    { module: "WorkPackage", app: "construction", prefix: "WP", separator: "-", padLength: 3, nextNumber: 6, description: "Work packages (e.g., WP-005)" },
    { module: "DailyReport", app: "construction", prefix: "DR", separator: "-", padLength: 3, nextNumber: 3, description: "Daily reports (e.g., DR-002)" },
    { module: "Issue", app: "construction", prefix: "ISS", separator: "-", padLength: 3, nextNumber: 4, description: "Issues (e.g., ISS-003)" },
    { module: "ChangeRequest", app: "construction", prefix: "CR", separator: "-", padLength: 3, nextNumber: 3, description: "Change requests (e.g., CR-002)" },
    { module: "NonConformance", app: "construction", prefix: "NCR", separator: "-", padLength: 3, nextNumber: 2, description: "Non-conformance reports (e.g., NCR-001)" },
    { module: "HSERecord", app: "construction", prefix: "HSE", separator: "-", padLength: 3, nextNumber: 3, description: "HSE records (e.g., HSE-002)" },
    { module: "Incident", app: "construction", prefix: "INC", separator: "-", padLength: 3, nextNumber: 3, description: "Incidents (e.g., INC-002)" },
    { module: "Communication", app: "construction", prefix: "CL", separator: "-", padLength: 4, nextNumber: 1, description: "Communication log entries" },
    { module: "Disbursement", app: "construction", prefix: "DB", separator: "-", padLength: 3, nextNumber: 1, description: "Disbursements (e.g., DB-001)" },
    { module: "Vendor", app: "construction", prefix: "V", separator: "-", padLength: 3, nextNumber: 6, description: "Project vendors (e.g., V-005)" },
    { module: "Staff", app: "construction", prefix: "STF", separator: "-", padLength: 3, nextNumber: 4, description: "Project staff (e.g., STF-003)" },
    { module: "Contractor", app: "construction", prefix: "CON", separator: "-", padLength: 3, nextNumber: 2, description: "Project contractors (e.g., CON-001)" },
    { module: "Material", app: "construction", prefix: "MAT", separator: "-", padLength: 3, nextNumber: 2, description: "Project materials (e.g., MAT-001)" },
    { module: "Equipment", app: "construction", prefix: "EQ", separator: "-", padLength: 3, nextNumber: 2, description: "Project equipment (e.g., EQ-001)" },
    { module: "Stakeholder", app: "construction", prefix: "SH", separator: "-", padLength: 3, nextNumber: 4, description: "Stakeholders (e.g., SH-003)" },
    { module: "Baseline", app: "construction", prefix: "BL", separator: "-", padLength: 3, nextNumber: 2, description: "Baselines (e.g., BL-001)" },
    { module: "Calendar", app: "construction", prefix: "CAL", separator: "-", padLength: 3, nextNumber: 3, description: "Project calendars (e.g., CAL-002)" },
    // ── procurement ──
    { module: "MaterialRequest", app: "procurement", prefix: "MR", separator: "-", padLength: 4, nextNumber: 42, description: "Material requests (e.g., MR-0041)" },
    { module: "PurchaseOrder", app: "procurement", prefix: "PO", separator: "-", padLength: 4, nextNumber: 32, description: "Purchase orders (e.g., PO-0031)" },
    { module: "PurchaseRequest", app: "procurement", prefix: "PR", separator: "-", padLength: 4, nextNumber: 19, description: "Purchase requests (e.g., PR-0018)" },
    { module: "PurchaseInvoice", app: "procurement", prefix: "PI", separator: "-", padLength: 3, nextNumber: 1, description: "Purchase invoices (e.g., PI-001)" },
    { module: "RFQ", app: "procurement", prefix: "RFQ", separator: "-", padLength: 4, nextNumber: 1, description: "Request for quotes (e.g., RFQ-0001)" },
    { module: "Quote", app: "procurement", prefix: "QT", separator: "-", padLength: 4, nextNumber: 1, description: "Quotes (e.g., QT-0001)" },
    { module: "GoodsReceipt", app: "procurement", prefix: "GRN", separator: "-", padLength: 4, nextNumber: 1, description: "Goods receipt notes (e.g., GRN-0001)" },
    // ── storefront ──
    { module: "GeneralStore", app: "storefront", prefix: "GS", separator: "-", padLength: 3, nextNumber: 9, description: "General store items (e.g., GS-008)" },
    { module: "StockTransfer", app: "storefront", prefix: "TRF", separator: "-", padLength: 3, nextNumber: 1, description: "Stock transfers (e.g., TRF-001)" },
    { module: "MaterialReturn", app: "storefront", prefix: "RET", separator: "-", padLength: 3, nextNumber: 11, description: "Material returns (e.g., RET-010)" },
    { module: "StockMovement", app: "storefront", prefix: "MOV", separator: "-", padLength: 3, nextNumber: 1, description: "Stock movements (e.g., MOV-001)" },
    // ── ess ──
    { module: "Appraisal", app: "ess", prefix: "APR", separator: "-", padLength: 4, nextNumber: 6, description: "Appraisals (e.g., APR-0005)" },
    // ── admin ──
    { module: "EmailConfig", app: "admin", prefix: "EC", separator: "-", padLength: 3, nextNumber: 1, description: "Email configurations (e.g., EC-001)" },
    { module: "ReportSchedule", app: "admin", prefix: "RS", separator: "-", padLength: 3, nextNumber: 1, description: "Report schedules (e.g., RS-001)" },
    { module: "Role", app: "admin", prefix: "R", separator: "", padLength: 1, nextNumber: 8, description: "Admin roles (e.g., R8)" },
    // ── shared ──
    { module: "Task", app: "shared", prefix: "TASK", separator: "-", padLength: 4, nextNumber: 1, description: "Tasks (e.g., TASK-0001)" },
    { module: "MyTask", app: "shared", prefix: "TK", separator: "-", padLength: 4, nextNumber: 1, description: "My personal tasks (e.g., TK-0001)" },
];
