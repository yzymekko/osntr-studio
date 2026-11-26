import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Replace,
  RotateCcw,
  Sliders,
  Sparkles,
  Type,
} from 'lucide-react';
import {
  applyCategoryBulkAction,
  applyRuleSchemeTransform,
  getSchemeChangePreviews,
} from '../engine/schemeTransform';
import { validateEntries } from '../engine/validator';
import {
  DEFAULT_RULE_SCHEME,
  type LanguageScope,
  type OsntrEntry,
  type RuleScheme,
} from '../types/osntr';

interface SetCustomizerPanelProps {
  entries: OsntrEntry[];
  currentScheme: RuleScheme;
  categories: string[];
  onApplyScheme: (nextScheme: RuleScheme, nextEntries: OsntrEntry[], changeCount: number) => void;
  onApplyBulkEntries: (nextEntries: OsntrEntry[], message: string) => void;
}

const SYMBOL_PREFIX_PRESETS = [';', ',', ':', ';;', '!'];
const BOLD_PREFIX_PRESETS = ['**', '##', 'bb', ';;'];
const DOUBLE_PREFIX_PRESETS = ['//', '\\\\', 'dd', '=='];
const LOWER_SEP_PRESETS = [
  { value: '.', label: '. (점 · 기본)' },
  { value: '_', label: '_ (밑줄)' },
  { value: '-', label: '- (하이픈)' },
  { value: "'", label: "' (작은따옴표)" },
  { value: ',', label: ', (쉼표)' },
];

