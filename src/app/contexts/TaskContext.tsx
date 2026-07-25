import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type TaskPriority = "Low" | "Medium" | "High";
export type TaskCategory = "process" | "general";
export type TaskStatus = "Pending" | "In Progress" | "Completed" | "To Do" | "Awaiting Approval" | "Approved" | "Declined";

export interface AppTask {
  id: string;
  name: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  dueDate: string;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  app: string;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  startedAt?: string;
  submittedAt?: string;
  resolvedAt?: string;
  declineReason?: string;
}

interface TaskContextType {
  tasks: AppTask[];
  addTask: (task: Omit<AppTask, "id" | "createdAt">) => void;
  updateTask: (id: string, updates: Partial<AppTask>) => void;
  deleteTask: (id: string) => void;
  getTasksByApp: (app: string) => AppTask[];
  getTasksByAssignee: (assignee: string) => AppTask[];
}

const TaskContext = createContext<TaskContextType | null>(null);

function makeId() {
  return `TASK-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

const SEED_TASKS: Omit<AppTask, "id" | "createdAt">[] = [
  { name: "Foundation Works Inspection", description: "Inspect Level B1-B2 foundation pours and report compliance.", assignedTo: "Chukwudi Eze", assignedBy: "Project Manager", dueDate: "2026-04-15", priority: "High", category: "process", status: "In Progress", app: "projects", projectName: "Downtown Office Complex" },
  { name: "Safety Audit — Block B", description: "Conduct full HSE compliance walkthrough on Block B.", assignedTo: "Amara Lawson", assignedBy: "Project Manager", dueDate: "2026-04-18", priority: "High", category: "process", status: "To Do", app: "projects", projectName: "Downtown Office Complex" },
  { name: "Concrete Pour Schedule Review", description: "Review timing for next week's pours.", assignedTo: "Femi Bode", assignedBy: "Project Manager", dueDate: "2026-04-20", priority: "Medium", category: "process", status: "To Do", app: "projects", projectName: "Riverside Residential" },
  { name: "Soil Compaction Test Review", description: "Awaiting lab report from geotechnical engineer.", assignedTo: "Ngozi Okafor", assignedBy: "Project Manager", dueDate: "2026-04-14", priority: "High", category: "process", status: "Declined", app: "projects", projectName: "Riverside Residential", startedAt: "2026-04-10", submittedAt: "2026-04-13", resolvedAt: "2026-04-14", declineReason: "Missing compaction test results. Please resubmit with complete data." },
  { name: "Site Photo Documentation", description: "Document all active work areas for weekly report.", assignedTo: "Chukwudi Eze", assignedBy: "Project Manager", dueDate: "2026-04-08", priority: "Low", category: "general", status: "Approved", app: "projects", projectName: "Downtown Office Complex", startedAt: "2026-04-06", submittedAt: "2026-04-07", resolvedAt: "2026-04-08" },
  { name: "Rebar Installation QC Check", description: "Verify rebar placement against structural drawings.", assignedTo: "Amara Lawson", assignedBy: "Project Manager", dueDate: "2026-04-22", priority: "Medium", category: "process", status: "To Do", app: "projects", projectName: "Downtown Office Complex" },
  { name: "Review Q1 expense reports", description: "Validate all Q1 submissions before audit.", assignedTo: "Amara Lawson", assignedBy: "Finance Manager", dueDate: "2026-04-18", priority: "High", category: "process", status: "In Progress", app: "finance" },
  { name: "Process new hire onboarding", description: "Complete documentation for 3 new hires.", assignedTo: "Ngozi Okafor", assignedBy: "HR Manager", dueDate: "2026-04-20", priority: "High", category: "process", status: "To Do", app: "hr" },
  { name: "Approve pending purchase requests", description: "Review 5 open PRs awaiting approval.", assignedTo: "Kene Obi", assignedBy: "Procurement Manager", dueDate: "2026-04-16", priority: "High", category: "process", status: "In Progress", app: "procurement" },
  { name: "Monthly stock count", description: "Physical count of all general store items.", assignedTo: "Ike Eze", assignedBy: "Store Manager", dueDate: "2026-04-18", priority: "High", category: "process", status: "To Do", app: "storefront" },
];

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<AppTask[]>(() =>
    SEED_TASKS.map((s) => ({ ...s, id: makeId(), createdAt: new Date().toISOString().slice(0, 10) }))
  );

  const addTask = useCallback((task: Omit<AppTask, "id" | "createdAt">) => {
    const id = makeId();
    const createdAt = new Date().toISOString().slice(0, 10);
    setTasks((prev) => [...prev, { ...task, id, createdAt }]);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<AppTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getTasksByApp = useCallback(
    (app: string) => tasks.filter((t) => t.app === app),
    [tasks]
  );

  const getTasksByAssignee = useCallback(
    (assignee: string) => tasks.filter((t) => t.assignedTo === assignee),
    [tasks]
  );

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, deleteTask, getTasksByApp, getTasksByAssignee }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}

export { TaskContext };
