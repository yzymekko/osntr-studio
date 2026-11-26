import type { BuildConfig, OsntrEntry } from '../types/osntr';
import { getEffectiveShortcuts } from '../engine/validator';

function escapeAhkString(str: string): string {
  return str
    .replace(/`/g, '``')
    .replace(/"/g, '`"')
    .replace(/\r/g, '`r')
    .replace(/\n/g, '`n')
    .replace(/\t/g, '`t');
}

function formatHotstringLine(
  opts: string,
  shortcut: string,
  output: string,
  note?: string
): string {
  const escapedShortcut = escapeAhkString(shortcut);
  const escapedOutput = escapeAhkString(output);
  const comment = note ? ` ; ${note.replace(/[\r\n]+/g, ' ')}` : '';
  return `Hotstring("${opts}${escapedShortcut}", "${escapedOutput}")${comment}`;
}

export function buildAhkScript(entries: OsntrEntry[], config: BuildConfig): string {
  const opts = config.ahkOmitEndChar ? ':CTO:' : ':CT:';
  const endChars = config.ahkEndChars || ' ';
  const lines: string[] = [];

  lines.push('; ============================================================================');
  lines.push('; OSNTR v0.8.1 - AutoHotkey v2 Script');
  lines.push(`; Mode: ${config.ahkImeMode === 'ime' ? 'IME 한영 구분 모드 (Windows IME API)' : '정석 모드 (IME 미감지 · 안정성 최우선)'}`);
  lines.push(`; Entries: ${entries.length}`);
  lines.push('; ============================================================================');
  lines.push('#Requires AutoHotkey v2.0');
  lines.push('#SingleInstance Force');
  lines.push(`Hotstring("EndChars", "${escapeAhkString(endChars)}")`);
  lines.push('');

  if (config.ahkImeMode === 'standard') {
    let currentCategory = '';
    for (const e of entries) {
      if (e.category !== currentCategory) {
        currentCategory = e.category;
        lines.push(`; --- ${currentCategory} ---`);
      }
      const shortcuts = getEffectiveShortcuts(
        e.ahkStandardShortcuts,
        config.ahkIncludeDotAliases
      );
      for (const s of shortcuts) {
        lines.push(formatHotstringLine(opts, s, e.output));
      }
    }
  } else {
    // Mode B: IME Korean/English Detection
    lines.push('IME_IsKorean() {');
    lines.push('    hwnd := WinExist("A")');
    lines.push('    if !hwnd');
    lines.push('        return false');
    lines.push('    hIME := DllCall("imm32\\ImmGetDefaultIMEWnd", "Ptr", hwnd, "Ptr")');
    lines.push('    if !hIME');
    lines.push('        return false');
    lines.push('    return SendMessage(0x0283, 0x0005, 0, , "ahk_id " hIME) != 0');
    lines.push('}');
    lines.push('');

    const koEntries = entries.filter((e) => e.languageScope === 'ko');
    const enEntries = entries.filter((e) => e.languageScope === 'en');
    const bothEntries = entries.filter((e) => e.languageScope === 'both');

    lines.push('; --- [1] 한글 IME 전용 (languageScope == "ko") ---');
    lines.push('#HotIf IME_IsKorean()');
    for (const e of koEntries) {
      const shortcuts = getEffectiveShortcuts(
        e.ahkImeShortcuts,
        config.ahkIncludeDotAliases
      );
      for (const s of shortcuts) {
        lines.push(formatHotstringLine(opts, s, e.output));
      }
    }
    lines.push('');

    lines.push('; --- [2] 영문 IME 전용 (languageScope == "en") ---');
    lines.push('#HotIf !IME_IsKorean()');
    for (const e of enEntries) {
      const shortcuts = getEffectiveShortcuts(
        e.ahkImeShortcuts,
        config.ahkIncludeDotAliases
      );
      for (const s of shortcuts) {
        lines.push(formatHotstringLine(opts, s, e.output));
      }
    }
    lines.push('');

    lines.push('; --- [3] 한영 공통 (languageScope == "both") ---');
    lines.push('#HotIf');
    for (const e of bothEntries) {
      const shortcuts = getEffectiveShortcuts(
        e.ahkImeShortcuts,
        config.ahkIncludeDotAliases
      );
      for (const s of shortcuts) {
        lines.push(formatHotstringLine(opts, s, e.output));
      }
    }
  }

  lines.push('');
  // Prepend UTF-8 BOM for AutoHotkey v2 compatibility on Windows
  return '\uFEFF' + lines.join('\r\n');
}