export const SetCustomizerPanel: React.FC<SetCustomizerPanelProps> = ({
  entries,
  currentScheme,
  categories,
  onApplyScheme,
  onApplyBulkEntries,
}) => {
  const [draft, setDraft] = useState<RuleScheme>(currentScheme);

  // Sync draft when external reset/undo updates currentScheme
  useEffect(() => {
    setDraft(currentScheme);
  }, [currentScheme]);

  // Category bulk tool state
  const [targetCategory, setTargetCategory] = useState<string>(categories[0] || '__ALL__');
  const [bulkScope, setBulkScope] = useState<LanguageScope>('en');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [syncAhkReplace, setSyncAhkReplace] = useState(true);

  const previewEntries = useMemo(
    () => applyRuleSchemeTransform(entries, currentScheme, draft),
    [entries, currentScheme, draft]
  );

  const changes = useMemo(
    () => getSchemeChangePreviews(entries, previewEntries),
    [entries, previewEntries]
  );

  const previewValidation = useMemo(
    () => validateEntries(previewEntries, { includeDotAliases: draft.lowercaseKeepDirectInAhk }),
    [previewEntries, draft.lowercaseKeepDirectInAhk]
  );

  const hasChanges = changes.length > 0;
  const hasDefaultDiff = JSON.stringify(draft) !== JSON.stringify(DEFAULT_RULE_SCHEME);

  // Build quick live example strings for the draft
  const formatLowerExample = (base: string, letter: string) =>
    draft.lowercasePosition === 'before'
      ? `${base}${draft.lowercaseSeparator}${letter}`
      : `${base}${letter}${draft.lowercaseSeparator}`;

  const handleApplySchemeClick = () => {
    if (!hasChanges) return;
    onApplyScheme(draft, previewEntries, changes.length);
  };

  const handleApplyCategoryScope = () => {
    const next = applyCategoryBulkAction(entries, targetCategory, {
      type: 'scope',
      scope: bulkScope,
    });
    const label =
      bulkScope === 'ko' ? '한글 전용' : bulkScope === 'en' ? '영문 전용' : '한·영 공통';
    const catLabel = targetCategory === '__ALL__' ? '전체 규칙' : targetCategory;
    onApplyBulkEntries(next, `[${catLabel}] Windows IME 범위를 "${label}"으로 일괄 변경했습니다.`);
  };

  const handleApplyCategoryReplace = () => {
    if (!findText) return;
    const next = applyCategoryBulkAction(entries, targetCategory, {
      type: 'replace',
      find: findText,
      replaceWith: replaceText,
      syncAhk: syncAhkReplace,
    });
    const diffCount = getSchemeChangePreviews(entries, next).length;
    if (diffCount === 0) return;
    const catLabel = targetCategory === '__ALL__' ? '전체 규칙' : targetCategory;
    onApplyBulkEntries(
      next,
      `[${catLabel}] ${diffCount}개 항목에서 "${findText}" → "${replaceText}" 일괄 치환 완료`
    );
    setFindText('');
    setReplaceText('');
  };

  return (
    <div className="space-y-5">
      {/* Intro Banner */}
      <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-white to-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-teal-700" />
              <h2 className="text-base font-bold text-slate-900">세트별 규칙 일괄 변경</h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              408개 규칙을 하나씩 수정할 필요 없이 <strong>시행 문자(시작 기호)</strong>,{' '}
              <strong>소문자 구분 규칙</strong>, <strong>숫자·알파벳 기호 세트 코드</strong>를
              한꺼번에 바꿀 수 있습니다. 아래에서 미리보기를 확인한 뒤 적용하세요.
            </p>
          </div>
          {hasDefaultDiff && (
            <button
              type="button"
              onClick={() => setDraft(DEFAULT_RULE_SCHEME)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              OSNTR 기본값 불러오기
            </button>
          )}
        </div>
      </div>

      {/* Section 1: Trigger Prefixes (시행 문자) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div>
          <span className="inline-block rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800">
            STEP 1
          </span>
          <h3 className="mt-1 text-sm font-bold text-slate-900">
            시행 문자 (단축어 시작 기호) 일괄 변경
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            모든 단축어 맨 앞에 붙는 시작 기호 3종을 원하는 문자로 한 번에 변경합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Basic Symbol Prefix */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">기본 기호·특문</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200">
                284개
              </span>
            </div>
            <input
              type="text"
              value={draft.symbolPrefix}
              onChange={(e) => setDraft({ ...draft, symbolPrefix: e.target.value })}
              placeholder=";"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1">
              {SYMBOL_PREFIX_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraft({ ...draft, symbolPrefix: p })}
                  className={`rounded-md px-2 py-0.5 font-mono text-xs transition ${
                    draft.symbolPrefix === p
                      ? 'bg-teal-700 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="pt-1 text-[11px] text-slate-500">
              예시: <span className="keycap">{draft.symbolPrefix}ㅇ</span> → ○ ,{' '}
              <span className="keycap">{draft.symbolPrefix}ㅗ</span> → ↑
            </div>
          </div>

          {/* Sans-Serif Bold Prefix */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">굵은 글씨 (𝗔𝗮𝟬)</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200">
                62개
              </span>
            </div>
            <input
              type="text"
              value={draft.boldPrefix}
              onChange={(e) => setDraft({ ...draft, boldPrefix: e.target.value })}
              placeholder="**"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1">
              {BOLD_PREFIX_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraft({ ...draft, boldPrefix: p })}
                  className={`rounded-md px-2 py-0.5 font-mono text-xs transition ${
                    draft.boldPrefix === p
                      ? 'bg-teal-700 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="pt-1 text-[11px] text-slate-500">
              예시: <span className="keycap">{draft.boldPrefix}A</span> → 𝗔 ,{' '}
              <span className="keycap">{draft.boldPrefix}0</span> → 𝟬
            </div>
          </div>

          {/* Double-Struck Bold Prefix */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">이중선 글씨 (𝔸𝕒𝟘)</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200">
                62개
              </span>
            </div>
            <input
              type="text"
              value={draft.doubleBoldPrefix}
              onChange={(e) => setDraft({ ...draft, doubleBoldPrefix: e.target.value })}
              placeholder="//"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1">
              {DOUBLE_PREFIX_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraft({ ...draft, doubleBoldPrefix: p })}
                  className={`rounded-md px-2 py-0.5 font-mono text-xs transition ${
                    draft.doubleBoldPrefix === p
                      ? 'bg-teal-700 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="pt-1 text-[11px] text-slate-500">
              예시: <span className="keycap">{draft.doubleBoldPrefix}A</span> → 𝔸 ,{' '}
              <span className="keycap">{draft.doubleBoldPrefix}0</span> → 𝟘
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Lowercase Rule (소문자 별규칙) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div>
          <span className="inline-block rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800">
            STEP 2
          </span>
          <h3 className="mt-1 text-sm font-bold text-slate-900">
            소문자 구분 규칙 (소문자 별규칙 · 78개)
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Mac·아이폰은 대소문자(<code className="font-mono">A</code>와{' '}
            <code className="font-mono">a</code>)를 구분하지 않아 소문자용 구분 기호가 필요합니다.
            굵은 소문자(𝗮~𝘇), 이중선 소문자(𝕒~𝕫), 원문자 소문자(ⓐ~ⓩ) 78개에 동시에 적용됩니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                소문자 구분 기호
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {LOWER_SEP_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, lowercaseSeparator: preset.value })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      draft.lowercaseSeparator === preset.value
                        ? 'bg-teal-700 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-500'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={draft.lowercaseSeparator}
                onChange={(e) => setDraft({ ...draft, lowercaseSeparator: e.target.value })}
                placeholder="원하는 구분 기호 직접 입력 (예: . 또는 _)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                구분 기호 위치
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, lowercasePosition: 'before' })}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    draft.lowercasePosition === 'before'
                      ? 'border-teal-600 bg-teal-50/70 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold">글자 앞 (기본)</div>
                  <div className="mt-0.5 font-mono text-[11px] opacity-80">
                    {draft.boldPrefix}
                    {draft.lowercaseSeparator}a → 𝗮
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, lowercasePosition: 'after' })}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    draft.lowercasePosition === 'after'
                      ? 'border-teal-600 bg-teal-50/70 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold">글자 뒤</div>
                  <div className="mt-0.5 font-mono text-[11px] opacity-80">
                    {draft.boldPrefix}a{draft.lowercaseSeparator} → 𝗮
                  </div>
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={draft.lowercaseKeepDirectInAhk}
                onChange={(e) =>
                  setDraft({ ...draft, lowercaseKeepDirectInAhk: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 accent-teal-700"
              />
              <span>
                <strong>Windows(AHK) 직접 입력 호환 유지</strong>
                <span className="block text-[11px] text-slate-500">
                  켜두면 Windows에서는 구분 기호 없이 <code className="font-mono">{draft.boldPrefix}a</code>
                  로 쳐도 되고, Mac처럼{' '}
                  <code className="font-mono">{formatLowerExample(draft.boldPrefix, 'a')}</code>로 쳐도
                  둘 다 작동합니다.
                </span>
              </span>
            </label>
          </div>

          {/* Live Visual Preview of Lowercase Rule */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Type className="h-3.5 w-3.5 text-teal-700" />
              <span>소문자 3개 세트 적용 미리보기</span>
            </div>
            <div className="my-3 space-y-2.5 text-xs">
              {[
                {
                  name: '굵은 소문자 (26개)',
                  glyph: '𝗮',
                  base: draft.boldPrefix,
                },
                {
                  name: '이중선 소문자 (26개)',
                  glyph: '𝕒',
                  base: draft.doubleBoldPrefix,
                },
                {
                  name: '원문자 소문자 (26개)',
                  glyph: 'ⓐ',
                  base: draft.symbolPrefix + draft.stemCircledOpen,
                },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-base">
                      {row.glyph}
                    </span>
                    <span className="font-medium text-slate-700">{row.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="keycap keycap-accent">
                      {formatLowerExample(row.base, 'a')}
                    </span>
                    {draft.lowercaseKeepDirectInAhk && draft.lowercaseSeparator && (
                      <span className="text-[11px] text-slate-400">
                        (Win: {row.base}a)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!draft.lowercaseSeparator && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
                구분 기호를 비워두면 Mac/iOS에서 대문자(A)와 소문자(a)가 서로 충돌합니다.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Number / Alphabet / Special Sets */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div>
          <span className="inline-block rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800">
            STEP 3
          </span>
          <h3 className="mt-1 text-sm font-bold text-slate-900">
            숫자·알파벳·통화 세트별 코드 일괄 변경
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            원문자(⓪Ⓐⓐ), 채운 원(⓿🅐), 네모문자(🄰🅰︎), 통화(₩€$) 세트의 대표 글자를 한 번에 바꿀 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              title: '원문자 (빈 원)',
              count: '68개',
              glyphs: '⓪ Ⓐ ⓐ',
              field: 'stemCircledOpen' as const,
              sampleAfter: `${draft.symbolPrefix}${draft.stemCircledOpen}A`,
              helper: '기본: d (ㅇ 위치)',
            },
            {
              title: '원문자 (채운 원)',
              count: '42개',
              glyphs: '⓿ 🅐',
              field: 'stemCircledFilled' as const,
              sampleAfter: `${draft.symbolPrefix}${draft.stemCircledFilled}A`,
              helper: '기본: g (ㅎ 위치)',
            },
            {
              title: '네모 (빈 네모)',
              count: '26개',
              glyphs: '🄰 🄱',
              field: 'stemSquaredOpen' as const,
              sampleAfter: `${draft.symbolPrefix}${draft.stemSquaredOpen}A`,
              helper: '기본: a (ㅁ 위치)',
            },
            {
              title: '네모 (채운 네모)',
              count: '26개',
              glyphs: '🅰︎ 🅱︎',
              field: 'stemSquaredFilled' as const,
              sampleAfter: `${draft.symbolPrefix}${draft.stemSquaredFilled}A`,
              helper: '기본: q (ㅂ 위치)',
            },
            {
              title: '통화 끝문자',
              count: '7개',
              glyphs: '₩ € $',
              field: 'currencySuffix' as const,
              sampleAfter: `${draft.symbolPrefix}w${draft.currencySuffix}`,
              helper: '기본: = (뒤에 붙음)',
            },
          ].map((item) => (
            <div
              key={item.field}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{item.title}</span>
                <span className="text-[10px] text-slate-400">{item.count}</span>
              </div>
              <div className="text-base tracking-widest text-slate-800">{item.glyphs}</div>
              <input
                type="text"
                value={draft[item.field]}
                onChange={(e) => setDraft({ ...draft, [item.field]: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{item.helper}</span>
                <span className="keycap">{item.sampleAfter}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Apply Bar + Live Diff Preview */}
      <section
        className={`rounded-2xl border p-5 transition ${
          hasChanges
            ? previewValidation.errors.length > 0
              ? 'border-rose-300 bg-rose-50/60'
              : 'border-teal-300 bg-teal-50/50 shadow-sm'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {hasChanges ? (
                previewValidation.errors.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                ) : (
                  <Sparkles className="h-4 w-4 text-teal-700" />
                )
              ) : (
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
              )}
              <h3 className="text-sm font-bold text-slate-900">
                {hasChanges
                  ? `총 ${changes.length}개 규칙이 일괄 변경됩니다`
                  : '위에서 설정을 바꾸면 실시간 미리보기가 표시됩니다'}
              </h3>
            </div>
            {hasChanges && previewValidation.errors.length === 0 && (
              <p className="text-xs text-teal-800">
                충돌 검사 통과 (0건) — 모든 플랫폼(Mac · Windows 정석 · IME)에서 안전하게 동작합니다.
              </p>
            )}
            {hasChanges && previewValidation.errors.length > 0 && (
              <div className="text-xs text-rose-700 space-y-0.5">
                <p className="font-semibold">
                  예상 충돌 {previewValidation.errors.length}건 감지됨 — 다른 문자/코드를 선택하는 것을 권장합니다:
                </p>
                {previewValidation.errors.slice(0, 3).map((err) => (
                  <p key={err.id}>• {err.message}</p>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                type="button"
                onClick={() => setDraft(currentScheme)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                변경 취소
              </button>
            )}
            <button
              type="button"
              disabled={!hasChanges}
              onClick={handleApplySchemeClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              {hasChanges ? `${changes.length}개 항목에 일괄 적용` : '변경사항 없음'}
            </button>
          </div>
        </div>

        {hasChanges && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
              변경 샘플 미리보기 (최대 8건 표시)
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {changes.slice(0, 8).map((c) => (
                <div key={c.entryId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-sm">
                      {c.output}
                    </span>
                    <span className="text-slate-500">{c.category}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400 line-through">{c.beforeMac}</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="keycap keycap-accent">{c.afterMac}</span>
                    {c.afterAhkStd !== c.afterMac && (
                      <span className="text-[11px] text-slate-500">(Win: {c.afterAhkStd})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Section 4: Category-Level Quick Bulk Tools */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Replace className="h-4 w-4 text-teal-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">카테고리별 세부 일괄 편집</h3>
            <p className="text-xs text-slate-500">
              특정 카테고리만 골라 Windows 한·영 작동 조건을 바꾸거나, 단축어 일부 문자를 한 번에 치환할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Bulk IME Scope */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="text-xs font-bold text-slate-800">
              ① Windows IME 한·영 작동 언어 일괄 지정
            </div>
            <select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
            >
              <option value="__ALL__">전체 카테고리</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c} ({entries.filter((e) => e.category === c).length}개)
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {(
                [
                  { id: 'ko', label: '한글일 때만' },
                  { id: 'en', label: '영문일 때만' },
                  { id: 'both', label: '한·영 모두' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBulkScope(opt.id)}
                  className={`rounded-lg border py-1.5 font-medium transition ${
                    bulkScope === opt.id
                      ? 'border-teal-600 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleApplyCategoryScope}
              className="w-full rounded-lg bg-slate-900 py-2 text-xs font-medium text-white hover:bg-slate-800"
            >
              선택 카테고리에 언어 조건 일괄 적용
            </button>
          </div>

          {/* Bulk Find & Replace */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="text-xs font-bold text-slate-800">
              ② 선택 카테고리 내 단축어 찾아 바꾸기
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="찾을 문자 (예: ㅂ)"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
              />
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="바꿀 문자 (예: !)"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={syncAhkReplace}
                onChange={(e) => setSyncAhkReplace(e.target.checked)}
                className="accent-teal-700"
              />
              Windows(AHK) 영타 단축어도 함께 치환
            </label>
            <button
              type="button"
              disabled={!findText}
              onClick={handleApplyCategoryReplace}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-40"
            >
              찾아 바꾸기 실행
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
