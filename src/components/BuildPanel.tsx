import React from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Code2,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Globe,
  Laptop,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { buildAhkScript } from '../exporters/exportAhk';
import { buildCsvContent, buildJsonBackup } from '../exporters/exportCsv';
import { buildHtmlCheatsheet } from '../exporters/exportHtml';
import { buildChunkedPlistZip, buildPlistXml } from '../exporters/exportPlist';
import type { BuildConfig, OsntrEntry, RuleScheme, ValidationResult } from '../types/osntr';
import { downloadBlob, downloadTextFile } from '../utils/download';

interface BuildPanelProps {
  entries: OsntrEntry[];
  config: BuildConfig;
  scheme: RuleScheme;
  onChangeConfig: (next: BuildConfig) => void;
  validation: ValidationResult;
  onPreviewCode: (title: string, code: string) => void;
}

export const BuildPanel: React.FC<BuildPanelProps> = ({
  entries,
  config,
  scheme,
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
    <div className="space-y-5">
      {/* Status & Common Option */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">설치 파일 빌드 &amp; 다운로드</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            현재 편집된 <strong>{buildEntries.length}개</strong> 규칙으로 각 기기에서 바로 쓸 수 있는 파일을 생성합니다.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={config.includePersonal}
            onChange={(e) => onChangeConfig({ ...config, includePersonal: e.target.checked })}
            className="h-4 w-4 accent-teal-700"
          />
          <span>개인 상용구(Personal) 함께 포함</span>
        </label>
      </div>

      {validation.errors.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <p className="font-bold">충돌 {validation.errors.length}건이 감지되었습니다</p>
            <p className="mt-0.5 text-rose-700">
              일부 단축어가 겹쳐 예상과 다르게 동작할 수 있습니다. 규칙 사전에서 충돌 항목을 먼저 수정하는 것을 권장합니다.
            </p>
          </div>
        </div>
      )}

      {/* Card 1: Windows AutoHotkey v2 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Laptop className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Windows · AutoHotkey v2 (.ahk)</h3>
              <p className="text-xs text-slate-500">
                한·영 상태를 구분할지 여부에 따라 원하는 방식을 선택하세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePreviewAhk}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Code2 className="h-3.5 w-3.5 text-teal-700" />
            생성 코드 미리보기
          </button>
        </div>

        {/* Standard vs IME Visual Comparison */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onChangeConfig({ ...config, ahkImeMode: 'standard' })}
            className={`rounded-xl border-2 p-4 text-left transition ${
              config.ahkImeMode === 'standard'
                ? 'border-teal-600 bg-teal-50/50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">정석 모드 (안정성 최우선)</span>
              {config.ahkImeMode === 'standard' && (
                <CheckCircle2 className="h-4 w-4 text-teal-700" />
              )}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              한·영 상태를 감지하지 않고 키보드 영타만으로 즉시 치환합니다. 노션·슬랙·게임 등{' '}
              <strong>모든 프로그램에서 지연·오류 0%</strong>로 작동합니다.
            </p>
            <div className="mt-2.5 rounded-lg bg-white/80 px-2.5 py-1.5 text-[11px] text-slate-600 border border-slate-200/70">
              • 겹치는 4종(◉◎☑︎☒︎)은 대문자(<code>{scheme.symbolPrefix}Dg</code> 등)로 입력
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChangeConfig({ ...config, ahkImeMode: 'ime' })}
            className={`rounded-xl border-2 p-4 text-left transition ${
              config.ahkImeMode === 'ime'
                ? 'border-teal-600 bg-teal-50/50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">IME 한영 구분 모드</span>
              {config.ahkImeMode === 'ime' && (
                <CheckCircle2 className="h-4 w-4 text-teal-700" />
              )}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              현재 한글/영문 입력 상태를 자동으로 감지해 분기합니다. 영문{' '}
              <code>{scheme.symbolPrefix}tm</code>만 ™으로 바꾸고 한글{' '}
              <code>{scheme.symbolPrefix}스</code>는 무시하고 싶을 때 선택하세요.
            </p>
            <div className="mt-2.5 rounded-lg bg-white/80 px-2.5 py-1.5 text-[11px] text-slate-600 border border-slate-200/70">
              • 한글 <code>{scheme.symbolPrefix}dg</code> → ◉ / 영문 <code>{scheme.symbolPrefix}dg</code> → ⓖ 분리
            </div>
          </button>
        </div>

        {config.ahkImeMode === 'ime' && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              참고: 일부 Electron 앱(노션·슬랙) 및 Windows UWP 앱에서는 IME 상태 감지가 간헐적으로 어긋날 수 있습니다.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
            <div>
              <span className="font-semibold text-slate-800">치환 후 스페이스 자동 제거</span>
              <span className="block text-[11px] text-slate-500">옵션 :CTO: (기호 뒤 공백 없음)</span>
            </div>
            <input
              type="checkbox"
              checked={config.ahkOmitEndChar}
              onChange={(e) => onChangeConfig({ ...config, ahkOmitEndChar: e.target.checked })}
              className="h-4 w-4 accent-teal-700"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
            <div>
              <span className="font-semibold text-slate-800">소문자 구분 기호 별칭 호환</span>
              <span className="block text-[11px] text-slate-500">
                Mac용 소문자 구분자({scheme.lowercaseSeparator || '없음'})도 Windows에서 함께 인식
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.ahkIncludeDotAliases}
              onChange={(e) =>
                onChangeConfig({ ...config, ahkIncludeDotAliases: e.target.checked })
              }
              className="h-4 w-4 accent-teal-700"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleDownloadAhk}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
          Windows용 .ahk 파일 다운로드 ({config.ahkImeMode === 'ime' ? 'IME 한영 구분' : '정석 모드'})
        </button>
      </section>

      {/* Card 2: macOS / iOS Plist */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">macOS / iPhone · 텍스트 대치 (.plist)</h3>
              <p className="text-xs text-slate-500">
                시스템 설정 → 키보드 → 텍스트 대치 창으로 드래그해 한 번에 등록하세요.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
            <span className="text-slate-600">분할 단위:</span>
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
              className="w-14 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right font-mono text-xs font-semibold"
            />
            <span className="text-slate-500">개씩</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleDownloadChunkedZip}
            className="flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <Archive className="h-4 w-4" />
            분할 ZIP 다운로드 ({totalParts}개 파일 · 추천)
          </button>
          <button
            type="button"
            onClick={handleDownloadSinglePlist}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            통합 .plist 1개로 다운로드
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          팁: iCloud 동기화 누락을 막기 위해 400개 이상 등록 시 <strong>100개 단위 분할 ZIP</strong>을 차례로 드래그하는 것을 권장합니다.
        </p>
      </section>

      {/* Card 3: Cheatsheet & Backups */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={handleDownloadHtml}
          className="flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs hover:border-teal-500 hover:bg-teal-50/30 transition"
        >
          <Globe className="h-5 w-5 text-teal-700" />
          <div className="text-sm font-bold text-slate-900">HTML 치트시트</div>
          <p className="text-xs text-slate-500">검색·클릭 복사가 되는 오프라인 요약표 파일</p>
        </button>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs hover:border-teal-500 hover:bg-teal-50/30 transition"
        >
          <FileSpreadsheet className="h-5 w-5 text-teal-700" />
          <div className="text-sm font-bold text-slate-900">엑셀용 CSV (BOM)</div>
          <p className="text-xs text-slate-500">한글 깨짐 없이 엑셀·구글시트에서 열기</p>
        </button>

        <button
          type="button"
          onClick={handleDownloadJson}
          className="flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs hover:border-teal-500 hover:bg-teal-50/30 transition"
        >
          <FileCode className="h-5 w-5 text-teal-700" />
          <div className="text-sm font-bold text-slate-900">마스터 JSON 백업</div>
          <p className="text-xs text-slate-500">현재 모든 규칙을 원본 그대로 저장·복원</p>
        </button>
      </section>
    </div>
  );
};
