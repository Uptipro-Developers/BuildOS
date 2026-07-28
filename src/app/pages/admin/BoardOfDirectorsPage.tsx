import { Plus, Edit, Trash2, GripVertical, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  getDirectors,
  createDirector,
  updateDirector,
  reorderDirectors,
  deleteDirector,
} from "../../api/admin-extras";

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
  const [deleteTarget, setDeleteTarget] = useState<Director | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const [directors, setDirectors] = useState<Director[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadDirectors = async (showErrorToast = true) => {
    try {
      const items = await getDirectors();
      setDirectors(items);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load directors.";
      if (showErrorToast) {
        toast.error(message);
      }
      throw err;
    }
  };

  useEffect(() => {
    void loadDirectors().catch(() => {
      // Error toast is already shown in loadDirectors.
    });
  }, []);

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    designation: "",
    sequence: directors.length + 1,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const dragDirectorId = useRef<string | null>(null);
  const dragOverDirectorId = useRef<string | null>(null);

  const handleDragStart = (directorId: string) => {
    dragDirectorId.current = directorId;
  };

  const handleDragOver = (e: React.DragEvent, directorId: string) => {
    e.preventDefault();
    dragOverDirectorId.current = directorId;
  };

  const handleDrop = async () => {
    const fromId = dragDirectorId.current;
    const toId = dragOverDirectorId.current;
    if (!fromId || !toId || fromId === toId || isReordering) return;

    const fromIndex = directors.findIndex((d) => d.id === fromId);
    const toIndex = directors.findIndex((d) => d.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const previousDirectors = directors;
    const reordered = [...directors];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const normalized = reordered.map((d, i) => ({ ...d, sequence: i + 1 }));

    setDirectors(normalized);
    setIsReordering(true);
    dragDirectorId.current = null;
    dragOverDirectorId.current = null;

    try {
      await reorderDirectors(
        normalized.map((director) => ({
          id: director.id,
          sequence: director.sequence,
        })),
      );
      toast.success("Director order updated successfully.");
    } catch (err) {
      setDirectors(previousDirectors);
      const message =
        err instanceof Error ? err.message : "Failed to reorder directors.";
      toast.error(message);
    } finally {
      setIsReordering(false);
    }
  };

  const filteredDirectors = directors.filter((d) =>
    `${d.firstName} ${d.middleName} ${d.lastName} ${d.designation}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
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
    const target = directors.find((d) => d.id === id) ?? null;
    setDeleteTarget(target);
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.designation.trim())
      newErrors.designation = "Designation is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(Object.values(newErrors)[0]);
      return;
    }
    setErrors({});
    setIsSaving(true);

    try {
      if (editingDirector) {
        await updateDirector(editingDirector.id, {
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          designation: formData.designation,
        });
      } else {
        await createDirector({
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          designation: formData.designation,
          sequence: formData.sequence,
        });
      }
      await loadDirectors(false);
      handleCloseModal();
      toast.success(
        editingDirector
          ? "Director updated successfully."
          : "Director created successfully.",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save director.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteDirector(deleteTarget.id);
      await loadDirectors(false);
      setDeleteTarget(null);
      toast.success("Director deleted successfully.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete director.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDirector(null);
    setErrors({});
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      designation: "",
      sequence: directors.length + 1,
    });
  };

  useEffect(() => {
    if (!showModal || editingDirector) return;
    setFormData((prev) => ({ ...prev, sequence: directors.length + 1 }));
  }, [showModal, editingDirector, directors.length]);

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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  #
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  First Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Middle Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Last Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Designation
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDirectors.map((director) => (
                <tr
                  key={director.id}
                  draggable
                  onDragStart={() => handleDragStart(director.id)}
                  onDragOver={(e) => handleDragOver(e, director.id)}
                  onDrop={() => {
                    void handleDrop();
                  }}
                  className="hover:bg-indigo-50/40 transition-colors cursor-default"
                >
                  <td className="px-4 py-3">
                    <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing" />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-500">
                    {director.sequence}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {director.firstName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {director.middleName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {director.lastName}
                  </td>
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
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
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
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.firstName}
                    </p>
                  )}
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
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.lastName}
                    </p>
                  )}
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
                  {errors.designation && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.designation}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sequence <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.sequence}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Sequence is auto-assigned by the system.
                  </p>
                  {errors.sequence && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.sequence}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSaving && (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {editingDirector ? "Save Changes" : "Add Director"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Delete Director?
            </h2>
            <p className="text-sm text-gray-500">
              <strong>
                {deleteTarget.firstName} {deleteTarget.lastName}
              </strong>{" "}
              will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isDeleting && (
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
