// U+FE0E (Variation Selector-15) Text Presentation management
// Spec 4-1: 19 symbols requiring forced text presentation to prevent color emoji rendering

export const VARIATION_SELECTOR_TEXT = '\uFE0E';
export const VARIATION_SELECTOR_EMOJI = '\uFE0F';

export const TEXT_PRESENTATION_TARGETS = new Set<string>([
  '◀', // U+25C0
  '▶', // U+25B6
  '♠', // U+2660
  '♦', // U+2666
  '♥', // U+2665
  '♣', // U+2663
  '⬆', // U+2B06
  '⬇', // U+2B07
  '⬅', // U+2B05
  '➡', // U+27A1
  '☑', // U+2611
  '☒', // U+2612
  '✖', // U+2716
  '↩', // U+21A9
  '☎', // U+260E
  '🅰', // U+1F170
  '🅱', // U+1F171
  '🅾', // U+1F17E
  '🅿', // U+1F17F
]);

export function stripVariationSelectors(text: string): string {
  return text.replace(/[\uFE0E\uFE0F]/g, '');
}

export function hasTextPresentation(text: string): boolean {
  return text.includes(VARIATION_SELECTOR_TEXT);
}

export function needsTextPresentationRecommendation(text: string): boolean {
  const clean = stripVariationSelectors(text);
  for (const ch of clean) {
    if (TEXT_PRESENTATION_TARGETS.has(ch)) {
      return true;
    }
  }
  return false;
}

export function applyTextPresentation(text: string, force: boolean): string {
  const clean = stripVariationSelectors(text);
  if (!clean) return clean;
  if (!force) return clean;
  return clean + VARIATION_SELECTOR_TEXT;
}
