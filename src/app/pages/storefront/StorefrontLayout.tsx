import { Outlet } from "react-router";
import { AppHeader } from "../../components/AppHeader";
import { CollapsibleSidebar } from "../../components/CollapsibleSidebar";
import {
  LayoutDashboard,
  Store,
  FolderOpen,
  BarChart3,
  ListTodo,
  User,
  Package,
  Inbox,
  CheckSquare,
  Settings,
  TrendingDown,
} from "lucide-react";

const sidebarSections = [
  {
    label: "",
    items: [
      {
        label: "Dashboard",
        href: "/apps/storefront/dashboard",
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
        href: "/apps/storefront/tasks",
        icon: <ListTodo className="w-4 h-4" />,
        end: true,
      },
      {
        label: "My Tasks",
        href: "/apps/storefront/my-tasks",
        icon: <User className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        label: "All Materials",
        href: "/apps/storefront/all-materials",
        icon: <Package className="w-4 h-4" />,
        end: true,
      },
      {
        label: "General Store",
        href: "/apps/storefront/general-store",
        icon: <Store className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Project Stores",
        href: "/apps/storefront/project-stores",
        icon: <FolderOpen className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Distribution",
    items: [
      {
        label: "Incoming Requests",
        href: "/apps/storefront/incoming-requests",
        icon: <Inbox className="w-4 h-4" />,
        end: true,
      },
      {
        label: "Stock Movement",
        href: "/apps/storefront/stock-movement",
        icon: <TrendingDown className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Approvals",
    items: [
      {
        label: "Approvals",
        href: "/apps/storefront/approvals",
        icon: <CheckSquare className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "Reports",
        href: "/apps/storefront/reports",
        icon: <BarChart3 className="w-4 h-4" />,
        end: true,
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        label: "Configuration",
        href: "/apps/storefront/config",
        icon: <Settings className="w-4 h-4" />,
        end: true,
      },
    ],
  },
];

export function StorefrontLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <AppHeader currentApp="storefront" appColor="bg-teal-700" />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
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
