import { useNavigate, NavLink } from "react-router";
import {
  Building2,
  DollarSign,
  Package,
  Users,
  UserCircle,
  Bell,
  ChevronDown,
  LayoutGrid,
  ShieldCheck,
  Settings,
  LogOut,
  User,
  Store,
} from "lucide-react";
import { useState } from "react";
import { useAuthUser } from "../utils/useAuthUser";
import { ConfirmationModal } from "./ConfirmationModal";
import {
  clearAuthSession,
  logoutServerSideIfPossible,
} from "../utils/authSession";

interface AppHeaderProps {
  currentApp: string;
  /** @deprecated color is now derived from app id */
  appColor?: string;
}

const apps = [
  {
    id: "launcher",
    name: "App Launcher",
    icon: LayoutGrid,
    href: "/apps",
    color: "text-slate-400",
  },
  {
    id: "construction",
    name: "Projects",
    icon: Building2,
    href: "/apps/construction",
    color: "text-orange-400",
  },
  {
    id: "finance",
    name: "Finance",
    icon: DollarSign,
    href: "/apps/finance",
    color: "text-emerald-400",
  },
  {
    id: "procurement",
    name: "Procurement",
    icon: Package,
    href: "/apps/procurement",
    color: "text-blue-400",
  },
  {
    id: "hr",
    name: "HR",
    icon: Users,
    href: "/apps/hr",
    color: "text-purple-400",
  },
  {
    id: "ess",
    name: "ESS",
    icon: UserCircle,
    href: "/apps/ess",
    color: "text-pink-400",
  },
  {
    id: "admin",
    name: "Admin",
    icon: ShieldCheck,
    href: "/apps/admin",
    color: "text-indigo-400",
  },
  {
    id: "storefront",
    name: "Storefront",
    icon: Store,
    href: "/apps/storefront",
    color: "text-teal-400",
  },
];

export function AppHeader({ currentApp }: AppHeaderProps) {
  const navigate = useNavigate();
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const {
    name: authName,
    email: authEmail,
    role: authRole,
    initials: authInitials,
    assignedApps,
  } = useAuthUser();

  const allowedApps = new Set(
    (assignedApps.length > 0 ? assignedApps : ["ess"]).map((app) =>
      String(app).trim().toLowerCase(),
    ),
  );
  const switcherApps = apps.filter(
    (a) => a.id !== "launcher" && allowedApps.has(a.id.toLowerCase()),
  );

  const currentAppInfo = apps.find((a) => a.id === currentApp);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutServerSideIfPossible();
    } finally {
      clearAuthSession();
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      navigate("/auth/login", { replace: true });
    }
  };

  return (
    <>
    <header className="bg-slate-900 border-b border-slate-800 h-14 flex items-center">
      <div className="px-4 flex items-center justify-between w-full gap-4">
        {/* Left: Logo + App Switcher */}
        <div className="flex items-center gap-1 shrink-0">
          {/* BuildOS Logo */}
          <NavLink
            to="/apps"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors mr-3"
          >
            <div className="flex items-center">
              <span className="text-white font-bold text-lg tracking-tight">
                Build
              </span>
              <span className="text-indigo-400 font-bold text-lg tracking-tight">
                OS
              </span>
            </div>
          </NavLink>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-700 mr-3" />

          {/* App Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowAppSwitcher(!showAppSwitcher)}
              className="flex items-center gap-2 hover:bg-slate-800 rounded-md px-2.5 py-1.5 transition-colors"
            >
              {currentAppInfo && (
                <currentAppInfo.icon
                  className={`w-4 h-4 ${currentAppInfo.color}`}
                />
              )}
              <span className="text-sm text-slate-200 font-medium">
                {currentAppInfo?.name ?? "Apps"}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showAppSwitcher ? "rotate-180" : ""}`}
              />
            </button>

            {showAppSwitcher && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAppSwitcher(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 overflow-hidden">
                  <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Switch App
                  </p>
                  {switcherApps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => {
                        navigate(app.href);
                        setShowAppSwitcher(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left transition-colors ${currentApp === app.id ? "bg-indigo-50" : ""}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100`}
                      >
                        <app.icon
                          className={`w-4 h-4 ${app.color.replace("text-", "text-").replace("-400", "-600")}`}
                        />
                      </div>
                      <span
                        className={`text-sm font-medium ${currentApp === app.id ? "text-indigo-700" : "text-gray-800"}`}
                      >
                        {app.name}
                      </span>
                      {currentApp === app.id && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1" />

        {/* Right: Notifications + Profile */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <Bell
              className="w-4.5 h-4.5 text-slate-300"
              style={{ width: "18px", height: "18px" }}
            />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-slate-900"></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative ml-1">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 hover:bg-slate-800 rounded-lg px-2 py-1.5 transition-colors"
            >
              <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-semibold">
                  {authInitials || "?"}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-slate-200 leading-tight">
                  {authName || "User"}
                </p>
                <p className="text-xs text-slate-500 leading-tight capitalize">
                  {authRole || "—"}
                </p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform hidden md:block ${showProfile ? "rotate-180" : ""}`}
              />
            </button>

            {showProfile && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfile(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {authName || "User"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {authEmail || "—"}
                    </p>
                    {authRole && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium capitalize">
                        <ShieldCheck className="w-3 h-3" />
                        {authRole}
                      </span>
                    )}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate("/apps/ess/profile");
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        navigate("/apps/admin/general-settings");
                        setShowProfile(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      System Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>

    <ConfirmationModal
      isOpen={showLogoutConfirm}
      title="Log out?"
      description="You will be signed out of BuildOS and returned to the login screen."
      confirmLabel="Log Out"
      cancelLabel="Cancel"
      isDangerous
      isLoading={isLoggingOut}
      onConfirm={() => {
        void handleLogout();
      }}
      onCancel={() => setShowLogoutConfirm(false)}
    />
    </>
  );
}
