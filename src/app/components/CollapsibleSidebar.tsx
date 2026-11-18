import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePermissions } from "../utils/usePermissions";

export interface SidebarItem {
  label: string;
  href: string;
  icon: ReactNode;
  end?: boolean;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
  defaultOpen?: boolean; // sections default to open unless this is false
}

interface CollapsibleSidebarProps {
  sections: SidebarSection[];
  activeClass: string;
  baseClass: string;
}

export function CollapsibleSidebar({ sections, activeClass, baseClass }: CollapsibleSidebarProps) {
  const { canNav } = usePermissions();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("buildos-sidebar-collapsed") === "true");

  // Layer 2 (navigation) enforcement happens here rather than in each of the
  // seven app layouts, so a role's navigation config gates every app from one
  // place. `canNav` is keyed on the item's href, which is also the permission id,
  // and it allows anything the role hasn't explicitly restricted — so an
  // unconfigured role keeps its full sidebar.
  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => canNav(item.href)),
        }))
        // A section whose every item is hidden would render as an empty header.
        .filter((section) => section.items.length > 0),
    [sections, canNav],
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sections.forEach((s) => {
      // Empty-label (dashboard row) and Tasks are always open by default; others default open too
      init[s.label] = s.defaultOpen !== false;
    });
    return init;
  });

  function toggle(label: string) {
    if (!label) return; // never collapse the unlabeled dashboard row
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function toggleSidebar() {
    setSidebarCollapsed((current) => { const next = !current; localStorage.setItem("buildos-sidebar-collapsed", String(next)); return next; });
  }

  return (
    <nav className={`relative h-full flex-shrink-0 space-y-1 overflow-y-auto p-3 pt-12 transition-[width] duration-200 ${sidebarCollapsed ? "w-16" : "w-56"}`}>
      <button onClick={toggleSidebar} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="absolute right-3 top-3 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">{sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>
      {visibleSections.map((section) => {
        const isOpen = !section.label || openSections[section.label];

        if (!section.label) {
          // Dashboard row — no header, always visible
          return (
            <div key="__root__" className="mb-2 space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-md px-2 py-1.5 text-sm transition-colors ${sidebarCollapsed ? "justify-center" : "gap-2.5"} ${isActive ? activeClass : baseClass}`
                  }
                >
                  {item.icon}
                  {!sidebarCollapsed && item.label}
                </NavLink>
              ))}
            </div>
          );
        }

        return (
          <div key={section.label} className="mb-1">
            {/* Section header — clickable */}
            {!sidebarCollapsed && <button
              onClick={() => toggle(section.label)}
              className="w-full flex items-center justify-between px-2 py-1 rounded-md hover:bg-gray-50 transition-colors group"
            >
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest group-hover:text-gray-500 transition-colors">
                {section.label}
              </span>
              {isOpen
                ? <ChevronDown  className="w-3 h-3 text-gray-300 group-hover:text-gray-400" />
                : <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-400" />}
            </button>}

            {/* Section items */}
            {(sidebarCollapsed || isOpen) && (
              <div className="mt-0.5 mb-2 space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.end}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center rounded-md px-2 py-1.5 text-sm transition-colors ${sidebarCollapsed ? "justify-center" : "gap-2.5"} ${isActive ? activeClass : baseClass}`
                    }
                  >
                    {item.icon}
                    {!sidebarCollapsed && item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
