import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  FileUp,
  Info,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Sliders,
  Trash2,
  Undo2,
} from 'lucide-react';
import { BatchModal } from './components/BatchModal';
import { BuildPanel } from './components/BuildPanel';
import { ImportDiffModal } from './components/ImportDiffModal';
import { PreviewCodeModal } from './components/PreviewCodeModal';
import { RuleModal } from './components/RuleModal';
import { SandboxPanel } from './components/SandboxPanel';
import { SetCustomizerPanel } from './components/SetCustomizerPanel';
import { SEED_ENTRIES, SEED_VERSION } from './data/seed_v0.8.1';
import { validateEntries } from './engine/validator';
import {
  DEFAULT_RULE_SCHEME,
  type BuildConfig,
  type EntryGroup,
  type OsntrEntry,
  type RuleScheme,
} from './types/osntr';

const STORAGE_ENTRIES_KEY = 'osntr_studio_entries_v081';
const STORAGE_CONFIG_KEY = 'osntr_studio_config_v081';
const STORAGE_SCHEME_KEY = 'osntr_studio_scheme_v081';

const DEFAULT_CONFIG: BuildConfig = {
  includePersonal: true,
  plistChunkSize: 100,
  ahkImeMode: 'standard',
  ahkEndChars: ' ',
  ahkOmitEndChar: false,
  ahkIncludeDotAliases: true,
};

type ActiveTab = 'rules' | 'customize' | 'build';

interface HistorySnapshot {
  entries: OsntrEntry[];
  scheme: RuleScheme;
}

