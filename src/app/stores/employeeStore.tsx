import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface Employee {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  jobTitle: string;
  primarySupervisor: string;
  employmentDate: string;
  dateOfBirth: string;
  maritalStatus: string;
  personalPhone: string;
  personalEmail: string;
  address: string;
  nextOfKin: string;
  pfa: string;
  rsaNumber: string;
  bankName: string;
  bankAccount: string;
  taxId: string;
  grade: string;
  nationality: string;
  department: string;
  orgLevel: string;
  status: "active" | "inactive" | "on_leave";
  employmentType: string;
  syncStatus: "unsynced" | "synced";
  userId?: string;
}

const SEED_EMPLOYEES: Employee[] = [
  { id: "EMP-001", firstName: "Chukwudi", middleName: "", lastName: "Eze", jobTitle: "Site Engineer", primarySupervisor: "Aisha Bello", employmentDate: "2023-01-15", dateOfBirth: "1990-05-12", maritalStatus: "Married", personalPhone: "+234 80 1234 5678", personalEmail: "c.eze@personal.com", address: "12 Lekki Phase 1, Lagos", nextOfKin: "Ngozi Eze (Spouse) - +234 80 8765 4321", pfa: "ARM Pension", rsaNumber: "RSA-12345678-01", bankName: "GTBank", bankAccount: "0123456789", taxId: "TIN-9876543-001", grade: "Level 8", nationality: "Nigerian", department: "Engineering", orgLevel: "Crew", status: "active", employmentType: "Full-time", syncStatus: "synced", userId: "USR-002" },
  { id: "EMP-002", firstName: "Aisha", middleName: "M.", lastName: "Bello", jobTitle: "Project Manager", primarySupervisor: "", employmentDate: "2021-03-01", dateOfBirth: "1987-11-23", maritalStatus: "Married", personalPhone: "+234 81 2345 6789", personalEmail: "a.bello@personal.com", address: "45 Victoria Island, Lagos", nextOfKin: "Musa Bello (Spouse) - +234 80 1122 3344", pfa: "Trustfund Pensions", rsaNumber: "RSA-23456789-01", bankName: "Zenith Bank", bankAccount: "1234567890", taxId: "TIN-8765432-001", grade: "Level 14", nationality: "Nigerian", department: "Operations", orgLevel: "Collegium", status: "active", employmentType: "Full-time", syncStatus: "synced" },
  { id: "EMP-003", firstName: "Sarah", middleName: "", lastName: "Johnson", jobTitle: "Accountant", primarySupervisor: "Fatima Yusuf", employmentDate: "2022-02-14", dateOfBirth: "1992-08-05", maritalStatus: "Single", personalPhone: "+234 81 4567 8901", personalEmail: "s.johnson@personal.com", address: "8 GRA, Port Harcourt", nextOfKin: "James Johnson (Father) - +234 80 9988 7766", pfa: "AXA Mansard", rsaNumber: "RSA-34567890-01", bankName: "Access Bank", bankAccount: "2345678901", taxId: "TIN-7654321-001", grade: "Level 7", nationality: "Nigerian", department: "Finance", orgLevel: "Cluster", status: "active", employmentType: "Full-time", syncStatus: "synced" },
  { id: "EMP-004", firstName: "Emeka", middleName: "C.", lastName: "Nwosu", jobTitle: "HSE Officer", primarySupervisor: "Chukwudi Eze", employmentDate: "2023-03-12", dateOfBirth: "1993-12-19", maritalStatus: "Married", personalPhone: "+234 81 0123 4567", personalEmail: "e.nwosu@personal.com", address: "23 Festac Town, Lagos", nextOfKin: "Ada Nwosu (Spouse) - +234 80 5544 3322", pfa: "FCMB Pension", rsaNumber: "RSA-45678901-01", bankName: "First Bank", bankAccount: "3456789012", taxId: "TIN-6543210-001", grade: "Level 9", nationality: "Nigerian", department: "Health & Safety", orgLevel: "Crew", status: "active", employmentType: "Contract", syncStatus: "synced" },
  { id: "EMP-005", firstName: "Funke", middleName: "A.", lastName: "Adeyemi", jobTitle: "Finance Analyst", primarySupervisor: "Sarah Johnson", employmentDate: "2024-02-20", dateOfBirth: "1995-04-30", maritalStatus: "Single", personalPhone: "+234 81 3456 8901", personalEmail: "f.adeyemi@personal.com", address: "15 Ikeja, Lagos", nextOfKin: "Tunde Adeyemi (Brother) - +234 80 6677 8899", pfa: "Leadway Pensure", rsaNumber: "RSA-56789012-01", bankName: "UBA", bankAccount: "4567890123", taxId: "TIN-5432109-001", grade: "Level 6", nationality: "Nigerian", department: "Finance", orgLevel: "Cluster", status: "active", employmentType: "Full-time", syncStatus: "unsynced" },
  { id: "EMP-006", firstName: "Yemi", middleName: "O.", lastName: "Olusegun", jobTitle: "Project Manager", primarySupervisor: "", employmentDate: "2026-04-07", dateOfBirth: "1988-09-15", maritalStatus: "Married", personalPhone: "+234 70 5678 0123", personalEmail: "y.olusegun@personal.com", address: "7 Marina, Lagos", nextOfKin: "Bisi Olusegun (Spouse) - +234 80 2233 4455", pfa: "Stanbic IBTC Pension", rsaNumber: "RSA-67890123-01", bankName: "Fidelity Bank", bankAccount: "5678901234", taxId: "TIN-4321098-001", grade: "Level 13", nationality: "Nigerian", department: "Operations", orgLevel: "Collegium", status: "active", employmentType: "Full-time", syncStatus: "unsynced" },
  { id: "EMP-007", firstName: "Bisi", middleName: "", lastName: "Akinola", jobTitle: "Admin Officer", primarySupervisor: "Aisha Bello", employmentDate: "2022-05-01", dateOfBirth: "1994-03-22", maritalStatus: "Single", personalPhone: "+234 80 1234 6789", personalEmail: "b.akinola@personal.com", address: "55 Surulere, Lagos", nextOfKin: "Kunle Akinola (Father) - +234 80 7788 9900", pfa: "ARM Pension", rsaNumber: "RSA-78901234-01", bankName: "GTBank", bankAccount: "6789012345", taxId: "TIN-3210987-001", grade: "Level 5", nationality: "Nigerian", department: "Administration", orgLevel: "Cluster", status: "active", employmentType: "Full-time", syncStatus: "unsynced" },
];

