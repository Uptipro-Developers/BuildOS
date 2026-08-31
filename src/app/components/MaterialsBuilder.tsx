import { FolderOpen, Plus, Trash2, X } from "lucide-react";
import { DIMENSION_UNITS } from "../api/materials";
import type { MaterialCatalogMaterialInput } from "../api/admin-extras";

/**
 * Shared "Material Name -> item -> dimension" builder — every dimension of
 * every item becomes its own flat Material row on save (see
 * admin-extras.service.ts's buildMaterialCreateInput). Used by both
 * Storefront Config's Add/Edit Category modal and All Materials' Add
 * Material modal (scoped to an already-selected category), so the two stay
 * in lockstep instead of drifting apart.
 */

export const DIMENSION_KINDS = [
    "Weight",
    "Length",
    "Width",
    "Breadth",
    "Thickness",
    "Area",
    "Volume",
    "Custom",
];

let catalogFormKeySeed = 0;
/** A fresh React key for a builder row — exported so callers reconstructing form state (e.g. regrouping flat rows for edit) can mint keys the same way. */
export function nextCatalogFormKey() {
    catalogFormKeySeed += 1;
    return `k${catalogFormKeySeed}`;
}

export interface DimensionFormRow {
    key: string;
    kind: string;
    value: string;
    unit: string;
}
export interface ItemFormRow {
    key: string;
    name: string;
    sku: string;
    /** No unit of its own — every dimension carries its own unit, since that's what a saved row's own unit comes from. Needs at least one dimension to save anything. */
    dimensions: DimensionFormRow[];
}
export interface MaterialFormRow {
    key: string;
    name: string;
    classification: "Consumable" | "Reusable";
    items: ItemFormRow[];
}

export function blankDimension(): DimensionFormRow {
    return { key: nextCatalogFormKey(), kind: "Length", value: "", unit: "" };
}
export function blankItem(): ItemFormRow {
    return { key: nextCatalogFormKey(), name: "", sku: "", dimensions: [blankDimension()] };
}
export function blankMaterial(): MaterialFormRow {
    return { key: nextCatalogFormKey(), name: "", classification: "Consumable", items: [blankItem()] };
}

/**
 * A blank pre-seeded row is silently dropped on save (that's fine — it's
 * how "leave it empty if you don't need it" works). But a row that's
 * *partly* filled in — an item named with no dimension, or an item under
 * a Material whose own name was never filled in — would be silently
 * dropped too, with no sign anything was lost. Catch that before saving.
 * An item needs at least one dimension, since a saved row's identity
 * (and stock) comes from its dimension — there's nothing to save without one.
 */
export function findIncompleteMaterialRow(materials: MaterialFormRow[]): string | null {
    for (const m of materials) {
        const materialName = m.name.trim();
        for (const it of m.items) {
            const itemName = it.name.trim();
            if (!itemName) continue;
            if (!materialName) {
                return `"${itemName}" needs its material's name filled in before it can be saved.`;
            }
            if (it.dimensions.length === 0) {
                return `"${itemName}" under "${materialName}" needs at least one dimension before it can be saved.`;
            }
        }
    }
    return null;
}

/** Trims and drops blank rows, shaping the builder's state into the wire payload the backend expects. */
export function materialsToPayload(materials: MaterialFormRow[]): MaterialCatalogMaterialInput[] {
    return materials
        .filter((m) => m.name.trim())
        .map((m) => ({
            name: m.name.trim(),
            classification: m.classification,
            items: m.items
                .filter((it) => it.name.trim())
                .map((it) => ({
                    name: it.name.trim(),
                    sku: it.sku.trim() || undefined,
                    dimensions: it.dimensions
                        .filter((d) => d.kind)
                        .map((d) => ({
                            kind: d.kind,
                            value: d.value === "" ? undefined : Number(d.value),
                            unit: d.unit || undefined,
                        })),
                })),
        }));
}

