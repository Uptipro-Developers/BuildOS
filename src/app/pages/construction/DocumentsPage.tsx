import { useParams } from "react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  Upload,
  Download,
  Trash2,
  Plus,
  MoreHorizontal,
  Edit,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  RefreshCw,
} from "lucide-react";
import {
  getProjectById,
  documentFolders,
  documentFiles,
  fmtDate,
} from "./mockData";
import { listDocumentFolders } from "../../api/document-folders";
import { listDocumentFiles } from "../../api/document-files";

interface FolderNode {
  id: string;
  name: string;
  parentFolderId: string | null;
  children: FolderNode[];
  createdBy: string;
}

function buildTree(folders: typeof documentFolders): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];
  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }
  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentFolderId && map.has(f.parentFolderId)) {
      map.get(f.parentFolderId)!.children.push(node);
    } else if (!f.parentFolderId) {
      roots.push(node);
    }
  }
  return roots;
}

export function DocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const project = getProjectById(id ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([]),
  );
  const [search, setSearch] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [localFolders, setLocalFolders] = useState(documentFolders);
  const [localFiles, setLocalFiles] = useState(documentFiles);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(
    null,
  );

  // Load folders and files from the backend, falling back to mock data.
  useEffect(() => {
    if (!id) return;
    let active = true;
    listDocumentFolders(id)
      .then((data) => {
        if (active && data.length > 0) setLocalFolders(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    listDocumentFiles(id)
      .then((data) => {
        if (active && data.length > 0) setLocalFiles(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, [id]);

  const projectFolders = useMemo(
    () => localFolders.filter((f) => f.projectId === (id ?? "")),
    [localFolders, id],
  );
  const projectFiles = useMemo(
    () => localFiles.filter((f) => f.projectId === (id ?? "")),
    [localFiles, id],
  );
  const folderTree = useMemo(() => buildTree(projectFolders), [projectFolders]);

  const selectedFiles = useMemo(() => {
    if (!selectedFolderId) return [];
    let allFolderIds = [selectedFolderId];
    const collectChildren = (parentId: string) => {
      projectFolders
        .filter((f) => f.parentFolderId === parentId)
        .forEach((child) => {
          allFolderIds.push(child.id);
          collectChildren(child.id);
        });
    };
    collectChildren(selectedFolderId);
    return projectFiles.filter((f) => allFolderIds.includes(f.folderId));
  }, [projectFiles, selectedFolderId, projectFolders]);

  const filteredFiles = selectedFiles.filter(
    (f) => !search || f.name.toLowerCase().includes(search.toLowerCase()),
  );

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function toggleExpand(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    const newId = `DF-${Date.now()}`;
    setLocalFolders((prev) => [
      ...prev,
      {
        id: newId,
        projectId: id ?? "",
        parentFolderId: selectedFolderId,
        name: newFolderName.trim(),
        createdBy: "You",
      },
    ]);
    setNewFolderName("");
    setShowNewFolder(false);
    if (selectedFolderId)
      setExpandedFolders((prev) => new Set(prev).add(selectedFolderId));
    showToast(`Folder "${newFolderName.trim()}" created`);
  }

  function handleRenameFolder() {
    if (!editingFolderName.trim() || !editingFolderId) return;
    setLocalFolders((prev) =>
      prev.map((f) =>
        f.id === editingFolderId ? { ...f, name: editingFolderName.trim() } : f,
      ),
    );
    setEditingFolderId(null);
    setEditingFolderName("");
    setOpenMenu(null);
    showToast("Folder renamed");
  }

  function handleDeleteFolder(folderId: string) {
    const idsToRemove = new Set<string>();
    const collect = (pid: string) => {
      idsToRemove.add(pid);
      localFolders
        .filter((f) => f.parentFolderId === pid)
        .forEach((c) => collect(c.id));
    };
    collect(folderId);
    setLocalFolders((prev) => prev.filter((f) => !idsToRemove.has(f.id)));
    setLocalFiles((prev) => prev.filter((f) => !idsToRemove.has(f.folderId)));
    setConfirmDeleteFolder(null);
    if (selectedFolderId && idsToRemove.has(selectedFolderId))
      setSelectedFolderId(null);
    showToast("Folder deleted");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedFolderId) return;
    setLocalFiles((prev) => [
      ...prev,
      {
        id: `DCF-${Date.now()}`,
        folderId: selectedFolderId,
        projectId: id ?? "",
        name: file.name,
        fileUrl: "#",
        version: 1,
        uploadedBy: "You",
        uploadedAt: new Date().toISOString().split("T")[0],
      },
    ]);
    showToast(`"${file.name}" uploaded`);
    e.target.value = "";
  }

  function handleDeleteFile(fileId: string) {
    setLocalFiles((prev) => prev.filter((f) => f.id !== fileId));
    setOpenMenu(null);
    showToast("File deleted");
  }

  function handleReplaceFile(fileId: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      setLocalFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                name: file.name,
                version: f.version + 1,
                uploadedBy: "You",
                uploadedAt: new Date().toISOString().split("T")[0],
              }
            : f,
        ),
      );
      showToast(`"${file.name}" uploaded as new version`);
    };
    input.click();
  }

  function handleRenameFile(fileId: string) {
    const newName = prompt("Enter new file name:");
    if (!newName?.trim()) return;
    setLocalFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, name: newName.trim() } : f)),
    );
    setOpenMenu(null);
  }

  function renderTreeNode(
    node: FolderNode,
    depth: number = 0,
  ): React.ReactNode {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children.length > 0;
    const isEditing = editingFolderId === node.id;
    const fileCount = projectFiles.filter((f) => {
      let ids = [node.id];
      const collect = (pid: string) => {
        projectFolders
          .filter((f2) => f2.parentFolderId === pid)
          .forEach((c) => {
            ids.push(c.id);
            collect(c.id);
          });
      };
      collect(node.id);
      return ids.includes(f.folderId);
    }).length;
    const folderCount = node.children.length;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors group ${
            isSelected
              ? "bg-orange-100 text-orange-800 font-medium"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => {
            if (!isEditing) {
              setSelectedFolderId(node.id);
              if (hasChildren) toggleExpand(node.id);
            }
          }}
        >
          {hasChildren ? (
            <span className="flex-shrink-0 text-gray-400">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          ) : (
            <span className="w-3.5 flex-shrink-0" />
          )}
          {isSelected ? (
            <FolderOpen className="w-4 h-4 text-orange-500 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          {isEditing ? (
            <input
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onBlur={handleRenameFolder}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameFolder();
                if (e.key === "Escape") setEditingFolderId(null);
              }}
              className="flex-1 text-sm border border-orange-500 rounded px-1 py-0.5 focus:outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate flex-1">{node.name}</span>
          )}
          <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
            {folderCount > 0 &&
              `${folderCount} folder${folderCount !== 1 ? "s" : ""} `}
            {fileCount > 0 && `${fileCount} file${fileCount !== 1 ? "s" : ""}`}
            {folderCount === 0 && fileCount === 0 && "empty"}
          </span>
          {!isEditing && (
            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(openMenu === node.id ? null : node.id);
                }}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-400"
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
              {openMenu === node.id && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(node.id);
                      setEditingFolderName(node.name);
                      setOpenMenu(null);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="w-3.5 h-3.5" /> Rename
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteFolder(node.id);
                      setOpenMenu(null);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
      />
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toastMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {project?.name ?? "Project"} — Document management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <Plus className="w-3.5 h-3.5" /> New Folder
          </button>
          <button
            onClick={() =>
              selectedFolderId
                ? fileRef.current?.click()
                : showToast("Select a folder first")
            }
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Folder tree sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                Folders
              </span>
              <span className="text-[10px] text-gray-400">
                {projectFolders.length}
              </span>
            </div>
            <div className="p-1.5 max-h-[600px] overflow-y-auto">
              {folderTree.map((node) => renderTreeNode(node))}
              {folderTree.length === 0 && (
                <div className="text-center py-8">
                  <Folder className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 mb-2">No folders yet</p>
                  <button
                    onClick={() => setShowNewFolder(true)}
                    className="text-xs text-orange-600 font-medium hover:text-orange-700"
                  >
                    Create first folder →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {selectedFolderId
                    ? (projectFolders.find((f) => f.id === selectedFolderId)
                        ?.name ?? "Select a folder")
                    : "Select a folder"}
                </span>
                {selectedFolderId && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    {filteredFiles.length} file
                    {filteredFiles.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search files..."
                  className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full"
                />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    File Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Version
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Uploaded By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Uploaded Date
                  </th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFiles.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">
                          {f.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-mono font-medium">
                        v{f.version}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {f.uploadedBy}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {fmtDate(f.uploadedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => showToast(`Downloading "${f.name}"…`)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenMenu(openMenu === f.id ? null : f.id)
                            }
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {openMenu === f.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                              <button
                                onClick={() => {
                                  handleRenameFile(f.id);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-3.5 h-3.5" /> Rename
                              </button>
                              <button
                                onClick={() => {
                                  handleReplaceFile(f.id);
                                  setOpenMenu(null);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Replace
                              </button>
                              <hr className="my-1 border-gray-100" />
                              <button
                                onClick={() => handleDeleteFile(f.id)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {!selectedFolderId && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Select a folder to view files
                      </p>
                    </td>
                  </tr>
                )}
                {selectedFolderId && filteredFiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        No files in this folder
                      </p>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="mt-2 text-sm text-orange-600 font-medium hover:text-orange-700"
                      >
                        Upload a file →
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Version history hint */}
          {selectedFolderId && filteredFiles.some((f) => f.version > 1) && (
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs text-orange-700">
                <strong>Version history:</strong> Files with version &gt; 1 have
                previous versions. Click Replace to upload a new version.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                New Folder
              </h3>
              <button
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folder Name
              </label>
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Structural Drawings"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
              {selectedFolderId && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Will be created inside:{" "}
                  <strong>
                    {projectFolders.find((f) => f.id === selectedFolderId)
                      ?.name ?? "root"}
                  </strong>
                </p>
              )}
              {!selectedFolderId && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Will be created at the root level
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation */}
      {confirmDeleteFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Delete Folder?
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  This will permanently delete{" "}
                  <strong>
                    {
                      localFolders.find((f) => f.id === confirmDeleteFolder)
                        ?.name
                    }
                  </strong>{" "}
                  and all its contents.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteFolder(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFolder(confirmDeleteFolder)}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {openMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
}
