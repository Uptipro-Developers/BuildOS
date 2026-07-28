import { useParams } from "react-router";
import { useState, useMemo, useEffect } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Mail,
  Phone,
  Users,
  FileText,
  CalendarCheck,
  Clock,
} from "lucide-react";
import {
  communicationLog as mockComms,
  getProjectById,
  projects,
  fmtDate,
} from "./mockData";
import type { CommunicationLogEntry } from "./types";
import {
  listCommunications,
  createCommunication,
} from "../../api/communications";
import { getAuthUserName } from "../../utils/useAuthUser";
import { useNumbering } from "../../stores/numberingStore";

const channelStyles: Record<string, { bg: string; icon: React.ReactNode }> = {
  email: {
    bg: "bg-blue-100 text-blue-600",
    icon: <Mail className="w-3.5 h-3.5" />,
  },
  phone: {
    bg: "bg-green-100 text-green-600",
    icon: <Phone className="w-3.5 h-3.5" />,
  },
  meeting: {
    bg: "bg-purple-100 text-purple-600",
    icon: <Users className="w-3.5 h-3.5" />,
  },
  letter: {
    bg: "bg-amber-100 text-amber-600",
    icon: <FileText className="w-3.5 h-3.5" />,
  },
};

const statusStyles: Record<string, { bg: string; label: string }> = {
  sent: { bg: "bg-green-100 text-green-700", label: "Sent" },
  "action-required": {
    bg: "bg-red-100 text-red-700",
    label: "Action Required",
  },
  received: { bg: "bg-blue-100 text-blue-700", label: "Received" },
  archived: { bg: "bg-gray-100 text-gray-500", label: "Archived" },
};

const emptyForm: Omit<CommunicationLogEntry, "id" | "createdAt" | "createdBy"> =
  {
    projectId: "",
    date: new Date().toISOString().slice(0, 10),
    from: "",
    to: "",
    channel: "email",
    subject: "",
    summary: "",
    status: "sent",
  };

export function CommunicationLogPage() {
  const { getNextId } = useNumbering();
  const { id: projectId } = useParams<{ id: string }>();
  const project = projectId ? getProjectById(projectId) : null;
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [allComms, setAllComms] = useState(mockComms);
  useEffect(() => {
    let active = true;
    listCommunications(projectId)
      .then((data) => {
        if (active && data.length > 0) setAllComms(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const list = useMemo(() => {
    let base = projectId
      ? allComms.filter((c) => c.projectId === projectId)
      : allComms;
    if (search) {
      const q = search.toLowerCase();
      base = base.filter(
        (c) =>
          c.subject.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.from.toLowerCase().includes(q) ||
          c.to.toLowerCase().includes(q),
      );
    }
    if (channelFilter !== "All")
      base = base.filter((c) => c.channel === channelFilter);
    return base.sort((a, b) => b.date.localeCompare(a.date));
  }, [allComms, projectId, search, channelFilter]);

  function handleAdd() {
    if (!form.projectId || !form.subject) return;
    const newEntry: CommunicationLogEntry = {
      id: getNextId("Communication"),
      createdAt: new Date().toISOString(),
      createdBy: getAuthUserName() || "Current User",
      ...form,
    };
    const { id: _omit, ...payload } = newEntry;
    createCommunication(payload)
      .then((saved) => setAllComms((prev) => [...prev, saved]))
      .catch(() => setAllComms((prev) => [...prev, newEntry]));
    setShowForm(false);
    setForm(emptyForm);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#E8973A", color: "white" }}
          >
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Communication Log
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {project ? project.name : "All projects"} — Track emails, calls,
              meetings & letters
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setForm({ ...emptyForm, projectId: projectId || projects[0].id });
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: "#E8973A" }}
        >
          <Plus className="w-4 h-4" /> Log Communication
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search communications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
            style={{ borderColor: "#E2E8F0" }}
          />
        </div>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: "#E2E8F0" }}
        >
          <option value="All">All Channels</option>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="meeting">Meeting</option>
          <option value="letter">Letter</option>
        </select>
      </div>

      <div className="space-y-3">
        {list.map((c) => {
          const ch = channelStyles[c.channel] || channelStyles.email;
          const st = statusStyles[c.status] || statusStyles.sent;
          const proj = projects.find((p) => p.id === c.projectId);
          return (
            <div
              key={c.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ch.bg}`}
                    >
                      {ch.icon} {c.channel}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.bg}`}
                    >
                      {st.label}
                    </span>
                    {!projectId && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {proj?.name || c.projectId}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {c.subject}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {c.summary}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>
                      From: <strong className="text-gray-600">{c.from}</strong>
                    </span>
                    <span>
                      To: <strong className="text-gray-600">{c.to}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarCheck className="w-3 h-3" /> {fmtDate(c.date)}
                    </span>
                    {c.followUpDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Follow-up:{" "}
                        {fmtDate(c.followUpDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No communications logged</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl w-full max-w-lg bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                Log Communication
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              {!projectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={form.projectId}
                    onChange={(e) =>
                      setForm({ ...form, projectId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0" }}
                  >
                    <option value="">Select project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From
                  </label>
                  <input
                    type="text"
                    value={form.from}
                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                    placeholder="Sender name"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To
                  </label>
                  <input
                    type="text"
                    value={form.to}
                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                    placeholder="Recipient name"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0" }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel
                  </label>
                  <select
                    value={form.channel}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        channel: e.target
                          .value as CommunicationLogEntry["channel"],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0" }}
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="meeting">Meeting</option>
                    <option value="letter">Letter</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  placeholder="Subject line..."
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#E2E8F0" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary
                </label>
                <textarea
                  rows={3}
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                  placeholder="Brief summary of the communication..."
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: "#E2E8F0" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as CommunicationLogEntry["status"],
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  <option value="sent">Sent</option>
                  <option value="received">Received</option>
                  <option value="action-required">Action Required</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date (optional)
                </label>
                <input
                  type="date"
                  value={form.followUpDate || ""}
                  onChange={(e) =>
                    setForm({ ...form, followUpDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#E2E8F0" }}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border text-sm text-gray-600"
                style={{ borderColor: "#E2E8F0" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 rounded-lg text-sm text-white font-medium"
                style={{ backgroundColor: "#E8973A" }}
              >
                Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
