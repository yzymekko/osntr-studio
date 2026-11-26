import React, { useEffect, useState } from 'react';
import { HelpCircle, Sparkles, X } from 'lucide-react';
import { containsHangul, hangulToQwerty } from '../engine/hangulToQwerty';
import {
  applyTextPresentation,
  needsTextPresentationRecommendation,
} from '../engine/textPresentation';
import type { EntryGroup, LanguageScope, OsntrEntry } from '../types/osntr';

interface RuleModalProps {
  isOpen: boolean;
  editingEntry: OsntrEntry | null;
  categories: string[];
  onClose: () => void;
  onSave: (entry: OsntrEntry) => void;
}

export const RuleModal: React.FC<RuleModalProps> = ({
  isOpen,
  editingEntry,
  categories,
  onClose,
  onSave,
}) => {
  const [group, setGroup] = useState<EntryGroup>('core');
  const [category, setCategory] = useState('도형·별·체크');
  const [output, setOutput] = useState('');
  const [forceFe0e, setForceFe0e] = useState(false);
  const [macShortcut, setMacShortcut] = useState('');
  const [ahkStdText, setAhkStdText] = useState('');
  const [ahkImeText, setAhkImeText] = useState('');
  const [languageScope, setLanguageScope] = useState<LanguageScope>('both');
  const [note, setNote] = useState('');
  const [autoSyncAhk, setAutoSyncAhk] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (editingEntry) {
      setGroup(editingEntry.group);
      setCategory(editingEntry.category);
      setOutput(editingEntry.output);
      setForceFe0e(editingEntry.forceTextPresentation);
      setMacShortcut(editingEntry.macShortcut);
      setAhkStdText(editingEntry.ahkStandardShortcuts.join(', '));
      setAhkImeText(editingEntry.ahkImeShortcuts.join(', '));
      setLanguageScope(editingEntry.languageScope);
      setNote(editingEntry.note || '');
      setAutoSyncAhk(false);
    } else {
      setGroup('core');
      setCategory(categories[0] || '기타');
      setOutput('');
      setForceFe0e(false);
      setMacShortcut('');
      setAhkStdText('');
      setAhkImeText('');
      setLanguageScope('both');
      setNote('');
      setAutoSyncAhk(true);
    }
  }, [isOpen, editingEntry, categories]);

  if (!isOpen) return null;

  const fe0eRecommended = needsTextPresentationRecommendation(output);

  const handleOutputChange = (val: string) => {
    const rec = needsTextPresentationRecommendation(val);
    if (rec && !forceFe0e) {
      setForceFe0e(true);
      setOutput(applyTextPresentation(val, true));
    } else {
      setOutput(val);
    }
  };

  const handleToggleFe0e = (checked: boolean) => {
    setForceFe0e(checked);
    setOutput((prev) => applyTextPresentation(prev, checked));
  };

  const handleMacShortcutChange = (val: string) => {
    setMacShortcut(val);
    if (autoSyncAhk) {
      const hasHangul = containsHangul(val);
      const converted = hasHangul ? hangulToQwerty(val) : val;
      setAhkStdText(converted);
      setAhkImeText(converted);
      if (hasHangul) {
        setLanguageScope('ko');
      } else if (/[a-zA-Z]/.test(val)) {
        setLanguageScope('en');
      } else {
        setLanguageScope('both');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!macShortcut.trim() || !output) return;

    const parseList = (raw: string) =>
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const stdList = parseList(ahkStdText);
    const imeList = parseList(ahkImeText);
    const fallback = containsHangul(macShortcut) ? hangulToQwerty(macShortcut) : macShortcut;

    const finalOutput = applyTextPresentation(output, forceFe0e);

    onSave({
      id: editingEntry?.id || `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      group,
      category: category.trim() || '기타',
      output: finalOutput,
      forceTextPresentation: forceFe0e,
      languageScope,
      macShortcut: macShortcut.trim(),
      ahkStandardShortcuts: stdList.length > 0 ? stdList : [fallback],
      ahkImeShortcuts: imeList.length > 0 ? imeList : [fallback],
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {editingEntry ? '규칙 편집' : '새 단축어 규칙 만들기'}
            </h3>
            <p className="text-xs text-slate-500">
              Mac·아이폰과 Windows에서 공통으로 쓸 단축어를 설정합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6 text-sm">
          {/* Step 1: Output */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              1. 변환되어 나올 기호 또는 문구
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-2xl">
                {output || '?'}
              </div>
              <input
                type="text"
                required
                value={output}
                onChange={(e) => handleOutputChange(e.target.value)}
                placeholder="예: ◉, ™ 또는 자주 쓰는 이메일 주소"
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-base focus:border-teal-600 focus:outline-none"
              />
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs">
              <div>
                <span className="font-semibold text-slate-800">
                  컬러 이모지 대신 흑백 텍스트 기호로 고정
                </span>
                <span className="ml-1.5 rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                  U+FE0E
                </span>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  ◀︎ ▶︎ ♥︎ ☑︎ 등이 컬러 이모지로 바뀌는 것을 막아줍니다.
                </p>
              </div>
              <input
                type="checkbox"
                checked={forceFe0e}
                onChange={(e) => handleToggleFe0e(e.target.checked)}
                className="h-4 w-4 accent-teal-700"
              />
            </label>

            {fe0eRecommended && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-teal-700">
                <Sparkles className="h-3.5 w-3.5" />
                이 기호는 이모지화 방지(U+FE0E) 적용을 권장하는 기호입니다.
              </p>
            )}
          </div>

          {/* Step 2: Mac/iOS Shortcut */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                2. Mac / 아이폰에서 입력할 단축어
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={autoSyncAhk}
                  onChange={(e) => setAutoSyncAhk(e.target.checked)}
                  className="accent-teal-700"
                />
                Windows 영타 자동 채우기
              </label>
            </div>
            <input
              type="text"
              required
              value={macShortcut}
              onChange={(e) => handleMacShortcutChange(e.target.value)}
              placeholder="예: ;ㅇㅎ 또는 ;tm"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          {/* Step 3: Windows AHK Behavior */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
            <div>
              <div className="text-xs font-bold text-slate-900">
                3. Windows (AutoHotkey) 입력 방식 설정
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Windows에서는 한·영 상태에 따라 다르게 동작하도록 2가지 빌드 모드를 지원합니다.
              </p>
            </div>

            {/* IME Language Scope */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                어느 입력 상태일 때 변환할까요? (IME 한영 구분 모드용)
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(
                  [
                    { id: 'ko', title: '한글일 때만', desc: '예: ;ㅇㅎ (영문 무시)' },
                    { id: 'en', title: '영문일 때만', desc: '예: ;tm (한글 ;스 무시)' },
                    { id: 'both', title: '한·영 모두', desc: '언어 상관없이 변환' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLanguageScope(item.id)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      languageScope === item.id
                        ? 'border-teal-600 bg-white text-teal-900 shadow-xs'
                        : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold">{item.title}</div>
                    <div className="mt-0.5 text-[10px] opacity-80">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Standard vs IME Shortcuts */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  정석 모드용 영타 (한·영 미구분)
                </label>
                <input
                  type="text"
                  value={ahkStdText}
                  onChange={(e) => {
                    setAutoSyncAhk(false);
                    setAhkStdText(e.target.value);
                  }}
                  placeholder="예: ;Dg"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-sm focus:border-teal-600 focus:outline-none"
                />
                <p className="text-[11px] leading-snug text-slate-500">
                  다른 영문 단축어와 겹칠 때만 첫 글자를 대문자(예: <code>;Dg</code>)로 바꾸세요.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  IME 모드용 영타 (한·영 자동 구분)
                </label>
                <input
                  type="text"
                  value={ahkImeText}
                  onChange={(e) => {
                    setAutoSyncAhk(false);
                    setAhkImeText(e.target.value);
                  }}
                  placeholder="예: ;dg"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-sm focus:border-teal-600 focus:outline-none"
                />
                <p className="text-[11px] leading-snug text-slate-500">
                  한·영이 자동 분리되므로 보통 소문자 영타(예: <code>;dg</code>) 그대로 둡니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-white/80 px-3 py-2 text-[11px] text-slate-600 border border-slate-200/70">
              <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" />
              <span>
                여러 별칭을 등록하려면 쉼표(<code>,</code>)로 구분하세요. (예:{' '}
                <code>**a, **.a</code>)
              </span>
            </div>
          </div>

          {/* Step 4: Group, Category, Note */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">분류 레이어</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value as EntryGroup)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium"
              >
                <option value="core">공용 OSNTR 기호</option>
                <option value="personal">개인 상용구 (이메일 등)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">카테고리</label>
              <input
                type="text"
                list="osntr-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                placeholder="예: 도형·별·체크"
              />
              <datalist id="osntr-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">메모 (선택)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="기억할 메모"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              {editingEntry ? '수정 완료' : '규칙 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
