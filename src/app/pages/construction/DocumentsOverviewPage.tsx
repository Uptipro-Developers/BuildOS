import { useNavigate } from "react-router";
import {
  FolderKanban,
  FileText,
  Upload,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  projects,
  documentFiles as mockFiles,
  documentFolders as mockFolders,
  fmtDate,
} from "./mockData";
import { exportCSV } from "../../utils/exportCSV";
import { listDocumentFiles } from "../../api/document-files";
import { listDocumentFolders } from "../../api/document-folders";

export function DocumentsOverviewPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [documentFiles, setDocumentFiles] = useState(mockFiles);
  const [documentFolders, setDocumentFolders] = useState(mockFolders);
  useEffect(() => {
    let active = true;
    listDocumentFiles()
      .then((d) => {
        if (active && d.length > 0) setDocumentFiles(d);
      })
      .catch(() => {});
    listDocumentFolders()
      .then((d) => {
        if (active && d.length > 0) setDocumentFolders(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const projectsWithDocs = new Set(documentFiles.map((f) => f.projectId)).size;
  const totalFolders = documentFolders.length;
  const totalFiles = documentFiles.length;

  const stats = [
    { icon: FolderKanban, label: "Total Folders", value: totalFolders },
    { icon: FileText, label: "Total Files", value: totalFiles },
    {
      icon: Upload,
      label: "Projects with docs",
      value: projectsWithDocs,
      color: "#E8973A",
    },
  ];

  const filtered = documentFiles.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const getFolderName = (folderId: string): string => {
    const folder = documentFolders.find((df) => df.id === folderId);
    return folder?.name ?? folderId;
  };

  return (
    <div
      style={{ backgroundColor: "#F7F8FA" }}
      className="min-h-screen p-6 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1A202C" }}>
          Documents Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "#718096" }}>
          Documents across all projects
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-white rounded-lg p-4 flex items-center gap-3"
              style={{ border: "1px solid #E2E8F0" }}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: s.color ?? "#718096" }}
              />
              <div>
                <p className="text-xl font-bold" style={{ color: "#1A202C" }}>
                  {s.value}
                </p>
                <p className="text-xs" style={{ color: "#718096" }}>
                  {s.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="bg-white rounded-lg p-4"
        style={{ border: "1px solid #E2E8F0" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#718096" }}
            />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
              style={{ border: "1px solid #E2E8F0", color: "#1A202C" }}
            />
          </div>
          <button
            onClick={() => {
              const rows = filtered.map((f) => {
                const proj = projects.find((p) => p.id === f.projectId);
                return [
                  f.name,
                  proj?.name ?? f.projectId,
                  getFolderName(f.folderId),
                  String(f.version),
                  f.uploadedBy,
                  fmtDate(f.uploadedAt),
                ];
              });
              exportCSV(
                "documents",
                [
                  "File Name",
                  "Project",
                  "Folder",
                  "Version",
                  "Uploaded By",
                  "Date",
                ],
                rows,
              );
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  backgroundColor: "#F7F8FA",
                  borderBottom: "1px solid #E2E8F0",
                }}
              >
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  File Name
                </th>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Project
                </th>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Folder
                </th>
                <th
                  className="text-center px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Version
                </th>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Uploaded By
                </th>
                <th
                  className="text-left px-4 py-3 font-medium"
                  style={{ color: "#718096" }}
                >
                  Date
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((file, i) => {
                const project = projects.find((p) => p.id === file.projectId);
                return (
                  <tr
                    key={file.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      borderBottom:
                        i < filtered.length - 1 ? "1px solid #E2E8F0" : "none",
                    }}
                    onClick={() =>
                      navigate(
                        `/apps/construction/projects/${file.projectId}/documents`,
                      )
                    }
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "#1A202C" }}
                    >
                      <div className="flex items-center gap-2">
                        <FileText
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: "#718096" }}
                        />
                        <span className="truncate max-w-[220px]">
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {project?.name ?? file.projectId}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {getFolderName(file.folderId)}
                    </td>
                    <td className="text-center px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#E8F0FE", color: "#1A5BB3" }}
                      >
                        v{file.version}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {file.uploadedBy}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {fmtDate(file.uploadedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight
                        className="w-4 h-4"
                        style={{ color: "#718096" }}
                      />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-8 text-sm"
                    style={{ color: "#718096" }}
                  >
                    No documents found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
