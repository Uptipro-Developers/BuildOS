import { Outlet } from "react-router";
import { AppHeader } from "../../components/AppHeader";
import { CollapsibleSidebar } from "../../components/CollapsibleSidebar";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  FolderKanban,
  ListTodo,
  User,
  History,
  CheckSquare,
  ScrollText,
  Star,
  AlertTriangle,
} from "lucide-react";

const sidebarSections = [
  {
    label: "",
    items: [
      {
        label: "Dashboard",
        href: "/apps/ess/dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "My Work",
    items: [
      {
        label: "My Projects",
        href: "/apps/ess/projects",
        icon: <FolderKanban className="w-4 h-4" />,
        end: true,
      },
      {
        label: "My Tasks",
        href: "/apps/ess/tasks",
        icon: <ListTodo className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Requests",
    items: [
      {
        label: "My Requests",
        href: "/apps/ess/requests",
        icon: <FileText className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Create Request",
        href: "/apps/ess/submit",
        icon: <PlusCircle className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Approvals",
        href: "/apps/ess/approvals",
        icon: <CheckSquare className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Payroll",
    items: [
      {
        label: "Payslip History",
        href: "/apps/ess/payslips",
        icon: <ScrollText className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Performance",
    items: [
      {
        label: "Appraisals",
        href: "/apps/ess/appraisals",
        icon: <Star className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Log Issues",
        href: "/apps/ess/log-issues",
        icon: <AlertTriangle className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "My Profile",
        href: "/apps/ess/profile",
        icon: <User className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Activity History",
        href: "/apps/ess/activity",
        icon: <History className="w-4 h-4" />,
        end: true,
      },
    ],
  },
];

export function ESSLayout() {
  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      <AppHeader currentApp="ess" appColor="bg-teal-600" />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
          <CollapsibleSidebar
            sections={sidebarSections}
            activeClass="bg-teal-50 text-teal-700 font-medium [&_svg]:text-teal-600"
            baseClass="text-gray-600 hover:bg-gray-50 hover:text-gray-900 [&_svg]:text-gray-400"
          />
        </aside>
        <main className="flex-1 overflow-y-auto p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
