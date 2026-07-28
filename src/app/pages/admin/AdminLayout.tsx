import { Outlet, NavLink } from "react-router";
import { AppHeader } from "../../components/AppHeader";
import { type ReactNode } from "react";
import {
  Building2,
  Users,
  Settings,
  FolderCog,
  Bell,
  FileText,
  Shield,
  FileBarChart,
  Plug,
  LayoutDashboard,
  ChevronDown,
  CheckSquare,
  BarChart3,
} from "lucide-react";
import { useState } from "react";

interface NavSection {
  label: string;
  items: {
    label: string;
    href: string;
    icon: ReactNode;
  }[];
}

export function AdminLayout() {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );

  const toggleSection = (label: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const sidebarItems: NavSection[] = [
    {
      label: "",
      items: [
        {
          label: "Dashboard",
          href: "/apps/admin/dashboard",
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },
    {
      label: "Organization",
      items: [
        {
          label: "Company Profile",
          href: "/apps/admin/company-profile",
          icon: <Building2 className="w-4 h-4" />,
        },
        {
          label: "Board of Directors",
          href: "/apps/admin/board-of-directors",
          icon: <Users className="w-4 h-4" />,
        },
      ],
    },
    {
      label: "User Management",
      items: [
        {
          label: "Users",
          href: "/apps/admin/users",
          icon: <Users className="w-4 h-4" />,
        },
        {
          label: "Roles & Permissions",
          href: "/apps/admin/roles",
          icon: <Shield className="w-4 h-4" />,
        },
        {
          label: "User Permissions",
          href: "/apps/admin/user-permissions",
          icon: <Shield className="w-4 h-4" />,
        },
      ],
    },
    {
      label: "System Configuration",
      items: [
        {
          label: "General Settings",
          href: "/apps/admin/general-settings",
          icon: <Settings className="w-4 h-4" />,
        },
        {
          label: "Process Configuration",
          href: "/apps/admin/project-config",
          icon: <FolderCog className="w-4 h-4" />,
        },
        {
          label: "Email Configuration",
          href: "/apps/admin/email-config",
          icon: <Bell className="w-4 h-4" />,
        },
      ],
    },
    {
      label: "Reports",
      items: [
        {
          label: "Report Builder",
          href: "/apps/admin/report-builder",
          icon: <FileBarChart className="w-4 h-4" />,
        },
        {
          label: "Report Automation",
          href: "/apps/admin/report-automation",
          icon: <BarChart3 className="w-4 h-4" />,
        },
      ],
    },
    {
      label: "System",
      items: [
        {
          label: "Notifications",
          href: "/apps/admin/notifications",
          icon: <Bell className="w-4 h-4" />,
        },
        {
          label: "Audit & Logs",
          href: "/apps/admin/audit-logs",
          icon: <FileText className="w-4 h-4" />,
        },
        {
          label: "Integrations",
          href: "/apps/admin/integrations",
          icon: <Plug className="w-4 h-4" />,
        },
        // Hidden for now — route stays live at /apps/admin/changelog
        // {
        //   label: "Changelog",
        //   href: "/apps/admin/changelog",
        //   icon: <History className="w-4 h-4" />,
        // },
      ],
    },
    {
      label: "Approvals",
      items: [
        {
          label: "Approvals",
          href: "/apps/admin/approvals",
          icon: <CheckSquare className="w-4 h-4" />,
        },
      ],
    },
  ];

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <AppHeader currentApp="admin" />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — sticky, independent scroll */}
        <aside className="w-60 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
          <nav className="flex-1 py-3">
            {sidebarItems.map((section, idx) => {
              const isCollapsed = collapsedSections.has(section.label);
              return (
                <div key={idx} className="mb-1">
                  {section.label && (
                    <button
                      onClick={() => toggleSection(section.label)}
                      className="w-full flex items-center justify-between px-4 py-1.5 group"
                    >
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">
                        {section.label}
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-gray-300 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                      />
                    </button>
                  )}
                  {!isCollapsed && (
                    <div className="space-y-0.5 px-2">
                      {section.items.map((item) => (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive
                                ? "bg-indigo-50 text-indigo-700 font-medium"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={
                                  isActive ? "text-indigo-600" : "text-gray-400"
                                }
                              >
                                {item.icon}
                              </span>
                              {item.label}
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
