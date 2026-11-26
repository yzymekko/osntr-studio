import React, { useState } from 'react';
import { FileUp, UploadCloud, X } from 'lucide-react';
import type { OsntrEntry } from '../types/osntr';
import {
  buildEntryFromImport,
  computeImportDiff,
  parseImportFile,
  type DiffItem,
} from '../utils/importer';

interface ImportDiffModalProps {
  isOpen: boolean;
  existingEntries: OsntrEntry[];
  onClose: () => void;
  onApplyMerge: (nextEntries: OsntrEntry[]) => void;
}

export const ImportDiffModal: React.FC<ImportDiffModalProps> = ({
  isOpen,
  existingEntries,
  onClose,
  onApplyMerge,
}) => {
  const [fileName, setFileName] = useState('');
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    try {
      setError('');
      const text = await file.text();
      const parsed = parseImportFile(file.name, text);
      if (parsed.length === 0) {
        setError('파싱된 항목이 없습니다. (.plist, .ahk, .csv, .json 지원)');
        return;
      }
      setFileName(file.name);
      setDiffs(computeImportDiff(existingEntries, parsed));
    } catch (err) {
      setError(`파일 읽기 오류: ${(err as Error).message}`);
    }
  };

  const toggleItem = (id: string) => {
    setDiffs((prev) => prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)));
  };

  const addedCount = diffs.filter((d) => d.status === 'added').length;
  const modCount = diffs.filter((d) => d.status === 'modified').length;
  const remCount = diffs.filter((d) => d.status === 'removed').length;
  const uncCount = diffs.filter((d) => d.status === 'unchanged').length;

  const handleApply = () => {
    const map = new Map<string, OsntrEntry>();
    for (const e of existingEntries) {
      map.set(e.macShortcut.toLowerCase(), e);
    }

    for (const d of diffs) {
      if (!d.selected) continue;
      const key = d.macShortcut.toLowerCase();
      if (d.status === 'added' && d.incoming) {
        map.set(key, buildEntryFromImport(d.incoming));
      } else if (d.status === 'modified' && d.incoming && d.existing) {
        map.set(key, {
          ...d.existing,
          output: d.incoming.output,
        });
      } else if (d.status === 'removed') {
        map.delete(key);
      }
    }

    onApplyMerge(Array.from(map.values()));
    setDiffs([]);
    setFileName('');
    onClose();
  };

  const actionableDiffs = diffs.filter((d) => d.status !== 'unchanged');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileUp className="h-4 w-4 text-teal-700" />
            <h3 className="text-base font-semibold text-slate-900">
              기존 파일 가져오기 &amp; Diff 병합
            </h3>
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
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-teal-500 hover:bg-teal-50/30"
          >
            <UploadCloud className="h-7 w-7 text-slate-400" />
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-teal-700">파일을 선택</span>하거나 여기에 드래그 앤 드롭하세요
            </div>
            <div className="text-[11px] text-slate-400">지원 포맷: .plist, .ahk, .csv, .json</div>
            <input
              type="file"
              accept=".plist,.ahk,.csv,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          {diffs.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-700">파일: {fileName}</span>
                <div className="flex gap-2">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
                    추가 {addedCount}
                  </span>
                  <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                    변경 {modCount}
                  </span>
                  <span className="rounded bg-rose-100 px-2 py-0.5 font-medium text-rose-800">
                    누락/삭제 {remCount}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                    동일 {uncCount}
                  </span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
                {actionableDiffs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    현재 마스터 DB와 100% 동일합니다. 변경사항이 없습니다.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600">
                      <tr>
                        <th className="w-8 px-3 py-2">선택</th>
                        <th className="px-3 py-2">상태</th>
                        <th className="px-3 py-2">단축어</th>
                        <th className="px-3 py-2">기존 → 가져옴</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {actionableDiffs.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={d.selected}
                              onChange={() => toggleItem(d.id)}
                              className="accent-teal-700"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                d.status === 'added'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : d.status === 'modified'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {d.status === 'added'
                                ? '추가'
                                : d.status === 'modified'
                                ? '변경'
                                : '삭제'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono">{d.macShortcut}</td>
                          <td className="px-3 py-2">
                            {d.status === 'added' && (
                              <span className="text-emerald-700">{d.incoming?.output}</span>
                            )}
                            {d.status === 'modified' && (
                              <span>
                                <span className="text-slate-400 line-through">
                                  {d.existing?.output}
                                </span>{' '}
                                → <span className="font-semibold text-amber-800">{d.incoming?.output}</span>
                              </span>
                            )}
                            {d.status === 'removed' && (
                              <span className="text-rose-700 line-through">{d.existing?.output}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              닫기
            </button>
            <button
              type="button"
              disabled={actionableDiffs.filter((d) => d.selected).length === 0}
              onClick={handleApply}
              className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-40"
            >
              선택 항목 병합 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
