/**
 * printDocument — renders a standalone HTML document and opens the browser's
 * print dialog for it.
 *
 * Several "Download PDF" buttons in the app had no handler at all. A payslip or
 * a payroll run summary is a document, not a spreadsheet, so wiring them to CSV
 * would have been the wrong output. This routes them through the browser's own
 * print pipeline instead, where "Save as PDF" is a first-class destination on
 * every platform we support — a real PDF, with no PDF library and no
 * server-side renderer involved.
 *
 * Rendering happens in an off-screen iframe so the app's DOM and stylesheets are
 * untouched and the page behind the dialog keeps all of its state.
 */

/** Escapes a value for interpolation into document HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Print styles for the generated documents. Deliberately self-contained — the
 * iframe loads no app CSS, so anything used by a caller's markup lives here.
 */
const DOCUMENT_STYLES = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 12px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1, h2 { margin: 0; font-weight: 600; }
  .doc-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 24px; padding-bottom: 12px; margin-bottom: 20px;
    border-bottom: 2px solid #0f766e;
  }
  .doc-title { font-size: 20px; letter-spacing: -0.01em; }
  .doc-subtitle { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
  .doc-meta { font-size: 11px; color: #6b7280; text-align: right; }
  .doc-meta div + div { margin-top: 2px; }
  .doc-meta strong { color: #111827; font-weight: 600; }
  .doc-section { margin-bottom: 20px; }
  .doc-section h2 {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
    color: #6b7280; margin-bottom: 6px;
  }
  table { width: 100%; border-collapse: collapse; }
  table th, table td {
    padding: 7px 8px; text-align: left; border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
  }
  table th {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;
    color: #6b7280; font-weight: 600; background: #f9fafb;
  }
  table td.num, table th.num { text-align: right; white-space: nowrap; }
  table.kv td:first-child { width: 34%; color: #6b7280; }
  tr.total td {
    border-top: 1px solid #d1d5db; border-bottom: none;
    font-weight: 600; padding-top: 9px;
  }
  tr.net td {
    border-top: 2px solid #0f766e; border-bottom: none;
    font-size: 14px; font-weight: 700; color: #0f766e; padding-top: 10px;
  }
  .negative { color: #b91c1c; }
  .doc-foot {
    margin-top: 28px; padding-top: 10px; border-top: 1px solid #e5e7eb;
    font-size: 10px; color: #9ca3af;
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
`;

/**
 * Opens the print dialog for a generated document.
 *
 * @param title    Document title — becomes the default filename when the user
 *                 picks "Save as PDF".
 * @param bodyHtml Document body markup. Interpolate untrusted values through
 *                 {@link escapeHtml}.
 * @throws If the browser refuses to create the print frame.
 */
export function printDocument(title: string, bodyHtml: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("title", title);
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    throw new Error("Unable to open the print view for this document.");
  }

  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8">` +
      `<title>${escapeHtml(title)}</title>` +
      `<style>${DOCUMENT_STYLES}</style></head><body>${bodyHtml}</body></html>`,
  );
  doc.close();

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    frame.remove();
  };
  win.addEventListener("afterprint", cleanup, { once: true });

  // A document.write'd frame fires no dependable load event, so print on the
  // next frame once layout has settled. The timeout is only a backstop for
  // browsers that never fire afterprint — it must outlast the dialog, since
  // removing the frame early cancels the print job.
  requestAnimationFrame(() => {
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
      return;
    }
    window.setTimeout(cleanup, 60_000);
  });
}

/** Builds the standard document header used by every generated document. */
export function documentHeader(
  title: string,
  subtitle: string,
  meta: Array<[string, string]>,
): string {
  const metaHtml = meta
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<div>${escapeHtml(label)}: <strong>${escapeHtml(value)}</strong></div>`,
    )
    .join("");
  return (
    `<div class="doc-header"><div>` +
    `<h1 class="doc-title">${escapeHtml(title)}</h1>` +
    (subtitle ? `<p class="doc-subtitle">${escapeHtml(subtitle)}</p>` : "") +
    `</div><div class="doc-meta">${metaHtml}</div></div>`
  );
}

/** Builds the standard footer. `generatedOn` is passed in already formatted. */
export function documentFooter(generatedOn: string, note?: string): string {
  return (
    `<p class="doc-foot">Generated on ${escapeHtml(generatedOn)} from BuildOS.` +
    (note ? ` ${escapeHtml(note)}` : "") +
    `</p>`
  );
}
