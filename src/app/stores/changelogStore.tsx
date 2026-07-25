import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ChangelogEntry {
  id: string;
  timestamp: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  details?: string;
  performedBy: string;
}

interface ChangelogContextValue {
  entries: ChangelogEntry[];
  logChange: (entry: Omit<ChangelogEntry, "id" | "timestamp">) => void;
  getByModule: (module: string) => ChangelogEntry[];
  getByEntity: (entityType: string, entityId: string) => ChangelogEntry[];
  clearAll: () => void;
}

const ChangelogContext = createContext<ChangelogContextValue | null>(null);

const SEED_ENTRIES: ChangelogEntry[] = [
  { id: "seed-1", timestamp: "2026-07-07T10:00:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-001", summary: "1. HR: Removed percentage/member counts from org structure — simplified to just groups/views", performedBy: "System" },
  { id: "seed-2", timestamp: "2026-07-07T10:01:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-002", summary: "2. HR: Merged Leave Type and Claim Type setup into General Setup page", performedBy: "System" },
  { id: "seed-3", timestamp: "2026-07-07T10:02:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-003", summary: "3. HR: Moved General Setup navigation to bottom of HR sidebar (last section)", performedBy: "System" },
  { id: "seed-4", timestamp: "2026-07-07T10:03:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-004", summary: "4. Numbering: Redesigned module numbering to table format with Starting #, Ending #, Increment, Last Used tracking", performedBy: "System" },
  { id: "seed-5", timestamp: "2026-07-07T10:04:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-005", summary: "5. Finance: Made debit/credit fields mutually exclusive in Journal Entry page", performedBy: "System" },
  { id: "seed-6", timestamp: "2026-07-07T10:05:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-006", summary: "6. Finance: Made debit/credit fields mutually exclusive in Accruals page", performedBy: "System" },
  { id: "seed-7", timestamp: "2026-07-07T10:06:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-007", summary: "7. Finance: Renamed 'Zeroize Income Statement Accounts' to 'Generate Closing Entries' in Year End Close step 3", performedBy: "System" },
  { id: "seed-8", timestamp: "2026-07-07T10:07:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-008", summary: "8. Numbering: Updated all 6 config pages (Admin, Finance, HR, Construction, Storefront, Procurement) to use new table-format numbering UI", performedBy: "System" },
  { id: "seed-9", timestamp: "2026-07-07T10:08:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-009", summary: "9. Storefront: Removed ₦ currency symbol from all table data cells — column headers already indicate currency", performedBy: "System" },
  { id: "seed-10", timestamp: "2026-07-07T10:09:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-010", summary: "10. Landing page: Made app grid responsive (adapts columns to filtered app count)", performedBy: "System" },
  { id: "seed-11", timestamp: "2026-07-07T11:00:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-011", summary: "11. Numbering: Replaced text input with dropdown selector in all config pages — pick from curated module list per domain (Finance, HR, Construction, Procurement, Storefront, Admin). Fixed broken filters that showed empty tables.", performedBy: "System" },
  { id: "seed-12", timestamp: "2026-07-08T08:00:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-012", summary: "12. Numbering: Split 'Numbering Template' column into 'Process' (dropdown) + 'Template' (text input). Template defines the ID format with {N:W} placeholder (e.g. 'EXP-{N:4}'). Last Used # renders using the template.", performedBy: "System" },
  { id: "seed-13", timestamp: "2026-07-12T12:00:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-013", summary: "13. Settings restructure: Renamed all module config pages to SettingsPage convention, converted to tab-based all-in-one layout (Finance, HR, Procurement, Construction, Admin, Storefront), merged admin email config into AdminSettingsPage Email tab, updated all sidebar nav links and routes to /settings.", performedBy: "System" },
  { id: "seed-14", timestamp: "2026-07-21T14:00:00.000Z", module: "Admin", action: "CHANGELOG", entityType: "System", entityId: "UPD-014", summary: "14. Employee lifecycle: Restructured employee creation — HR now creates complete records with General/Contact/Payment details (firstName, middleName, lastName, jobTitle, supervisor, employmentDate, DOB, maritalStatus, phone, email, address, nextOfKin, PFA, RSA, bank, taxId, grade, nationality). New employeeStore shares data between HR and Admin. Admin Users page shows employees from HR with Synced/Unsynced status and a Sync Employee panel to create user accounts with role-based permissions. Updated EmployeeProfilePage to display all new fields.", performedBy: "System" },
];

export function ChangelogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ChangelogEntry[]>(SEED_ENTRIES);

  const logChange = useCallback((entry: Omit<ChangelogEntry, "id" | "timestamp">) => {
    setEntries(prev => [{
      id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    }, ...prev]);
  }, []);

  const getByModule = useCallback((module: string) =>
    entries.filter(e => e.module === module),
  [entries]);

  const getByEntity = useCallback((entityType: string, entityId: string) =>
    entries.filter(e => e.entityType === entityType && e.entityId === entityId),
  [entries]);

  const clearAll = useCallback(() => setEntries([]), []);

  return (
    <ChangelogContext.Provider value={{ entries, logChange, getByModule, getByEntity, clearAll }}>
      {children}
    </ChangelogContext.Provider>
  );
}

export function useChangelog() {
  const ctx = useContext(ChangelogContext);
  if (!ctx) throw new Error("useChangelog must be used within ChangelogProvider");
  return ctx;
}
