import { DeployedReports } from "../../components/DeployedReports";

/**
 * HR Reports.
 *
 * The reports offered here are the templates deployed from Admin → Report
 * Builder, not a list defined in this file. Three fixed cards used to sit here
 * — Attendance, Workforce Utilization and Payroll Summary — each with a
 * fabricated "Last generated" timestamp, so the module showed the same three
 * reports no matter what anyone had actually built, and a template deployed in
 * Report Builder appeared nowhere.
 *
 * The card / generate / preview / export interaction those cards had is kept; it
 * now lives in DeployedReports and is driven by each template's saved
 * configuration and filters.
 */
export function HRReportsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">HR Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate, preview, and export HR reports deployed from Report Builder
        </p>
      </div>

      <DeployedReports app="hr" accent="purple" />
    </div>
  );
}
