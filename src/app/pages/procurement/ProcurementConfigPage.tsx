import { Hash } from "lucide-react";
import { NumberingConfigPanel } from "../../components/NumberingConfigPanel";

export function ProcurementConfigPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Hash className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-semibold text-gray-900">Procurement Configuration</h1>
          </div>
          <p className="text-sm text-gray-500">
            Module-specific configuration for the Procurement module. Access is permission-controlled.
          </p>
        </div>
      </div>

      {/* Module numbering.

          This card previously filtered with
          `configs.filter(cfg => cfg.module.startsWith("Procurement"))`, and no
          module is named that way — the sequences here are MaterialRequest,
          PurchaseOrder, PurchaseRequest, RFQ, Quote, PurchaseInvoice and
          GoodsReceipt — so the list rendered empty and nothing could be
          configured. The shared panel selects by the `app` a sequence belongs to,
          and persists to the server. */}
      <NumberingConfigPanel app="procurement" accent="blue" />
    </div>
  );
}
