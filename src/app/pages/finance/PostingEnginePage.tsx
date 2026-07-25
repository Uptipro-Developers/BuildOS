import { useState } from "react";
import {
  Zap, Search, X, CheckCircle, Clock, XCircle, Send,
  Plus, ArrowLeft, Building2, Users, ShoppingCart, Package,
  Briefcase, FileText, ChevronDown, AlertTriangle, Eye,
  BookOpen, Layers,
} from "lucide-react";
import { useFinance } from "../../stores/financeStore";
import { useChangelog } from "../../stores/changelogStore";
import { useNumbering } from "../../stores/numberingStore";
import { DataTable, type Column } from "../../components/DataTable";

// ── Types
type TxnStatus = "pending" | "approved" | "rejected" | "posted";
type SourceApp = "HR" | "Procurement" | "ESS" | "Storefront" | "Projects" | "Finance";

interface ProcessCategory {
  id: string;
  name: string;
  description: string;
  sourceApp: SourceApp;
  linkedProcess: string;
  debitAccount: string;
  creditAccount: string;
}

interface Transaction {
  id: string;
  categoryId: string;
  description: string;
  amount: number;
  sourceApp: SourceApp;
  reference: string;
  date: string;
  submittedBy: string;
  status: TxnStatus;
  reviewedBy?: string;
  reviewedDate?: string;
  notes?: string;
  ledgerRef?: string;
}

// ── Seed: Process Categories ──────────────────────────────────────────────────
const SEED_CATEGORIES: ProcessCategory[] = [
  { id: "cat-001", name: "Payroll Disbursement",  description: "Post approved payroll batches from HR to the general ledger",         sourceApp: "HR",          linkedProcess: "Payroll Processing", debitAccount: "5100 Labour Costs",        creditAccount: "1110 Cash & Bank"         },
  { id: "cat-002", name: "Supplier Payments",      description: "Post approved supplier invoices and purchase order payments",         sourceApp: "Procurement", linkedProcess: "Purchase Order",     debitAccount: "2000 Accounts Payable",    creditAccount: "1110 Cash & Bank"         },
  { id: "cat-003", name: "Expense Claims",         description: "Post approved staff expense reimbursements and claims",               sourceApp: "ESS",         linkedProcess: "Expense Request",    debitAccount: "5400 Overhead",            creditAccount: "1110 Cash & Bank"         },
  { id: "cat-004", name: "Material Purchases",     description: "Post material receipts against inventory from goods receipts",        sourceApp: "Procurement", linkedProcess: "Goods Receipt",      debitAccount: "1300 Inventory",           creditAccount: "2000 Accounts Payable"    },
  { id: "cat-005", name: "Material Transfers",     description: "Post cost of materials transferred from stores to project sites",     sourceApp: "Storefront",  linkedProcess: "Material Transfer",  debitAccount: "5200 Material Costs",      creditAccount: "1300 Inventory"           },
  { id: "cat-006", name: "Contract Revenue",       description: "Recognise revenue upon project milestone completion and billing",     sourceApp: "Projects",    linkedProcess: "Milestone Billing",  debitAccount: "1100 Accounts Receivable", creditAccount: "4100 Contract Revenue"    },
  { id: "cat-007", name: "Salary Advances",        description: "Post salary advances issued to staff against staff advance accounts", sourceApp: "HR",          linkedProcess: "Salary Advance",     debitAccount: "1200 Staff Advances",      creditAccount: "1110 Cash & Bank"         },
  { id: "cat-008", name: "Employee Allowances",    description: "Post approved site and role-based allowance payments",                sourceApp: "HR",          linkedProcess: "Allowances",         debitAccount: "5100 Labour Costs",        creditAccount: "2100 Accrued Liabilities" },
];

