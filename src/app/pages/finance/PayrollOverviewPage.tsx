import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";
import { notifyLoadFailure } from "../../utils/loadFailure";
import { exportCSV } from "../../utils/exportCSV";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { RowAction, RowActionNote, RowActions } from "../../components/RowAction";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { useChangelog } from "../../stores/changelogStore";
import { getAuthUserName } from "../../utils/useAuthUser";
import {
  approvePayrollPosting,
  getPayrollOverview,
  getPayrollPostingPreview,
  postPayroll,
  sendPayrollForPostingApproval,
  type PayrollOverviewRow,
  type PayrollPostingPreview,
} from "../../api/finance-extras";
import {
  csvAmountHeader,
  formatCurrencyByGeneralSettings,
  formatDateByGeneralSettings,
} from "../../utils/generalSettings";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const monthName = (m: number) => MONTHS[m - 1] ?? String(m);

/**
 * The run's position between HR and the ledger.
 *
 * Approving the posting and performing it are separate states on purpose:
 * authorising payroll to hit the accounts should not be the same keystroke as
 * doing it, and a run sitting in Posting Approved is a run somebody has signed
 * off but nobody has committed.
 */
const STATUS_META: Record<
  string,
  { badge: string; icon: ReactNode; hint: string }
> = {
  Approved: {
    badge: "bg-blue-100 text-blue-700",
    icon: <CheckCircle className="w-3 h-3" />,
    hint: "Approved in HR — ready to be sent for posting approval",
  },
  "Pending Posting Approval": {
    badge: "bg-amber-100 text-amber-700",
    icon: <Clock className="w-3 h-3" />,
    hint: "Waiting for someone to approve the accounting",
  },
  "Posting Approved": {
    badge: "bg-violet-100 text-violet-700",
    icon: <CheckCircle className="w-3 h-3" />,
    hint: "Approved to post — not yet in the ledger",
  },
  Posted: {
    badge: "bg-emerald-100 text-emerald-700",
    icon: <BookOpen className="w-3 h-3" />,
    hint: "In the general ledger",
  },
};

const metaFor = (status: string) =>
  STATUS_META[status] ?? {
    badge: "bg-gray-100 text-gray-600",
    icon: <Clock className="w-3 h-3" />,
    hint: status,
  };

/**
 * Payroll, once HR has approved it.
 *
 * This screen used to hold the whole flow in React state: a run "approved" or
 * "paid" here was back to its old status on the next refresh, and paying it
 * posted whatever the page happened to have in memory. Every step now goes to
 * the server, which owns both the status flow and the posting — so a refresh
 * shows what actually happened, and Posted is only ever set once a journal
 * entry exists behind it.
 */
