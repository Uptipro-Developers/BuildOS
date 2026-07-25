import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Sector, StructureField, CategoryStructureConfig, CategoryConfig, ProjectTypeSetting } from "../pages/construction/types";
import { defaultProjectTypes } from "../pages/construction/mockData";

interface ProjectTypeContextValue {
  projectTypes: ProjectTypeSetting[];
  setProjectTypes: (updater: ProjectTypeSetting[] | ((prev: ProjectTypeSetting[]) => ProjectTypeSetting[])) => void;
  addSector: (name: string) => void;
  removeSector: (sector: string) => void;
  addCategory: (sector: string, name: string) => void;
  removeCategory: (sector: string, catName: string) => void;
  updateStructureMeta: (sector: string, catName: string, field: "unitLabel", value: string) => void;
  addStructureField: (sector: string, catName: string, field: StructureField) => void;
  removeStructureField: (sector: string, catName: string, idx: number) => void;
  addDescriptorOption: (sector: string, catName: string, option: string) => void;
  removeDescriptorOption: (sector: string, catName: string, option: string) => void;
  updateDescriptorMode: (sector: string, catName: string, mode: "dropdown" | "free-text") => void;
  updateDescription: (sector: string, catName: string, value: string) => void;
  getCategoriesForSector: (sector: string) => CategoryConfig[];
  getDescriptorConfig: (sector: string, catName: string) => { mode: "dropdown" | "free-text"; options: string[] } | null;
  getStructureConfigForCategory: (sector: string, catName: string) => CategoryStructureConfig | null;
}

const ProjectTypeContext = createContext<ProjectTypeContextValue | null>(null);

export function ProjectTypeProvider({ children }: { children: ReactNode }) {
  const [projectTypes, setProjectTypesState] = useState<ProjectTypeSetting[]>(defaultProjectTypes);

  const setProjectTypes = useCallback((updater: ProjectTypeSetting[] | ((prev: ProjectTypeSetting[]) => ProjectTypeSetting[])) => {
    setProjectTypesState(updater);
  }, []);

  const addSector = useCallback((name: string) => {
    setProjectTypesState(prev => [...prev, { sector: name as Sector, categories: [] }]);
  }, []);

  const removeSector = useCallback((sector: string) => {
    setProjectTypesState(prev => prev.filter(pt => pt.sector !== sector));
  }, []);

  const addCategory = useCallback((sector: string, name: string) => {
    setProjectTypesState(prev => prev.map(pt =>
      pt.sector === sector
        ? { ...pt, categories: [...pt.categories, { name, structure: { subUnitLabel: "", subUnitFields: [], subUnitItemLabel: "", innerUnitLabel: "", innerFields: [] }, descriptorMode: "free-text" as const, descriptorOptions: [], description: "" }] }
        : pt
    ));
  }, []);

  const removeCategory = useCallback((sector: string, catName: string) => {
    setProjectTypesState(prev => prev.map(pt =>
      pt.sector === sector ? { ...pt, categories: pt.categories.filter(c => c.name !== catName) } : pt
    ));
  }, []);

  const updateStructureMeta = useCallback((sector: string, catName: string, field: "unitLabel", value: string) => {
    setProjectTypesState(prev => prev.map(pt =>
      pt.sector === sector
        ? { ...pt, categories: pt.categories.map(c => c.name === catName ? { ...c, structure: { ...c.structure, [field]: value } } : c) }
        : pt
    ));
  }, []);

  const addStructureField = useCallback((sector: string, catName: string, field: StructureField) => {
    setProjectTypesState(prev => prev.map(pt =>
      pt.sector === sector
        ? { ...pt, categories: pt.categories.map(c => c.name === catName ? { ...c, structure: { ...c.structure, fields: [...c.structure.fields, field] } } : c) }
        : pt
    ));
  }, []);

  const removeStructureField = useCallback((sector: string, catName: string, idx: number) => {
    setProjectTypesState(prev => prev.map(pt =>
      pt.sector === sector
        ? { ...pt, categories: pt.categories.map(c => c.name === catName ? { ...c, structure: { ...c.structure, fields: c.structure.fields.filter((_, i) => i !== idx) } } : c) }
        : pt
    ));
  }, []);

  const addDescriptorOption = useCallback((sector: string, catName: string, option: string) => {
    setProjectTypesState(prev => prev.map(pt =>
      pt.sector === sector
        ? { ...pt, categories: pt.categories.map(c => c.name === catName ? { ...c, descriptorOptions: [...c.descriptorOptions, option] } : c) }
        : pt
    ));
  }, []);

  const removeDescriptorOption = useCallback((sector: string, catName: string, option: string) => {
    setProjectTypesState(prev => prev.map(pt =>
      pt.sector === sector
        ? { ...pt, categories: pt.categories.map(c => c.name === catName ? { ...c, descriptorOptions: c.descriptorOptions.filter(d => d !== option) } : c) }
        : pt
    ));
  }, []);

  const updateDescriptorMode = useCallback((sector: string, catName: string, mode: "dropdown" | "free-text") => {
    setProjectTypesState(prev => prev.map(pt =>
      pt.sector === sector
        ? { ...pt, categories: pt.categories.map(c => c.name === catName ? { ...c, descriptorMode: mode } : c) }
        : pt
    ));
  }, []);

  const updateDescription = useCallback((sector: string, catName: string, value: string) => {
    setProjectTypesState(prev => prev.map(pt =>
      pt.sector === sector
        ? { ...pt, categories: pt.categories.map(c => c.name === catName ? { ...c, description: value } : c) }
        : pt
    ));
  }, []);

  const getCategoriesForSector = useCallback((sector: string): CategoryConfig[] => {
    return projectTypes.find(pt => pt.sector === sector)?.categories ?? [];
  }, [projectTypes]);

  const getDescriptorConfig = useCallback((sector: string, catName: string): { mode: "dropdown" | "free-text"; options: string[] } | null => {
    const pt = projectTypes.find(p => p.sector === sector);
    if (!pt) return null;
    const cat = pt.categories.find(c => c.name === catName);
    return cat ? { mode: cat.descriptorMode, options: cat.descriptorOptions } : null;
  }, [projectTypes]);

  const getStructureConfigForCategory = useCallback((sector: string, catName: string): CategoryStructureConfig | null => {
    const pt = projectTypes.find(p => p.sector === sector);
    if (!pt) return null;
    const cat = pt.categories.find(c => c.name === catName);
    return cat ? cat.structure : null;
  }, [projectTypes]);

  return (
    <ProjectTypeContext.Provider value={{
      projectTypes,
      setProjectTypes,
      addSector,
      removeSector,
      addCategory,
      removeCategory,
      updateStructureMeta,
      addStructureField,
      removeStructureField,
      addDescriptorOption,
      removeDescriptorOption,
      updateDescriptorMode,
      updateDescription,
      getCategoriesForSector,
      getDescriptorConfig,
      getStructureConfigForCategory,
    }}>
      {children}
    </ProjectTypeContext.Provider>
  );
}

export function useProjectTypeStore(): ProjectTypeContextValue {
  const ctx = useContext(ProjectTypeContext);
  if (!ctx) throw new Error("useProjectTypeStore must be used within ProjectTypeProvider");
  return ctx;
}
