import { Outlet } from "react-router";
import { AppHeader } from "../../components/AppHeader";
import { CollapsibleSidebar } from "../../components/CollapsibleSidebar";
import type { SidebarSection } from "../../components/CollapsibleSidebar";
import {
  LayoutDashboard, FolderKanban, Users, BarChart3, Settings,
  Calendar, FileText, Truck, AlertTriangle, GitCompare,
  Clock, CheckSquare, ShieldCheck, Briefcase,
  MessageSquare, Wallet, ClipboardList, ListTodo,
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
        { label: "All Projects", href: "/apps/construction/projects", icon: <FolderKanban className="w-4 h-4" />, end: true },
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
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <AppHeader currentApp="construction" appColor="bg-amber-600" />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
          <CollapsibleSidebar
            sections={baseSections}
            activeClass="bg-amber-50 text-amber-700 font-medium [&_svg]:text-amber-600"
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
