import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { getUsers, inviteUser } from "../api/admin-extras";

export type AppKey = "construction" | "finance" | "hr" | "procurement" | "admin" | "ess";
export type UserStatus = "Active" | "Inactive" | "Pending";

export interface Process {
  id: string;
  label: string;
  app: AppKey;
  permissions: { view: boolean; create: boolean; edit: boolean; approve: boolean; delete: boolean; };
}

export interface ActivityEntry { date: string; action: string; module: string; app: AppKey; }
export interface RequestEntry  { type: "submitted" | "approved" | "rejected"; label: string; date: string; }

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  department: string;
  joinDate: string;
  status: UserStatus;
  apps: AppKey[];
  lastActive: string;
  processes: Process[];
  activity: ActivityEntry[];
  requests: RequestEntry[];
  hasSignature?: boolean;
  signatureInitials?: string;
  employeeId?: string;
}

export const buildProcesses = (allow: string[]): Process[] => [
  { id: "p1",  label: "Create Purchase Request",  app: "procurement",  permissions: { view: allow.includes("p1_v"), create: allow.includes("p1_c"), edit: allow.includes("p1_e"), approve: allow.includes("p1_a"), delete: allow.includes("p1_d") } },
  { id: "p2",  label: "Approve Purchase Order",   app: "procurement",  permissions: { view: true,  create: false, edit: false, approve: allow.includes("p2_a"), delete: false } },
  { id: "p3",  label: "Issue Materials",           app: "procurement",  permissions: { view: true,  create: allow.includes("p3_c"), edit: false, approve: false, delete: false } },
  { id: "p4",  label: "Create Expense",            app: "finance",      permissions: { view: true,  create: allow.includes("p4_c"), edit: allow.includes("p4_e"), approve: false,  delete: false } },
  { id: "p5",  label: "Approve Expense",           app: "finance",      permissions: { view: true,  create: false, edit: false, approve: allow.includes("p5_a"), delete: false } },
  { id: "p6",  label: "Create Payroll",            app: "hr",           permissions: { view: allow.includes("p6_v"), create: allow.includes("p6_c"), edit: false, approve: false, delete: false } },
  { id: "p7",  label: "Approve Leave Request",     app: "hr",           permissions: { view: true,  create: false, edit: false, approve: allow.includes("p7_a"), delete: false } },
  { id: "p8",  label: "Assign Workforce",          app: "construction", permissions: { view: true,  create: allow.includes("p8_c"), edit: allow.includes("p8_e"), approve: false, delete: false } },
  { id: "p9",  label: "Create Project",            app: "construction", permissions: { view: true,  create: allow.includes("p9_c"), edit: allow.includes("p9_e"), approve: false, delete: false } },
  { id: "p10", label: "Approve Project Budget",    app: "construction", permissions: { view: true,  create: false, edit: false, approve: allow.includes("p10_a"), delete: false } },
  { id: "p11", label: "Generate Reports",          app: "admin",        permissions: { view: true,  create: allow.includes("p11_c"), edit: false, approve: false, delete: false } },
  { id: "p12", label: "Manage Users",              app: "admin",        permissions: { view: allow.includes("p12_v"), create: allow.includes("p12_c"), edit: allow.includes("p12_e"), approve: false, delete: allow.includes("p12_d") } },
];