const SCOPE_LABELS: Record<OsntrEntry['languageScope'], { text: string; cls: string }> = {
  ko: { text: '한글 전용', cls: 'bg-sky-50 text-sky-800 border-sky-200/80' },
  en: { text: '영문 전용', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200/80' },
  both: { text: '한·영 공통', cls: 'bg-slate-100 text-slate-700 border-slate-200/80' },
};

export function App() {
  const [entries, setEntries] = useState<OsntrEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ENTRIES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return SEED_ENTRIES;
  });

  const [scheme, setScheme] = useState<RuleScheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SCHEME_KEY);
      if (saved) return { ...DEFAULT_RULE_SCHEME, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_RULE_SCHEME;
  });

  const [buildConfig, setBuildConfig] = useState<BuildConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  });

  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('rules');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }, [entries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SCHEME_KEY, JSON.stringify(scheme));
    } catch {
      // ignore
    }
  }, [scheme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(buildConfig));
    } catch {
      // ignore
    }
  }, [buildConfig]);

  // Filters
  const [groupFilter, setGroupFilter] = useState<'all' | EntryGroup>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [onlyFe0e, setOnlyFe0e] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);

  // Modals & UI feedback
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<OsntrEntry | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState<{ title: string; code: string } | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const pushHistory = () => {
    setHistory((prev) => [...prev.slice(-9), { entries, scheme }]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setEntries(last.entries);
    setScheme(last.scheme);
    showToast('직전 상태로 되돌렸습니다.');
  };

  const validation = useMemo(
    () =>
      validateEntries(
        buildConfig.includePersonal ? entries : entries.filter((e) => e.group === 'core'),
        { includeDotAliases: buildConfig.ahkIncludeDotAliases }
      ),
    [entries, buildConfig.includePersonal, buildConfig.ahkIncludeDotAliases]
  );

  const categories = useMemo(
    () => Array.from(new Set(entries.map((e) => e.category))),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((e) => {
      if (groupFilter !== 'all' && e.group !== groupFilter) return false;
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (onlyDiff && e.macShortcut === e.ahkStandardShortcuts[0]) return false;
      if (onlyFe0e && !e.forceTextPresentation) return false;
      if (onlyErrors && !(validation.entryIssuesMap[e.id]?.length > 0)) return false;

      if (!q) return true;
      return (
        e.output.toLowerCase().includes(q) ||
        e.macShortcut.toLowerCase().includes(q) ||
        e.ahkStandardShortcuts.some((s) => s.toLowerCase().includes(q)) ||
        e.ahkImeShortcuts.some((s) => s.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q) ||
        (e.note && e.note.toLowerCase().includes(q))
      );
    });
  }, [
    entries,
    groupFilter,
    categoryFilter,
    searchQuery,
    onlyDiff,
    onlyFe0e,
    onlyErrors,
    validation.entryIssuesMap,
  ]);

  const handleSaveRule = (saved: OsntrEntry) => {
    pushHistory();
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      if (exists) {
        return prev.map((e) => (e.id === saved.id ? saved : e));
      }
      return [saved, ...prev];
    });
    showToast(`저장됨: ${saved.macShortcut} → ${saved.output}`);
  };

  const handleDeleteRule = (entry: OsntrEntry) => {
    pushHistory();
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    showToast(`삭제됨: ${entry.macShortcut}`);
  };

  const handleApplyScheme = (
    nextScheme: RuleScheme,
    nextEntries: OsntrEntry[],
    changeCount: number
  ) => {
    pushHistory();
    setScheme(nextScheme);
    setEntries(nextEntries);
    setBuildConfig((prev) => ({
      ...prev,
      ahkIncludeDotAliases: nextScheme.lowercaseKeepDirectInAhk,
    }));
    showToast(`${changeCount}개 항목에 세트 규칙을 일괄 적용했습니다.`);
  };

  const handleApplyBulkEntries = (nextEntries: OsntrEntry[], message: string) => {
    pushHistory();
    setEntries(nextEntries);
    showToast(message);
  };

  const handleResetSeed = () => {
    if (!window.confirm('모든 변경사항을 초기화하고 OSNTR v0.8.1 기본 408개 시드로 되돌릴까요?')) {
      return;
    }
    pushHistory();
    setEntries(SEED_ENTRIES);
    setScheme(DEFAULT_RULE_SCHEME);
    setBuildConfig(DEFAULT_CONFIG);
    showToast('OSNTR v0.8.1 기본 시드로 초기화되었습니다.');
  };

  const copyGlyph = (glyph: string) => {
    navigator.clipboard.writeText(glyph).then(() => {
      showToast(`클립보드에 복사됨: ${glyph}`);
    });
  };

  const coreCount = entries.filter((e) => e.group === 'core').length;
  const personalCount = entries.filter((e) => e.group === 'personal').length;

  const lowerExample =
    scheme.lowercasePosition === 'before'
      ? `${scheme.boldPrefix}${scheme.lowercaseSeparator}a`
      : `${scheme.boldPrefix}a${scheme.lowercaseSeparator}`;

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 font-mono text-sm font-bold text-white shadow-xs">
              {scheme.symbolPrefix}ㅎ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900">OSNTR Studio</h1>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                  v{SEED_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Mac · 아이폰 · Windows 공통 특수문자 단축어 편집기 &amp; 빌더
              </p>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <nav className="order-3 flex w-full items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold sm:order-2 sm:w-auto">
            {(
              [
                { id: 'rules', label: '규칙 사전', icon: BookOpen },
                { id: 'customize', label: '세트 일괄 변경', icon: Sliders },
                { id: 'build', label: '내보내기 · 빌드', icon: Download },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 transition sm:flex-initial ${
                    active
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Status & Utility Actions */}
          <div className="order-2 flex items-center gap-2 sm:order-3">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs md:flex">
              <span className="font-semibold text-slate-700">{entries.length}종</span>
              <span className="text-slate-300">|</span>
              {validation.errors.length === 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  충돌 없음
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('rules');
                    setOnlyErrors(true);
                  }}
                  className="inline-flex items-center gap-1 font-bold text-rose-600 hover:underline"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  충돌 {validation.errors.length}건
                </button>
              )}
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                title="직전 변경 되돌리기"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">되돌리기</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              title="기존 .plist / .ahk / .csv / .json 파일 가져오기"
            >
              <FileUp className="h-3.5 w-3.5 text-teal-700" />
              <span className="hidden sm:inline">가져오기</span>
            </button>

            <button
              type="button"
              onClick={handleResetSeed}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              title="기본 v0.8.1 시드로 초기화"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px]">
        {/* Primary Workspace */}
        <div className="min-w-0">
          {activeTab === 'customize' && (
            <SetCustomizerPanel
              entries={entries}
              currentScheme={scheme}
              categories={categories}
              onApplyScheme={handleApplyScheme}
              onApplyBulkEntries={handleApplyBulkEntries}
            />
          )}

          {activeTab === 'build' && (
            <BuildPanel
              entries={entries}
              config={buildConfig}
              scheme={scheme}
              onChangeConfig={setBuildConfig}
              validation={validation}
              onPreviewCode={(title, code) => setPreviewCode({ title, code })}
            />
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              {/* Top Search & Action Bar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Layer Tabs */}
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                    {(
                      [
                        { id: 'all', label: `전체 (${entries.length})` },
                        { id: 'core', label: `공용 기호 (${coreCount})` },
                        { id: 'personal', label: `개인 상용구 (${personalCount})` },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setGroupFilter(tab.id)}
                        className={`rounded-lg px-3 py-1.5 transition ${
                          groupFilter === tab.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBatchModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Layers className="h-3.5 w-3.5 text-teal-700" />
                      패턴 생성
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEntry(null);
                        setRuleModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      새 규칙 추가
                    </button>
                  </div>
                </div>

                {/* Search & Quick Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="rule-search"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`기호, 단축어(${scheme.symbolPrefix}ㅇㅎ, ${scheme.symbolPrefix}tm), 카테고리 검색...`}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-sm focus:border-teal-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={onlyDiff}
                      onChange={(e) => setOnlyDiff(e.target.checked)}
                      className="accent-teal-700"
                    />
                    Mac·Win 다른 항목
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={onlyFe0e}
                      onChange={(e) => setOnlyFe0e(e.target.checked)}
                      className="accent-teal-700"
                    />
                    이모지 방지(FE0E)
                  </label>
                </div>

                {/* Visual Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('')}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      categoryFilter === ''
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    전체 ({entries.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        categoryFilter === cat
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conflict Banner if any */}
              {validation.errors.length > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900">
                  <div className="mb-1 flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      단축어 충돌 {validation.errors.length}건이 발견되었습니다
                    </span>
                    <button
                      type="button"
                      onClick={() => setOnlyErrors((v) => !v)}
                      className="font-semibold text-rose-700 underline"
                    >
                      {onlyErrors ? '전체 보기' : '충돌 항목만 모아보기'}
                    </button>
                  </div>
                  <ul className="list-inside list-disc space-y-0.5 text-rose-800">
                    {validation.errors.slice(0, 5).map((err) => (
                      <li key={err.id}>{err.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rules Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500">
                  <span>
                    표시 중: <strong className="text-slate-800">{filteredEntries.length}개</strong>{' '}
                    <span className="hidden sm:inline">(기호를 클릭하면 클립보드에 복사됩니다)</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400"
                    title="스페이스 확정 방식이므로 접두사 겹침은 정상 동작합니다."
                  >
                    <Info className="h-3 w-3" />
                    접두사 공유 {validation.infos.length}건 (정상)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-white text-xs font-bold text-slate-500">
                      <tr>
                        <th className="w-24 px-4 py-3">출력 기호</th>
                        <th className="px-3 py-3">분류</th>
                        <th className="px-3 py-3">Mac · 아이폰</th>
                        <th className="px-3 py-3">Windows 정석</th>
                        <th className="px-3 py-3">Windows IME (언어 조건)</th>
                        <th className="w-20 px-3 py-3 text-right">편집</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEntries.map((entry) => {
                        const issues = validation.entryIssuesMap[entry.id] || [];
                        const hasError = issues.length > 0;
                        const isMacDiff = entry.macShortcut !== entry.ahkStandardShortcuts[0];
                        const scopeMeta = SCOPE_LABELS[entry.languageScope];

                        return (
                          <tr
                            key={entry.id}
                            className={`transition hover:bg-slate-50/80 ${
                              hasError ? 'bg-rose-50/40' : ''
                            }`}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => copyGlyph(entry.output)}
                                  title="클릭하여 기호 복사"
                                  className="flex h-10 min-w-[40px] cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 text-lg leading-none transition hover:border-teal-500 hover:bg-teal-50"
                                >
                                  {entry.output}
                                </button>
                                {entry.forceTextPresentation && (
                                  <span
                                    title="컬러 이모지 대신 흑백 텍스트로 고정 (U+FE0E)"
                                    className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500"
                                  >
                                    흑백
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-slate-700">
                                  {entry.category}
                                </span>
                                {entry.group === 'personal' && (
                                  <span className="w-fit rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                    개인 상용구
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="keycap">{entry.macShortcut}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap items-center gap-1">
                                {entry.ahkStandardShortcuts.map((s) => (
                                  <span
                                    key={s}
                                    className={`keycap ${isMacDiff ? 'keycap-accent' : ''}`}
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${scopeMeta.cls}`}
                                >
                                  {scopeMeta.text}
                                </span>
                                {entry.ahkImeShortcuts.map((s) => (
                                  <span key={s} className="keycap">
                                    {s}
                                  </span>
                                ))}
                              </div>
                              {hasError && (
                                <p className="mt-1 text-[11px] font-medium text-rose-600">
                                  {issues[0].message}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEntry(entry);
                                    setRuleModalOpen(true);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                                  title="규칙 편집"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRule(entry)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                  title="규칙 삭제"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredEntries.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">
                            검색 조건에 맞는 규칙이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Persistent Right Sidebar: Live Typing Sandbox + Active Scheme Summary */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SandboxPanel entries={entries} buildConfig={buildConfig} scheme={scheme} />

          {/* Current Active Rule Scheme Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900">현재 적용된 세트 규칙</h2>
              {activeTab !== 'customize' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('customize')}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  일괄 변경하기 →
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[11px] text-slate-500">기본 시행 문자</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="keycap keycap-accent">{scheme.symbolPrefix}</span>
                  <span className="text-[11px] text-slate-400">284개</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[11px] text-slate-500">소문자 구분 규칙</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="keycap keycap-accent">{lowerExample}</span>
                  <span className="text-[11px] text-slate-400">78개</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[11px] text-slate-500">굵은 글씨 (𝗔𝗮𝟬)</div>
                <div className="mt-1">
                  <span className="keycap">{scheme.boldPrefix}</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[11px] text-slate-500">이중선 글씨 (𝔸𝕒𝟘)</div>
                <div className="mt-1">
                  <span className="keycap">{scheme.doubleBoldPrefix}</span>
                </div>
              </div>
            </div>

            {activeTab !== 'build' && (
              <button
                type="button"
                onClick={() => setActiveTab('build')}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                Mac (.plist) / Windows (.ahk) 빌드하기
              </button>
            )}
          </section>
        </aside>
      </main>

      {/* Modals */}
      <RuleModal
        isOpen={ruleModalOpen}
        editingEntry={editingEntry}
        categories={categories}
        onClose={() => setRuleModalOpen(false)}
        onSave={handleSaveRule}
      />

      <BatchModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onAddBatch={(batch) => {
          pushHistory();
          setEntries((prev) => [...batch, ...prev]);
          showToast(`${batch.length}개 항목이 일괄 추가되었습니다.`);
        }}
      />

      <ImportDiffModal
        isOpen={importModalOpen}
        existingEntries={entries}
        onClose={() => setImportModalOpen(false)}
        onApplyMerge={(nextEntries) => {
          pushHistory();
          setEntries(nextEntries);
          showToast('가져오기 병합이 적용되었습니다.');
        }}
      />

      <PreviewCodeModal
        title={previewCode?.title || ''}
        code={previewCode?.code || ''}
        onClose={() => setPreviewCode(null)}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
