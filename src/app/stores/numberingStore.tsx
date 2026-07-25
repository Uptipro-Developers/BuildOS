import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ModuleNumbering {
  module: string;
  prefix: string;
  separator: string;
  template: string;
  startingNumber: number;
  endingNumber: number | null;
  incrementBy: number;
  lastUsedDate: string;
  lastUsedNumber: number;
  description: string;
}

export function formatId(template: string, num: number): string {
  return template.replace(/\{N(:\d+)?\}/g, (m) => {
    const width = m.match(/:(\d+)/);
    return width ? String(num).padStart(parseInt(width[1]), "0") : String(num);
  });
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

function cfg(p: Partial<ModuleNumbering> & { module: string; prefix: string }): ModuleNumbering {
  return {
    separator: "-",
    startingNumber: 1,
    endingNumber: null,
    incrementBy: 1,
    lastUsedDate: "",
    lastUsedNumber: 0,
    description: "",
    ...p,
    template: p.template ?? `${p.prefix}${p.separator ?? "-"}{N:4}`,
  };
}

const DEFAULT_CONFIGS: ModuleNumbering[] = [
  // ── Finance ──
  cfg({ module: "Expense", prefix: "EXP", startingNumber: 1, lastUsedNumber: 51, description: "Expense records" }),
  cfg({ module: "Income", prefix: "INC", startingNumber: 1, lastUsedNumber: 21, description: "Income records" }),
  cfg({ module: "Budget", prefix: "BDG", startingNumber: 1, lastUsedNumber: 8, description: "Budget records" }),
  cfg({ module: "Claim", prefix: "CLM", startingNumber: 1, lastUsedNumber: 31, description: "Claims" }),
  cfg({ module: "Payment", prefix: "PAY", startingNumber: 1, lastUsedNumber: 41, description: "Payment records" }),
  cfg({ module: "JournalEntry", prefix: "JE", startingNumber: 1, lastUsedNumber: 4, description: "Journal entries" }),
  cfg({ module: "PayrollRun", prefix: "PRL", startingNumber: 1, lastUsedNumber: 0, description: "Payroll runs" }),
  cfg({ module: "Accrual", prefix: "ACCR", startingNumber: 1, lastUsedNumber: 4, description: "Accruals" }),
  cfg({ module: "Transaction", prefix: "TXN", startingNumber: 1, lastUsedNumber: 60, description: "Ledger transactions" }),
  cfg({ module: "FinanceApproval", prefix: "FA", startingNumber: 1, lastUsedNumber: 18, description: "Finance approvals" }),
  cfg({ module: "ScheduledPosting", prefix: "SP", startingNumber: 1, lastUsedNumber: 10, description: "Scheduled postings" }),
  // ── HR ──
  cfg({ module: "Employee", prefix: "EMP", startingNumber: 1, lastUsedNumber: 15, description: "Employee records" }),
  cfg({ module: "HRRole", prefix: "ROLE", startingNumber: 1, lastUsedNumber: 14, description: "HR roles" }),
  cfg({ module: "PayrollPeriod", prefix: "PP", startingNumber: 1, lastUsedNumber: 4, description: "Payroll periods" }),
  cfg({ module: "LeaveType", prefix: "LT", startingNumber: 1, lastUsedNumber: 7, description: "Leave types" }),
  cfg({ module: "ClaimType", prefix: "CT", startingNumber: 1, lastUsedNumber: 5, description: "Claim types" }),
  cfg({ module: "BankName", prefix: "BNK", startingNumber: 1, lastUsedNumber: 12, description: "Bank names" }),
  cfg({ module: "Holiday", prefix: "HOL", startingNumber: 1, lastUsedNumber: 0, description: "Holidays" }),
  // ── Construction ──
  cfg({ module: "Project", prefix: "PRJ", startingNumber: 1, lastUsedNumber: 8, description: "Projects" }),
  cfg({ module: "Structure", prefix: "STR", startingNumber: 1, lastUsedNumber: 15, description: "Project structures" }),
  cfg({ module: "SiteTask", prefix: "ST", startingNumber: 1, lastUsedNumber: 9, description: "Site tasks" }),
  cfg({ module: "WorkPackage", prefix: "WP", startingNumber: 1, lastUsedNumber: 5, description: "Work packages" }),
  cfg({ module: "DailyReport", prefix: "DR", startingNumber: 1, lastUsedNumber: 2, description: "Daily reports" }),
  cfg({ module: "Issue", prefix: "ISS", startingNumber: 1, lastUsedNumber: 3, description: "Issues" }),
  cfg({ module: "ChangeRequest", prefix: "CR", startingNumber: 1, lastUsedNumber: 2, description: "Change requests" }),
  cfg({ module: "NonConformance", prefix: "NCR", startingNumber: 1, lastUsedNumber: 1, description: "Non-conformance reports" }),
  cfg({ module: "HSERecord", prefix: "HSE", startingNumber: 1, lastUsedNumber: 2, description: "HSE records" }),
  cfg({ module: "Incident", prefix: "INC", startingNumber: 1, lastUsedNumber: 2, description: "Incidents" }),
  cfg({ module: "Communication", prefix: "CL", startingNumber: 1, lastUsedNumber: 0, description: "Communication log entries" }),
  cfg({ module: "Disbursement", prefix: "DB", startingNumber: 1, lastUsedNumber: 0, description: "Disbursements" }),
  cfg({ module: "Vendor", prefix: "V", startingNumber: 1, lastUsedNumber: 5, description: "Project vendors" }),
  cfg({ module: "Staff", prefix: "STF", startingNumber: 1, lastUsedNumber: 3, description: "Project staff" }),
  cfg({ module: "Contractor", prefix: "CON", startingNumber: 1, lastUsedNumber: 1, description: "Project contractors" }),
  cfg({ module: "Material", prefix: "MAT", startingNumber: 1, lastUsedNumber: 1, description: "Project materials" }),
  cfg({ module: "Equipment", prefix: "EQ", startingNumber: 1, lastUsedNumber: 1, description: "Project equipment" }),
  cfg({ module: "Stakeholder", prefix: "SH", startingNumber: 1, lastUsedNumber: 3, description: "Stakeholders" }),
  cfg({ module: "Baseline", prefix: "BL", startingNumber: 1, lastUsedNumber: 1, description: "Baselines" }),
  cfg({ module: "Calendar", prefix: "CAL", startingNumber: 1, lastUsedNumber: 2, description: "Project calendars" }),
  // ── Procurement ──
  cfg({ module: "MaterialRequest", prefix: "MR", startingNumber: 1, lastUsedNumber: 41, description: "Material requests" }),
  cfg({ module: "PurchaseOrder", prefix: "PO", startingNumber: 1, lastUsedNumber: 31, description: "Purchase orders" }),
  cfg({ module: "PurchaseRequest", prefix: "PR", startingNumber: 1, lastUsedNumber: 18, description: "Purchase requests" }),
  cfg({ module: "PurchaseInvoice", prefix: "PI", startingNumber: 1, lastUsedNumber: 0, description: "Purchase invoices" }),
  cfg({ module: "RFQ", prefix: "RFQ", startingNumber: 1, lastUsedNumber: 0, description: "Request for quotes" }),
  cfg({ module: "Quote", prefix: "QT", startingNumber: 1, lastUsedNumber: 0, description: "Quotes" }),
  cfg({ module: "GoodsReceipt", prefix: "GRN", startingNumber: 1, lastUsedNumber: 0, description: "Goods receipt notes" }),
  // ── Storefront ──
  cfg({ module: "GeneralStore", prefix: "GS", startingNumber: 1, lastUsedNumber: 8, description: "General store items" }),
  cfg({ module: "StockTransfer", prefix: "TRF", startingNumber: 1, lastUsedNumber: 0, description: "Stock transfers" }),
  cfg({ module: "MaterialReturn", prefix: "RET", startingNumber: 1, lastUsedNumber: 10, description: "Material returns" }),
  cfg({ module: "StockMovement", prefix: "MOV", startingNumber: 1, lastUsedNumber: 0, description: "Stock movements" }),
  // ── ESS ──
  cfg({ module: "Appraisal", prefix: "APR", startingNumber: 1, lastUsedNumber: 5, description: "Appraisals" }),
  // ── Admin ──
  cfg({ module: "EmailConfig", prefix: "EC", startingNumber: 1, lastUsedNumber: 0, description: "Email configurations" }),
  cfg({ module: "ReportSchedule", prefix: "RS", startingNumber: 1, lastUsedNumber: 0, description: "Report schedules" }),
  cfg({ module: "Role", prefix: "R", separator: "", startingNumber: 1, lastUsedNumber: 7, description: "Admin roles" }),
    // ── Shared / Cross-cutting ──
  cfg({ module: "Task", prefix: "TASK", startingNumber: 1, lastUsedNumber: 0, description: "Tasks" }),
  cfg({ module: "MyTask", prefix: "TK", startingNumber: 1, lastUsedNumber: 0, description: "My personal tasks" }),
];

export const MODULE_DOMAINS: Record<string, string[]> = {
  Finance: ["Expense", "Income", "Budget", "Claim", "Payment", "JournalEntry", "PayrollRun", "Accrual", "Transaction", "FinanceApproval", "ScheduledPosting"],
  HR: ["Employee", "HRRole", "PayrollPeriod", "LeaveType", "ClaimType", "BankName", "Holiday"],
  Construction: ["Project", "Structure", "SiteTask", "WorkPackage", "DailyReport", "Issue", "ChangeRequest", "NonConformance", "HSERecord", "Incident", "Communication", "Disbursement", "Vendor", "Staff", "Contractor", "Material", "Equipment", "Stakeholder", "Baseline", "Calendar"],
  Procurement: ["MaterialRequest", "PurchaseOrder", "PurchaseRequest", "PurchaseInvoice", "RFQ", "Quote", "GoodsReceipt"],
  Storefront: ["GeneralStore", "StockTransfer", "MaterialReturn", "StockMovement"],
  ESS: ["Appraisal"],
  Admin: ["EmailConfig", "ReportSchedule", "Role"],
  Shared: ["Task", "MyTask"],
};

export function NumberingProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<ModuleNumbering[]>(DEFAULT_CONFIGS);

  const getNextId = useCallback((module: string) => {
    let result = "";
    setConfigs(prev => {
      const idx = prev.findIndex(c => c.module === module);
      if (idx < 0) return prev;
      const cfg = prev[idx];
      const nextNum = cfg.lastUsedNumber === 0 ? cfg.startingNumber : cfg.lastUsedNumber + cfg.incrementBy;
      if (cfg.endingNumber !== null && nextNum > cfg.endingNumber) {
        result = "";
        return prev;
      }
      result = formatId(cfg.template, nextNum);
      const next = [...prev];
      next[idx] = { ...cfg, lastUsedNumber: nextNum, lastUsedDate: new Date().toISOString().split("T")[0] };
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
