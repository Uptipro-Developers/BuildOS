import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ModuleNumbering {
  module: string;
  prefix: string;
  separator: string;
  padLength: number;
  nextNumber: number;
  description: string;
}

interface NumberingContextValue {
  configs: ModuleNumbering[];
  getNextId: (module: string) => string;
  updateConfig: (module: string, updates: Partial<ModuleNumbering>) => void;
  resetConfig: (module: string) => void;
  addConfig: (cfg: ModuleNumbering) => void;
  removeConfig: (module: string) => void;
}

const NumberingContext = createContext<NumberingContextValue | null>(null);

const DEFAULT_CONFIGS: ModuleNumbering[] = [
  // ── Finance ──
  { module: "Expense", prefix: "EXP", separator: "-", padLength: 4, nextNumber: 52, description: "Expense records (e.g., EXP-0051)" },
  { module: "Income", prefix: "INC", separator: "-", padLength: 4, nextNumber: 22, description: "Income records (e.g., INC-0021)" },
  { module: "Budget", prefix: "BDG", separator: "-", padLength: 4, nextNumber: 9, description: "Budget records (e.g., BDG-0009)" },
  { module: "Claim", prefix: "CLM", separator: "-", padLength: 4, nextNumber: 32, description: "Claims (e.g., CLM-0031)" },
  { module: "Payment", prefix: "PAY", separator: "-", padLength: 4, nextNumber: 42, description: "Payment records (e.g., PAY-0041)" },
  { module: "JournalEntry", prefix: "JE", separator: "-", padLength: 3, nextNumber: 5, description: "Journal entries (e.g., JE-005)" },
  { module: "PayrollRun", prefix: "PRL", separator: "-", padLength: 3, nextNumber: 1, description: "Payroll runs (e.g., PRL-001)" },
  { module: "Accrual", prefix: "ACCR", separator: "-", padLength: 4, nextNumber: 5, description: "Accruals (e.g., ACCR-0004)" },
  { module: "Transaction", prefix: "TXN", separator: "-", padLength: 4, nextNumber: 61, description: "Ledger transactions (e.g., TXN-0060)" },
  { module: "FinanceApproval", prefix: "FA", separator: "-", padLength: 3, nextNumber: 19, description: "Finance approvals (e.g., FA-018)" },
  { module: "ScheduledPosting", prefix: "SP", separator: "-", padLength: 4, nextNumber: 11, description: "Scheduled postings (e.g., SP-0010)" },
  // ── HR ──
  { module: "Employee", prefix: "EMP", separator: "-", padLength: 3, nextNumber: 16, description: "Employee records (e.g., EMP-015)" },
  { module: "HRRole", prefix: "ROLE", separator: "-", padLength: 3, nextNumber: 15, description: "HR roles (e.g., ROLE-014)" },
  { module: "PayrollPeriod", prefix: "PP", separator: "-", padLength: 3, nextNumber: 5, description: "Payroll periods (e.g., PP-004)" },
  { module: "LeaveType", prefix: "LT", separator: "-", padLength: 3, nextNumber: 8, description: "Leave types (e.g., LT-007)" },
  { module: "ClaimType", prefix: "CT", separator: "-", padLength: 3, nextNumber: 6, description: "Claim types (e.g., CT-005)" },
  { module: "BankName", prefix: "BNK", separator: "-", padLength: 3, nextNumber: 13, description: "Bank names (e.g., BNK-012)" },
  { module: "Holiday", prefix: "HOL", separator: "-", padLength: 3, nextNumber: 1, description: "Holidays (e.g., HOL-001)" },
  // ── Construction ──
  { module: "Project", prefix: "PRJ", separator: "-", padLength: 3, nextNumber: 9, description: "Projects (e.g., PRJ-008)" },
  { module: "Structure", prefix: "STR", separator: "-", padLength: 3, nextNumber: 16, description: "Project structures (e.g., STR-015)" },
  { module: "SiteTask", prefix: "ST", separator: "-", padLength: 3, nextNumber: 10, description: "Site tasks (e.g., ST-009)" },
  { module: "WorkPackage", prefix: "WP", separator: "-", padLength: 3, nextNumber: 6, description: "Work packages (e.g., WP-005)" },
  { module: "DailyReport", prefix: "DR", separator: "-", padLength: 3, nextNumber: 3, description: "Daily reports (e.g., DR-002)" },
  { module: "Issue", prefix: "ISS", separator: "-", padLength: 3, nextNumber: 4, description: "Issues (e.g., ISS-003)" },
  { module: "ChangeRequest", prefix: "CR", separator: "-", padLength: 3, nextNumber: 3, description: "Change requests (e.g., CR-002)" },
  { module: "NonConformance", prefix: "NCR", separator: "-", padLength: 3, nextNumber: 2, description: "Non-conformance reports (e.g., NCR-001)" },
  { module: "HSERecord", prefix: "HSE", separator: "-", padLength: 3, nextNumber: 3, description: "HSE records (e.g., HSE-002)" },
  { module: "Incident", prefix: "INC", separator: "-", padLength: 3, nextNumber: 3, description: "Incidents (e.g., INC-002)" },
  { module: "Communication", prefix: "CL", separator: "-", padLength: 4, nextNumber: 1, description: "Communication log entries"},
  { module: "Disbursement", prefix: "DB", separator: "-", padLength: 3, nextNumber: 1, description: "Disbursements (e.g., DB-001)" },
  { module: "Vendor", prefix: "V", separator: "-", padLength: 3, nextNumber: 6, description: "Project vendors (e.g., V-005)" },
  { module: "Staff", prefix: "STF", separator: "-", padLength: 3, nextNumber: 4, description: "Project staff (e.g., STF-003)" },
  { module: "Contractor", prefix: "CON", separator: "-", padLength: 3, nextNumber: 2, description: "Project contractors (e.g., CON-001)" },
  { module: "Material", prefix: "MAT", separator: "-", padLength: 3, nextNumber: 2, description: "Project materials (e.g., MAT-001)" },
  { module: "Equipment", prefix: "EQ", separator: "-", padLength: 3, nextNumber: 2, description: "Project equipment (e.g., EQ-001)" },
  { module: "Stakeholder", prefix: "SH", separator: "-", padLength: 3, nextNumber: 4, description: "Stakeholders (e.g., SH-003)" },
  { module: "Baseline", prefix: "BL", separator: "-", padLength: 3, nextNumber: 2, description: "Baselines (e.g., BL-001)" },
  { module: "Calendar", prefix: "CAL", separator: "-", padLength: 3, nextNumber: 3, description: "Project calendars (e.g., CAL-002)" },
  // ── Procurement ──
  { module: "MaterialRequest", prefix: "MR", separator: "-", padLength: 4, nextNumber: 42, description: "Material requests (e.g., MR-0041)" },
  { module: "PurchaseOrder", prefix: "PO", separator: "-", padLength: 4, nextNumber: 32, description: "Purchase orders (e.g., PO-0031)" },
  { module: "PurchaseRequest", prefix: "PR", separator: "-", padLength: 4, nextNumber: 19, description: "Purchase requests (e.g., PR-0018)" },
  { module: "PurchaseInvoice", prefix: "PI", separator: "-", padLength: 3, nextNumber: 1, description: "Purchase invoices (e.g., PI-001)" },
  { module: "RFQ", prefix: "RFQ", separator: "-", padLength: 4, nextNumber: 1, description: "Request for quotes (e.g., RFQ-0001)" },
  { module: "Quote", prefix: "QT", separator: "-", padLength: 4, nextNumber: 1, description: "Quotes (e.g., QT-0001)" },
  { module: "GoodsReceipt", prefix: "GRN", separator: "-", padLength: 4, nextNumber: 1, description: "Goods receipt notes (e.g., GRN-0001)" },
  // ── Storefront ──
  { module: "GeneralStore", prefix: "GS", separator: "-", padLength: 3, nextNumber: 9, description: "General store items (e.g., GS-008)" },
  { module: "StockTransfer", prefix: "TRF", separator: "-", padLength: 3, nextNumber: 1, description: "Stock transfers (e.g., TRF-001)" },
  { module: "MaterialReturn", prefix: "RET", separator: "-", padLength: 3, nextNumber: 11, description: "Material returns (e.g., RET-010)" },
  { module: "StockMovement", prefix: "MOV", separator: "-", padLength: 3, nextNumber: 1, description: "Stock movements (e.g., MOV-001)" },
  // ── ESS ──
  { module: "Appraisal", prefix: "APR", separator: "-", padLength: 4, nextNumber: 6, description: "Appraisals (e.g., APR-0005)" },
  // ── Admin ──
  { module: "EmailConfig", prefix: "EC", separator: "-", padLength: 3, nextNumber: 1, description: "Email configurations (e.g., EC-001)" },
  { module: "ReportSchedule", prefix: "RS", separator: "-", padLength: 3, nextNumber: 1, description: "Report schedules (e.g., RS-001)" },
  { module: "Role", prefix: "R", separator: "", padLength: 1, nextNumber: 8, description: "Admin roles (e.g., R8)" },
  // ── Shared / Cross-cutting ──
  { module: "Task", prefix: "TASK", separator: "-", padLength: 4, nextNumber: 1, description: "Tasks (e.g., TASK-0001)" },
  { module: "MyTask", prefix: "TK", separator: "-", padLength: 4, nextNumber: 1, description: "My personal tasks (e.g., TK-0001)" },
];

