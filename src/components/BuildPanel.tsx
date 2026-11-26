import React from 'react';
import {
  AlertTriangle,
  Archive,
  Code2,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Globe,
  ShieldAlert,
} from 'lucide-react';
import { buildAhkScript } from '../exporters/exportAhk';
import { buildCsvContent, buildJsonBackup } from '../exporters/exportCsv';
import { buildHtmlCheatsheet } from '../exporters/exportHtml';
import { buildChunkedPlistZip, buildPlistXml } from '../exporters/exportPlist';
import type { BuildConfig, OsntrEntry, ValidationResult } from '../types/osntr';
import { downloadBlob, downloadTextFile } from '../utils/download';

interface BuildPanelProps {
  entries: OsntrEntry[];
  config: BuildConfig;
  onChangeConfig: (next: BuildConfig) => void;
  validation: ValidationResult;
  onPreviewCode: (title: string, code: string) => void;
}

export const BuildPanel: React.FC<BuildPanelProps> = ({
  entries,
  config,
  onChangeConfig,
  validation,
  onPreviewCode,
}) => {
  const buildEntries = config.includePersonal
    ? entries
    : entries.filter((e) => e.group === 'core');

  const totalParts = Math.max(
    1,
    Math.ceil(buildEntries.length / Math.max(1, config.plistChunkSize))
  );

  const handleDownloadAhk = () => {
    const script = buildAhkScript(buildEntries, config);
    const suffix = config.ahkImeMode === 'ime' ? 'IME' : 'Standard';
    downloadTextFile(`OSNTR_v0.8.1_${suffix}.ahk`, script, 'text/plain;charset=utf-8');
  };

  const handlePreviewAhk = () => {
    const script = buildAhkScript(buildEntries, config);
    onPreviewCode(
      `AutoHotkey v2 미리보기 (${config.ahkImeMode === 'ime' ? 'IME 한영 구분' : '정석 모드'})`,
      script.replace(/^\uFEFF/, '')
    );
  };

  const handleDownloadSinglePlist = () => {
    const xml = buildPlistXml(buildEntries);
    downloadTextFile('OSNTR_v0.8.1_All.plist', xml, 'application/xml;charset=utf-8');
  };

  const handleDownloadChunkedZip = async () => {
    const blob = await buildChunkedPlistZip(buildEntries, config.plistChunkSize);
    downloadBlob(`OSNTR_v0.8.1_Plist_${totalParts}Parts.zip`, blob);
  };

  const handleDownloadHtml = () => {
    const html = buildHtmlCheatsheet(buildEntries);
    downloadTextFile('OSNTR_v0.8.1_Cheatsheet.html', html, 'text/html;charset=utf-8');
  };

  const handleDownloadCsv = () => {
    const csv = buildCsvContent(buildEntries);
    downloadTextFile('OSNTR_v0.8.1.csv', csv, 'text/csv;charset=utf-8');
  };

  const handleDownloadJson = () => {
    const json = buildJsonBackup(entries);
    downloadTextFile('OSNTR_Master_Backup.json', json, 'application/json;charset=utf-8');
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">멀티 포맷 빌드 &amp; 내보내기</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          대상 {buildEntries.length}개
        </span>
      </div>

      {validation.errors.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">충돌 {validation.errors.length}건 감지됨</p>
            <p className="text-rose-700">빌드 전 충돌을 해결하는 것을 권장합니다.</p>
          </div>
        </div>
      )}

      {/* Personal layer toggle */}
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs">
        <span className="font-medium text-slate-700">개인(Personal) 레이어 포함</span>
        <input
          type="checkbox"
          checked={config.includePersonal}
          onChange={(e) => onChangeConfig({ ...config, includePersonal: e.target.checked })}
          className="h-4 w-4 accent-teal-700"
        />
      </label>

      {/* Windows AHK v2 */}
      <div className="space-y-2.5 rounded-lg border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <FileCode className="h-4 w-4 text-teal-700" />
            <span>Windows AutoHotkey v2 (.ahk)</span>
          </div>
          <button
            type="button"
            onClick={handlePreviewAhk}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:underline"
          >
            <Code2 className="h-3 w-3" />
            코드 미리보기
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onChangeConfig({ ...config, ahkImeMode: 'standard' })}
            className={`rounded-md border px-2 py-1.5 text-left transition ${
              config.ahkImeMode === 'standard'
                ? 'border-teal-600 bg-teal-50/70 text-teal-900'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="font-semibold">정석 모드</div>
            <div className="text-[10px] opacity-80">IME 미감지 · 오류 0%</div>
          </button>
          <button
            type="button"
            onClick={() => onChangeConfig({ ...config, ahkImeMode: 'ime' })}
            className={`rounded-md border px-2 py-1.5 text-left transition ${
              config.ahkImeMode === 'ime'
                ? 'border-teal-600 bg-teal-50/70 text-teal-900'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="font-semibold">IME 한영 구분</div>
            <div className="text-[10px] opacity-80">Windows IME API 감지</div>
          </button>
        </div>

        {config.ahkImeMode === 'ime' && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] leading-snug text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>
              일부 Electron(노션·슬랙) 및 UWP 앱에서는 Windows IME 상태 감지가 간헐적으로 어긋날 수 있습니다.
            </span>
          </div>
        )}

        <div className="space-y-1.5 pt-1 text-xs text-slate-700">
          <label className="flex cursor-pointer items-center justify-between">
            <span>EndChar(스페이스) 생략 (:CTO:)</span>
            <input
              type="checkbox"
              checked={config.ahkOmitEndChar}
              onChange={(e) => onChangeConfig({ ...config, ahkOmitEndChar: e.target.checked })}
              className="h-3.5 w-3.5 accent-teal-700"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between">
            <span>소문자 점(.) 별칭 호환 포함</span>
            <input
              type="checkbox"
              checked={config.ahkIncludeDotAliases}
              onChange={(e) =>
                onChangeConfig({ ...config, ahkIncludeDotAliases: e.target.checked })
              }
              className="h-3.5 w-3.5 accent-teal-700"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleDownloadAhk}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" />
          .ahk 스크립트 다운로드
        </button>
      </div>

      {/* macOS / iOS Plist */}
      <div className="space-y-2.5 rounded-lg border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <FileText className="h-4 w-4 text-teal-700" />
            <span>macOS / iOS (.plist)</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-600">
            <span>분할 단위:</span>
            <input
              type="number"
              min={10}
              max={500}
              step={10}
              value={config.plistChunkSize}
              onChange={(e) =>
                onChangeConfig({
                  ...config,
                  plistChunkSize: Math.max(10, Number(e.target.value) || 100),
                })
              }
              className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-right font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownloadSinglePlist}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            통합 .plist
          </button>
          <button
            type="button"
            onClick={handleDownloadChunkedZip}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-2.5 py-2 text-xs font-medium text-white hover:bg-teal-800"
          >
            <Archive className="h-3.5 w-3.5" />
            분할 ZIP ({totalParts}개)
          </button>
        </div>
      </div>

      {/* Docs & Backup */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        <button
          type="button"
          onClick={handleDownloadHtml}
          className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
        >
          <Globe className="h-3.5 w-3.5 text-teal-700" />
          HTML 치트시트
        </button>
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-teal-700" />
          CSV (BOM)
        </button>
        <button
          type="button"
          onClick={handleDownloadJson}
          className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
        >
          <Download className="h-3.5 w-3.5 text-teal-700" />
          JSON 백업
        </button>
      </div>
    </section>
  );
};