export function PayrollOverviewPage() {
  const { logChange } = useChangelog();
  const [params, setParams] = useSearchParams();
  const [runs, setRuns] = useState<PayrollOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  /** Id of the run mid-action, so a step cannot be double-fired. */
  const [busy, setBusy] = useState<string | null>(null);
  const [postTarget, setPostTarget] = useState<PayrollOverviewRow | null>(null);
  const [preview, setPreview] = useState<PayrollPostingPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  function load() {
    setLoading(true);
    return getPayrollOverview()
      .then(setRuns)
      .catch((err) => notifyLoadFailure("the payroll overview", err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void load();
  }, []);

  /** A ledger line links here with the run it came from. */
  const highlighted = params.get("run");

  const fmt = (n: number) =>
    formatCurrencyByGeneralSettings(n, { minimumFractionDigits: 0 });

  /**
   * Loads what the run would post, before committing to it.
   *
   * Shown in the confirmation rather than after the fact: an unmapped process
   * or a lopsided entry is something to find out about while you can still
   * cancel.
   */
  async function openPostConfirmation(run: PayrollOverviewRow) {
    setPostTarget(run);
    setPreview(null);
    setPreviewLoading(true);
    try {
      setPreview(await getPayrollPostingPreview(run.id));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not work out what this run would post.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function run(
    row: PayrollOverviewRow,
    action: "send" | "approve" | "post",
  ) {
    if (busy) return;
    setBusy(row.id);
    // The server records who acted from the JWT; this is only the local
    // changelog's copy of it.
    const performedBy = getAuthUserName() || "Current User";
    try {
      if (action === "send") {
        await sendPayrollForPostingApproval(row.id);
        toast.success(`${row.code} sent for posting approval.`);
        logChange({
          module: "Finance",
          action: "Sent for Posting Approval",
          entityType: "PayrollRun",
          entityId: row.id,
          summary: `Payroll ${row.code} (${monthName(row.month)} ${row.year}) sent for posting approval`,
          performedBy,
        });
      } else if (action === "approve") {
        await approvePayrollPosting(row.id);
        toast.success(`${row.code} approved for posting.`, {
          description: "Post it to write the entries to the general ledger.",
        });
        logChange({
          module: "Finance",
          action: "Posting Approved",
          entityType: "PayrollRun",
          entityId: row.id,
          summary: `Payroll ${row.code} approved for posting`,
          performedBy,
        });
      } else {
        const { journalEntry } = await postPayroll(row.id);
        setPostTarget(null);
        toast.success(`${row.code} posted.`, {
          description: `Written to the general ledger as ${journalEntry.reference}.`,
        });
        logChange({
          module: "Finance",
          action: "Posted",
          entityType: "PayrollRun",
          entityId: row.id,
          summary: `Payroll ${row.code} posted as ${journalEntry.reference}`,
          performedBy,
        });
      }
      await load();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "That step could not be completed.",
      );
    } finally {
      setBusy(null);
    }
  }

  const summary = useMemo(() => {
    const sum = (rows: PayrollOverviewRow[]) =>
      rows.reduce((s, r) => s + r.netPay, 0);
    return {
      posted: sum(runs.filter((r) => r.status === "Posted")),
      awaiting: runs.filter((r) => r.status !== "Posted").length,
      pendingApproval: runs.filter((r) => r.status === "Pending Posting Approval")
        .length,
      readyToPost: runs.filter((r) => r.status === "Posting Approved").length,
    };
  }, [runs]);

  function handleExport() {
    exportCSV(
      "payroll-overview",
      [
        "Payroll Code",
        "Month",
        "Year",
        "Employees",
        csvAmountHeader("Total Earnings"),
        csvAmountHeader("Total Deductions"),
        csvAmountHeader("Net Pay"),
        "Status",
        "Journal Reference",
      ],
      runs.map((r) => [
        r.code,
        monthName(r.month),
        r.year,
        r.employeeCount,
        r.totalEarnings,
        r.totalDeductions,
        r.netPay,
        r.status,
        r.journalReference ?? "",
      ]),
    );
    toast.success(`Exported ${runs.length} payroll runs.`);
  }

  const columns: Column<PayrollOverviewRow>[] = [
    {
      key: "code",
      label: "Payroll Code",
      sortable: true,
      filterable: true,
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-semibold text-gray-900">
            {r.code}
          </span>
          <span className="text-[11px] text-gray-400">{r.periodName}</span>
        </div>
      ),
    },
    {
      key: "month",
      label: "Month",
      sortable: true,
      filterable: true,
      render: (r) => (
        <span className="text-sm text-gray-700">{monthName(r.month)}</span>
      ),
    },
    {
      key: "year",
      label: "Year",
      sortable: true,
      filterable: true,
      render: (r) => <span className="text-sm text-gray-700">{r.year}</span>,
    },
    {
      key: "totalEarnings",
      label: "Total Earnings",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => (
        <span className="text-sm text-gray-900">{fmt(r.totalEarnings)}</span>
      ),
    },
    {
      key: "totalDeductions",
      label: "Total Deductions",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => (
        <span className="text-sm text-red-600">−{fmt(r.totalDeductions)}</span>
      ),
    },
    {
      key: "netPay",
      label: "Net Pay",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => (
        <span className="text-sm font-semibold text-emerald-700">
          {fmt(r.netPay)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      minWidth: 190,
      render: (r) => {
        const meta = metaFor(r.status);
        return (
          <div className="flex flex-col gap-0.5">
            <StatusBadge label={r.status} badge={meta.badge} icon={meta.icon} title={meta.hint} />
            {r.journalReference && (
              <Link
                to={`/apps/finance/general-ledger?ref=${encodeURIComponent(r.journalReference)}`}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 hover:underline"
              >
                {r.journalReference}
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Action",
      sortable: false,
      filterable: false,
      className: "text-right",
      headerClassName: "text-right",
      // One action per state, and never more than one: the flow is a line, and
      // showing Post beside Send for Approval would suggest it is a shortcut.
      render: (r) => (
        <RowActions>
          {r.status === "Approved" && (
            <RowAction
              icon={<Send className="w-3.5 h-3.5" />}
              label="Send for Posting Approval"
              tone="primary"
              busy={busy === r.id}
              busyLabel="Sending…"
              onClick={() => void run(r, "send")}
            />
          )}
          {r.status === "Pending Posting Approval" && (
            <RowAction
              icon={<CheckCircle className="w-3.5 h-3.5" />}
              label="Approve Posting"
              tone="positive"
              busy={busy === r.id}
              busyLabel="Approving…"
              onClick={() => void run(r, "approve")}
            />
          )}
          {r.status === "Posting Approved" && (
            <RowAction
              icon={<BookOpen className="w-3.5 h-3.5" />}
              label="Post"
              tone="positive"
              busy={busy === r.id}
              busyLabel="Posting…"
              onClick={() => void openPostConfirmation(r)}
            />
          )}
          {r.status === "Posted" && (
            <RowActionNote>
              Posted{r.postedAt ? ` ${formatDateByGeneralSettings(r.postedAt)}` : ""}
            </RowActionNote>
          )}
        </RowActions>
      ),
    },
  ];

  const ordered = useMemo(() => {
    if (!highlighted) return runs;
    // The run a ledger line linked to comes first, so the link lands on it.
    const hit = runs.find((r) => r.id === highlighted);
    return hit ? [hit, ...runs.filter((r) => r.id !== highlighted)] : runs;
  }, [runs, highlighted]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Payroll Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Payroll approved in HR, on its way to the general ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={runs.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {highlighted && (
        <div className="flex items-center justify-between gap-3 bg-violet-50 border border-violet-100 rounded-xl p-3">
          <p className="text-sm text-violet-800">
            Showing the payroll run a ledger line was traced back from.
          </p>
          <button
            onClick={() => setParams({}, { replace: true })}
            className="text-xs text-violet-700 hover:underline"
          >
            Show all runs
          </button>
        </div>
      )}

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">
          Runs arrive here once <strong>HR has approved</strong> them. Send a run
          for posting approval, approve the posting, then post it — the entries
          are built from the{" "}
          <Link
            to="/apps/finance/posting-engine"
            className="font-medium underline underline-offset-2"
          >
            Payroll Disbursement process mapping
          </Link>
          , not from accounts fixed in code.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Posted (Net)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {fmt(summary.posted)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Awaiting Posting</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {summary.awaiting}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Runs not yet in the ledger</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {summary.pendingApproval}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Ready to Post</p>
          <p className="text-2xl font-bold text-violet-600 mt-1">
            {summary.readyToPost}
          </p>
        </div>
      </div>

      {loading && runs.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={ordered}
          keyExtractor={(r) => r.id}
          searchPlaceholder="Search payroll code, period, status…"
          searchFields={[
            (r) => r.code,
            (r) => r.periodName,
            (r) => r.status,
            (r) => String(r.year),
            (r) => monthName(r.month),
          ]}
          emptyMessage="No payroll has been approved in HR yet — an approved run appears here automatically"
          pageSize={20}
        />
      )}

      <ConfirmationModal
        isOpen={postTarget !== null}
        title={postTarget ? `Post ${postTarget.code} to the ledger?` : ""}
        description={
          postTarget
            ? `${monthName(postTarget.month)} ${postTarget.year} — ${fmt(postTarget.netPay)} net across ${postTarget.employeeCount} employee${postTarget.employeeCount === 1 ? "" : "s"}. Posting writes the accounting entries and cannot be undone except by reversing them.`
            : ""
        }
        confirmLabel={busy ? "Posting…" : "Post to Ledger"}
        isLoading={busy !== null}
        // An unmapped process has nowhere to post to, and the server would
        // refuse anyway — better to say so than to offer a button that fails.
        confirmDisabled={previewLoading || preview?.mapped === false}
        onConfirm={() => {
          if (postTarget) void run(postTarget, "post");
        }}
        onCancel={() => {
          setPostTarget(null);
          setPreview(null);
        }}
      >
        <PostingPreview loading={previewLoading} preview={preview} />
      </ConfirmationModal>
    </div>
  );
}

/**
 * The double entry the run will post, shown before it is posted.
 *
 * A missing mapping is the failure mode worth surfacing here: the entries have
 * nowhere to go, and the only fix is a configuration change on another screen.
 */
function PostingPreview({
  loading,
  preview,
}: {
  loading: boolean;
  preview: PayrollPostingPreview | null;
}) {
  if (loading) {
    return (
      <p className="text-xs text-gray-400 mt-3">Working out the entries…</p>
    );
  }
  if (!preview) return null;

  if (!preview.mapped) {
    return (
      <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        <p className="text-xs text-red-800">
          <strong>{preview.process}</strong> has no Process Account Mapping, so
          this payroll has nowhere to post. Map it under{" "}
          <Link
            to="/apps/finance/posting-engine"
            className="underline underline-offset-2 font-medium"
          >
            Posting Engine › Process Account Mapping
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-semibold text-gray-700">
          Entries to be posted
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100">
            <th className="text-left font-medium px-3 py-1.5">Account</th>
            <th className="text-right font-medium px-3 py-1.5">Debit</th>
            <th className="text-right font-medium px-3 py-1.5">Credit</th>
          </tr>
        </thead>
        <tbody>
          {preview.lines.map((line, i) => (
            <tr key={`${line.accountCode}-${i}`} className="border-b border-gray-50">
              <td className="px-3 py-1.5">
                <span className="font-mono text-gray-700">{line.accountCode}</span>{" "}
                <span className="text-gray-500">{line.accountName}</span>
              </td>
              <td className="px-3 py-1.5 text-right text-emerald-700">
                {line.debit ? formatCurrencyByGeneralSettings(line.debit) : "—"}
              </td>
              <td className="px-3 py-1.5 text-right text-red-600">
                {line.credit ? formatCurrencyByGeneralSettings(line.credit) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold text-gray-800">
            <td className="px-3 py-1.5">
              {preview.balanced ? "✓ Balanced" : "⚠ Does not balance"}
            </td>
            <td className="px-3 py-1.5 text-right">
              {formatCurrencyByGeneralSettings(preview.totalDebit)}
            </td>
            <td className="px-3 py-1.5 text-right">
              {formatCurrencyByGeneralSettings(preview.totalCredit)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
