import { Outlet } from "react-router";
import { AppHeader } from "../../components/AppHeader";
import { CollapsibleSidebar } from "../../components/CollapsibleSidebar";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  BookOpen,
  DollarSign,
  Sliders,
  PlayCircle,
  Network,
  BarChart3,
  CalendarDays,
  CalendarCheck,
  Settings2,
  Landmark,
  Calendar,
  CheckSquare,
  CreditCard,
  ListTodo,
  User,
  Layers,
} from "lucide-react";

const sidebarSections = [
  {
    label: "",
    items: [
      {
        label: "Dashboard",
        href: "/apps/hr/dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Tasks",
    items: [
      {
        label: "Tasks",
        href: "/apps/hr/hr-tasks",
        icon: <ListTodo className="w-4 h-4" />,
        end: true,
      },
      {
        label: "My Tasks",
        href: "/apps/hr/my-tasks",
        icon: <User className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Employee Management",
    items: [
      {
        label: "All Employees",
        href: "/apps/hr/employees",
        icon: <Users className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Departments",
        href: "/apps/hr/departments",
        icon: <Building2 className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Organization",
    items: [
      {
        label: "Organization Structure",
        href: "/apps/hr/org-structure",
        icon: <Layers className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Leave & Attendance",
    items: [
      {
        label: "Leave Requests",
        href: "/apps/hr/leave-requests",
        icon: <CalendarCheck className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Leave Balances",
        href: "/apps/hr/leave-balances",
        icon: <CalendarDays className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Daily Attendance",
        href: "/apps/hr/attendance",
        icon: <Clock className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Attendance Logs",
        href: "/apps/hr/attendance-logs",
        icon: <BookOpen className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Payroll",
    items: [
      {
        label: "Payroll Overview",
        href: "/apps/hr/payroll",
        icon: <DollarSign className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Payroll Processing",
        href: "/apps/hr/payroll-processing",
        icon: <PlayCircle className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Workforce",
    items: [
      {
        label: "Workforce Allocation",
        href: "/apps/hr/workforce",
        icon: <Network className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "General Setup",
    items: [
      {
        label: "General Setup",
        href: "/apps/hr/hr-general-setup",
        icon: <Settings2 className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Base Calendar",
        href: "/apps/hr/base-calendar",
        icon: <CalendarCheck className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Payroll Setup",
    items: [
      {
        label: "Payroll Period",
        href: "/apps/hr/payroll-periods",
        icon: <Calendar className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Bank Names",
        href: "/apps/hr/bank-names",
        icon: <Landmark className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Salary Structure",
        href: "/apps/hr/salary-structure",
        icon: <Sliders className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Leave Setup",
    items: [
      {
        label: "Leave Type Setup",
        href: "/apps/hr/leave-type-setup",
        icon: <CalendarDays className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Claims Setup",
    items: [
      {
        label: "Claim Type Setup",
        href: "/apps/hr/claim-type-setup",
        icon: <CreditCard className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Approvals",
    items: [
      {
        label: "Approvals",
        href: "/apps/hr/approvals",
        icon: <CheckSquare className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "HR Reports",
        href: "/apps/hr/reports",
        icon: <BarChart3 className="w-4 h-4" />,
        end: true,
      },
    ],
  },
];

export function HRLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <AppHeader currentApp="hr" appColor="bg-indigo-700" />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
          <CollapsibleSidebar
            sections={sidebarSections}
            activeClass="bg-indigo-50 text-indigo-700 font-medium [&_svg]:text-indigo-600"
            baseClass="text-gray-600 hover:bg-gray-50 [&_svg]:text-gray-400"
          />
        </aside>
        <main className="flex-1 overflow-y-auto p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
