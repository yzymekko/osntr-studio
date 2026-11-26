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
