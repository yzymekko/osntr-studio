import type { OsntrEntry } from '../types/osntr';

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsvContent(entries: OsntrEntry[]): string {
  const rows = ['입력,출력'];
  for (const e of entries) {
    rows.push(`${escapeCsvCell(e.macShortcut)},${escapeCsvCell(e.output)}`);
  }
  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}

export function buildJsonBackup(entries: OsntrEntry[]): string {
  return JSON.stringify(
    {
      version: '0.8.1',
      exportedAt: new Date().toISOString(),
      count: entries.length,
      entries,
    },
    null,
    2
  );
}
