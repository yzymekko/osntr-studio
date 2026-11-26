import { describe, expect, it } from 'vitest';
import { SEED_ENTRIES } from '../../data/seed_v0.8.1';
import { buildAhkScript } from '../../exporters/exportAhk';
import { buildPlistXml } from '../../exporters/exportPlist';
import { hangulToQwerty } from '../hangulToQwerty';
import { simulateSpaceCommit } from '../sandboxEngine';
import { applyTextPresentation, needsTextPresentationRecommendation } from '../textPresentation';
import { validateEntries } from '../validator';

describe('OSNTR Core Engine', () => {
  it('loads all 408 seed entries with zero validation errors', () => {
    expect(SEED_ENTRIES.length).toBe(408);
    const result = validateEntries(SEED_ENTRIES);
    expect(result.errors).toEqual([]);
    expect(result.infos.length).toBeGreaterThan(0);
  });

  it('converts Hangul syllables and standalone Jamo to 2-beolsik QWERTY', () => {
    expect(hangulToQwerty(';도씨')).toBe(';ehTl');
    expect(hangulToQwerty(';ㅇㅎ')).toBe(';dg');
    expect(hangulToQwerty(';ㅁㅍ')).toBe(';av');
    expect(hangulToQwerty(';ㅏㅌ')).toBe(';kx');
    expect(hangulToQwerty(';ㅗㅂ')).toBe(';hq');
    expect(hangulToQwerty(';[ㅂ')).toBe(';[q');
  });

  it('detects and applies U+FE0E text presentation', () => {
    expect(needsTextPresentationRecommendation('◀')).toBe(true);
    expect(needsTextPresentationRecommendation('□')).toBe(false);
    expect(applyTextPresentation('◀', true)).toBe('◀\uFE0E');
    expect(applyTextPresentation('◀\uFE0E', false)).toBe('◀');
  });

  it('simulates Space commit across Mac, AHK Standard, and AHK IME modes', () => {
    // Mac mode (case-insensitive)
    const macRes = simulateSpaceCommit('hello ;ㅇㅎ', SEED_ENTRIES, {
      mode: 'mac',
      imeLang: 'ko',
      omitEndChar: false,
      includeDotAliases: true,
    });
    expect(macRes.nextText).toBe('hello ◉ ');

    // AHK Standard mode (case-sensitive ;Dg vs ;dg)
    const stdBullseye = simulateSpaceCommit(';Dg', SEED_ENTRIES, {
      mode: 'ahk-standard',
      imeLang: 'en',
      omitEndChar: false,
      includeDotAliases: true,
    });
    expect(stdBullseye.nextText).toBe('◉ ');

    const stdCircledG = simulateSpaceCommit(';dg', SEED_ENTRIES, {
      mode: 'ahk-standard',
      imeLang: 'en',
      omitEndChar: false,
      includeDotAliases: true,
    });
    expect(stdCircledG.nextText).toBe('ⓖ ');

    // AHK IME mode: ;dg in Korean IME -> ◉, in English IME -> ⓖ
    const imeKo = simulateSpaceCommit(';ㅇㅎ', SEED_ENTRIES, {
      mode: 'ahk-ime',
      imeLang: 'ko',
      omitEndChar: true,
      includeDotAliases: true,
    });
    expect(imeKo.nextText).toBe('◉');

    const imeEn = simulateSpaceCommit(';dg', SEED_ENTRIES, {
      mode: 'ahk-ime',
      imeLang: 'en',
      omitEndChar: false,
      includeDotAliases: true,
    });
    expect(imeEn.nextText).toBe('ⓖ ');
  });

  it('builds valid plist XML with phrase before shortcut and escaped XML entities', () => {
    const xml = buildPlistXml(SEED_ENTRIES.slice(0, 5));
    expect(xml).toContain('<key>phrase</key>');
    expect(xml).toContain('<key>shortcut</key>');
    const lessThanEntry = SEED_ENTRIES.find((e) => e.macShortcut === ';<');
    expect(lessThanEntry).toBeDefined();
    const ltXml = buildPlistXml([lessThanEntry!]);
    expect(ltXml).toContain('<string>;&lt;</string>');
  });

  it('builds AHK v2 script for both Standard and IME modes', () => {
    const stdAhk = buildAhkScript(SEED_ENTRIES, {
      includePersonal: true,
      plistChunkSize: 100,
      ahkImeMode: 'standard',
      ahkEndChars: ' ',
      ahkOmitEndChar: false,
      ahkIncludeDotAliases: true,
    });
    expect(stdAhk).toContain('#Requires AutoHotkey v2.0');
    expect(stdAhk).toContain('Hotstring(":CT:;Dg", "◉")');
    expect(stdAhk).not.toContain('IME_IsKorean()');

    const imeAhk = buildAhkScript(SEED_ENTRIES, {
      includePersonal: true,
      plistChunkSize: 100,
      ahkImeMode: 'ime',
      ahkEndChars: ' ',
      ahkOmitEndChar: true,
      ahkIncludeDotAliases: true,
    });
    expect(imeAhk).toContain('IME_IsKorean()');
    expect(imeAhk).toContain('#HotIf IME_IsKorean()');
    expect(imeAhk).toContain('#HotIf !IME_IsKorean()');
    expect(imeAhk).toContain('Hotstring(":CTO:;dg", "◉")');
  });
});
