import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { ProjectRole } from "../pages/construction/types";
import { DEFAULT_PROJECT_ROLES } from "../pages/construction/types";
import {
  getProjectRoles,
  saveProjectRoles,
} from "../api/construction-settings";

interface RolesContextType {
  roles: ProjectRole[];
  addRole: (role: Omit<ProjectRole, "id">) => void;
  updateRole: (id: string, updates: Partial<ProjectRole>) => void;
  deleteRole: (id: string) => void;
  getRole: (id: string) => ProjectRole | undefined;
  isDefaultRole: (id: string) => boolean;
  /** False until the stored roles have been loaded. */
  loaded: boolean;
}

const RolesContext = createContext<RolesContextType | null>(null);

const DEFAULT_ROLE_IDS = DEFAULT_PROJECT_ROLES.map((r) => r.id);

/**
 * Project roles, held server-side.
 *
 * These were plain React state: adding a role, editing its permissions or
 * deleting one survived only until the next refresh, and nothing outside the
 * settings screen could see the result. The whole list is written on every
 * change because that is how the settings screen edits it — as one collection.
 *
 * An empty stored list means "never configured" and falls through to the
 * built-in roles, so a fresh install still has a usable set.
 */
export function RolesProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<ProjectRole[]>(DEFAULT_PROJECT_ROLES);
  const [loaded, setLoaded] = useState(false);
  // Writes are skipped until the load settles, so the defaults are never
  // flushed over a stored configuration that has not arrived yet.
  const loadedRef = useRef(false);
  const rolesRef = useRef<ProjectRole[]>(DEFAULT_PROJECT_ROLES);

  useEffect(() => {
    let alive = true;
    getProjectRoles()
      .then((stored) => {
        if (!alive) return;
        if (Array.isArray(stored) && stored.length) {
          rolesRef.current = stored as ProjectRole[];
          setRoles(stored as ProjectRole[]);
        }
      })
      .catch(() => {
        // Keep the built-in roles; the settings screen stays usable offline.
      })
      .finally(() => {
        if (!alive) return;
        loadedRef.current = true;
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Applies a change locally, then persists the resulting list.
   *
   * The next list is derived outside the state updater: a request fired from
   * inside one would be sent twice under React's double-invoked updaters.
   */
  const commit = useCallback(
    (next: (prev: ProjectRole[]) => ProjectRole[], failure: string) => {
      const previous = rolesRef.current;
      const updated = next(previous);
      rolesRef.current = updated;
      setRoles(updated);

      if (!loadedRef.current) return;
      saveProjectRoles(updated).catch((err) => {
        toast.error(
          err instanceof Error ? `${failure} ${err.message}` : failure,
        );
        // Put the previous list back: leaving the change on screen would imply
        // it had been stored.
        rolesRef.current = previous;
        setRoles(previous);
      });
    },
    [],
  );

  const addRole = useCallback(
    (role: Omit<ProjectRole, "id">) => {
      const id = `role-custom-${Date.now()}`;
      commit(
        (prev) => [...prev, { ...role, id }],
        "Could not save the new role.",
      );
    },
    [commit],
  );

  const updateRole = useCallback(
    (id: string, updates: Partial<ProjectRole>) => {
      commit(
        (prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        "Could not save the role.",
      );
    },
    [commit],
  );

  const deleteRole = useCallback(
    (id: string) => {
      // An empty stored list reads as "never configured" and falls back to the
      // built-in roles, so deleting the last one would appear to undo itself.
      if (rolesRef.current.length <= 1) {
        toast.error("At least one project role must remain.");
        return;
      }
      commit(
        (prev) => prev.filter((r) => r.id !== id),
        "Could not delete the role.",
      );
    },
    [commit],
  );

  const getRole = useCallback(
    (id: string) => roles.find((r) => r.id === id),
    [roles],
  );

  const isDefaultRole = useCallback(
    (id: string) => DEFAULT_ROLE_IDS.includes(id),
    [],
  );

  return (
    <RolesContext.Provider
      value={{
        roles,
        addRole,
        updateRole,
        deleteRole,
        getRole,
        isDefaultRole,
        loaded,
      }}
    >
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles() {
  const ctx = useContext(RolesContext);
  if (!ctx) throw new Error("useRoles must be used within RolesProvider");
  return ctx;
}

export { RolesContext };
