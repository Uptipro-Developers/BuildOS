import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Vendor } from "../pages/construction/types";
import { vendors as initialVendors } from "../pages/construction/mockData";

export interface IndividualContractor {
  id: string;
  name: string;
  trade: string;
  payRate: number;
  payRateUnit: "daily" | "weekly" | "monthly" | "lump-sum";
  skilledCount: number;
  unskilledCount: number;
  manDays: number;
  status: "Active" | "Completed" | "Terminated";
  mobile?: string;
  email?: string;
}

interface ResourceContextType {
  contractors: IndividualContractor[];
  vendors: Vendor[];
  addContractor: (c: Omit<IndividualContractor, "id">) => void;
  updateContractor: (id: string, c: Partial<IndividualContractor>) => void;
  removeContractor: (id: string) => void;
  addVendor: (v: Omit<Vendor, "id">) => void;
  updateVendor: (id: string, v: Partial<Vendor>) => void;
  removeVendor: (id: string) => void;
}

const ResourceContext = createContext<ResourceContextType | null>(null);

const initialContractors: IndividualContractor[] = [
  { id: "IC-001", name: "Babatunde Welder", trade: "Welding", payRate: 25000, payRateUnit: "daily", skilledCount: 3, unskilledCount: 5, manDays: 120, status: "Active", mobile: "08023456789" },
  { id: "IC-002", name: "Femi Scaffolder", trade: "Scaffolding", payRate: 18000, payRateUnit: "daily", skilledCount: 2, unskilledCount: 4, manDays: 90, status: "Active", mobile: "08034567890" },
  { id: "IC-003", name: "Segun Mason", trade: "Masonry", payRate: 20000, payRateUnit: "daily", skilledCount: 4, unskilledCount: 6, manDays: 180, status: "Active", mobile: "08045678901" },
  { id: "IC-004", name: "Kunle Electrician", trade: "Electrical", payRate: 30000, payRateUnit: "daily", skilledCount: 2, unskilledCount: 3, manDays: 60, status: "Completed", mobile: "08056789012" },
];

export function ResourceProvider({ children }: { children: ReactNode }) {
  const [contractors, setContractors] = useState<IndividualContractor[]>(initialContractors);
  const [vendors, setVendors] = useState<Vendor[]>(() => initialVendors.map(v => ({ ...v })));

  const addContractor = useCallback((c: Omit<IndividualContractor, "id">) => {
    const id = `IC-${String(Date.now()).slice(-6)}`;
    setContractors(prev => [...prev, { ...c, id }]);
  }, []);

  const updateContractor = useCallback((id: string, c: Partial<IndividualContractor>) => {
    setContractors(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));
  }, []);

  const removeContractor = useCallback((id: string) => {
    setContractors(prev => prev.filter(x => x.id !== id));
  }, []);

  const addVendor = useCallback((v: Omit<Vendor, "id">) => {
    const id = `V-${String(Date.now()).slice(-6)}`;
    setVendors(prev => [...prev, { ...v, id }]);
  }, []);

  const updateVendor = useCallback((id: string, v: Partial<Vendor>) => {
    setVendors(prev => prev.map(x => x.id === id ? { ...x, ...v } : x));
  }, []);

  const removeVendor = useCallback((id: string) => {
    setVendors(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <ResourceContext.Provider value={{ contractors, vendors, addContractor, updateContractor, removeContractor, addVendor, updateVendor, removeVendor }}>
      {children}
    </ResourceContext.Provider>
  );
}

export function useResources() {
  const ctx = useContext(ResourceContext);
  if (!ctx) throw new Error("useResources must be used within ResourceProvider");
  return ctx;
}

export { ResourceContext };
