import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlarmClock,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  TimerReset,
} from "lucide-react";
import {
  clockIn,
  clockOut,
  getMyAttendanceToday,
  type MyAttendanceToday,
} from "../../api/hr-extras";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";
import { logActivity } from "../../utils/activityLog";

/**
 * Self-service clock in / out.
 *
 * Attendance times previously had no capture point at all: HR's Daily Attendance
 * page only ever wrote a status, so Check In, Check Out and Hours were empty for
 * every record in the system. This is where an employee records their own times;
 * HR can still enter or correct them from Daily Attendance.
 *
 * The employee is resolved from the session on the server, so this page never
 * sends an employee id — otherwise anyone signed in could clock in as someone
 * else.
 */
export function MyAttendancePage() {
  const [state, setState] = useState<MyAttendanceToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(() => {
    setLoading(true);
    getMyAttendanceToday()
      .then((result) => {
        setState(result);
        setError(null);
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Failed to load your attendance.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // A live clock, so the button's meaning is unambiguous before it is pressed.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const act = async (action: "in" | "out") => {
    setBusy(true);
    try {
      const record = await (action === "in" ? clockIn() : clockOut());
      toast.success(
        action === "in"
          ? `Clocked in at ${record.clockIn}.`
          : `Clocked out at ${record.clockOut} — ${record.hoursWorked ?? 0}h recorded.`,
      );
      logActivity({
        action: action === "in" ? "Clocked in" : "Clocked out",
        module: "ESS",
        description:
          action === "in"
            ? `At ${record.clockIn}`
            : `At ${record.clockOut} — ${record.hoursWorked ?? 0}h`,
      });
      load();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to clock ${action === "in" ? "in" : "out"}.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const record = state?.record ?? null;
  const clockDisplay = now.toTimeString().slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Clock in when you start and out when you finish — your hours are worked
          out from the two.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-gray-400 py-10 text-center">
          Loading your attendance…
        </p>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {state && !loading && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {formatDateByGeneralSettings(new Date())}
                </p>
                <p className="text-4xl font-semibold text-gray-900 mt-1 tabular-nums">
                  {clockDisplay}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {state.employeeName} · {state.department}
                </p>
                {state.workDayStart ? (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                    <AlarmClock className="w-3.5 h-3.5" />
                    Work day starts {state.workDayStart}
                    {state.lateGraceMinutes > 0
                      ? ` (${state.lateGraceMinutes} min grace)`
                      : ""}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">
                    No work day start configured, so clock-ins are not marked late.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {!state.clockedIn && (
                  <button
                    onClick={() => void act("in")}
                    disabled={busy}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-60"
                  >
                    <LogIn className="w-4 h-4" />
                    {busy ? "Clocking in…" : "Clock In"}
                  </button>
                )}
                {state.clockedIn && !state.clockedOut && (
                  <button
                    onClick={() => void act("out")}
                    disabled={busy}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-60"
                  >
                    <LogOut className="w-4 h-4" />
                    {busy ? "Clocking out…" : "Clock Out"}
                  </button>
                )}
                {state.clockedIn && state.clockedOut && (
                  <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Day complete
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Check In",
                value: record?.clockIn || "—",
                Icon: LogIn,
              },
              {
                label: "Check Out",
                value: record?.clockOut || "—",
                Icon: LogOut,
              },
              {
                label: "Hours",
                value: record?.hoursWorked
                  ? `${record.hoursWorked}h`
                  : record?.clockIn && !record?.clockOut
                    ? "In progress"
                    : "—",
                Icon: TimerReset,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white border border-gray-200 rounded-xl p-4"
              >
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <card.Icon className="w-3.5 h-3.5" />
                  {card.label}
                </p>
                <p className="text-xl font-semibold text-gray-900 tabular-nums">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {record && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Today's record
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="w-4 h-4 text-gray-400" />
                Recorded as{" "}
                <span className="font-medium capitalize">
                  {String(record.status).replace(/_/g, " ")}
                </span>
                {record.status === "late" && state.workDayStart && (
                  <span className="text-xs text-amber-600">
                    (after {state.workDayStart})
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Need a correction? HR can adjust your times from Daily Attendance.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
