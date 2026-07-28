import { useEffect, useState } from "react";
import { getChartAccounts } from "../../api/finance-extras";
import { apiFetch } from "../../api/client";
import {
  getCurrencySymbol,
  formatDateByGeneralSettings,
} from "../../utils/generalSettings";
import {
  CalendarClock,
  Plus,
  Search,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Send,
  RefreshCw,
  PlayCircle,
} from "lucide-react";
import { useNumbering } from "../../stores/numberingStore";

// ── Types ─────────────────────────────────────────────────────────────────────
type ScheduleType = "immediate" | "scheduled" | "recurring";
type PostingStatus = "pending" | "processed" | "cancelled" | "overdue";

interface ScheduledPosting {
  id: string;
  description: string;
  amount: number;
  debitAccount: string;
  creditAccount: string;
  scheduleType: ScheduleType;
  scheduledDate?: string;
  recurringPattern?: string;
  status: PostingStatus;
  sourceProcess: string;
  createdBy: string;
  createdDate: string;
  processedDate?: string;
}

const RECURRENCE_PATTERNS: string[] = [];
const SOURCE_PROCESSES: string[] = [];

const STATUS_CFG: Record<
  PostingStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    badge: "bg-amber-100 text-amber-700",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  processed: {
    label: "Processed",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-gray-100 text-gray-500",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  overdue: {
    label: "Overdue",
    badge: "bg-red-100 text-red-700",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
};

const SCHEDULE_TYPE_CFG: Record<ScheduleType, { label: string; desc: string }> =
  {
    immediate: {
      label: "Post Immediately",
      desc: "Transaction is posted right now",
    },
    scheduled: {
      label: "Schedule for Date",
      desc: "Post on a specific future date",
    },
    recurring: { label: "Recurring", desc: "Post automatically on a schedule" },
  };

