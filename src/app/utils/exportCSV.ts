/**
 * Exports an array of rows to a CSV file download.
 * @param filename - File name without .csv extension
 * @param headers - Column header labels
 * @param rows - Data rows (each row is an array of cell values)
 */
export function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (cell: string) => `"${String(cell ?? "").replace(/"/g, '""')}"`;
  const content = [headers, ...rows].map(row => row.map(escape).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
