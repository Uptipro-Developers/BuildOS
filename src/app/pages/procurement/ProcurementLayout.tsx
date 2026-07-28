import { Outlet } from "react-router";
import { AppHeader } from "../../components/AppHeader";
import { CollapsibleSidebar } from "../../components/CollapsibleSidebar";
import {
  FileText,
  ShoppingCart,
  Building,
  LayoutDashboard,
  ArrowUpDown,
  BarChart3,
  Truck,
  PackageCheck,
  CheckSquare,
  ListTodo,
  User,
  Send,
  Inbox,
  ShieldCheck,
  Settings,
} from "lucide-react";

const sidebarSections = [
  {
    label: "",
    items: [
      {
        label: "Dashboard",
        href: "/apps/procurement/dashboard",
        end: true,
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
    ],
  },
  {
    label: "Tasks",
    items: [
      {
        label: "Tasks",
        href: "/apps/procurement/tasks",
        end: true,
        icon: <ListTodo className="w-4 h-4" />,
      },
      {
        label: "My Tasks",
        href: "/apps/procurement/my-tasks",
        end: true,
        icon: <User className="w-4 h-4" />,
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        label: "Stock Movement",
        href: "/apps/procurement/stock-movement",
        end: true,
        icon: <ArrowUpDown className="w-4 h-4" />,
      },
    ],
  },
  {
    label: "Requests",
    items: [
      {
        label: "Material Requests",
        href: "/apps/procurement/material-requests",
        end: true,
        icon: <FileText className="w-4 h-4" />,
      },
      {
        label: "Purchase Requests",
        href: "/apps/procurement/purchase-requests",
        end: true,
        icon: <ShoppingCart className="w-4 h-4" />,
      },
      {
        label: "Sent Requests",
        href: "/apps/procurement/sent-requests",
        end: true,
        icon: <Send className="w-4 h-4" />,
      },
    ],
  },
  {
    label: "Vendor Communication",
    items: [
      {
        label: "Received Quotes & Invoices",
        href: "/apps/procurement/received-quotes",
        end: true,
        icon: <Inbox className="w-4 h-4" />,
      },
    ],
  },
  {
    label: "Purchasing",
    items: [
      {
        label: "Purchase Orders",
        href: "/apps/procurement/purchase-orders",
        end: true,
        icon: <Truck className="w-4 h-4" />,
      },
      {
        label: "Goods Receipt",
        href: "/apps/procurement/goods-receipt",
        end: true,
        icon: <PackageCheck className="w-4 h-4" />,
      },
    ],
  },
  {
    label: "Suppliers",
    items: [
      {
        label: "Suppliers",
        href: "/apps/procurement/suppliers",
        end: true,
        icon: <Building className="w-4 h-4" />,
      },
      {
        label: "Supplier Compliance",
        href: "/apps/procurement/supplier-compliance",
        end: true,
        icon: <ShieldCheck className="w-4 h-4" />,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        label: "Approvals",
        href: "/apps/procurement/approvals",
        end: true,
        icon: <CheckSquare className="w-4 h-4" />,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "Reports",
        href: "/apps/procurement/reports",
        end: true,
        icon: <BarChart3 className="w-4 h-4" />,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Configuration", href: "/apps/procurement/config", end: true, icon: <Settings className="w-4 h-4" /> },
    ],
  },
];

export function ProcurementLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <AppHeader currentApp="procurement" appColor="bg-blue-700" />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
          <CollapsibleSidebar
            sections={sidebarSections}
            activeClass="bg-blue-50 text-blue-700 font-medium [&_svg]:text-blue-600"
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