// ── Seed: Transactions ────────────────────────────────────────────────────────
const SEED_TRANSACTIONS: Transaction[] = [
  // Payroll Disbursement
  { id: "TXN-2026-001", categoryId: "cat-001", description: "April 2026 Payroll – General Staff",            amount: 4850000, sourceApp: "HR",          reference: "PAY-2604",  date: "25 Apr 2026", submittedBy: "Ngozi Adeyemi",  status: "pending"  },
  { id: "TXN-2026-002", categoryId: "cat-001", description: "March 2026 Payroll – All Staff",                amount: 4620000, sourceApp: "HR",          reference: "PAY-2603",  date: "31 Mar 2026", submittedBy: "Ngozi Adeyemi",  status: "posted",  reviewedBy: "Sola Adeleke", reviewedDate: "1 Apr 2026",  ledgerRef: "LGR-0095" },
  { id: "TXN-2026-003", categoryId: "cat-001", description: "February 2026 Payroll – Site Staff",            amount: 3980000, sourceApp: "HR",          reference: "PAY-2602",  date: "28 Feb 2026", submittedBy: "Ngozi Adeyemi",  status: "posted",  reviewedBy: "Sola Adeleke", reviewedDate: "1 Mar 2026",  ledgerRef: "LGR-0082" },
  // Supplier Payments
  { id: "TXN-2026-004", categoryId: "cat-002", description: "Supplier Invoice – SteelMart PO-0391",          amount: 1540000, sourceApp: "Procurement", reference: "PO-0391",   date: "22 Apr 2026", submittedBy: "Emeka Obi",      status: "pending"  },
  { id: "TXN-2026-005", categoryId: "cat-002", description: "CemCo Invoice – Cement Batch Apr",              amount:  680000, sourceApp: "Procurement", reference: "PO-0382",   date: "12 Apr 2026", submittedBy: "Emeka Obi",      status: "approved", reviewedBy: "Sola Adeleke", reviewedDate: "13 Apr 2026" },
  { id: "TXN-2026-006", categoryId: "cat-002", description: "WoodCraft Timber Supply Invoice",               amount:  295000, sourceApp: "Procurement", reference: "PO-0374",   date: "5 Apr 2026",  submittedBy: "Emeka Obi",      status: "posted",  reviewedBy: "Sola Adeleke", reviewedDate: "7 Apr 2026",  ledgerRef: "LGR-0088" },
  // Expense Claims
  { id: "TXN-2026-007", categoryId: "cat-003", description: "Expense Reimbursement – Aisha Bello (Travel)",  amount:   45000, sourceApp: "ESS",         reference: "EXP-3310",  date: "18 Apr 2026", submittedBy: "Aisha Bello",    status: "pending"  },
  { id: "TXN-2026-008", categoryId: "cat-003", description: "Q1 Audit Fee Invoice",                          amount:  250000, sourceApp: "Finance",     reference: "EXP-3309",  date: "10 Apr 2026", submittedBy: "Sola Adeleke",   status: "pending"  },
  { id: "TXN-2026-009", categoryId: "cat-003", description: "Expense – Robert Lee (Equipment Hire)",         amount:   85000, sourceApp: "ESS",         reference: "EXP-3301",  date: "8 Apr 2026",  submittedBy: "Robert Lee",     status: "rejected", reviewedBy: "Sola Adeleke", reviewedDate: "9 Apr 2026",  notes: "Missing receipt — please resubmit." },
  // Material Purchases
  { id: "TXN-2026-010", categoryId: "cat-004", description: "GRN – Cement Bags 800 units",                   amount:  680000, sourceApp: "Procurement", reference: "GRN-0218",  date: "20 Apr 2026", submittedBy: "Emeka Obi",      status: "pending"  },
  { id: "TXN-2026-011", categoryId: "cat-004", description: "GRN – Steel Rods Batch Lot 14",                 amount:  420000, sourceApp: "Procurement", reference: "GRN-0210",  date: "11 Apr 2026", submittedBy: "Emeka Obi",      status: "posted",  reviewedBy: "Sola Adeleke", reviewedDate: "12 Apr 2026", ledgerRef: "LGR-0089" },
  // Material Transfers
  { id: "TXN-2026-012", categoryId: "cat-005", description: "Downtown Office – Rebar Transfer",              amount:  820000, sourceApp: "Storefront",  reference: "MT-0074",   date: "17 Apr 2026", submittedBy: "Store Clerk",    status: "pending"  },
  { id: "TXN-2026-013", categoryId: "cat-005", description: "Riverside Residential – Tile Transfer",         amount:  392000, sourceApp: "Storefront",  reference: "MT-0068",   date: "6 Apr 2026",  submittedBy: "Store Clerk",    status: "posted",  reviewedBy: "Sola Adeleke", reviewedDate: "7 Apr 2026",  ledgerRef: "LGR-0091" },
  // Contract Revenue
  { id: "TXN-2026-014", categoryId: "cat-006", description: "Lekki Tower Phase 2 – Milestone 4",             amount: 6200000, sourceApp: "Projects",    reference: "MILE-0042", date: "15 Apr 2026", submittedBy: "PM Office",      status: "pending"  },
  { id: "TXN-2026-015", categoryId: "cat-006", description: "Harbour Bridge – Milestone 6",                  amount: 8500000, sourceApp: "Projects",    reference: "MILE-0038", date: "10 Apr 2026", submittedBy: "PM Office",      status: "approved", reviewedBy: "Sola Adeleke", reviewedDate: "11 Apr 2026" },
  { id: "TXN-2026-016", categoryId: "cat-006", description: "Abuja Twin Towers – Milestone 2",               amount: 4750000, sourceApp: "Projects",    reference: "MILE-0031", date: "28 Mar 2026", submittedBy: "PM Office",      status: "posted",  reviewedBy: "Sola Adeleke", reviewedDate: "30 Mar 2026", ledgerRef: "LGR-0079" },
  // Salary Advances
  { id: "TXN-2026-017", categoryId: "cat-007", description: "Salary Advance – Tom Savage",                   amount:  150000, sourceApp: "HR",          reference: "SA-0055",   date: "14 Apr 2026", submittedBy: "Ngozi Adeyemi",  status: "pending"  },
  { id: "TXN-2026-018", categoryId: "cat-007", description: "Salary Advance – Bisi Okonkwo",                 amount:  100000, sourceApp: "HR",          reference: "SA-0051",   date: "2 Apr 2026",  submittedBy: "Ngozi Adeyemi",  status: "posted",  reviewedBy: "Sola Adeleke", reviewedDate: "3 Apr 2026",  ledgerRef: "LGR-0085" },
  // Employee Allowances
  { id: "TXN-2026-019", categoryId: "cat-008", description: "April 2026 Site Allowances",                    amount:  310000, sourceApp: "HR",          reference: "ALW-2604",  date: "25 Apr 2026", submittedBy: "Ngozi Adeyemi",  status: "pending"  },
  { id: "TXN-2026-020", categoryId: "cat-008", description: "March 2026 Role Allowances – Supervision",      amount:  185000, sourceApp: "HR",          reference: "ALW-2603",  date: "31 Mar 2026", submittedBy: "Ngozi Adeyemi",  status: "posted",  reviewedBy: "Sola Adeleke", reviewedDate: "1 Apr 2026",  ledgerRef: "LGR-0094" },
];

