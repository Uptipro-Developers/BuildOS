import { ExternalLink } from "lucide-react";

const TRUEBRIDGE_ADMIN_URL = "https://thuebridge-admin-ten.vercel.app/";

/**
 * Floating button rendered once at the app root (see App.tsx), so it stays
 * fixed in the bottom-right corner across every page. A plain anchor with
 * target="_blank" rather than an onClick + window.open, so ctrl/cmd-click,
 * middle-click and "open in new tab" all work the normal browser way.
 */
export function TruebridgeAdminButton() {
    return (
        <a
            href={TRUEBRIDGE_ADMIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Truebridge Admin"
            aria-label="Open Truebridge Admin in a new tab"
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-teal-700 text-white shadow-lg hover:bg-teal-800 hover:scale-105 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
            <ExternalLink className="w-5 h-5" />
        </a>
    );
}
