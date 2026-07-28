import { useState, useRef, useEffect } from "react";
import {
  Mail,
  Phone,
  Briefcase,
  Building2,
  User,
  Calendar,
  Shield,
  Upload,
  X,
  PenLine,
} from "lucide-react";
import { apiFetch } from "../../api/client";
import { toast } from "sonner";
import { updateMyProfile } from "../../api/profile";
import { createActivityRecord } from "../../api/activity-history";
import { useAuthUser } from "../../utils/useAuthUser";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";

interface ProfileField {
  label: string;
  value: string;
  icon?: React.ReactNode;
  editable?: boolean;
}

interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string | null;
    phone: string | null;
    signature?: string | null;
  };
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    phone: string | null;
    dateHired: string;
    employmentType: string;
    department: { id: string; name: string } | null;
  } | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

function formatEmploymentType(type: string): string {
  const map: Record<string, string> = {
    FullTime: "Full-time",
    Contract: "Contract",
    PartTime: "Part-time",
  };
  return map[type] ?? type;
}

function formatDate(iso: string): string {
  return formatDateByGeneralSettings(iso);
}

function formatJoinDate(iso: string): string {
  return formatDateByGeneralSettings(iso);
}

export function MyProfilePage() {
  const { id: authUserId, name: authName } = useAuthUser();
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // Signature state
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [savingSig, setSavingSig] = useState(false);
  const sigFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<MeResponse>("/auth/me")
      .then((data) => {
        setProfile(data);
        const ph = data.employee?.phone ?? data.user.phone ?? "";
        setPhone(ph);
        setDraft(ph);
        if (data.user.signature) setSigPreview(data.user.signature);
      })
      .catch(() => {
        try {
          const u = JSON.parse(localStorage.getItem("auth_user") || "{}");
          if (u?.id) {
            setProfile({ user: u, employee: null });
            setPhone(u.phone ?? "");
            setDraft(u.phone ?? "");
          }
        } catch {
          /* ignore */
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function logActivity(action: string, description: string) {
    void createActivityRecord({
      userId: authUserId || undefined,
      userName: authName || "ESS User",
      action,
      module: "ess",
      description,
    }).catch(() => {
      /* non-blocking */
    });
  }

  async function handleSave() {
    const next = draft.trim();
    setSavingPhone(true);
    try {
      await updateMyProfile({ phone: next });
      setPhone(next);
      setEditing(false);
      toast.success("Phone number updated.");
      logActivity("Updated profile", `Phone number changed to ${next || "—"}`);
    } catch {
      toast.error("Failed to update phone number. Please try again.");
    } finally {
      setSavingPhone(false);
    }
  }

  function handleSigUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Signature image must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (!dataUrl) {
        toast.error("Could not read the selected image.");
        return;
      }
      setSavingSig(true);
      try {
        await updateMyProfile({ signature: dataUrl });
        setSigPreview(dataUrl);
        toast.success("Signature saved.");
        logActivity("Updated signature", "Uploaded a new signature");
      } catch {
        toast.error("Failed to save signature. Please try again.");
      } finally {
        setSavingSig(false);
      }
    };
    reader.onerror = () => toast.error("Could not read the selected image.");
    reader.readAsDataURL(f);
  }

  async function clearSignature() {
    setSavingSig(true);
    try {
      await updateMyProfile({ signature: null });
      setSigPreview(null);
      if (sigFileRef.current) sigFileRef.current.value = "";
      toast.success("Signature cleared.");
      logActivity("Updated signature", "Removed signature");
    } catch {
      toast.error("Failed to clear signature. Please try again.");
    } finally {
      setSavingSig(false);
    }
  }

  const name = profile?.user.name ?? "—";
  const email = profile?.user.email ?? "—";
  const jobTitle = profile?.employee?.role ?? "—";
  const department =
    profile?.employee?.department?.name ?? profile?.user.department ?? "—";
  const initials = profile ? getInitials(profile.user.name) : "—";
  const hireDate = profile?.employee?.dateHired
    ? formatDate(profile.employee.dateHired)
    : "—";
  const joinDisplay = profile?.employee?.dateHired
    ? formatJoinDate(profile.employee.dateHired)
    : "—";
  const employmentType = profile?.employee?.employmentType
    ? formatEmploymentType(profile.employee.employmentType)
    : "—";
  const employeeId = profile?.employee
    ? `EMP-${profile.employee.id.slice(-4).toUpperCase()}`
    : "—";

  const bannerSubtitle =
    jobTitle !== "—" && department !== "—"
      ? `${jobTitle} · ${department} Department`
      : jobTitle !== "—"
        ? jobTitle
        : department !== "—"
          ? `${department} Department`
          : "—";

  const bannerMeta = [
    employeeId !== "—" ? employeeId : null,
    joinDisplay !== "—" ? `Joined ${joinDisplay}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const personalFields: ProfileField[] = [
    {
      label: "Full Name",
      value: name,
      icon: <User className="w-4 h-4 text-gray-400" />,
      editable: false,
    },
    {
      label: "Phone",
      value: phone,
      icon: <Phone className="w-4 h-4 text-gray-400" />,
      editable: true,
    },
    {
      label: "Email",
      value: email,
      icon: <Mail className="w-4 h-4 text-gray-400" />,
      editable: false,
    },
  ];

  const employmentFields: ProfileField[] = [
    {
      label: "Employee ID",
      value: employeeId,
      icon: <Shield className="w-4 h-4 text-gray-400" />,
    },
    {
      label: "Department",
      value: department,
      icon: <Building2 className="w-4 h-4 text-gray-400" />,
    },
    {
      label: "Role",
      value: jobTitle,
      icon: <Briefcase className="w-4 h-4 text-gray-400" />,
    },
    {
      label: "Hire Date",
      value: hireDate,
      icon: <Calendar className="w-4 h-4 text-gray-400" />,
    },
    {
      label: "Employment Type",
      value: employmentType,
      icon: <Briefcase className="w-4 h-4 text-gray-400" />,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Your personal and employment details
          </p>
        </div>
        <div className="text-sm text-gray-400 py-12 text-center">
          Loading profile…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your personal and employment details
        </p>
      </div>

      {/* Avatar + Name banner */}
      <div className="bg-linear-to-r from-teal-600 to-teal-700 rounded-xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
          {initials}
        </div>
        <div>
          <p className="text-white text-xl font-semibold">{name}</p>
          <p className="text-teal-100 text-sm">{bannerSubtitle}</p>
          {bannerMeta && (
            <p className="text-teal-200 text-xs mt-0.5">{bannerMeta}</p>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Personal Information
          </h2>
          {!editing && (
            <button
              onClick={() => {
                setDraft(phone);
                setEditing(true);
              }}
              className="text-xs font-medium text-teal-600 hover:text-teal-800 border border-teal-200 px-3 py-1 rounded-md"
            >
              Edit Phone
            </button>
          )}
        </div>
        <div className="divide-y divide-gray-50">
          {personalFields.map((f) => (
            <div key={f.label} className="flex items-center gap-4 px-5 py-4">
              <div className="w-5 flex-shrink-0">{f.icon}</div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                {f.label === "Phone" && editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="border border-teal-400 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-48"
                    />
                    <button
                      onClick={handleSave}
                      disabled={savingPhone}
                      className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-md hover:bg-teal-700 disabled:opacity-60"
                    >
                      {savingPhone ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-900">
                    {f.label === "Phone" ? phone || "—" : f.value}
                  </p>
                )}
              </div>
              {!f.editable && (
                <span className="text-xs text-gray-300 italic">read-only</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Employment Details */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Employment Details
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {employmentFields.map((f) => (
            <div key={f.label} className="flex items-center gap-4 px-5 py-4">
              <div className="w-5 flex-shrink-0">{f.icon}</div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                <p className="text-sm font-medium text-gray-600">{f.value}</p>
              </div>
              <span className="text-xs text-gray-300 italic">read-only</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl">
          <p className="text-xs text-gray-400">
            To update employment details, contact HR at{" "}
            <span className="text-teal-600 font-medium">hr@buildos.ng</span>
          </p>
        </div>
      </div>

      {/* Signature Section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-semibold text-gray-700">
              My Signature
            </h2>
          </div>
          {sigPreview && (
            <button
              onClick={clearSignature}
              disabled={savingSig}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded-md disabled:opacity-60"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Your signature is used for document sign-offs and approvals within
            the platform. Only you can update it — this field is not editable by
            HR or Admin.
          </p>

          {/* Signature preview area */}
          <div
            className="border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center"
            style={{ minHeight: 100 }}
          >
            {sigPreview ? (
              <img
                src={sigPreview}
                alt="My signature"
                className="max-h-24 max-w-xs object-contain"
              />
            ) : (
              <div className="text-center py-6">
                <PenLine className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No signature on file</p>
              </div>
            )}
          </div>

          {/* Upload button */}
          <input
            ref={sigFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSigUpload}
          />
          <button
            onClick={() => sigFileRef.current?.click()}
            disabled={savingSig}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm px-4 py-2 rounded-md transition-colors disabled:opacity-60"
          >
            <Upload className="w-4 h-4" />
            {savingSig
              ? "Saving…"
              : sigPreview
                ? "Replace Signature"
                : "Upload Signature"}
          </button>
          <p className="text-xs text-gray-400">
            Accepted formats: PNG, JPG, SVG. Use a transparent or white
            background for best results.
          </p>
        </div>
      </div>
    </div>
  );
}
