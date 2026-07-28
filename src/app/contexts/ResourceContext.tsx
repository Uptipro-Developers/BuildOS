import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Vendor } from "../pages/construction/types";
import {
  listContractors,
  createContractor as apiCreateContractor,
  updateContractor as apiUpdateContractor,
  deleteContractor as apiDeleteContractor,
} from "../api/contractors";
import {
  listVendors,
  createVendor as apiCreateVendor,
  updateVendor as apiUpdateVendor,
  deleteVendor as apiDeleteVendor,
} from "../api/vendors";

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

export function ResourceProvider({ children }: { children: ReactNode }) {
  const [contractors, setContractors] = useState<IndividualContractor[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    listContractors()
      .then((rows) => {
        if (rows.length > 0) setContractors(rows as IndividualContractor[]);
      })
      .catch(() => {});
    listVendors()
      .then((rows) => {
        if (rows.length > 0) setVendors(rows);
      })
      .catch(() => {});
  }, []);

  const addContractor = useCallback((c: Omit<IndividualContractor, "id">) => {
    const tempId = `IC-${String(Date.now()).slice(-6)}`;
    setContractors((prev) => [...prev, { ...c, id: tempId }]);
    apiCreateContractor(c as Record<string, any>)
      .then((saved) => {
        setContractors((prev) =>
          prev.map((x) =>
            x.id === tempId ? (saved as IndividualContractor) : x,
          ),
        );
      })
      .catch(() => {});
  }, []);

  const updateContractor = useCallback(
    (id: string, c: Partial<IndividualContractor>) => {
      setContractors((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...c } : x)),
      );
      apiUpdateContractor(id, c as Record<string, any>).catch(() => {});
    },
    [],
  );

  const removeContractor = useCallback((id: string) => {
    setContractors((prev) => prev.filter((x) => x.id !== id));
    apiDeleteContractor(id).catch(() => {});
  }, []);

  const addVendor = useCallback((v: Omit<Vendor, "id">) => {
    const tempId = `V-${String(Date.now()).slice(-6)}`;
    setVendors((prev) => [...prev, { ...v, id: tempId }]);
    apiCreateVendor(v as Record<string, any>)
      .then((saved) => {
        setVendors((prev) => prev.map((x) => (x.id === tempId ? saved : x)));
      })
      .catch(() => {});
  }, []);

  const updateVendor = useCallback((id: string, v: Partial<Vendor>) => {
    setVendors((prev) => prev.map((x) => (x.id === id ? { ...x, ...v } : x)));
    apiUpdateVendor(id, v as Record<string, any>).catch(() => {});
  }, []);

  const removeVendor = useCallback((id: string) => {
    setVendors((prev) => prev.filter((x) => x.id !== id));
    apiDeleteVendor(id).catch(() => {});
  }, []);

  return (
    <ResourceContext.Provider
      value={{
        contractors,
        vendors,
        addContractor,
        updateContractor,
        removeContractor,
        addVendor,
        updateVendor,
        removeVendor,
      }}
    >
      {children}
    </ResourceContext.Provider>
  );
}

export function useResources() {
  const ctx = useContext(ResourceContext);
  if (!ctx)
    throw new Error("useResources must be used within ResourceProvider");
  return ctx;
}

export { ResourceContext };