function fmt(n: number) {
  const symbol = getCurrencySymbol();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(0)}K`;
  return `${symbol}${n}`;
}

// ── New Posting Modal ─────────────────────────────────────────────────────────
function NewPostingModal({
  accountOptions,
  onClose,
  onSave,
}: {
  accountOptions: string[];
  onClose: () => void;
  onSave: (p: ScheduledPosting) => void;
}) {
  const { getNextId } = useNumbering();
  const today = formatDateByGeneralSettings(new Date());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [debitAccount, setDebit] = useState("");
  const [creditAccount, setCredit] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("scheduled");
  const [scheduledDate, setScheduledDate] = useState("");
  const [recurringPattern, setRecurringPattern] = useState("");
  const [sourceProcess, setSourceProcess] = useState("");
  useEffect(() => {
    setDebit((prev) => prev || accountOptions[0] || "");
    setCredit((prev) => prev || accountOptions[1] || "");
  }, [accountOptions]);

  const valid =
    description.trim() &&
    amount.trim() &&
    parseFloat(amount) > 0 &&
    debitAccount !== creditAccount &&
    (scheduleType !== "scheduled" || scheduledDate);

  function save() {
    if (!valid) return;
    onSave({
      id: getNextId("ScheduledPosting"),
      description: description.trim(),
      amount: parseFloat(amount),
      debitAccount,
      creditAccount,
      scheduleType,
      scheduledDate: scheduleType === "scheduled" ? scheduledDate : undefined,
      recurringPattern:
        scheduleType === "recurring" ? recurringPattern : undefined,
      status: scheduleType === "immediate" ? "processed" : "pending",
      processedDate: scheduleType === "immediate" ? today : undefined,
      sourceProcess,
      createdBy: "Sola Adeleke",
      createdDate: today,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            New Scheduled Posting
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Schedule type */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Posting Schedule
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["immediate", "scheduled", "recurring"] as ScheduleType[]).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setScheduleType(t)}
                    className={`p-3 rounded-xl border text-left ${scheduleType === t ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <p
                      className={`text-xs font-semibold ${scheduleType === t ? "text-emerald-700" : "text-gray-700"}`}
                    >
                      {SCHEDULE_TYPE_CFG[t].label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {SCHEDULE_TYPE_CFG[t].desc}
                    </p>
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Description & amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. April 2026 Payroll Disbursement"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Amount ({getCurrencySymbol()}){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Source Process
              </label>
              <select
                value={sourceProcess}
                onChange={(e) => setSourceProcess(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {SOURCE_PROCESSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date / recurrence */}
          {scheduleType === "scheduled" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Posting Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
          {scheduleType === "recurring" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Recurrence Pattern <span className="text-red-500">*</span>
              </label>
              <select
                value={recurringPattern}
                onChange={(e) => setRecurringPattern(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {RECURRENCE_PATTERNS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Accounts */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Double-Entry
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Debit Account
              </label>
              <select
                value={debitAccount}
                onChange={(e) => setDebit(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {accountOptions.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Credit Account
              </label>
              <select
                value={creditAccount}
                onChange={(e) => setCredit(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {accountOptions.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            {debitAccount === creditAccount && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Accounts must differ.
              </p>
            )}
          </div>

          {scheduleType === "immediate" && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-800">
              This posting will be <strong>processed immediately</strong> and
              posted to the ledger on {today}.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!valid}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {scheduleType === "immediate" ? (
              <PlayCircle className="w-4 h-4" />
            ) : (
              <CalendarClock className="w-4 h-4" />
            )}
            {scheduleType === "immediate" ? "Post Now" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ScheduledPostingPage() {
  const [postings, setPostings] = useState<ScheduledPosting[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PostingStatus | "all">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<ScheduleType | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [accountOptions, setAccountOptions] = useState<string[]>([]);

  useEffect(() => {
    getChartAccounts()
      .then((accounts) =>
        setAccountOptions(accounts.map((a) => `${a.code} ${a.name}`)),
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    apiFetch<ScheduledPosting[]>("/scheduled-postings")
      .then((data) => setPostings(Array.isArray(data) ? data : []))
      .catch(() => setPostings([]));
  }, []);

  const filtered = postings.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (typeFilter !== "all" && p.scheduleType !== typeFilter) return false;
    if (
      search &&
      !p.description.toLowerCase().includes(search.toLowerCase()) &&
      !p.id.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const pendingCount = postings.filter((p) => p.status === "pending").length;
  const overdueCount = postings.filter((p) => p.status === "overdue").length;
  const pendingValue = postings
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);

  function processPosting(id: string) {
    const today = formatDateByGeneralSettings(new Date());
    setPostings((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "processed", processedDate: today } : p,
      ),
    );
  }

  function cancelPosting(id: string) {
    setPostings((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "cancelled" } : p)),
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Scheduled Postings
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Schedule, automate, and manage recurring financial transaction
            postings
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700"
        >
          <Plus className="w-3.5 h-3.5" /> New Posting
        </button>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800 font-medium">
            {overdueCount} posting{overdueCount > 1 ? "s are" : " is"} overdue —
            review and process or cancel them.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{postings.length}</p>
          <p className="text-xs text-gray-500">Total Postings</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          <p className="text-xs text-gray-500">Overdue</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-600">
            {fmt(pendingValue)}
          </p>
          <p className="text-xs text-gray-500">Scheduled Value</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search postings…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {(
            ["all", "pending", "processed", "overdue", "cancelled"] as const
          ).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                statusFilter === s
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {(["all", "immediate", "scheduled", "recurring"] as const).map(
            (t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  typeFilter === t
                    ? "bg-emerald-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((p) => {
          const cfg = STATUS_CFG[p.status] ?? {
            badge: "bg-gray-100 text-gray-700",
            icon: null,
            label: String(p.status ?? "Unknown"),
          };
          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {p.id}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                      {p.scheduleType === "immediate" ? (
                        "Immediate"
                      ) : p.scheduleType === "recurring" ? (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />
                          {p.recurringPattern ?? "Recurring"}
                        </span>
                      ) : (
                        "Scheduled"
                      )}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {p.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Source:{" "}
                    <span className="font-medium text-gray-700">
                      {p.sourceProcess}
                    </span>
                    {p.scheduledDate && (
                      <>
                        {" "}
                        · Scheduled:{" "}
                        <span className="font-medium text-gray-700">
                          {p.scheduledDate}
                        </span>
                      </>
                    )}
                    {p.processedDate && (
                      <>
                        {" "}
                        · Processed:{" "}
                        <span className="font-medium text-emerald-700">
                          {p.processedDate}
                        </span>
                      </>
                    )}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>
                      DR:{" "}
                      <span className="font-mono text-gray-600">
                        {p.debitAccount}
                      </span>
                    </span>
                    <span>
                      CR:{" "}
                      <span className="font-mono text-gray-600">
                        {p.creditAccount}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {fmt(p.amount)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Created {p.createdDate} · {p.createdBy}
                  </p>
                  {(p.status === "pending" || p.status === "overdue") && (
                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        onClick={() => cancelPosting(p.id)}
                        className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => processPosting(p.id)}
                        className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Process Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No scheduled postings found</p>
          </div>
        )}
      </div>

      {showModal && (
        <NewPostingModal
          accountOptions={accountOptions}
          onClose={() => setShowModal(false)}
          onSave={(p) => {
            apiFetch<ScheduledPosting>("/scheduled-postings", {
              method: "POST",
              body: JSON.stringify(p),
            })
              .then((created) => {
                setPostings((prev) => [created ?? p, ...prev]);
                setShowModal(false);
              })
              .catch((err) => {
                alert("Failed to create scheduled posting. Please try again.");
                console.error(err);
              });
          }}
        />
      )}
    </div>
  );
}
