import type { OsntrEntry } from '../types/osntr';
import { hangulToQwerty } from './hangulToQwerty';
import { getEffectiveShortcuts } from './validator';

export type SandboxMode = 'mac' | 'ahk-standard' | 'ahk-ime';

export interface SandboxResult {
  nextText: string;
  matchedEntry: OsntrEntry | null;
  matchedShortcut: string | null;
}

/**
 * Simulates committing a word with Space (or custom endChar) at the end of `currentText`.
 */
export function simulateSpaceCommit(
  currentText: string,
  entries: OsntrEntry[],
  options: {
    mode: SandboxMode;
    imeLang: 'ko' | 'en';
    omitEndChar: boolean;
    includeDotAliases: boolean;
    endChar?: string;
  }
): SandboxResult {
  const endChar = options.endChar ?? ' ';

  // Extract token right before the cursor (end of string, delimited by whitespace/newline)
  const match = currentText.match(/([^\s]+)$/);
  if (!match) {
    return {
      nextText: currentText + endChar,
      matchedEntry: null,
      matchedShortcut: null,
    };
  }

  const rawToken = match[1];
  const prefix = currentText.slice(0, currentText.length - rawToken.length);

  let matchedEntry: OsntrEntry | null = null;
  let matchedShortcut: string | null = null;

  if (options.mode === 'mac') {
    const lowerToken = rawToken.toLowerCase();
    for (const e of entries) {
      if (e.macShortcut.toLowerCase() === lowerToken) {
        matchedEntry = e;
        matchedShortcut = e.macShortcut;
        break;
      }
    }
  } else if (options.mode === 'ahk-standard') {
    // In AHK standard mode, Windows user might type in English or Korean;
    // if they type Hangul in our web sandbox, convert to QWERTY to simulate keystrokes
    const keystrokeToken = hangulToQwerty(rawToken);
    for (const e of entries) {
      const list = getEffectiveShortcuts(e.ahkStandardShortcuts, options.includeDotAliases);
      if (list.includes(keystrokeToken)) {
        matchedEntry = e;
        matchedShortcut = keystrokeToken;
        break;
      }
    }
  } else {
    // ahk-ime mode
    const keystrokeToken = hangulToQwerty(rawToken);
    for (const e of entries) {
      const inScope =
        options.imeLang === 'ko'
          ? e.languageScope === 'ko' || e.languageScope === 'both'
          : e.languageScope === 'en' || e.languageScope === 'both';
      if (!inScope) continue;

      const list = getEffectiveShortcuts(e.ahkImeShortcuts, options.includeDotAliases);
      if (list.includes(keystrokeToken)) {
        matchedEntry = e;
        matchedShortcut = keystrokeToken;
        break;
      }
    }
  }

  if (!matchedEntry) {
    return {
      nextText: currentText + endChar,
      matchedEntry: null,
      matchedShortcut: null,
    };
  }

  const trailing = options.mode !== 'mac' && options.omitEndChar ? '' : endChar;
  return {
    nextText: prefix + matchedEntry.output + trailing,
    matchedEntry,
    matchedShortcut,
  };
}
