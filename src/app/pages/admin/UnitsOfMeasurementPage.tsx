import { Plus, Edit, Trash2, Ruler } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { CreatableSelect } from "../../components/CreatableSelect";

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  category: string;
  baseUnit: string;
  conversionFactor: number;
}

export function UnitsOfMeasurementPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [categoryOptions, setCategoryOptions] = useState([
    { label: "Length", value: "Length" },
    { label: "Weight", value: "Weight" },
    { label: "Volume", value: "Volume" },
    { label: "Area", value: "Area" },
    { label: "Custom", value: "Custom" },
  ]);

  const [units, setUnits] = useState<Unit[]>([
    {
      id: "1",
      name: "Meter",
      abbreviation: "m",
      category: "Length",
      baseUnit: "Meter",
      conversionFactor: 1,
    },
    {
      id: "2",
      name: "Centimeter",
      abbreviation: "cm",
      category: "Length",
      baseUnit: "Meter",
      conversionFactor: 0.01,
    },
    {
      id: "3",
      name: "Foot",
      abbreviation: "ft",
      category: "Length",
      baseUnit: "Meter",
      conversionFactor: 0.3048,
    },
    {
      id: "4",
      name: "Kilogram",
      abbreviation: "kg",
      category: "Weight",
      baseUnit: "Kilogram",
      conversionFactor: 1,
    },
    {
      id: "5",
      name: "Ton",
      abbreviation: "ton",
      category: "Weight",
      baseUnit: "Kilogram",
      conversionFactor: 1000,
    },
    {
      id: "6",
      name: "Bag (Cement)",
      abbreviation: "bag",
      category: "Custom",
      baseUnit: "Kilogram",
      conversionFactor: 50,
    },
    {
      id: "7",
      name: "Cubic Meter",
      abbreviation: "m³",
      category: "Volume",
      baseUnit: "Cubic Meter",
      conversionFactor: 1,
    },
    {
      id: "8",
      name: "Liter",
      abbreviation: "L",
      category: "Volume",
      baseUnit: "Cubic Meter",
      conversionFactor: 0.001,
    },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    category: "",
    baseUnit: "",
    conversionFactor: 1,
  });

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
    },
    {
      key: "abbreviation",
      label: "Abbreviation",
      sortable: true,
      render: (row: Unit) => (
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          {row.abbreviation}
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (row: Unit) => {
        const colors: Record<string, string> = {
          Length: "bg-blue-100 text-blue-700",
          Weight: "bg-green-100 text-green-700",
          Volume: "bg-purple-100 text-purple-700",
          Custom: "bg-yellow-100 text-yellow-700",
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              colors[row.category] || "bg-gray-100 text-gray-700"
            }`}
          >
            {row.category}
          </span>
        );
      },
    },
    {
      key: "baseUnit",
      label: "Base Unit",
      sortable: true,
    },
    {
      key: "conversionFactor",
      label: "Conversion Factor",
      sortable: true,
      render: (row: Unit) => (
        <span className="font-mono text-sm">{row.conversionFactor}</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (row: Unit) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id);
            }}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      abbreviation: unit.abbreviation,
      category: unit.category,
      baseUnit: unit.baseUnit,
      conversionFactor: unit.conversionFactor,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this unit?")) {
      setUnits((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const handleSave = () => {
    if (editingUnit) {
      setUnits((prev) =>
        prev.map((u) => (u.id === editingUnit.id ? { ...u, ...formData } : u))
      );
    } else {
      const newUnit: Unit = {
        id: Date.now().toString(),
        ...formData,
      };
      setUnits((prev) => [...prev, newUnit]);
    }
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUnit(null);
    setFormData({
      name: "",
      abbreviation: "",
      category: "",
      baseUnit: "",
      conversionFactor: 1,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Units of Measurement
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Define custom units for materials and quantities
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Unit
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Ruler className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <h3 className="text-sm font-medium text-blue-900">About Units</h3>
          <p className="text-sm text-blue-700 mt-1">
            Create custom units for materials specific to construction (e.g., bags, bundles, rolls).
            All units are converted to base units for accurate calculations.
          </p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={units}
        columns={columns}
        searchable={true}
        exportable={true}
        pageSize={10}
        maxHeight="520px"
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingUnit ? "Edit Unit" : "Add New Unit"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Define the unit properties and conversion factor.</p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Unit Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Meter, Bag, Ton"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Abbreviation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.abbreviation}
                    onChange={(e) =>
                      setFormData({ ...formData, abbreviation: e.target.value })
                    }
                    placeholder="e.g., m, bag, ton"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <CreatableSelect
                    options={categoryOptions}
                    value={formData.category}
                    onChange={(value) => setFormData({ ...formData, category: value })}
                    onCreateOption={(label) => {
                      const opt = { label, value: label };
                      setCategoryOptions((prev) => [...prev, opt]);
                      return opt;
                    }}
                    placeholder="Select or create category"
                    createLabel="Create new category"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Base Unit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.baseUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, baseUnit: e.target.value })
                    }
                    placeholder="e.g., Meter, Kilogram"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Conversion Factor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.conversionFactor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        conversionFactor: parseFloat(e.target.value) || 1,
                      })
                    }
                    placeholder="e.g., 1, 0.01, 1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Multiplier to convert this unit to its base unit</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                {editingUnit ? "Save Changes" : "Add Unit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
