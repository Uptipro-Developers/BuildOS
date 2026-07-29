/** A cell value that keeps its type all the way into the spreadsheet. */
export type CsvCell = string | number | Date | null | undefined;

/**
 * Quotes a cell only when it needs it. Quoting every cell (the previous
 * behaviour) makes Excel treat numbers and dates as text, so exported columns
 * can't be summed, sorted or filtered numerically.
 */
function formatCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return "";

  // Dates go out as ISO yyyy-mm-dd, which every spreadsheet parses as a date
  // regardless of the reader's locale.
  if (cell instanceof Date) {
    return Number.isNaN(cell.getTime()) ? "" : cell.toISOString().slice(0, 10);
  }

  if (typeof cell === "number") {
    return Number.isFinite(cell) ? String(cell) : "";
  }

  const text = String(cell);
  // Quote only when the value would otherwise break the row: separators,
  // quotes, newlines, or leading/trailing spaces Excel would trim.
  const needsQuoting = /[",\r\n]/.test(text) || text !== text.trim();
  return needsQuoting ? `"${text.replace(/"/g, '""')}"` : text;
}

/** yyyy-mm-dd_hh-mm in local time, for unique, sortable filenames. */
function fileTimestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

/**
 * Exports rows to a CSV file download.
 *
 * Pass raw values — numbers as numbers and dates as Date/ISO strings — not
 * display-formatted text. A pre-formatted "₦245,000" exports as unusable text,
 * whereas 245000 stays a real number the recipient can total in Excel. Put the
 * unit in the header instead (e.g. "Amount (NGN)").
 *
 * @param filename - Base file name; a timestamp and .csv are appended
 * @param headers  - Column header labels
 * @param rows     - Data rows (each row is an array of cell values)
 */
export function exportCSV(filename: string, headers: string[], rows: CsvCell[][]) {
  const content = [headers, ...rows]
    .map((row) => row.map(formatCell).join(","))
    .join("\r\n");

  // Prepend a UTF-8 BOM so Excel reads ₦ and accented characters correctly
  // instead of mojibake.
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${fileTimestamp()}.csv`;
  a.style.display = "none";
  // Firefox and Safari ignore a click on an anchor that isn't in the document,
  // and revoking the URL synchronously can cancel a download already in flight.
  document.body.appendChild(a);
  a.click();
  requestAnimationFrame(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
