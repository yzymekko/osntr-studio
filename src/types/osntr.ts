export type LanguageScope = 'ko' | 'en' | 'both';
export type EntryGroup = 'core' | 'personal';

export interface OsntrEntry {
  id: string;
  group: EntryGroup;
  category: string;
  output: string;
  forceTextPresentation: boolean;
  languageScope: LanguageScope;
  macShortcut: string;
  ahkStandardShortcuts: string[];
  ahkImeShortcuts: string[];
  note?: string;
}

export interface BuildConfig {
  includePersonal: boolean;
  plistChunkSize: number;
  ahkImeMode: 'standard' | 'ime';
  ahkEndChars: string;
  ahkOmitEndChar: boolean;
  ahkIncludeDotAliases: boolean;
}

export type LowercasePosition = 'before' | 'after';

export interface RuleScheme {
  // 시행 문자 (실행 접두사)
  symbolPrefix: string;      // 기본 기호·특문 (기본값: ";")
  boldPrefix: string;        // 산세리프 볼드 (기본값: "**")
  doubleBoldPrefix: string;  // 이중선 볼드 (기본값: "//")

  // 소문자 별규칙 (Mac/iOS 대소문자 미구분 대응, 78개)
  lowercaseSeparator: string;          // 기본값: "."
  lowercasePosition: LowercasePosition; // 'before' (**.a) | 'after' (**a.)
  lowercaseKeepDirectInAhk: boolean;   // AHK에서 구분자 없는 **a도 함께 지원

  // 숫자·알파벳 기호 세트 어간 코드
  stemCircledOpen: string;    // 원문자 빈 원 (기본값: "d")
  stemCircledFilled: string;  // 원문자 채운 원 (기본값: "g")
  stemSquaredOpen: string;    // 네모문자 빈 네모 (기본값: "a")
  stemSquaredFilled: string;  // 네모문자 채운 네모 (기본값: "q")

  // 통화 기호 접미사
  currencySuffix: string;     // 기본값: "=" (;w= → ₩)
}

export const DEFAULT_RULE_SCHEME: RuleScheme = {
  symbolPrefix: ';',
  boldPrefix: '**',
  doubleBoldPrefix: '//',
  lowercaseSeparator: '.',
  lowercasePosition: 'before',
  lowercaseKeepDirectInAhk: true,
  stemCircledOpen: 'd',
  stemCircledFilled: 'g',
  stemSquaredOpen: 'a',
  stemSquaredFilled: 'q',
  currencySuffix: '=',
};

export type ConflictSeverity = 'error' | 'warning' | 'info';
export type ConflictPlatform = 'mac' | 'ahk-standard' | 'ahk-ime-ko' | 'ahk-ime-en' | 'prefix';

export interface ValidationIssue {
  id: string;
  severity: ConflictSeverity;
  platform: ConflictPlatform;
  shortcut: string;
  entryIds: string[];
  message: string;
}

export interface ValidationResult {
  errors: ValidationIssue[];
  infos: ValidationIssue[];
  entryIssuesMap: Record<string, ValidationIssue[]>;
}