// ── Config maps ───────────────────────────────────────────────────────────────
const STATUS_CFG: Record<TxnStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  pending:  { label: "Pending",          badge: "bg-gray-100 text-gray-600",       icon: <Clock       className="w-3.5 h-3.5" /> },
  approved: { label: "Approved",         badge: "bg-emerald-100 text-emerald-700", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { label: "Rejected",         badge: "bg-red-100 text-red-700",         icon: <XCircle     className="w-3.5 h-3.5" /> },
  posted:   { label: "Posted to Ledger", badge: "bg-purple-100 text-purple-700",   icon: <BookOpen    className="w-3.5 h-3.5" /> },
};

const APP_CFG: Record<SourceApp, { icon: React.ReactNode; badge: string }> = {
  HR:          { icon: <Users        className="w-3.5 h-3.5" />, badge: "bg-violet-100 text-violet-700"   },
  Procurement: { icon: <ShoppingCart className="w-3.5 h-3.5" />, badge: "bg-blue-100 text-blue-700"      },
  ESS:         { icon: <Briefcase    className="w-3.5 h-3.5" />, badge: "bg-teal-100 text-teal-700"      },
  Storefront:  { icon: <Package      className="w-3.5 h-3.5" />, badge: "bg-orange-100 text-orange-700"  },
  Projects:    { icon: <Building2    className="w-3.5 h-3.5" />, badge: "bg-sky-100 text-sky-700"        },
  Finance:     { icon: <FileText     className="w-3.5 h-3.5" />, badge: "bg-emerald-100 text-emerald-700"},
};