const INITIAL_USERS: UserRecord[] = [
  {
    id: "USR-001", name: "Amaka Osei", email: "amaka.osei@buildos.com", phone: "+234 801 234 5678",
    location: "Lagos", role: "Admin", department: "IT", joinDate: "Jan 12, 2022",
    status: "Active", apps: ["admin", "hr", "construction", "finance", "procurement", "ess"],
    lastActive: "2 minutes ago",
    processes: buildProcesses(["p1_v","p1_c","p1_e","p1_a","p1_d","p2_a","p3_c","p4_c","p4_e","p5_a","p6_v","p6_c","p7_a","p8_c","p8_e","p9_c","p9_e","p10_a","p11_c","p12_v","p12_c","p12_e","p12_d"]),
    activity: [
      { date: "Apr 10, 2026 09:14", action: "Synced employee Funke Adeyemi to user account", module: "Users", app: "admin" },
      { date: "Apr 10, 2026 08:55", action: "Updated project Lekki Tower A", module: "Projects", app: "construction" },
      { date: "Apr 9, 2026  17:30", action: "Approved expense EXP-0041", module: "Expenses", app: "finance" },
    ],
    requests: [
      { type: "approved", label: "Budget Increase — Lekki Tower A", date: "Apr 9, 2026" },
      { type: "submitted", label: "Q2 Payroll Run", date: "Apr 8, 2026" },
    ],
  },
  {
    id: "USR-002", name: "Chukwudi Eze", email: "c.eze@buildos.com", phone: "+234 802 345 6789",
    location: "Abuja", role: "Construction Manager", department: "Engineering", joinDate: "Mar 5, 2023",
    status: "Active", apps: ["construction", "procurement", "ess"],
    lastActive: "1 hour ago",
    employeeId: "EMP-001",
    processes: buildProcesses(["p8_c","p8_e","p9_c","p9_e","p3_c","p1_v"]),
    activity: [
      { date: "Apr 10, 2026 07:45", action: "Assigned workforce to Project 003", module: "Workforce", app: "construction" },
      { date: "Apr 9, 2026  15:20", action: "Submitted purchase request PR-0112", module: "Procurement", app: "procurement" },
    ],
    requests: [
      { type: "submitted", label: "Purchase Request PR-0112", date: "Apr 9, 2026" },
      { type: "rejected", label: "Equipment Hire — Crane", date: "Apr 7, 2026" },
    ],
  },
  {
    id: "USR-003", name: "Femi Adeleke", email: "f.adeleke@buildos.com", phone: "+234 803 456 7890",
    location: "Ibadan", role: "Accountant", department: "Finance", joinDate: "Jun 20, 2023",
    status: "Active", apps: ["finance", "ess"],
    lastActive: "30 minutes ago",
    processes: buildProcesses(["p4_c","p4_e","p5_a","p6_v","p11_c"]),
    activity: [
      { date: "Apr 10, 2026 09:00", action: "Approved expense EXP-0050", module: "Expenses", app: "finance" },
      { date: "Apr 9, 2026  11:30", action: "Generated monthly report", module: "Reports", app: "admin" },
    ],
    requests: [
      { type: "approved", label: "Expense EXP-0050", date: "Apr 10, 2026" },
    ],
  },
  {
    id: "USR-004", name: "Musa Ibrahim", email: "m.ibrahim@buildos.com", phone: "+234 804 567 8901",
    location: "Kano", role: "Store Manager", department: "Procurement", joinDate: "Nov 3, 2022",
    status: "Active", apps: ["procurement", "ess"],
    lastActive: "5 hours ago",
    processes: buildProcesses(["p1_v","p1_c","p2_a","p3_c"]),
    activity: [
      { date: "Apr 10, 2026 06:30", action: "Received delivery PO-2026-0041", module: "Purchase Orders", app: "procurement" },
    ],
    requests: [
      { type: "submitted", label: "Purchase Order PO-2026-0044", date: "Apr 8, 2026" },
    ],
  },
  {
    id: "USR-005", name: "Ngozi Okafor", email: "n.okafor@buildos.com", phone: "+234 805 678 9012",
    location: "Lagos", role: "HR Manager", department: "Human Resources", joinDate: "Feb 14, 2021",
    status: "Active", apps: ["hr", "ess"],
    lastActive: "Yesterday",
    processes: buildProcesses(["p6_v","p6_c","p7_a"]),
    activity: [
      { date: "Apr 9, 2026  16:00", action: "Processed April payroll", module: "Payroll", app: "hr" },
    ],
    requests: [
      { type: "submitted", label: "Payroll Processing — April 2026", date: "Apr 9, 2026" },
    ],
  },
  {
    id: "USR-006", name: "Tunde Bello", email: "t.bello@buildos.com", phone: "+234 806 789 0123",
    location: "Lagos", role: "Employee", department: "Engineering", joinDate: "Aug 1, 2024",
    status: "Pending", apps: ["ess"],
    lastActive: "3 hours ago",
    processes: buildProcesses([]),
    activity: [],
    requests: [
      { type: "submitted", label: "Leave Request — Annual Leave", date: "Apr 8, 2026" },
    ],
  },
  {
    id: "USR-007", name: "Fatima Yusuf", email: "f.yusuf@buildos.com", phone: "+234 807 890 1234",
    location: "Abuja", role: "Finance Manager", department: "Finance", joinDate: "May 10, 2020",
    status: "Active", apps: ["finance", "procurement", "ess"],
    lastActive: "4 hours ago",
    processes: buildProcesses(["p4_c","p4_e","p5_a","p6_v","p6_c","p1_v","p2_a","p11_c"]),
    activity: [
      { date: "Apr 10, 2026 08:10", action: "Reviewed monthly expenditure", module: "Finance", app: "finance" },
    ],
    requests: [
      { type: "approved", label: "Expense Batch — Apr Week 1", date: "Apr 9, 2026" },
    ],
  },
];

