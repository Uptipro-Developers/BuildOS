import { MyTasksView } from "../../components/MyTasksView";

// ESS aggregates every task assigned to the employee across all apps, so no
// `app` scope is passed. The "Viewing as" picker only appears for supervisors
// (people with direct/indirect reports); plain employees see only their own
// board and can move their tasks through the status flow (Start → Submit).
export function MyTasksPage() {
  return (
    <MyTasksView
      accentColor="bg-teal-600 hover:bg-teal-700"
      ringColor="focus:ring-teal-500"
      accentClass="bg-teal-600 border-teal-600"
      accentTextClass="text-teal-700"
    />
  );
}
