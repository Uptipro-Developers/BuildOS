import { useRef } from "react";
import { Upload, FileText, X } from "lucide-react";

export function AttachmentsSection({
  files,
  onChange,
}: {
  files: File[];
  onChange: (f: File[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    if (newFiles.length) onChange([...files, ...newFiles]);
    if (ref.current) ref.current.value = "";
  }

  function remove(i: number) {
    onChange(files.filter((_, j) => j !== i));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Attachments{" "}
        <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <input
        ref={ref}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={handleAdd}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-full flex items-center gap-2 border border-dashed border-gray-300 rounded-md px-4 py-3 hover:bg-gray-50 transition-colors justify-center"
      >
        <Upload className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">
          Click to attach files (PDF, images, Word, Excel)
        </span>
      </button>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded px-3 py-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-gray-400 flex-shrink-0">
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
