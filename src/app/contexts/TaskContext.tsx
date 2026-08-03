import { toast } from "sonner";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  listAppTasks,
  createAppTask,
  updateAppTask,
  deleteAppTask,
} from "../api/app-tasks";

export type TaskPriority = "Low" | "Medium" | "High";
export type TaskCategory = "process" | "general";
export type TaskStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "To Do"
  | "Awaiting Approval"
  | "Approved"
  | "Declined";

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

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<AppTask[]>([]);

  useEffect(() => {
    listAppTasks()
      .then((rows) => {
        if (rows.length > 0) setTasks(rows as AppTask[]);
      })
      .catch(() => {});
  }, []);

  const addTask = useCallback((task: Omit<AppTask, "id" | "createdAt">) => {
    const tempId = makeId();
    const createdAt = new Date().toISOString().slice(0, 10);
    const optimistic: AppTask = { ...task, id: tempId, createdAt };
    setTasks((prev) => [...prev, optimistic]);
    createAppTask(task as Record<string, any>)
      .then((saved) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === tempId ? (saved as AppTask) : t)),
        );
      })
      // The optimistic row used to stay on screen after a failed save, so a
      // task that was never stored looked created until the next reload.
      .catch((err) => {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        toast.error(
          err instanceof Error ? err.message : "Could not create the task.",
        );
      });
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<AppTask>) => {
    let previous: AppTask | undefined;
    setTasks((prev) => {
      previous = prev.find((t) => t.id === id);
      return prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
    });
    updateAppTask(id, updates as Record<string, any>).catch((err) => {
      if (previous) {
        setTasks((prev) => prev.map((t) => (t.id === id ? previous! : t)));
      }
      toast.error(
        err instanceof Error ? err.message : "Could not save the task.",
      );
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    let removed: AppTask | undefined;
    setTasks((prev) => {
      removed = prev.find((t) => t.id === id);
      return prev.filter((t) => t.id !== id);
    });
    deleteAppTask(id).catch((err) => {
      // Put it back rather than showing it gone until the next reload.
      if (removed) setTasks((prev) => [...prev, removed!]);
      toast.error(
        err instanceof Error ? err.message : "Could not delete the task.",
      );
    });
  }, []);

  const getTasksByApp = useCallback(
    (app: string) => tasks.filter((t) => t.app === app),
    [tasks],
  );

  const getTasksByAssignee = useCallback(
    (assignee: string) => tasks.filter((t) => t.assignedTo === assignee),
    [tasks],
  );

  return (
    <TaskContext.Provider
      value={{
        tasks,
        addTask,
        updateTask,
        deleteTask,
        getTasksByApp,
        getTasksByAssignee,
      }}
    >
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
