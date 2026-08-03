import { useEffect, useState } from "react";
import { listConstructionSettings } from "../api/construction-settings";
import {
  defaultScheduleLevels,
  defaultWeatherConfig,
  defaultProjectTypes,
  tradeTypes as defaultTradeTypes,
} from "../pages/construction/mockData";
import type {
  ScheduleLevelConfig,
  WeatherConfig,
} from "../pages/construction/types";

/**
 * The configured construction settings, with the built-in lists as fallback.
 *
 * Construction Settings is the only place these are edited, but the screens that
 * consume them each held their own compiled-in copy — `SECTORS` and the schedule
 * level maps in ProjectSetupPage, `weatherOptions` in DailyReportFormPage,
 * `tradeTypes` imported straight from mockData. Configuring anything therefore
 * changed the settings screen and nothing else.
 *
 * Consumers read through this hook so there is one source of truth, and the
 * constants only apply when nothing has been configured yet.
 */
export interface ConstructionConfig {
  scheduleLevels: ScheduleLevelConfig[];
  weatherConfig: WeatherConfig[];
  projectTypes: { sector: string; categories: string[] }[];
  tradeTypes: string[];
  /** False until the first load settles, so callers can avoid flashing defaults. */
  loaded: boolean;
}

export function useConstructionSettings(): ConstructionConfig {
  const [config, setConfig] = useState<ConstructionConfig>({
    scheduleLevels: defaultScheduleLevels,
    weatherConfig: defaultWeatherConfig,
    projectTypes: defaultProjectTypes as ConstructionConfig["projectTypes"],
    tradeTypes: defaultTradeTypes as string[],
    loaded: false,
  });

  useEffect(() => {
    let alive = true;
    listConstructionSettings()
      .then((rows) => {
        if (!alive) return;
        const s = rows?.[0];
        setConfig((prev) => ({
          // An empty stored list means "not configured", not "configured to
          // nothing" — falling through to the defaults keeps every picker
          // usable on a fresh install.
          scheduleLevels: s?.scheduleLevels?.length
            ? s.scheduleLevels
            : prev.scheduleLevels,
          weatherConfig: s?.weatherConfig?.length
            ? s.weatherConfig
            : prev.weatherConfig,
          projectTypes: s?.projectTypes?.length
            ? s.projectTypes
            : prev.projectTypes,
          tradeTypes: s?.tradeTypes?.length ? s.tradeTypes : prev.tradeTypes,
          loaded: true,
        }));
      })
      .catch(() => {
        // Keep the defaults; these screens must stay usable when the settings
        // request fails.
        if (alive) setConfig((prev) => ({ ...prev, loaded: true }));
      });
    return () => {
      alive = false;
    };
  }, []);

  return config;
}
