// CSV im deutschen Excel-Dialekt: Semikolon-getrennt, mit UTF-8-BOM.
const SEPARATOR = ";";

export function escapeCsvField(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const BOM = "\uFEFF";

export function toCsv(rows: string[][]): string {
  const body = rows.map((row) => row.map(escapeCsvField).join(SEPARATOR)).join("\r\n");
  return `${BOM}${body}\r\n`;
}
