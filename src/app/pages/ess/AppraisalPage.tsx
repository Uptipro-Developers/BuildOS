import { useState } from "react";
import { Star, MessageSquare, ChevronDown, ChevronUp, Plus } from "lucide-react";

type AppraisalStatus = "Pending" | "In Review" | "Completed";

interface Appraisal {
  id: string;
  cycle: string;
  manager: string;
  status: AppraisalStatus;
  selfScore: number | null;
  managerScore: number | null;
  feedback: string;
  objectives: { label: string; achieved: boolean }[];
}

const STATUS_STYLES: Record<AppraisalStatus, string> = {
  Pending:    "bg-yellow-50 text-yellow-700",
  "In Review":"bg-blue-50 text-blue-700",
  Completed:  "bg-green-50 text-green-700",
};

const MOCK_APPRAISALS: Appraisal[] = [
  {
    id: "APR-0005",
    cycle: "H1 2025 (Jan – Jun)",
    manager: "Michael Chen",
    status: "In Review",
    selfScore: 4,
    managerScore: null,
    feedback: "",
    objectives: [
      { label: "Complete structural design for Block C", achieved: true },
      { label: "Reduce site rework rate by 10%",        achieved: true },
      { label: "Complete PMP certification",             achieved: false },
    ],
  },
  {
    id: "APR-0004",
    cycle: "H2 2024 (Jul – Dec)",
    manager: "Michael Chen",
    status: "Completed",
    selfScore: 4,
    managerScore: 4,
    feedback: "James demonstrated strong technical skills and improved site coordination. Needs to focus on certification goals in the next cycle.",
    objectives: [
      { label: "Lead foundation work for Phase 2", achieved: true },
      { label: "Mentor two junior engineers",      achieved: true },
      { label: "Complete AutoCAD advanced course", achieved: true },
    ],
  },
  {
    id: "APR-0003",
    cycle: "H1 2024 (Jan – Jun)",
    manager: "Michael Chen",
    status: "Completed",
    selfScore: 3,
    managerScore: 3,
    feedback: "Solid performance. Some delays in reporting that need improvement.",
    objectives: [
      { label: "Improve daily report submission time", achieved: false },
      { label: "Achieve zero safety incidents on site",achieved: true },
    ],
  },
];

function StarRating({ value, onChange }: { value: number | null; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-5 h-5 ${n <= (value ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} ${onChange ? "cursor-pointer" : ""}`}
          onClick={() => onChange?.(n)}
        />
      ))}
    </div>
  );
}

export function AppraisalPage() {
  const [appraisals, setAppraisals] = useState<Appraisal[]>(MOCK_APPRAISALS);
  const [expanded, setExpanded] = useState<string | null>("APR-0005");
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  function saveSelfScore(id: string, score: number) {
    setAppraisals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selfScore: score } : a))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Appraisals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Performance reviews across appraisal cycles</p>
        </div>
      </div>

      {/* Latest cycle banner */}
      {appraisals[0] && (
        <div className="bg-teal-600 text-white rounded-xl p-5 flex justify-between items-center">
          <div>
            <p className="text-teal-100 text-sm">Current Appraisal Cycle</p>
            <p className="text-lg font-semibold mt-0.5">{appraisals[0].cycle}</p>
            <p className="text-teal-200 text-xs mt-1">Manager: {appraisals[0].manager}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[appraisals[0].status]}`}>
            {appraisals[0].status}
          </span>
        </div>
      )}

      {/* Appraisal list */}
      <div className="space-y-3">
        {appraisals.map((a) => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header row */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 text-left"
              onClick={() => toggleExpand(a.id)}
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{a.cycle}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.id} · {a.manager}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[a.status]}`}>
                  {a.status}
                </span>
                {expanded === a.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {/* Expanded */}
            {expanded === a.id && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-5">
                {/* Scores */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Your Self-Assessment</p>
                    <StarRating
                      value={a.selfScore}
                      onChange={a.status !== "Completed" ? (v) => saveSelfScore(a.id, v) : undefined}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {a.selfScore ? `${a.selfScore}/5` : "Not submitted"}
                      {a.status !== "Completed" && " · Click to rate"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Manager Score</p>
                    <StarRating value={a.managerScore} />
                    <p className="text-xs text-gray-400 mt-1">
                      {a.managerScore ? `${a.managerScore}/5` : "Pending manager review"}
                    </p>
                  </div>
                </div>

                {/* Objectives */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Objectives</p>
                  <ul className="space-y-1.5">
                    {a.objectives.map((obj, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${obj.achieved ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                          {obj.achieved ? "✓" : "–"}
                        </span>
                        <span className={obj.achieved ? "text-gray-800" : "text-gray-400"}>{obj.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Manager feedback */}
                {a.feedback && (
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Manager Feedback
                    </p>
                    <p className="text-sm text-gray-700">{a.feedback}</p>
                  </div>
                )}

                {/* Add self-feedback for in-review */}
                {a.status === "In Review" && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Self-Feedback</p>
                    {editing === a.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                          rows={3}
                          placeholder="Add comments about your performance this cycle…"
                          value={feedbackDraft}
                          onChange={(e) => setFeedbackDraft(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditing(null)}
                            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditing(a.id)}
                        className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add self-feedback
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