interface UserContextValue {
  users: UserRecord[];
  loading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
  addUserFromEmployee: (emp: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    jobTitle: string;
    department: string;
    personalEmail?: string;
    personalPhone?: string;
    address?: string;
  }, email?: string, role?: string, apps?: AppKey[]) => Promise<UserRecord>;
  updateUserSignature: (userId: string, hasSignature: boolean, signatureInitials?: string) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapApiUser = useCallback((user: any): UserRecord => {
    const statusText = String(user.status ?? "Pending").toLowerCase();
    const status: UserStatus = statusText === "active" ? "Active" : statusText === "inactive" ? "Inactive" : "Pending";
    const apps = ((user.assignedApps ?? []) as string[]).filter((app): app is AppKey =>
      ["construction", "finance", "hr", "procurement", "admin", "ess"].includes(app)
    );
    return {
      id: user.id,
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      location: "",
      role: user.role ?? "Employee",
      department: user.department ?? "",
      joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
      status,
      apps,
      lastActive: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Not active yet",
      processes: buildProcesses([]),
      activity: [],
      requests: [],
    };
  }, []);

  const refreshUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUsers = await getUsers();
      setUsers(apiUsers.map(mapApiUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [mapApiUser]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const addUserFromEmployee = useCallback((emp: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    jobTitle: string;
    department: string;
    personalEmail?: string;
    personalPhone?: string;
    address?: string;
  }, customEmail?: string, customRole?: string, apps: AppKey[] = ["ess", "hr"]) => {
    const fullName = `${emp.firstName} ${emp.middleName || ""} ${emp.lastName}`.replace(/\s+/g, " ").trim();
    const email = customEmail || emp.personalEmail || `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@buildos.com`;
    return inviteUser({
      name: fullName,
      email,
      role: customRole || emp.jobTitle || "Employee",
      assignedApps: apps,
      department: emp.department || "General",
    }).then((created) => {
      const newUser: UserRecord = {
        id: created.id,
        name: fullName,
        email: created.email,
        phone: emp.personalPhone || "",
        location: emp.address?.split(",").pop()?.trim() || "",
        role: customRole || emp.jobTitle || "Employee",
        department: emp.department || "General",
        joinDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: "Pending",
        apps,
        lastActive: "Pending invite",
        employeeId: emp.id,
        processes: buildProcesses([]),
        activity: [
          { date: new Date().toLocaleString(), action: `Invited employee ${fullName} to activate user account`, module: "Users", app: "admin" }
        ],
        requests: []
      };
      setUsers(prev => [...prev.filter(u => u.id !== newUser.id), newUser]);
      return newUser;
    });
  }, []);

  const updateUserSignature = useCallback((userId: string, hasSignature: boolean, signatureInitials?: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, hasSignature, signatureInitials } : u));
  }, []);

  return (
    <UserContext.Provider value={{ users, loading, error, refreshUsers, addUserFromEmployee, updateUserSignature }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUsers must be used within UserProvider");
  return ctx;
}
