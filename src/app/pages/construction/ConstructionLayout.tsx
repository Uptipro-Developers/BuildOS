import { Outlet, useLocation } from "react-router";
import { AppHeader } from "../../components/AppHeader";
import { CollapsibleSidebar } from "../../components/CollapsibleSidebar";
import type { SidebarSection } from "../../components/CollapsibleSidebar";
import {
  LayoutDashboard, FolderKanban, Users, BarChart3, Settings,
  Calendar, FileText, Truck, AlertTriangle, GitCompare,
  Clock, CheckSquare, ShieldCheck, FileSpreadsheet, Briefcase,
  DollarSign, MessageSquare, Wallet, ClipboardList, ListTodo,
} from "lucide-react";

export function ConstructionLayout() {

  const baseSections: SidebarSection[] = [
    {
      label: "",
      items: [
        { label: "Dashboard", href: "/apps/construction/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, end: true },
      ],
    },
    {
      label: "Projects",
      items: [
        { label: "All Projects", href: "/apps/construction", icon: <FolderKanban className="w-4 h-4" />, end: true },
      ],
    },
    {
      label: "Tasks",
      items: [
        { label: "Task Board", href: "/apps/construction/tasks", icon: <ClipboardList className="w-4 h-4" />, end: true },
        { label: "My Tasks", href: "/apps/construction/my-tasks", icon: <ListTodo className="w-4 h-4" />, end: true },
      ],
    },
    {
      label: "Management",
      items: [
        { label: "Schedule", href: "/apps/construction/schedule", icon: <Calendar className="w-4 h-4" />, end: true },
        { label: "Daily Reports", href: "/apps/construction/daily-reports", icon: <FileText className="w-4 h-4" />, end: true },
        { label: "Resources", href: "/apps/construction/resources", icon: <Truck className="w-4 h-4" />, end: true },
        { label: "Issues", href: "/apps/construction/issues", icon: <AlertTriangle className="w-4 h-4" />, end: true },
        { label: "Change Requests", href: "/apps/construction/change-requests", icon: <GitCompare className="w-4 h-4" />, end: true },
        { label: "Delays", href: "/apps/construction/delays", icon: <Clock className="w-4 h-4" />, end: true },
        { label: "Quality", href: "/apps/construction/quality", icon: <CheckSquare className="w-4 h-4" />, end: true },
        { label: "HSE", href: "/apps/construction/hse", icon: <ShieldCheck className="w-4 h-4" />, end: true },
        { label: "Documents", href: "/apps/construction/documents", icon: <FolderKanban className="w-4 h-4" />, end: true },
        { label: "Finance", href: "/apps/construction/finance", icon: <Wallet className="w-4 h-4" />, end: true },
        { label: "Communications", href: "/apps/construction/communications", icon: <MessageSquare className="w-4 h-4" />, end: true },
        { label: "Stakeholders", href: "/apps/construction/stakeholders", icon: <Briefcase className="w-4 h-4" />, end: true },
      ],
    },
    {
      label: "Resources",
      items: [
        { label: "Resource Hub", href: "/apps/construction/resource-hub", icon: <Users className="w-4 h-4" />, end: true },
      ],
    },
    {
      label: "Reports",
      items: [
        { label: "Reports", href: "/apps/construction/reports", icon: <BarChart3 className="w-4 h-4" />, end: true },
      ],
    },
    {
      label: "Settings",
      items: [
        { label: "Settings", href: "/apps/construction/settings", icon: <Settings className="w-4 h-4" />, end: true },
      ],
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "#F7F8FA" }}>
      <AppHeader currentApp="construction" appColor="bg-amber-600" />
      <div className="flex flex-1 overflow-hidden">
        <aside
          className="w-56 flex-shrink-0 overflow-y-auto flex flex-col"
          style={{ backgroundColor: "#1C2333" }}
        >
          <CollapsibleSidebar
            sections={baseSections}
            activeClass="bg-amber-500/10 text-amber-400 font-medium [&_svg]:text-amber-400"
            baseClass="text-slate-400 hover:bg-slate-800 hover:text-slate-200 [&_svg]:text-slate-500"
          />
        </aside>
        <main className="flex-1 overflow-y-auto min-w-0" style={{ backgroundColor: "#F7F8FA" }}>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
