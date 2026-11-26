// Two-set (두벌식) Korean Hangul to QWERTY keystroke converter

const CHOSEONG_QWERTY = [
  'r', // ㄱ
  'R', // ㄲ
  's', // ㄴ
  'e', // ㄷ
  'E', // ㄸ
  'f', // ㄹ
  'a', // ㅁ
  'q', // ㅂ
  'Q', // ㅃ
  't', // ㅅ
  'T', // ㅆ
  'd', // ㅇ
  'w', // ㅈ
  'W', // ㅉ
  'c', // ㅊ
  'z', // ㅋ
  'x', // ㅌ
  'v', // ㅍ
  'g', // ㅎ
] as const;

const JUNGSEONG_QWERTY = [
  'k',  // ㅏ
  'o',  // ㅐ
  'i',  // ㅑ
  'O',  // ㅒ
  'j',  // ㅓ
  'p',  // ㅔ
  'u',  // ㅕ
  'P',  // ㅖ
  'h',  // ㅗ
  'hk', // ㅘ
  'ho', // ㅙ
  'hl', // ㅚ
  'y',  // ㅛ
  'n',  // ㅜ
  'nj', // ㅝ
  'np', // ㅞ
  'nl', // ㅟ
  'b',  // ㅠ
  'm',  // ㅡ
  'ml', // ㅢ
  'l',  // ㅣ
] as const;

const JONGSEONG_QWERTY = [
  '',   // (none)
  'r',  // ㄱ
  'R',  // ㄲ
  'rt', // ㄳ
  's',  // ㄴ
  'sw', // ㄵ
  'sg', // ㄶ
  'e',  // ㄷ
  'f',  // ㄹ
  'fr', // ㄺ
  'fa', // ㄻ
  'fq', // ㄼ
  'ft', // ㄽ
  'fx', // ㄾ
  'fv', // ㄿ
  'fg', // ㅀ
  'a',  // ㅁ
  'q',  // ㅂ
  'qt', // ㅄ
  't',  // ㅅ
  'T',  // ㅆ
  'd',  // ㅇ
  'w',  // ㅈ
  'c',  // ㅊ
  'z',  // ㅋ
  'x',  // ㅌ
  'v',  // ㅍ
  'g',  // ㅎ
] as const;

// Standalone Compatibility Jamo (U+3131..U+3163)
const COMPAT_JAMO_MAP: Record<string, string> = {
  'ㄱ': 'r',
  'ㄲ': 'R',
  'ㄳ': 'rt',
  'ㄴ': 's',
  'ㄵ': 'sw',
  'ㄶ': 'sg',
  'ㄷ': 'e',
  'ㄸ': 'E',
  'ㄹ': 'f',
  'ㄺ': 'fr',
  'ㄻ': 'fa',
  'ㄼ': 'fq',
  'ㄽ': 'ft',
  'ㄾ': 'fx',
  'ㄿ': 'fv',
  'ㅀ': 'fg',
  'ㅁ': 'a',
  'ㅂ': 'q',
  'ㅃ': 'Q',
  'ㅄ': 'qt',
  'ㅅ': 't',
  'ㅆ': 'T',
  'ㅇ': 'd',
  'ㅈ': 'w',
  'ㅉ': 'W',
  'ㅊ': 'c',
  'ㅋ': 'z',
  'ㅌ': 'x',
  'ㅍ': 'v',
  'ㅎ': 'g',
  'ㅏ': 'k',
  'ㅐ': 'o',
  'ㅑ': 'i',
  'ㅒ': 'O',
  'ㅓ': 'j',
  'ㅔ': 'p',
  'ㅕ': 'u',
  'ㅖ': 'P',
  'ㅗ': 'h',
  'ㅘ': 'hk',
  'ㅙ': 'ho',
  'ㅚ': 'hl',
  'ㅛ': 'y',
  'ㅜ': 'n',
  'ㅝ': 'nj',
  'ㅞ': 'np',
  'ㅟ': 'nl',
  'ㅠ': 'b',
  'ㅡ': 'm',
  'ㅢ': 'ml',
  'ㅣ': 'l',
};

export function isHangulChar(ch: string): boolean {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return (
    (code >= 0xac00 && code <= 0xd7a3) || // Syllables
    (code >= 0x3131 && code <= 0x318e) || // Compatibility Jamo
    (code >= 0x1100 && code <= 0x11ff)    // Hangul Jamo
  );
}

export function containsHangul(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (isHangulChar(text[i])) return true;
  }
  return false;
}

export function hangulToQwerty(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const code = ch.charCodeAt(0);

    if (code >= 0xac00 && code <= 0xd7a3) {
      const syllableIndex = code - 0xac00;
      const choseong = Math.floor(syllableIndex / (21 * 28));
      const jungseong = Math.floor((syllableIndex % (21 * 28)) / 28);
      const jongseong = syllableIndex % 28;
      result +=
        CHOSEONG_QWERTY[choseong] +
        JUNGSEONG_QWERTY[jungseong] +
        JONGSEONG_QWERTY[jongseong];
    } else if (COMPAT_JAMO_MAP[ch]) {
      result += COMPAT_JAMO_MAP[ch];
    } else {
      result += ch;
    }
  }
  return result;
}
