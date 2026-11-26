import React, { useEffect, useState } from 'react';
import { AlertCircle, Sparkles, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-base font-semibold text-slate-900">
            {editingEntry ? '규칙 수정' : '새 규칙 추가'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">레이어 그룹</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value as EntryGroup)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="core">공용 Core (OSNTR)</option>
                <option value="personal">개인 Personal (상용구)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">카테고리</label>
              <input
                type="text"
                list="osntr-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="예: 도형·별·체크"
              />
              <datalist id="osntr-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              출력 문자열 (Output)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={output}
                onChange={(e) => handleOutputChange(e.target.value)}
                placeholder="예: ◉ 또는 ◀︎"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-base"
              />
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  checked={forceFe0e}
                  onChange={(e) => handleToggleFe0e(e.target.checked)}
                  className="accent-teal-700"
                />
                <span className="font-mono font-medium">U+FE0E</span>
              </label>
            </div>
            {fe0eRecommended && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-teal-700">
                <Sparkles className="h-3 w-3" />
                컬러 이모지화 방지(U+FE0E) 권장 대상 기호입니다.
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">
                Mac / iOS 단축어 (macShortcut)
              </label>
              <label className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-500">
                <input
                  type="checkbox"
                  checked={autoSyncAhk}
                  onChange={(e) => setAutoSyncAhk(e.target.checked)}
                  className="accent-teal-700"
                />
                두벌식 영타 자동 변환
              </label>
            </div>
            <input
              type="text"
              required
              value={macShortcut}
              onChange={(e) => handleMacShortcutChange(e.target.value)}
              placeholder="예: ;ㅇㅎ 또는 ;도씨"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                AHK 정석 모드 (쉼표 구분)
              </label>
              <input
                type="text"
                value={ahkStdText}
                onChange={(e) => {
                  setAutoSyncAhk(false);
                  setAhkStdText(e.target.value);
                }}
                placeholder="예: ;Dg"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                AHK IME 모드 (쉼표 구분)
              </label>
              <input
                type="text"
                value={ahkImeText}
                onChange={(e) => {
                  setAutoSyncAhk(false);
                  setAhkImeText(e.target.value);
                }}
                placeholder="예: ;dg"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                AHK IME 언어 범위
              </label>
              <select
                value={languageScope}
                onChange={(e) => setLanguageScope(e.target.value as LanguageScope)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="ko">한글 IME 전용 (ko)</option>
                <option value="en">영문 IME 전용 (en)</option>
                <option value="both">한영 공통 (both)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">메모 (선택)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="충돌 회피 사유 등"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {languageScope === 'ko' && ahkStdText && ahkStdText === ahkImeText && (
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
              <span>영문/소문자 단축어와 충돌 시 정석 모드에만 대문자를 지정하세요.</span>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800"
            >
              {editingEntry ? '수정 저장' : '규칙 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
