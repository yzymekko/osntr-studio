import JSZip from 'jszip';
import type { OsntrEntry } from '../types/osntr';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildPlistXml(entries: OsntrEntry[]): string {
  const dicts = entries
    .map(
      (e) =>
        `\t<dict>\n` +
        `\t\t<key>phrase</key>\n` +
        `\t\t<string>${escapeXml(e.output)}</string>\n` +
        `\t\t<key>shortcut</key>\n` +
        `\t\t<string>${escapeXml(e.macShortcut)}</string>\n` +
        `\t</dict>`
    )
    .join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n` +
    `<plist version="1.0">\n` +
    `<array>\n` +
    `${dicts}\n` +
    `</array>\n` +
    `</plist>\n`
  );
}

export async function buildChunkedPlistZip(
  entries: OsntrEntry[],
  chunkSize: number
): Promise<Blob> {
  const safeSize = Math.max(1, Math.floor(chunkSize));
  const zip = new JSZip();
  const totalParts = Math.max(1, Math.ceil(entries.length / safeSize));

  for (let i = 0; i < totalParts; i++) {
    const chunk = entries.slice(i * safeSize, (i + 1) * safeSize);
    const xml = buildPlistXml(chunk);
    const fileName = `OSNTR_Part${i + 1}_of_${totalParts}.plist`;
    zip.file(fileName, xml);
  }

  return zip.generateAsync({ type: 'blob' });
}