export function MaterialsBuilder({
    materials,
    onChange,
    title = "Materials under this category",
}: {
    materials: MaterialFormRow[];
    onChange: (materials: MaterialFormRow[]) => void;
    title?: string;
}) {
    function addMaterial() {
        onChange([...materials, blankMaterial()]);
    }
    function removeMaterial(key: string) {
        onChange(materials.filter((m) => m.key !== key));
    }
    function updateMaterialRow(key: string, patch: Partial<MaterialFormRow>) {
        onChange(materials.map((m) => (m.key === key ? { ...m, ...patch } : m)));
    }
    function addItem(materialKey: string) {
        onChange(
            materials.map((m) => (m.key === materialKey ? { ...m, items: [...m.items, blankItem()] } : m)),
        );
    }
    function removeItem(materialKey: string, itemKey: string) {
        onChange(
            materials.map((m) =>
                m.key === materialKey ? { ...m, items: m.items.filter((it) => it.key !== itemKey) } : m,
            ),
        );
    }
    function updateItemRow(materialKey: string, itemKey: string, patch: Partial<ItemFormRow>) {
        onChange(
            materials.map((m) =>
                m.key === materialKey
                    ? { ...m, items: m.items.map((it) => (it.key === itemKey ? { ...it, ...patch } : it)) }
                    : m,
            ),
        );
    }
    function addDimension(materialKey: string, itemKey: string) {
        onChange(
            materials.map((m) =>
                m.key === materialKey
                    ? {
                        ...m,
                        items: m.items.map((it) =>
                            it.key === itemKey ? { ...it, dimensions: [...it.dimensions, blankDimension()] } : it,
                        ),
                    }
                    : m,
            ),
        );
    }
    function removeDimension(materialKey: string, itemKey: string, dimensionKey: string) {
        onChange(
            materials.map((m) =>
                m.key === materialKey
                    ? {
                        ...m,
                        items: m.items.map((it) =>
                            it.key === itemKey
                                ? { ...it, dimensions: it.dimensions.filter((d) => d.key !== dimensionKey) }
                                : it,
                        ),
                    }
                    : m,
            ),
        );
    }
    function updateDimensionRow(
        materialKey: string,
        itemKey: string,
        dimensionKey: string,
        patch: Partial<DimensionFormRow>,
    ) {
        onChange(
            materials.map((m) =>
                m.key === materialKey
                    ? {
                        ...m,
                        items: m.items.map((it) =>
                            it.key === itemKey
                                ? {
                                    ...it,
                                    dimensions: it.dimensions.map((d) =>
                                        d.key === dimensionKey ? { ...d, ...patch } : d,
                                    ),
                                }
                                : it,
                        ),
                    }
                    : m,
            ),
        );
    }

    return (
        <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <FolderOpen className="w-4 h-4 text-gray-500" />
                    {title}
                </div>
                <button
                    type="button"
                    onClick={addMaterial}
                    className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Material
                </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
                Each material is classified Consumable (used up) or Reusable
                (returned to store), and can have as many items (variants)
                as needed — each item needs at least one dimension, since
                that's what its stock is tracked against.
            </p>

            <div className="space-y-3">
                {materials.map((m) => (
                    <div key={m.key} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Material Name<span className="text-red-500">*</span>
                                </label>
                                <input
                                    value={m.name}
                                    onChange={(e) => updateMaterialRow(m.key, { name: e.target.value })}
                                    placeholder="e.g. Granite Tiles"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                />
                            </div>
                            <div className="w-40">
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Classification
                                </label>
                                <select
                                    value={m.classification}
                                    onChange={(e) =>
                                        updateMaterialRow(m.key, {
                                            classification: e.target.value === "Reusable" ? "Reusable" : "Consumable",
                                        })
                                    }
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                >
                                    <option value="Consumable">Consumable</option>
                                    <option value="Reusable">Reusable</option>
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => addItem(m.key)}
                                className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap py-2"
                            >
                                <Plus className="w-3.5 h-3.5" /> Item
                            </button>
                            <button
                                type="button"
                                onClick={() => removeMaterial(m.key)}
                                title="Remove material"
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {m.items.length > 0 && (
                            <div className="space-y-2 pl-3 border-l-2 border-gray-200">
                                {m.items.map((it) => (
                                    <div key={it.key} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input
                                                value={it.name}
                                                onChange={(e) =>
                                                    updateItemRow(m.key, it.key, { name: e.target.value })
                                                }
                                                placeholder="Item name (e.g. Wall)"
                                                className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                            <input
                                                value={it.sku}
                                                onChange={(e) =>
                                                    updateItemRow(m.key, it.key, { sku: e.target.value })
                                                }
                                                placeholder="SKU (e.g. GT-W-600600)"
                                                className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addDimension(m.key, it.key)}
                                                className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap shrink-0"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Dimension
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(m.key, it.key)}
                                                title="Remove item"
                                                className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 shrink-0"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {it.dimensions.length === 0 && (
                                            <p className="text-[11px] text-red-500">
                                                Needs at least one dimension.
                                            </p>
                                        )}
                                        {it.dimensions.map((d) => (
                                            <div key={d.key} className="flex flex-wrap items-center gap-2">
                                                <select
                                                    value={d.kind}
                                                    onChange={(e) =>
                                                        updateDimensionRow(m.key, it.key, d.key, { kind: e.target.value })
                                                    }
                                                    className="w-32 shrink-0 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                                >
                                                    {DIMENSION_KINDS.map((k) => (
                                                        <option key={k} value={k}>{k}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    value={d.value}
                                                    onChange={(e) =>
                                                        updateDimensionRow(m.key, it.key, d.key, { value: e.target.value })
                                                    }
                                                    placeholder="Value"
                                                    className="w-24 shrink-0 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                />
                                                <select
                                                    value={d.unit}
                                                    onChange={(e) =>
                                                        updateDimensionRow(m.key, it.key, d.key, { unit: e.target.value })
                                                    }
                                                    className="w-28 shrink-0 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                                >
                                                    <option value="">— unit —</option>
                                                    {DIMENSION_UNITS.map((u) => (
                                                        <option key={u} value={u}>{u}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => removeDimension(m.key, it.key, d.key)}
                                                    title="Remove dimension"
                                                    className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 shrink-0"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {materials.length === 0 && (
                    <button
                        type="button"
                        onClick={addMaterial}
                        className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:text-teal-700 hover:border-teal-300"
                    >
                        + Add a material
                    </button>
                )}
            </div>
        </div>
    );
}
