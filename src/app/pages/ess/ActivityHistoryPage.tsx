import {
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Briefcase,
  User,
  Search,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";
import { exportCSV } from "../../utils/exportCSV";
import { getActivityHistory } from "../../api/activity-history";
import { useAuthUser } from "../../utils/useAuthUser";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";

type ActivityType =
  | "submitted"
  | "approved"
  | "rejected"
  | "assigned"
  | "profile";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  date: string;
  time: string;
}

// Activity type inferred from action string
function mapAction(action: string): ActivityType {
  const a = action.toLowerCase();
  if (a.includes("submit")) return "submitted";
  if (a.includes("approv")) return "approved";
  if (a.includes("reject")) return "rejected";
  if (a.includes("assign")) return "assigned";
  return "profile";
}

const typeConfig: Record<
  ActivityType,
  { icon: React.ReactNode; bg: string; label: string }
> = {
  submitted: {
    icon: <FileText className="w-4 h-4 text-blue-600" />,
    bg: "bg-blue-100",
    label: "Submitted",
  },
  approved: {
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
    bg: "bg-green-100",
    label: "Approved",
  },
  rejected: {
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    bg: "bg-red-100",
    label: "Rejected",
  },
  assigned: {
    icon: <Briefcase className="w-4 h-4 text-purple-600" />,
    bg: "bg-purple-100",
    label: "Assigned",
  },
  profile: {
    icon: <User className="w-4 h-4 text-gray-500" />,
    bg: "bg-gray-100",
    label: "Profile",
  },
};

function groupByDate(items: Activity[]): Record<string, Activity[]> {
  return items.reduce(
    (acc, item) => {
      (acc[item.date] = acc[item.date] || []).push(item);
      return acc;
    },
    {} as Record<string, Activity[]>,
  );
}

function formatDate(d: string) {
  return formatDateByGeneralSettings(d);
}

export function ActivityHistoryPage() {
  const { id: authUserId } = useAuthUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getActivityHistory(undefined, authUserId || undefined)
      .then((records) =>
        setActivities(
          records.map((r) => ({
            id: r.id,
            type: mapAction(r.action),
            title: r.action,
            detail: r.description ?? "",
            date: r.createdAt.slice(0, 10),
            time: r.createdAt.slice(11, 16),
          })),
        ),
      )
      .catch(() => {});
  }, [authUserId]);

  const filtered = activities.filter((a) => {
    const matchFilter = filter === "all" || a.type === filter;
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.detail.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });
  const grouped = groupByDate(filtered);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Activity History
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All actions and events on your account
          </p>
        </div>
        <button
          onClick={() => {
            const headers = ["Date", "Time", "Type", "Title", "Detail"];
            const rows = filtered.map((a) => [
              a.date,
              a.time,
              typeConfig[a.type].label,
              a.title,
              a.detail,
            ]);
            exportCSV("activity-history", headers, rows);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        >
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activity…"
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            "all",
            "submitted",
            "approved",
            "rejected",
            "assigned",
            "profile",
          ] as const
        ).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${filter === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {sortedDates.map((date) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs font-medium text-gray-400 whitespace-nowrap flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatDate(date)}
              </span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
            <div className="space-y-2">
              {grouped[date].map((a) => {
                const tc = typeConfig[a.type];
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4"
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${tc.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      {tc.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {a.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {a.detail}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                      {a.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No activity for this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
