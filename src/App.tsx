import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  FileUp,
  Info,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { BatchModal } from './components/BatchModal';
import { BuildPanel } from './components/BuildPanel';
import { ImportDiffModal } from './components/ImportDiffModal';
import { PreviewCodeModal } from './components/PreviewCodeModal';
import { RuleModal } from './components/RuleModal';
import { SandboxPanel } from './components/SandboxPanel';
import { SEED_ENTRIES, SEED_VERSION } from './data/seed_v0.8.1';
import { validateEntries } from './engine/validator';
import type { BuildConfig, EntryGroup, OsntrEntry } from './types/osntr';

const STORAGE_ENTRIES_KEY = 'osntr_studio_entries_v081';
const STORAGE_CONFIG_KEY = 'osntr_studio_config_v081';

const DEFAULT_CONFIG: BuildConfig = {
  includePersonal: true,
  plistChunkSize: 100,
  ahkImeMode: 'standard',
  ahkEndChars: ' ',
  ahkOmitEndChar: false,
  ahkIncludeDotAliases: true,
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

  const [buildConfig, setBuildConfig] = useState<BuildConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }, [entries]);

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
    setTimeout(() => setToast(''), 2000);
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
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    showToast(`삭제됨: ${entry.macShortcut}`);
  };

  const handleResetSeed = () => {
    if (!window.confirm('모든 변경사항을 초기화하고 OSNTR v0.8.1 기본 408개 시드로 되돌릴까요?')) {
      return;
    }
    setEntries(SEED_ENTRIES);
    setBuildConfig(DEFAULT_CONFIG);
    showToast('OSNTR v0.8.1 기본 시드로 초기화되었습니다.');
  };

  const copyGlyph = (glyph: string) => {
    navigator.clipboard.writeText(glyph).then(() => {
      showToast(`복사됨: ${glyph}`);
    });
  };

  const coreCount = entries.filter((e) => e.group === 'core').length;
  const personalCount = entries.filter((e) => e.group === 'personal').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 font-mono text-base font-bold text-white shadow-xs">
              ;ㅎ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900">OSNTR Studio</h1>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                  v{SEED_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                OS-Neutral Text Replacement Manager &amp; Multi-Platform Builder
              </p>
            </div>
          </div>

          {/* Health & Top Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
              <span className="font-medium text-slate-700">총 {entries.length}종</span>
              <span className="text-slate-300">|</span>
              {validation.errors.length === 0 ? (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  충돌 0건
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setOnlyErrors((v) => !v)}
                  className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  충돌 {validation.errors.length}건
                </button>
              )}
              <span className="text-slate-300">|</span>
              <span
                className="inline-flex items-center gap-1 text-slate-500"
                title="스페이스 확정 방식이므로 접두사 겹침은 정상 동작합니다."
              >
                <Info className="h-3.5 w-3.5" />
                접두사 {validation.infos.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setBatchModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Layers className="h-3.5 w-3.5 text-teal-700" />
              일괄 생성
            </button>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileUp className="h-3.5 w-3.5 text-teal-700" />
              가져오기 / Diff
            </button>
            <button
              type="button"
              onClick={handleResetSeed}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              title="기본 v0.8.1 시드로 초기화"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_380px]">
        {/* Left: Rule Manager */}
        <div className="min-w-0 space-y-4">
          {/* Controls Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Layer Tabs */}
              <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
                {(
                  [
                    { id: 'all', label: `전체 (${entries.length})` },
                    { id: 'core', label: `공용 Core (${coreCount})` },
                    { id: 'personal', label: `개인 Personal (${personalCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setGroupFilter(tab.id)}
                    className={`rounded-md px-3 py-1.5 transition ${
                      groupFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingEntry(null);
                  setRuleModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <Plus className="h-3.5 w-3.5" />
                새 규칙 추가
              </button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="rule-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="기호, 단축어(;ㅇㅎ, ;Dg), 카테고리 검색..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm focus:border-teal-600 focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="">전체 카테고리 ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={onlyDiff}
                  onChange={(e) => setOnlyDiff(e.target.checked)}
                  className="accent-teal-700"
                />
                Mac≠AHK
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={onlyFe0e}
                  onChange={(e) => setOnlyFe0e(e.target.checked)}
                  className="accent-teal-700"
                />
                U+FE0E
              </label>
              <span className="ml-auto text-xs text-slate-500">
                표시: {filteredEntries.length}개
              </span>
            </div>
          </div>

          {/* Conflict Banner if any */}
          {validation.errors.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              <div className="mb-1 flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  실시간 충돌 검사 경고 ({validation.errors.length}건)
                </span>
                <button
                  type="button"
                  onClick={() => setOnlyErrors((v) => !v)}
                  className="text-rose-700 underline"
                >
                  {onlyErrors ? '전체 보기' : '충돌 항목만 필터'}
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
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="w-20 px-4 py-3">출력</th>
                    <th className="px-3 py-3">카테고리</th>
                    <th className="px-3 py-3">Mac / iOS</th>
                    <th className="px-3 py-3">AHK 정석</th>
                    <th className="px-3 py-3">AHK IME (범위)</th>
                    <th className="w-20 px-3 py-3 text-right">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.map((entry) => {
                    const issues = validation.entryIssuesMap[entry.id] || [];
                    const hasError = issues.length > 0;
                    const isMacDiff = entry.macShortcut !== entry.ahkStandardShortcuts[0];

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
                              className="flex h-9 min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-lg leading-none hover:border-teal-500 hover:bg-teal-50"
                            >
                              {entry.output}
                            </button>
                            {entry.forceTextPresentation && (
                              <span
                                title="U+FE0E 텍스트 고정"
                                className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-500"
                              >
                                FE0E
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-slate-700">
                              {entry.category}
                            </span>
                            {entry.group === 'personal' && (
                              <span className="w-fit rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                Personal
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-800">
                            {entry.macShortcut}
                          </code>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {entry.ahkStandardShortcuts.map((s) => (
                              <code
                                key={s}
                                className={`rounded px-2 py-0.5 font-mono text-xs ${
                                  isMacDiff
                                    ? 'bg-teal-50 font-medium text-teal-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {s}
                              </code>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                entry.languageScope === 'ko'
                                  ? 'bg-sky-100 text-sky-800'
                                  : entry.languageScope === 'en'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {entry.languageScope}
                            </span>
                            {entry.ahkImeShortcuts.map((s) => (
                              <code
                                key={s}
                                className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700"
                              >
                                {s}
                              </code>
                            ))}
                          </div>
                          {hasError && (
                            <p className="mt-1 text-[11px] text-rose-600">{issues[0].message}</p>
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
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="수정"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(entry)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="삭제"
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
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                        조건에 일치하는 규칙이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Sandbox + Build */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SandboxPanel entries={entries} buildConfig={buildConfig} />
          <BuildPanel
            entries={entries}
            config={buildConfig}
            onChangeConfig={setBuildConfig}
            validation={validation}
            onPreviewCode={(title, code) => setPreviewCode({ title, code })}
          />
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
          setEntries((prev) => [...batch, ...prev]);
          showToast(`${batch.length}개 항목이 일괄 추가되었습니다.`);
        }}
      />

      <ImportDiffModal
        isOpen={importModalOpen}
        existingEntries={entries}
        onClose={() => setImportModalOpen(false)}
        onApplyMerge={(nextEntries) => {
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
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
