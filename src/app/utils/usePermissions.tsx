import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getMyPermissions,
  type EffectivePermissions,
  type PermissionAction,
} from "../api/admin-extras";

/**
 * The logged-in user's effective permissions, resolved once per session.
 *
 * Roles have long stored three layers of configuration — app access, navigation
 * and per-process VCEAD — but nothing read them, so configuring a role had no
 * effect anywhere in the app. This context is the single client-side reader, so
 * the launcher, the sidebars and individual action buttons all gate off one
 * answer that matches what the API enforces.
 *
 * Unconfigured layers are permissive by design (see PermissionsService): only one
 * role had nav or process configuration stored, so denying by default would have
 * locked every other role out of the entire app. `canNav` and `can` therefore
 * return true when nothing applies, and only restrict where an admin has
 * actually configured something — or set an explicit deny, which always wins.
 */

interface PermissionsContextValue {
  permissions: EffectivePermissions | null;
  loading: boolean;
  /** True once a real answer (or a definitive failure) has arrived. */
  ready: boolean;
  error: string | null;
  refresh: () => void;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: null,
  loading: false,
  ready: false,
  error: null,
  refresh: () => {},
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<EffectivePermissions | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    getMyPermissions()
      .then((result) => {
        if (!alive) return;
        setPermissions(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        // A failed resolve must not lock the user out of a working app, so the
        // gates stay open and the reason is surfaced for diagnosis.
        setPermissions(null);
        setError(err instanceof Error ? err.message : "Failed to load permissions.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        setReady(true);
      });

    return () => {
      alive = false;
    };
  }, [nonce]);

  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      loading,
      ready,
      error,
      refresh: () => setNonce((n) => n + 1),
    }),
    [permissions, loading, ready, error],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

/** Reads the app key out of a nav href ("/apps/hr/employees" → "hr"). */
function appOfNav(navId: string): string {
  const match = /^\/apps\/([^/]+)/.exec(navId);
  return match ? match[1].toLowerCase() : "";
}

export function usePermissions() {
  const { permissions, loading, ready, error, refresh } =
    useContext(PermissionsContext);

  return useMemo(() => {
    const isSuper = Boolean(permissions?.isSuper);

    /** Whether the user may open an app at all (Layer 1). */
    const canApp = (app: string) => {
      if (!permissions) return true; // not resolved yet — don't flicker things away
      if (isSuper) return true;
      return permissions.appAccess.includes(String(app).trim().toLowerCase());
    };

    /** Whether a sidebar item should be shown (Layer 2). */
    const canNav = (navId: string) => {
      if (!permissions || isSuper) return true;

      const app = appOfNav(navId);
      if (app && !canApp(app)) return false;

      // No nav configuration for this app ⇒ unrestricted.
      if (permissions.navUnrestrictedApps.includes(app)) return true;

      const allowed = permissions.navAccess[app];
      if (!allowed || allowed.length === 0) return true;
      return allowed.includes(navId);
    };

    /** Whether the user may perform an action on a process (Layer 3 / VCEAD). */
    const can = (processId: string, action: PermissionAction = "view") => {
      if (!permissions || isSuper) return true;

      const source = permissions.processSources[processId]?.[action];
      // An explicit deny always bites, even where the layer is otherwise open.
      if (source === "deny") return false;
      // A process the resolver never mentioned is outside the user's app access
      // or absent from the catalog; treat it as unconfigured rather than denied.
      if (source === undefined) return true;
      return Boolean(permissions.processPermissions[processId]?.[action]);
    };

    return {
      permissions,
      loading,
      ready,
      error,
      refresh,
      isSuper,
      canApp,
      canNav,
      can,
    };
  }, [permissions, loading, ready, error, refresh]);
}
