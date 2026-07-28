import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "sonner";
import { getPublicGeneralSettings } from "./api/admin-extras";
import {
  applyLanguageToDocument,
  hydrateGeneralSettings,
  GENERAL_SETTINGS_CHANGED_EVENT,
  GENERAL_SETTINGS_STORAGE_KEY,
} from "./utils/generalSettings";

const hasCachedSettings =
  typeof window !== "undefined" &&
  window.localStorage.getItem(GENERAL_SETTINGS_STORAGE_KEY) !== null;

export default function App() {
  // Block the very first paint only when there is nothing cached yet, so a
  // fresh session doesn't briefly render with the wrong currency/format before
  // the organisation's settings arrive. Returning users render immediately.
  const [ready, setReady] = useState(hasCachedSettings);
  const [settingsVersion, setSettingsVersion] = useState(0);

  // Load org-wide display preferences (currency, number/date/time formats,
  // timezone, language) on startup so the admin's General Settings take effect
  // across every app for every user — not just inside the Admin module.
  useEffect(() => {
    let active = true;
    applyLanguageToDocument();
    getPublicGeneralSettings()
      .then((data) => {
        if (!active) return;
        hydrateGeneralSettings(data?.generalSettings, data?.currencyOptions);
      })
      .catch(() => {
        // Keep cached settings / defaults if the server is unreachable —
        // the app must still render.
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Re-render the whole app whenever settings change so currency symbols,
  // date/number formatting, greetings and language update immediately.
  useEffect(() => {
    const onChange = () => setSettingsVersion((v) => v + 1);
    window.addEventListener(GENERAL_SETTINGS_CHANGED_EVENT, onChange);
    return () =>
      window.removeEventListener(GENERAL_SETTINGS_CHANGED_EVENT, onChange);
  }, []);

  if (!ready) return null;

  return (
    <>
      <RouterProvider key={settingsVersion} router={router} />
      <Toaster position="top-right" richColors />
    </>
  );
}
