import type { LanguageScope, OsntrEntry, RuleScheme } from '../types/osntr';
import { containsHangul, hangulToQwerty } from './hangulToQwerty';

// Detect whether an entry represents one of the 78 lowercase styled/circled letters (ⓐ~ⓩ, 𝗮~𝘇, 𝕒~𝕫)
export function getLowercaseLetterFromOutput(output: string): string | null {
  if (!output) return null;
  const cp = output.codePointAt(0);
  if (cp === undefined) return null;

  // Circled lowercase ⓐ (U+24D0) .. ⓩ (U+24E9)
  if (cp >= 0x24d0 && cp <= 0x24e9) {
    return String.fromCharCode(97 + (cp - 0x24d0));
  }
  // Mathematical Sans-Serif Bold Small 𝗮 (U+1D5EE) .. 𝘇 (U+1D607)
  if (cp >= 0x1d5ee && cp <= 0x1d607) {
    return String.fromCharCode(97 + (cp - 0x1d5ee));
  }
  // Mathematical Double-Struck Small 𝕒 (U+1D552) .. 𝕫 (U+1D56B)
  if (cp >= 0x1d552 && cp <= 0x1d56b) {
    return String.fromCharCode(97 + (cp - 0x1d552));
  }
  return null;
}

function replaceLeading(text: string, from: string, to: string): string {
  if (!from) return to + text;
  if (text.startsWith(from)) {
    return to + text.slice(from.length);
  }
  return text;
}

function replaceTrailing(text: string, from: string, to: string): string {
  if (!from) return text + to;
  if (text.endsWith(from)) {
    return text.slice(0, text.length - from.length) + to;
  }
  return text;
}

function toAhkToken(str: string): string {
  return containsHangul(str) ? hangulToQwerty(str) : str;
}

function buildLowercaseShortcuts(
  baseMacPrefix: string,
  letter: string,
  scheme: RuleScheme
): { mac: string; ahk: string[] } {
  const sep = scheme.lowercaseSeparator;
  const mac =
    scheme.lowercasePosition === 'before'
      ? `${baseMacPrefix}${sep}${letter}`
      : `${baseMacPrefix}${letter}${sep}`;

  const ahkBase = toAhkToken(baseMacPrefix);
  const ahkWithSep = toAhkToken(mac);
  const ahkDirect = `${ahkBase}${letter}`;

  if (scheme.lowercaseKeepDirectInAhk && sep !== '' && ahkDirect !== ahkWithSep) {
    return { mac, ahk: [ahkDirect, ahkWithSep] };
  }
  return { mac, ahk: [ahkWithSep] };
}

/**
 * Losslessly transforms all entries from `prev` RuleScheme to `next` RuleScheme.
 * Preserves personal entries and any unrelated custom entries untouched.
 */
