import { Outlet } from "react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { HRConfigProvider } from "../stores/hrConfigStore";
import { ResourceProvider } from "../contexts/ResourceContext";
import { TaskProvider } from "../contexts/TaskContext";
import { RolesProvider } from "../contexts/RolesContext";
import {
  ensureValidAccessToken,
  hasValidAuthSession,
  clearAuthSession,
} from "../utils/authSession";
import { ChangelogProvider } from "../stores/changelogStore";
import { NumberingProvider } from "../stores/numberingStore";

export function AppLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const enforceSession = async () => {
      if (!hasValidAuthSession()) {
        clearAuthSession();
        if (mounted) navigate("/auth/login", { replace: true });
        return;
      }

      const token = await ensureValidAccessToken();
      if (!token) {
        // A null token can also mean a transient refresh failure (network blip,
        // server cold-start, timeout). Only sign the user out if the session is
        // genuinely invalid; otherwise keep them in and let the next background
        // check retry, so a flaky refresh call never ejects an active user.
        if (!hasValidAuthSession()) {
          clearAuthSession();
          if (mounted) navigate("/auth/login", { replace: true });
          return;
        }
        if (mounted) setReady(true);
        return;
      }

      if (mounted) setReady(true);
    };

    void enforceSession();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void enforceSession();
      }
    };

    const timer = window.setInterval(() => {
      void enforceSession();
    }, 60_000);

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [navigate]);

  if (!ready) return null;

  return (
    <ChangelogProvider>
      <HRConfigProvider>
        <ResourceProvider>
          <TaskProvider>
            <RolesProvider>
              <NumberingProvider>
                <div className="min-h-screen bg-gray-50">
                  <Outlet />
                </div>
              </NumberingProvider>
            </RolesProvider>
          </TaskProvider>
        </ResourceProvider>
      </HRConfigProvider>
    </ChangelogProvider>
  );
}