export function NumberingProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<ModuleNumbering[]>(DEFAULT_CONFIGS);

  const getNextId = useCallback((module: string) => {
    let result = "";
    setConfigs(prev => {
      const idx = prev.findIndex(c => c.module === module);
      if (idx < 0) return prev;
      const cfg = prev[idx];
      const padded = String(cfg.nextNumber).padStart(cfg.padLength, "0");
      result = `${cfg.prefix}${cfg.separator}${padded}`;
      const next = [...prev];
      next[idx] = { ...cfg, nextNumber: cfg.nextNumber + 1 };
      return next;
    });
    return result;
  }, []);

  const updateConfig = useCallback((module: string, updates: Partial<ModuleNumbering>) => {
    setConfigs(prev => prev.map(c => c.module === module ? { ...c, ...updates } : c));
  }, []);

  const resetConfig = useCallback((module: string) => {
    const def = DEFAULT_CONFIGS.find(c => c.module === module);
    if (def) updateConfig(module, def);
  }, [updateConfig]);

  const addConfig = useCallback((cfg: ModuleNumbering) => {
    setConfigs(prev => prev.some(c => c.module === cfg.module) ? prev : [...prev, cfg]);
  }, []);

  const removeConfig = useCallback((module: string) => {
    setConfigs(prev => prev.filter(c => c.module !== module));
  }, []);

  return (
    <NumberingContext.Provider value={{ configs, getNextId, updateConfig, resetConfig, addConfig, removeConfig }}>
      {children}
    </NumberingContext.Provider>
  );
}

export function useNumbering() {
  const ctx = useContext(NumberingContext);
  if (!ctx) throw new Error("useNumbering must be used within NumberingProvider");
  return ctx;
}
