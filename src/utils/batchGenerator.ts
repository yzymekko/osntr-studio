import { containsHangul, hangulToQwerty } from '../engine/hangulToQwerty';
import { applyTextPresentation, needsTextPresentationRecommendation } from '../engine/textPresentation';
import type { EntryGroup, OsntrEntry } from '../types/osntr';

export type BatchPatternType = 'A-Z' | 'a-z' | '0-N' | 'directions';

export interface BatchGeneratorParams {
  patternType: BatchPatternType;
  shortcutPrefix: string; // e.g. ";m" or "**"
  outputBaseCodePoint: string; // e.g. "1F130" (hex) or comma-separated outputs
  outputListText: string; // e.g. "↑,↓,←,→" or empty if using baseCodePoint
  rangeMax?: number; // For 0-N (e.g. 9 or 15)
  useDotForLowercase: boolean;
  category: string;
  group: EntryGroup;
  forceTextPresentation: boolean;
}

const DIRECTION_VOWELS = [
  { label: '위', jamo: 'ㅗ' },
  { label: '아래', jamo: 'ㅜ' },
  { label: '좌', jamo: 'ㅓ' },
  { label: '우', jamo: 'ㅏ' },
];

export function generateBatchEntries(params: BatchGeneratorParams): OsntrEntry[] {
  const keys: string[] = [];
  if (params.patternType === 'A-Z') {
    for (let i = 0; i < 26; i++) keys.push(String.fromCharCode(65 + i));
  } else if (params.patternType === 'a-z') {
    for (let i = 0; i < 26; i++) keys.push(String.fromCharCode(97 + i));
  } else if (params.patternType === '0-N') {
    const max = Math.max(0, Math.min(99, params.rangeMax ?? 9));
    for (let i = 0; i <= max; i++) keys.push(String(i));
  } else {
    for (const d of DIRECTION_VOWELS) keys.push(d.jamo);
  }

  const explicitOutputs = params.outputListText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const baseCp = parseInt(params.outputBaseCodePoint.replace(/^U\+/i, ''), 16);

  return keys.map((k, idx) => {
    let rawOutput = '';
    if (explicitOutputs.length > 0) {
      rawOutput = explicitOutputs[idx] ?? explicitOutputs[explicitOutputs.length - 1];
    } else if (!Number.isNaN(baseCp)) {
      rawOutput = String.fromCodePoint(baseCp + idx);
    } else {
      rawOutput = k;
    }

    const shouldForce =
      params.forceTextPresentation || needsTextPresentationRecommendation(rawOutput);
    const output = applyTextPresentation(rawOutput, shouldForce);

    const isLowercase = params.patternType === 'a-z';
    const macShortcut =
      isLowercase && params.useDotForLowercase
        ? `${params.shortcutPrefix}.${k}`
        : `${params.shortcutPrefix}${k}`;

    const hasHangul = containsHangul(macShortcut);
    const noDotShortcut = `${params.shortcutPrefix}${k}`;
    const ahkList = isLowercase && params.useDotForLowercase
      ? [noDotShortcut, macShortcut]
      : [hasHangul ? hangulToQwerty(macShortcut) : macShortcut];

    return {
      id: `batch_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      group: params.group,
      category: params.category || '일괄 생성',
      output,
      forceTextPresentation: shouldForce,
      languageScope: hasHangul ? 'ko' : /[a-zA-Z]/.test(macShortcut) ? 'en' : 'both',
      macShortcut,
      ahkStandardShortcuts: ahkList,
      ahkImeShortcuts: ahkList,
    };
  });
}
