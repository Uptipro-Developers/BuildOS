import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  /**
   * Detail the decision depends on — the entries a posting would write, the
   * records a delete would take with it. Shown between the description and the
   * buttons, and widens the dialog, because a confirmation that hides what it
   * is about is a confirmation nobody can give meaningfully.
   */
  children?: ReactNode;
  /** Disables the confirm button — for a confirmation whose detail rules it out. */
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Reusable confirmation modal component for application-level confirmations.
 * Replaces window.confirm() for a more professional UX.
 *
 * Usage:
 * const [showConfirm, setShowConfirm] = useState(false);
 *
 * <ConfirmationModal
 *   isOpen={showConfirm}
 *   title="Delete Item?"
 *   description="This action cannot be undone."
 *   isDangerous={true}
 *   isLoading={isDeleting}
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowConfirm(false)}
 * />
 */
export function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDangerous = false,
  isLoading = false,
  children,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      await Promise.resolve(onConfirm());
    } catch (error) {
      console.error("Error in confirmation modal:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`bg-white rounded-2xl shadow-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto ${
          children ? "max-w-lg" : "max-w-sm"
        }`}
      >
        {/* Icon & Title */}
        <div className="flex gap-3">
          {isDangerous && (
            <div className="flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
          )}
          <div className="flex-1">
            <h2
              className={`text-base font-semibold ${isDangerous ? "text-gray-900" : "text-gray-900"}`}
            >
              {title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
            {children}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || confirmDisabled}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDangerous
                ? "bg-red-600 hover:bg-red-700 disabled:hover:bg-red-600"
                : "bg-indigo-600 hover:bg-indigo-700 disabled:hover:bg-indigo-600"
            }`}
          >
            {isLoading && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
