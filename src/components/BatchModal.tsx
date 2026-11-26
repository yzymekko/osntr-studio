import React, { useMemo, useState } from 'react';
import { Layers, X } from 'lucide-react';
import type { EntryGroup, OsntrEntry } from '../types/osntr';
import { generateBatchEntries, type BatchPatternType } from '../utils/batchGenerator';

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBatch: (entries: OsntrEntry[]) => void;
}

export const BatchModal: React.FC<BatchModalProps> = ({ isOpen, onClose, onAddBatch }) => {
  const [patternType, setPatternType] = useState<BatchPatternType>('A-Z');
  const [shortcutPrefix, setShortcutPrefix] = useState(';m');
  const [outputBaseCodePoint, setOutputBaseCodePoint] = useState('1F130');
  const [outputListText, setOutputListText] = useState('');
  const [rangeMax, setRangeMax] = useState(9);
  const [useDotForLowercase, setUseDotForLowercase] = useState(true);
  const [category, setCategory] = useState('일괄 생성');
  const [group, setGroup] = useState<EntryGroup>('core');
  const [forceFe0e, setForceFe0e] = useState(false);

  const previewEntries = useMemo(() => {
    if (!isOpen) return [];
    return generateBatchEntries({
      patternType,
      shortcutPrefix,
      outputBaseCodePoint,
      outputListText,
      rangeMax,
      useDotForLowercase,
      category,
      group,
      forceTextPresentation: forceFe0e,
    });
  }, [
    isOpen,
    patternType,
    shortcutPrefix,
    outputBaseCodePoint,
    outputListText,
    rangeMax,
    useDotForLowercase,
    category,
    group,
    forceFe0e,
  ]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (previewEntries.length === 0) return;
    onAddBatch(previewEntries);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-teal-700" />
            <h3 className="text-base font-semibold text-slate-900">패턴 일괄 생성기 (Batch Generator)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                { id: 'A-Z', label: '대문자 A~Z (26)' },
                { id: 'a-z', label: '소문자 a~z (26)' },
                { id: '0-N', label: '숫자 0~N' },
                { id: 'directions', label: '방향 ㅗㅜㅓㅏ (4)' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPatternType(p.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  patternType === p.id
                    ? 'border-teal-600 bg-teal-50 text-teal-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">단축어 접두사</label>
              <input
                type="text"
                value={shortcutPrefix}
                onChange={(e) => setShortcutPrefix(e.target.value)}
                placeholder="예: ;d 또는 **"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-sm"
              />
            </div>

            {patternType === '0-N' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">최대 숫자 N</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={rangeMax}
                  onChange={(e) => setRangeMax(Number(e.target.value) || 9)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-sm"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                시작 유니코드 (Hex)
              </label>
              <input
                type="text"
                value={outputBaseCodePoint}
                onChange={(e) => setOutputBaseCodePoint(e.target.value)}
                placeholder="예: 1F130 (🄰)"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">카테고리</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              또는 출력 목록 직접 입력 (쉼표 구분 — 입력 시 유니코드 대신 우선 적용)
            </label>
            <input
              type="text"
              value={outputListText}
              onChange={(e) => setOutputListText(e.target.value)}
              placeholder="예: ↑, ↓, ←, →"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
            {patternType === 'a-z' && (
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={useDotForLowercase}
                  onChange={(e) => setUseDotForLowercase(e.target.checked)}
                  className="accent-teal-700"
                />
                Mac용 소문자 점(.) 구분자 자동 삽입
              </label>
            )}
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={forceFe0e}
                onChange={(e) => setForceFe0e(e.target.checked)}
                className="accent-teal-700"
              />
              U+FE0E 강제 부착
            </label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as EntryGroup)}
              className="rounded border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="core">Core 레이어</option>
              <option value="personal">Personal 레이어</option>
            </select>
          </div>

          {/* Preview */}
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-1.5">출력</th>
                  <th className="px-3 py-1.5">Mac</th>
                  <th className="px-3 py-1.5">AHK</th>
                  <th className="px-3 py-1.5">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {previewEntries.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-1.5 text-base">{item.output}</td>
                    <td className="px-3 py-1.5 font-mono">{item.macShortcut}</td>
                    <td className="px-3 py-1.5 font-mono">{item.ahkStandardShortcuts.join(', ')}</td>
                    <td className="px-3 py-1.5">{item.languageScope}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-500">총 {previewEntries.length}개 항목 생성 예정</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800"
              >
                일괄 추가하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