interface EmployeeContextValue {
  employees: Employee[];
  addEmployee: (emp: Omit<Employee, "id" | "syncStatus" | "userId">) => void;
  syncEmployee: (empId: string, userId: string) => void;
  getByStatus: (status: "unsynced" | "synced" | "all") => Employee[];
}

const EmployeeContext = createContext<EmployeeContextValue | null>(null);

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(SEED_EMPLOYEES);

  const addEmployee = useCallback((emp: Omit<Employee, "id" | "syncStatus" | "userId">) => {
    setEmployees(prev => {
      const maxId = prev.reduce((max, e) => Math.max(max, parseInt(e.id.replace("EMP-", ""))), 0);
      const newId = `EMP-${String(maxId + 1).padStart(3, "0")}`;
      return [...prev, { ...emp, id: newId, syncStatus: "unsynced" as const }];
    });
  }, []);

  const syncEmployee = useCallback((empId: string, userId: string) => {
    setEmployees(prev => prev.map(e =>
      e.id === empId ? { ...e, syncStatus: "synced" as const, userId } : e
    ));
  }, []);

  const getByStatus = useCallback((status: "unsynced" | "synced" | "all") => {
    if (status === "all") return employees;
    return employees.filter(e => e.syncStatus === status);
  }, [employees]);

  return (
    <EmployeeContext.Provider value={{ employees, addEmployee, syncEmployee, getByStatus }}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployees() {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error("useEmployees must be used within EmployeeProvider");
  return ctx;
}
