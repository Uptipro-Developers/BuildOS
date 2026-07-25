import { Plus, Edit, Trash2, GripVertical, Search } from "lucide-react";
import { useState, useRef } from "react";

interface Director {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  designation: string;
  sequence: number;
}

export function BoardOfDirectorsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingDirector, setEditingDirector] = useState<Director | null>(null);

  const [directors, setDirectors] = useState<Director[]>([
    {
      id: "1",
      firstName: "John",
      middleName: "Michael",
      lastName: "Smith",
      designation: "Chairman",
      sequence: 1,
    },
    {
      id: "2",
      firstName: "Sarah",
      middleName: "Elizabeth",
      lastName: "Johnson",
      designation: "CEO",
      sequence: 2,
    },
    {
      id: "3",
      firstName: "Robert",
      middleName: "James",
      lastName: "Williams",
      designation: "CFO",
      sequence: 3,
    },
    {
      id: "4",
      firstName: "Emily",
      middleName: "Rose",
      lastName: "Brown",
      designation: "COO",
      sequence: 4,
    },
    {
      id: "5",
      firstName: "Michael",
      middleName: "David",
      lastName: "Davis",
      designation: "Director",
      sequence: 5,
    },
  ]);

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    designation: "",
    sequence: directors.length + 1,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = () => {
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;

    setDirectors((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      // Re-assign sequence numbers based on new order
      return updated.map((d, i) => ({ ...d, sequence: i + 1 }));
    });

    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  const filteredDirectors = directors.filter(
    (d) =>
      `${d.firstName} ${d.middleName} ${d.lastName} ${d.designation}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const handleEdit = (director: Director) => {
    setEditingDirector(director);
    setFormData({
      firstName: director.firstName,
      middleName: director.middleName,
      lastName: director.lastName,
      designation: director.designation,
      sequence: director.sequence,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this director?")) {
      setDirectors((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleSave = () => {
    if (editingDirector) {
      setDirectors((prev) =>
        prev.map((d) =>
          d.id === editingDirector.id ? { ...d, ...formData } : d
        )
      );
    } else {
      const newDirector: Director = {
        id: Date.now().toString(),
        ...formData,
      };
      setDirectors((prev) => [...prev, newDirector]);
    }
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDirector(null);
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      designation: "",
      sequence: directors.length + 1,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Board of Directors
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your organization's board members
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Director
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search directors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Draggable Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-auto" style={{ maxHeight: "520px" }}>
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Designation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDirectors.map((director, index) => (
                <tr
                  key={director.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  className="hover:bg-indigo-50/40 transition-colors cursor-default"
                >
                  <td className="px-4 py-3">
                    <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing" />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-500">{director.sequence}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{director.firstName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{director.middleName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{director.lastName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                      {director.designation}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(director)}
                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(director.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDirectors.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    No directors found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {editingDirector ? "Edit Director" : "Add New Director"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) =>
                      setFormData({ ...formData, middleName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) =>
                      setFormData({ ...formData, designation: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sequence <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.sequence}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sequence: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
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
                {editingDirector ? "Save Changes" : "Add Director"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
