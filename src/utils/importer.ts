import { containsHangul, hangulToQwerty } from '../engine/hangulToQwerty';
import { needsTextPresentationRecommendation, hasTextPresentation } from '../engine/textPresentation';
import type { OsntrEntry } from '../types/osntr';

export interface ParsedImportItem {
  macShortcut: string;
  output: string;
  category?: string;
  group?: 'core' | 'personal';
  note?: string;
  fullEntry?: OsntrEntry;
}

export interface DiffItem {
  id: string;
  status: 'added' | 'modified' | 'removed' | 'unchanged';
  macShortcut: string;
  incoming?: ParsedImportItem;
  existing?: OsntrEntry;
  selected: boolean;
}

export function parseImportFile(fileName: string, content: string): ParsedImportItem[] {
  const lower = fileName.toLowerCase();
  const cleanContent = content.replace(/^\uFEFF/, '');

  if (lower.endsWith('.json')) {
    const parsed = JSON.parse(cleanContent);
    const list: OsntrEntry[] = Array.isArray(parsed) ? parsed : parsed.entries ?? [];
    return list.map((e) => ({
      macShortcut: e.macShortcut,
      output: e.output,
      category: e.category,
      group: e.group,
      note: e.note,
      fullEntry: e,
    }));
  }

  if (lower.endsWith('.plist')) {
    const items: ParsedImportItem[] = [];
    const doc = new DOMParser().parseFromString(cleanContent, 'text/xml');
    const dicts = Array.from(doc.querySelectorAll('array > dict'));
    for (const dict of dicts) {
      const children = Array.from(dict.children);
      let phrase = '';
      let shortcut = '';
      for (let i = 0; i < children.length - 1; i++) {
        if (children[i].tagName === 'key') {
          const keyName = children[i].textContent?.trim();
          const val = children[i + 1].textContent ?? '';
          if (keyName === 'phrase') phrase = val;
          if (keyName === 'shortcut') shortcut = val;
        }
      }
      if (shortcut) {
        items.push({ macShortcut: shortcut, output: phrase });
      }
    }
    return items;
  }

  if (lower.endsWith('.ahk')) {
    const items: ParsedImportItem[] = [];
    const lines = cleanContent.split(/\r?\n/);
    const hotstringFnRegex = /^\s*Hotstring\(\s*"(?::[^"]*:)?([^"]+)"\s*,\s*"([^"]*)"\s*\)/i;
    const hotstringColonRegex = /^\s*:[^:]*:([^:]+)::(.*)$/;

    for (const line of lines) {
      const fnMatch = line.match(hotstringFnRegex);
      if (fnMatch) {
        items.push({
          macShortcut: unescapeAhk(fnMatch[1]),
          output: unescapeAhk(fnMatch[2]),
        });
        continue;
      }
      const colonMatch = line.match(hotstringColonRegex);
      if (colonMatch) {
        items.push({
          macShortcut: colonMatch[1],
          output: colonMatch[2].trim(),
        });
      }
    }
    return items;
  }

  // Default: CSV (입력,출력)
  const items: ParsedImportItem[] = [];
  const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && (line.startsWith('입력,') || line.toLowerCase().startsWith('shortcut,'))) {
      continue;
    }
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;
    const macShortcut = unquoteCsv(line.slice(0, commaIdx));
    const output = unquoteCsv(line.slice(commaIdx + 1));
    if (macShortcut) {
      items.push({ macShortcut, output });
    }
  }
  return items;
}

function unquoteCsv(cell: string): string {
  const trimmed = cell.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

function unescapeAhk(str: string): string {
  return str
    .replace(/`"/g, '"')
    .replace(/`n/g, '\n')
    .replace(/`r/g, '\r')
    .replace(/`t/g, '\t')
    .replace(/``/g, '`');
}

export function computeImportDiff(
  existingEntries: OsntrEntry[],
  incomingItems: ParsedImportItem[]
): DiffItem[] {
  const existingMap = new Map<string, OsntrEntry>();
  for (const e of existingEntries) {
    existingMap.set(e.macShortcut.toLowerCase(), e);
  }

  const seenKeys = new Set<string>();
  const diffs: DiffItem[] = [];

  for (const item of incomingItems) {
    const key = item.macShortcut.toLowerCase();
    seenKeys.add(key);
    const existing = existingMap.get(key);

    if (!existing) {
      diffs.push({
        id: `add_${key}_${diffs.length}`,
        status: 'added',
        macShortcut: item.macShortcut,
        incoming: item,
        selected: true,
      });
    } else if (existing.output !== item.output) {
      diffs.push({
        id: `mod_${key}_${diffs.length}`,
        status: 'modified',
        macShortcut: item.macShortcut,
        incoming: item,
        existing,
        selected: true,
      });
    } else {
      diffs.push({
        id: `unc_${key}_${diffs.length}`,
        status: 'unchanged',
        macShortcut: item.macShortcut,
        incoming: item,
        existing,
        selected: false,
      });
    }
  }

  for (const e of existingEntries) {
    const key = e.macShortcut.toLowerCase();
    if (!seenKeys.has(key)) {
      diffs.push({
        id: `rem_${key}`,
        status: 'removed',
        macShortcut: e.macShortcut,
        existing: e,
        selected: false, // Safer default: don't delete existing rules unless user checks them
      });
    }
  }

  return diffs;
}

export function buildEntryFromImport(item: ParsedImportItem): OsntrEntry {
  if (item.fullEntry) return item.fullEntry;
  const isKo = containsHangul(item.macShortcut);
  const qwerty = isKo ? hangulToQwerty(item.macShortcut) : item.macShortcut;
  const forceFe0e =
    hasTextPresentation(item.output) || needsTextPresentationRecommendation(item.output);

  return {
    id: `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    group: item.group ?? 'core',
    category: item.category ?? '가져온 항목',
    output: item.output,
    forceTextPresentation: forceFe0e,
    languageScope: isKo ? 'ko' : /[a-zA-Z]/.test(item.macShortcut) ? 'en' : 'both',
    macShortcut: item.macShortcut,
    ahkStandardShortcuts: [qwerty],
    ahkImeShortcuts: [qwerty],
    note: item.note,
  };
}
