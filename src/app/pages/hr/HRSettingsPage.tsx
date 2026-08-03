import { useState } from "react";
import { NumberingConfigPanel } from "../../components/NumberingConfigPanel";
import { HRGeneralSetupPage } from "./HRGeneralSetupPage";
import { LeaveTypeSetupPage } from "./LeaveTypeSetupPage";
import { ClaimTypeSetupPage } from "./ClaimTypeSetupPage";

/**
 * HR Settings.
 *
 * The design consolidates HR configuration into one tabbed page. This app had no
 * settings page at all — the same content was reachable only as four separate
 * full-page routes (General Setup, Leave Type Setup, Claim Type Setup and the
 * numbering panel), so there was nowhere the design's Settings entry could go.
 *
 * The existing pages are reused as panels rather than reimplemented, so the
 * standalone routes and this page cannot drift apart. They render without their
 * own page heading when embedded.
 */
const TABS = ["general", "leave", "claim", "numbering"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  general: "General",
  leave: "Leave Types",
  claim: "Claim Types",
  numbering: "Numbering",
};

export function HRSettingsPage() {
  const [tab, setTab] = useState<Tab>("general");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure HR parameters, leave and claim categories, and reference
          numbering.
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "general" && <HRGeneralSetupPage embedded />}
      {tab === "leave" && <LeaveTypeSetupPage embedded />}
      {tab === "claim" && <ClaimTypeSetupPage embedded />}
      {tab === "numbering" && <NumberingConfigPanel app="hr" accent="indigo" />}
    </div>
  );
}