export function applyRuleSchemeTransform(
  entries: OsntrEntry[],
  prev: RuleScheme,
  next: RuleScheme
): OsntrEntry[] {
  const prevSymAhk = toAhkToken(prev.symbolPrefix);
  const nextSymAhk = toAhkToken(next.symbolPrefix);
  const prevBoldAhk = toAhkToken(prev.boldPrefix);
  const nextBoldAhk = toAhkToken(next.boldPrefix);
  const prevDbAhk = toAhkToken(prev.doubleBoldPrefix);
  const nextDbAhk = toAhkToken(next.doubleBoldPrefix);

  return entries.map((entry) => {
    if (entry.group === 'personal') return entry;

    const lowerLetter = getLowercaseLetterFromOutput(entry.output);

    // 1. 산세리프 볼드 (**)
    if (entry.category === '산세리프 볼드 (**)') {
      if (lowerLetter) {
        const built = buildLowercaseShortcuts(next.boldPrefix, lowerLetter, next);
        return {
          ...entry,
          macShortcut: built.mac,
          ahkStandardShortcuts: built.ahk,
          ahkImeShortcuts: built.ahk,
        };
      }
      return {
        ...entry,
        macShortcut: replaceLeading(entry.macShortcut, prev.boldPrefix, next.boldPrefix),
        ahkStandardShortcuts: entry.ahkStandardShortcuts.map((s) =>
          replaceLeading(s, prevBoldAhk, nextBoldAhk)
        ),
        ahkImeShortcuts: entry.ahkImeShortcuts.map((s) =>
          replaceLeading(s, prevBoldAhk, nextBoldAhk)
        ),
      };
    }

    // 2. 이중선 볼드 (//)
    if (entry.category === '이중선 볼드 (//)') {
      if (lowerLetter) {
        const built = buildLowercaseShortcuts(next.doubleBoldPrefix, lowerLetter, next);
        return {
          ...entry,
          macShortcut: built.mac,
          ahkStandardShortcuts: built.ahk,
          ahkImeShortcuts: built.ahk,
        };
      }
      return {
        ...entry,
        macShortcut: replaceLeading(
          entry.macShortcut,
          prev.doubleBoldPrefix,
          next.doubleBoldPrefix
        ),
        ahkStandardShortcuts: entry.ahkStandardShortcuts.map((s) =>
          replaceLeading(s, prevDbAhk, nextDbAhk)
        ),
        ahkImeShortcuts: entry.ahkImeShortcuts.map((s) =>
          replaceLeading(s, prevDbAhk, nextDbAhk)
        ),
      };
    }

    // 3. 알파벳·숫자 기호 세트 (원문자/네모문자 4종)
    const stemPair: [string, string] | null =
      entry.category === '원문자 (빈 원)'
        ? [prev.stemCircledOpen, next.stemCircledOpen]
        : entry.category === '원문자 (채운 원)'
        ? [prev.stemCircledFilled, next.stemCircledFilled]
        : entry.category === '네모문자 (빈 네모)'
        ? [prev.stemSquaredOpen, next.stemSquaredOpen]
        : entry.category === '네모문자 (채운 네모)'
        ? [prev.stemSquaredFilled, next.stemSquaredFilled]
        : null;

    if (stemPair) {
      const [prevStem, nextStem] = stemPair;
      const prevFullMac = prev.symbolPrefix + prevStem;
      const nextFullMac = next.symbolPrefix + nextStem;
      const prevFullAhk = toAhkToken(prevFullMac);
      const nextFullAhk = toAhkToken(nextFullMac);

      if (lowerLetter) {
        const built = buildLowercaseShortcuts(nextFullMac, lowerLetter, next);
        return {
          ...entry,
          macShortcut: built.mac,
          ahkStandardShortcuts: built.ahk,
          ahkImeShortcuts: built.ahk,
        };
      }

      return {
        ...entry,
        macShortcut: replaceLeading(entry.macShortcut, prevFullMac, nextFullMac),
        ahkStandardShortcuts: entry.ahkStandardShortcuts.map((s) =>
          replaceLeading(s, prevFullAhk, nextFullAhk)
        ),
        ahkImeShortcuts: entry.ahkImeShortcuts.map((s) =>
          replaceLeading(s, prevFullAhk, nextFullAhk)
        ),
      };
    }

    // 4. 통화 (접두사 + 접미사)
    if (entry.category === '통화') {
      const prevCurAhk = toAhkToken(prev.currencySuffix);
      const nextCurAhk = toAhkToken(next.currencySuffix);
      return {
        ...entry,
        macShortcut: replaceTrailing(
          replaceLeading(entry.macShortcut, prev.symbolPrefix, next.symbolPrefix),
          prev.currencySuffix,
          next.currencySuffix
        ),
        ahkStandardShortcuts: entry.ahkStandardShortcuts.map((s) =>
          replaceTrailing(
            replaceLeading(s, prevSymAhk, nextSymAhk),
            prevCurAhk,
            nextCurAhk
          )
        ),
        ahkImeShortcuts: entry.ahkImeShortcuts.map((s) =>
          replaceTrailing(
            replaceLeading(s, prevSymAhk, nextSymAhk),
            prevCurAhk,
            nextCurAhk
          )
        ),
      };
    }

    // 5. 그 외 기본 기호·특문 (symbolPrefix 시작 항목)
    if (entry.macShortcut.startsWith(prev.symbolPrefix)) {
      return {
        ...entry,
        macShortcut: replaceLeading(entry.macShortcut, prev.symbolPrefix, next.symbolPrefix),
        ahkStandardShortcuts: entry.ahkStandardShortcuts.map((s) =>
          replaceLeading(s, prevSymAhk, nextSymAhk)
        ),
        ahkImeShortcuts: entry.ahkImeShortcuts.map((s) =>
          replaceLeading(s, prevSymAhk, nextSymAhk)
        ),
      };
    }

    return entry;
  });
}

export interface SchemeChangePreview {
  entryId: string;
  output: string;
  category: string;
  beforeMac: string;
  afterMac: string;
  beforeAhkStd: string;
  afterAhkStd: string;
}

export function getSchemeChangePreviews(
  beforeEntries: OsntrEntry[],
  afterEntries: OsntrEntry[]
): SchemeChangePreview[] {
  const changes: SchemeChangePreview[] = [];
  for (let i = 0; i < beforeEntries.length; i++) {
    const b = beforeEntries[i];
    const a = afterEntries[i];
    if (!a) continue;
    const bStd = b.ahkStandardShortcuts.join(', ');
    const aStd = a.ahkStandardShortcuts.join(', ');
    if (b.macShortcut !== a.macShortcut || bStd !== aStd) {
      changes.push({
        entryId: b.id,
        output: b.output,
        category: b.category,
        beforeMac: b.macShortcut,
        afterMac: a.macShortcut,
        beforeAhkStd: bStd,
        afterAhkStd: aStd,
      });
    }
  }
  return changes;
}

export type CategoryBulkAction =
  | { type: 'scope'; scope: LanguageScope }
  | { type: 'replace'; find: string; replaceWith: string; syncAhk: boolean }
  | { type: 'fe0e'; enabled: boolean };

export function applyCategoryBulkAction(
  entries: OsntrEntry[],
  targetCategory: string,
  action: CategoryBulkAction
): OsntrEntry[] {
  return entries.map((e) => {
    if (targetCategory !== '__ALL__' && e.category !== targetCategory) {
      return e;
    }

    if (action.type === 'scope') {
      return { ...e, languageScope: action.scope };
    }

    if (action.type === 'replace') {
      if (!action.find) return e;
      const nextMac = e.macShortcut.split(action.find).join(action.replaceWith);
      if (nextMac === e.macShortcut) return e;
      if (!action.syncAhk) {
        return { ...e, macShortcut: nextMac };
      }
      const findAhk = toAhkToken(action.find);
      const repAhk = toAhkToken(action.replaceWith);
      return {
        ...e,
        macShortcut: nextMac,
        ahkStandardShortcuts: e.ahkStandardShortcuts.map((s) =>
          s.split(findAhk).join(repAhk)
        ),
        ahkImeShortcuts: e.ahkImeShortcuts.map((s) => s.split(findAhk).join(repAhk)),
      };
    }

    return e;
  });
}