const SOURCE_APPS: SourceApp[] = ["HR", "Procurement", "ESS", "Storefront", "Projects", "Finance"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `₦${(n / 1000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}
function todayStr() {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── New Category Modal ────────────────────────────────────────────────────────
function NewCategoryModal({ onClose, onSave, accounts }: {
  onClose: () => void;
  onSave: (c: ProcessCategory) => void;
  accounts: { code: string; name: string }[];
}) {
  const accountOptions = accounts.map(a => `${a.code} ${a.name}`);
  const [form, setForm] = useState({
    name: "", description: "",
    sourceApp: "HR" as SourceApp,
    linkedProcess: "",
    debitAccount: "5100 Labour Costs",
    creditAccount: "1110 Cash & Bank",
  });
  const canSubmit = form.name.trim() && form.linkedProcess.trim() && form.debitAccount !== form.creditAccount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">New Process Category</h2>
            <p className="text-xs text-gray-500 mt-0.5">Define a category to group similar financial transactions</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Payroll Disbursement"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2} placeholder="Brief description of the transactions grouped under this category"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Source Application <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={form.sourceApp} onChange={e => setForm(p => ({ ...p, sourceApp: e.target.value as SourceApp }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none pr-7">
                  {SOURCE_APPS.map(a => <option key={a}>{a}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Linked Process <span className="text-red-500">*</span></label>
              <input value={form.linkedProcess} onChange={e => setForm(p => ({ ...p, linkedProcess: e.target.value }))}
                placeholder="e.g. Payroll Run"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Process-to-Account Mapping</p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded font-bold mr-1.5">DR</span>Debit Account
                </label>
                <div className="relative">
                    <select value={form.debitAccount} onChange={e => setForm(p => ({ ...p, debitAccount: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none pr-7">
                      {accountOptions.map(a => <option key={a}>{a}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-bold mr-1.5">CR</span>Credit Account
                </label>
                <div className="relative">
                    <select value={form.creditAccount} onChange={e => setForm(p => ({ ...p, creditAccount: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none pr-7">
                      {accountOptions.map(a => <option key={a}>{a}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              {form.debitAccount === form.creditAccount && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Debit and credit accounts must differ.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
          <button disabled={!canSubmit}
            onClick={() => { onSave({ id: `cat-${Date.now()}`, ...form }); onClose(); }}
            className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Category
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Transaction Detail Modal ──────────────────────────────────────────────────
function TransactionDetailModal({ txn, category, onClose, onApprove, onReject, onPost }: {
  txn: Transaction; category: ProcessCategory;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, notes: string) => void;
  onPost: (id: string) => void;
}) {
  const sc = STATUS_CFG[txn.status];
  const ac = APP_CFG[txn.sourceApp];
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <p className="text-xs text-gray-500 font-mono">{txn.id}</p>
            <h2 className="text-base font-semibold text-gray-900 max-w-sm truncate">{txn.description}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Status */}
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${sc.badge}`}>
            {sc.icon}
            <span className="text-sm font-semibold">{sc.label}</span>
            {txn.ledgerRef && <span className="ml-auto text-xs font-mono bg-white/60 px-2 py-0.5 rounded">Ledger: {txn.ledgerRef}</span>}
          </div>
          {/* Details */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Transaction Details</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label: "Category",     value: category.name },
                { label: "Process",      value: `${txn.sourceApp} → ${category.linkedProcess}` },
                { label: "Amount",       value: fmt(txn.amount) },
                { label: "Reference",    value: txn.reference },
                { label: "Date",         value: txn.date },
                { label: "Submitted By", value: txn.submittedBy },
                ...(txn.reviewedBy ? [{ label: "Reviewed By", value: txn.reviewedBy }, { label: "Reviewed", value: txn.reviewedDate! }] : []),
                ...(txn.notes ? [{ label: "Notes", value: txn.notes }] : []),
              ].map(row => (
                <div key={row.label} className="flex px-4 py-2.5 gap-4">
                  <span className="text-xs text-gray-500 w-28 flex-shrink-0">{row.label}</span>
                  <span className="text-xs font-medium text-gray-800">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          {/* DR/CR entries */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Financial Entries</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Account</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-2.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">DR</span></td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{category.debitAccount}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{fmt(txn.amount)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5"><span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">CR</span></td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{category.creditAccount}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{fmt(txn.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Source */}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${ac.badge}`}>{ac.icon} {txn.sourceApp}</span>
            <span className="text-xs text-gray-500">{category.linkedProcess}</span>
          </div>
          {/* Reject form */}
          {showRejectForm && (
            <div className="border border-red-200 rounded-xl p-4 space-y-3 bg-red-50">
              <p className="text-xs font-semibold text-red-800">Rejection Reason</p>
              <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={2}
                placeholder="Provide reason for rejection…"
                className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm outline-none resize-none bg-white focus:ring-2 focus:ring-red-400" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowRejectForm(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-white">Cancel</button>
                <button onClick={() => { onReject(txn.id, rejectNotes); onClose(); }}
                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">Confirm Rejection</button>
              </div>
            </div>
          )}
          {/* Actions */}
          {txn.status === "pending" && !showRejectForm && (
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowRejectForm(true)}
                className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button onClick={() => { onApprove(txn.id); onClose(); }}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
            </div>
          )}
          {txn.status === "approved" && (
            <button onClick={() => { onPost(txn.id); onClose(); }}
              className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Post to Ledger
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category Detail (drill-down) ──────────────────────────────────────────────
function CategoryDetailView({ category, transactions, onBack, onApprove, onReject, onPost }: {
  category: ProcessCategory;
  transactions: Transaction[];
  onBack: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, notes: string) => void;
  onPost: (id: string) => void;
}) {
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<TxnStatus | "all">("all");
  const [selectedTxn, setSelectedTxn]   = useState<Transaction | null>(null);

  const filtered = transactions.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = t.description.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all:      transactions.length,
    pending:  transactions.filter(t => t.status === "pending").length,
    approved: transactions.filter(t => t.status === "approved").length,
    rejected: transactions.filter(t => t.status === "rejected").length,
    posted:   transactions.filter(t => t.status === "posted").length,
  };
  const pendingAmt  = transactions.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0);
  const approvedAmt = transactions.filter(t => t.status === "approved").reduce((s, t) => s + t.amount, 0);
  const postedAmt   = transactions.filter(t => t.status === "posted").reduce((s, t) => s + t.amount, 0);
  const ac = APP_CFG[category.sourceApp];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900">{category.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${ac.badge}`}>{ac.icon} {category.sourceApp}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
        </div>
      </div>

      {/* Category info */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            { label: "Linked Process", value: category.linkedProcess, cls: "text-gray-800"          },
            { label: "Source",         value: category.sourceApp,     cls: "text-gray-800"          },
            { label: "Debit Account",  value: category.debitAccount,  cls: "text-blue-700 font-mono"  },
            { label: "Credit Account", value: category.creditAccount, cls: "text-green-700 font-mono" },
          ] as const).map(r => (
            <div key={r.label}>
              <p className="text-xs text-gray-500 mb-0.5">{r.label}</p>
              <p className={`text-sm font-medium ${r.cls}`}>{r.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xl font-bold text-gray-700">{counts.pending}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending</p>
          {pendingAmt > 0 && <p className="text-xs text-gray-400 mt-0.5">{fmt(pendingAmt)}</p>}
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xl font-bold text-emerald-700">{counts.approved}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Approved</p>
          {approvedAmt > 0 && <p className="text-xs text-emerald-500 mt-0.5">{fmt(approvedAmt)}</p>}
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xl font-bold text-purple-700">{counts.posted}</p>
          <p className="text-xs text-purple-600 mt-0.5">Posted</p>
          {postedAmt > 0 && <p className="text-xs text-purple-500 mt-0.5">{fmt(postedAmt)}</p>}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xl font-bold text-red-600">{counts.rejected}</p>
          <p className="text-xs text-red-500 mt-0.5">Rejected</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Search transactions, references…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "pending", "approved", "rejected", "posted"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${statusFilter === s ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              {s === "all" ? `All (${counts.all})` : `${STATUS_CFG[s].label} (${counts[s]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction table */}
      <DataTable columns={[
        { key: "id", label: "Transaction ID", render: t => <span className="font-mono text-xs text-gray-500">{t.id}</span>, sortable: true, filterable: true, minWidth: 100 },
        { key: "description", label: "Description", render: t => <div><p className="font-medium text-gray-900 max-w-xs truncate">{t.description}</p><p className="text-xs text-gray-400 font-mono">{t.reference}</p></div>, sortable: true, filterable: true, minWidth: 200 },
        { key: "amount", label: "Amount (₦)", render: t => <span className="text-sm font-semibold text-gray-800">{fmt(t.amount)}</span>, sortable: true, filterable: false, className: "text-right", headerClassName: "text-right" },
        { key: "date", label: "Date", render: t => <span className="text-xs text-gray-500">{t.date}</span>, sortable: true, filterable: false },
        { key: "submittedBy", label: "Submitted By", render: t => <span className="text-xs text-gray-600">{t.submittedBy}</span>, sortable: true, filterable: true },
        { key: "status", label: "Status", render: t => { const sc = STATUS_CFG[t.status]; return <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${sc.badge}`}>{sc.icon} {sc.label}</span>; }, sortable: true, filterable: true },
        { key: "actions", label: "Actions", render: t => (
          <div className="flex items-center gap-1">
            <button onClick={() => setSelectedTxn(t)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50" title="View Details"><Eye className="w-3.5 h-3.5" /></button>
            {t.status === "pending" && (
              <>
                <button onClick={() => onApprove(t.id)} className="p-1.5 text-gray-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50" title="Approve"><CheckCircle className="w-3.5 h-3.5" /></button>
                <button onClick={() => setSelectedTxn(t)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Reject"><XCircle className="w-3.5 h-3.5" /></button>
              </>
            )}
            {t.status === "approved" && (
              <button onClick={() => onPost(t.id)} className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50" title="Post to Ledger"><Zap className="w-3.5 h-3.5" /></button>
            )}
          </div>
        ), sortable: false, filterable: false, className: "text-right", headerClassName: "text-right" },
      ]} data={filtered} keyExtractor={t => t.id}
        searchPlaceholder="Search transactions..."
        searchFields={[t => t.description, t => t.reference, t => t.id]}
        emptyMessage="No transactions found." />

      {selectedTxn && (
        <TransactionDetailModal txn={selectedTxn} category={category} onClose={() => setSelectedTxn(null)}
          onApprove={id => { onApprove(id); setSelectedTxn(null); }}
          onReject={(id, notes) => { onReject(id, notes); setSelectedTxn(null); }}
          onPost={id => { onPost(id); setSelectedTxn(null); }} />
      )}
    </div>
  );
}

// ── Category Card ─────────────────────────────────────────────────────────────
function CategoryCard({ category, transactions, onClick }: {
  category: ProcessCategory;
  transactions: Transaction[];
  onClick: () => void;
}) {
  const pending    = transactions.filter(t => t.status === "pending").length;
  const approved   = transactions.filter(t => t.status === "approved").length;
  const posted     = transactions.filter(t => t.status === "posted").length;
  const pendingAmt = transactions.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0);
  const ac = APP_CFG[category.sourceApp];

  return (
    <button onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-50 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-800 transition-colors leading-tight">{category.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{category.description}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0 ${ac.badge}`}>{ac.icon} {category.sourceApp}</span>
      </div>
      {pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">{pending} pending</span>
          </div>
          <span className="text-xs font-bold text-amber-700">{fmt(pendingAmt)}</span>
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> {approved} approved</span>
        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-purple-500" /> {posted} posted</span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-gray-400" /> {transactions.length} total</span>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 text-xs">
        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono truncate flex-1">DR: {category.debitAccount}</span>
        <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded font-mono truncate flex-1">CR: {category.creditAccount}</span>
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function PostingEnginePage() {
  const { accounts, transactions: ledgerTransactions, setTransactions: setLedgerTransactions } = useFinance();
  const { logChange } = useChangelog();
  const { getNextId } = useNumbering();
  const [categories, setCategories]           = useState<ProcessCategory[]>(SEED_CATEGORIES);
  const [transactions, setTransactions]       = useState<Transaction[]>(SEED_TRANSACTIONS);
  const [activeCategory, setActiveCategory]   = useState<ProcessCategory | null>(null);
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [search, setSearch]                   = useState("");
  const [appFilter, setAppFilter]             = useState<SourceApp | "all">("all");

  const now = todayStr();

  function approveTransaction(id: string) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: "approved", reviewedBy: "Sola Adeleke", reviewedDate: now } : t));
    const txn = transactions.find(t => t.id === id);
    if (txn) logChange({ module: "Finance", action: "Approved", entityType: "PostingEngineTxn", entityId: id, summary: `Posting Engine: "${txn.description}" approved`, performedBy: "Sola Adeleke" });
  }
  function rejectTransaction(id: string, notes: string) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: "rejected", reviewedBy: "Sola Adeleke", reviewedDate: now, notes: notes || undefined } : t));
    const txn = transactions.find(t => t.id === id);
    if (txn) logChange({ module: "Finance", action: "Rejected", entityType: "PostingEngineTxn", entityId: id, summary: `Posting Engine: "${txn.description}" rejected`, performedBy: "Sola Adeleke" });
  }
  function postToLedger(id: string) {
    const txn = transactions.find(t => t.id === id);
    if (!txn) return;
    const cat = categories.find(c => c.id === txn.categoryId);
    if (!cat) return;
    const ledgerRef = `LGR-${String(Math.floor(1000 + Math.random() * 8999))}`;
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: "posted", ledgerRef } : t));
    logChange({ module: "Finance", action: "Posted", entityType: "PostingEngineTxn", entityId: id, summary: `Posting Engine: "${txn.description}" → Ledger (${ledgerRef})`, performedBy: "Sola Adeleke" });
    // Create corresponding entry in the FinanceContext ledger
    setLedgerTransactions(prev => [...prev, {
      id: getNextId("Transaction"),
      type: "Journal" as const,
      description: `${cat.name}: ${txn.description}`,
      debitAccount: cat.debitAccount,
      creditAccount: cat.creditAccount,
      reference: ledgerRef,
      amount: txn.amount,
      date: now,
      createdBy: txn.reviewedBy ?? "Posting Engine",
      sourceApp: txn.sourceApp,
      sourceProcess: cat.linkedProcess,
      approvalStatus: "auto-approved" as const,
      linkedRecords: [{ label: "Posting Engine Ref", ref: txn.id }],
    }]);
  }

  const filteredCategories = categories.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.linkedProcess.toLowerCase().includes(q);
    const matchApp = appFilter === "all" || c.sourceApp === appFilter;
    return matchSearch && matchApp;
  });

  const totalPending    = transactions.filter(t => t.status === "pending").length;
  const totalApproved   = transactions.filter(t => t.status === "approved").length;
  const totalPosted     = transactions.filter(t => t.status === "posted").length;
  const totalPendingAmt = transactions.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0);

  if (activeCategory) {
    return (
      <CategoryDetailView
        category={activeCategory}
        transactions={transactions.filter(t => t.categoryId === activeCategory.id)}
        onBack={() => setActiveCategory(null)}
        onApprove={approveTransaction}
        onReject={rejectTransaction}
        onPost={postToLedger}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-700" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Posting Engine</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-12">Process-based financial posting — select a category, review transactions, approve and post to ledger.</p>
        </div>
        <button onClick={() => setShowNewCatModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2.5 rounded-xl font-medium flex-shrink-0">
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-800">{categories.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Process Categories</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-700">{totalPending}</p>
          <p className="text-xs text-amber-600 mt-0.5">Pending Transactions</p>
          {totalPendingAmt > 0 && <p className="text-xs text-amber-500 mt-0.5">{fmt(totalPendingAmt)}</p>}
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-700">{totalApproved}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Ready to Post</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-700">{totalPosted}</p>
          <p className="text-xs text-purple-600 mt-0.5">Posted to Ledger</p>
        </div>
      </div>

      {/* Approved callout */}
      {totalApproved > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Send className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-800">
            <strong>{totalApproved} approved transaction{totalApproved > 1 ? "s" : ""}</strong> ready to be posted to the ledger. Open the relevant category to complete posting.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Search categories or processes…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", ...SOURCE_APPS] as const).map(a => (
            <button key={a} onClick={() => setAppFilter(a)}
              className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${appFilter === a ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              {a === "all" ? "All Apps" : a}
            </button>
          ))}
        </div>
        {(search || appFilter !== "all") && (
          <button onClick={() => { setSearch(""); setAppFilter("all"); }} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Category grid */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No process categories found.</p>
          <button onClick={() => setShowNewCatModal(true)} className="mt-3 text-xs text-emerald-600 hover:underline">Create a new category</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map(cat => (
            <CategoryCard key={cat.id} category={cat}
              transactions={transactions.filter(t => t.categoryId === cat.id)}
              onClick={() => setActiveCategory(cat)} />
          ))}
        </div>
      )}

      {showNewCatModal && (
        <NewCategoryModal onClose={() => setShowNewCatModal(false)}
          onSave={c => setCategories(prev => [...prev, c])}
          accounts={accounts.map(a => ({ code: a.code, name: a.name }))} />
      )}
    </div>
  );
}
