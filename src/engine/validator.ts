import type { OsntrEntry, ValidationIssue, ValidationResult } from '../types/osntr';

export function validateEntries(
  entries: OsntrEntry[],
  options: { includeDotAliases?: boolean } = {}
): ValidationResult {
  const { includeDotAliases = true } = options;
  const errors: ValidationIssue[] = [];
  const infos: ValidationIssue[] = [];
  const entryIssuesMap: Record<string, ValidationIssue[]> = {};

  const addIssue = (issue: ValidationIssue) => {
    if (issue.severity === 'info') {
      infos.push(issue);
    } else {
      errors.push(issue);
    }
    for (const entryId of issue.entryIds) {
      if (!entryIssuesMap[entryId]) {
        entryIssuesMap[entryId] = [];
      }
      entryIssuesMap[entryId].push(issue);
    }
  };

  // 1. Mac/iOS: case-insensitive macShortcut check
  const macMap = new Map<string, OsntrEntry[]>();
  for (const e of entries) {
    const key = e.macShortcut.trim().toLowerCase();
    if (!key) continue;
    const list = macMap.get(key) ?? [];
    list.push(e);
    macMap.set(key, list);
  }
  for (const [key, list] of macMap.entries()) {
    if (list.length > 1) {
      addIssue({
        id: `mac_${key}`,
        severity: 'error',
        platform: 'mac',
        shortcut: key,
        entryIds: list.map((x) => x.id),
        message: `Mac/iOS 대소문자 미구분 중복: "${list.map((x) => x.macShortcut).join('" vs "')}"`,
      });
    }
  }

  // 2. AHK Standard: case-sensitive check across all ahkStandardShortcuts
  const stdMap = new Map<string, OsntrEntry[]>();
  for (const e of entries) {
    const shortcuts = getEffectiveShortcuts(e.ahkStandardShortcuts, includeDotAliases);
    for (const s of shortcuts) {
      if (!s) continue;
      const list = stdMap.get(s) ?? [];
      list.push(e);
      stdMap.set(s, list);
    }
  }
  for (const [shortcut, list] of stdMap.entries()) {
    if (list.length > 1) {
      addIssue({
        id: `ahk_std_${shortcut}`,
        severity: 'error',
        platform: 'ahk-standard',
        shortcut,
        entryIds: list.map((x) => x.id),
        message: `AHK 정석 모드 중복 (대소문자 구분): "${shortcut}"`,
      });
    }
  }

  // 3. AHK IME: independent check for Korean block (ko + both) and English block (en + both)
  const imeKoMap = new Map<string, OsntrEntry[]>();
  const imeEnMap = new Map<string, OsntrEntry[]>();

  for (const e of entries) {
    const shortcuts = getEffectiveShortcuts(e.ahkImeShortcuts, includeDotAliases);
    for (const s of shortcuts) {
      if (!s) continue;
      if (e.languageScope === 'ko' || e.languageScope === 'both') {
        const list = imeKoMap.get(s) ?? [];
        list.push(e);
        imeKoMap.set(s, list);
      }
      if (e.languageScope === 'en' || e.languageScope === 'both') {
        const list = imeEnMap.get(s) ?? [];
        list.push(e);
        imeEnMap.set(s, list);
      }
    }
  }

  for (const [shortcut, list] of imeKoMap.entries()) {
    if (list.length > 1) {
      addIssue({
        id: `ahk_ime_ko_${shortcut}`,
        severity: 'error',
        platform: 'ahk-ime-ko',
        shortcut,
        entryIds: list.map((x) => x.id),
        message: `AHK IME 한글 블록 중복: "${shortcut}"`,
      });
    }
  }

  for (const [shortcut, list] of imeEnMap.entries()) {
    if (list.length > 1) {
      addIssue({
        id: `ahk_ime_en_${shortcut}`,
        severity: 'error',
        platform: 'ahk-ime-en',
        shortcut,
        entryIds: list.map((x) => x.id),
        message: `AHK IME 영문 블록 중복: "${shortcut}"`,
      });
    }
  }

  // 4. Prefix overlap check (Info level only, since OSNTR uses Space-commit)
  const macKeys = Array.from(macMap.keys()).sort((a, b) => a.length - b.length);
  for (let i = 0; i < macKeys.length; i++) {
    const shorter = macKeys[i];
    if (shorter.length < 2) continue;
    const matchedLonger: string[] = [];
    for (let j = i + 1; j < macKeys.length; j++) {
      if (macKeys[j].startsWith(shorter)) {
        matchedLonger.push(macKeys[j]);
      }
    }
    if (matchedLonger.length > 0) {
      const shortEntries = macMap.get(shorter) ?? [];
      infos.push({
        id: `prefix_${shorter}`,
        severity: 'info',
        platform: 'prefix',
        shortcut: shorter,
        entryIds: shortEntries.map((x) => x.id),
        message: `접두사 겹침 (스페이스 확정 방식이므로 정상): "${shorter}" → ${matchedLonger.slice(0, 3).join(', ')}${matchedLonger.length > 3 ? ` 외 ${matchedLonger.length - 3}건` : ''}`,
      });
    }
  }

  return { errors, infos, entryIssuesMap };
}

export function getEffectiveShortcuts(
  shortcuts: string[],
  includeDotAliases: boolean
): string[] {
  if (includeDotAliases || shortcuts.length <= 1) {
    return shortcuts;
  }
  // If dot alias exists alongside non-dot primary (e.g. ["**a", "**.a"]), filter out dot variant
  const nonDot = shortcuts.filter((s) => !/^(;d|\*\*|\/\/)\.[a-z]$/.test(s));
  return nonDot.length > 0 ? nonDot : shortcuts;
}
