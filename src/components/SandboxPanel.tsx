import React, { useState } from 'react';
import { Keyboard, RotateCcw, Sparkles } from 'lucide-react';
import { simulateSpaceCommit, type SandboxMode } from '../engine/sandboxEngine';
import type { BuildConfig, OsntrEntry } from '../types/osntr';

interface SandboxPanelProps {
  entries: OsntrEntry[];
  buildConfig: BuildConfig;
}

const SAMPLE_TOKENS = [';ㅇㅎ', ';Dg', ';dg', ';도씨', ';ㅁㅍ', '**A', '//0'];

export const SandboxPanel: React.FC<SandboxPanelProps> = ({ entries, buildConfig }) => {
  const [mode, setMode] = useState<SandboxMode>('mac');
  const [imeLang, setImeLang] = useState<'ko' | 'en'>('ko');
  const [text, setText] = useState('');
  const [lastMatch, setLastMatch] = useState<{ from: string; to: string } | null>(null);

  const handleSpaceCommit = () => {
    const result = simulateSpaceCommit(text, entries, {
      mode,
      imeLang,
      omitEndChar: buildConfig.ahkOmitEndChar,
      includeDotAliases: buildConfig.ahkIncludeDotAliases,
      endChar: buildConfig.ahkEndChars?.[0] || ' ',
    });
    setText(result.nextText);
    if (result.matchedEntry && result.matchedShortcut) {
      setLastMatch({ from: result.matchedShortcut, to: result.matchedEntry.output });
    } else {
      setLastMatch(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === ' ' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSpaceCommit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    // Also detect trailing space from mobile/IME composition commit
    if (val.endsWith(' ') && val.length === text.length + 1) {
      const withoutSpace = val.slice(0, -1);
      const result = simulateSpaceCommit(withoutSpace, entries, {
        mode,
        imeLang,
        omitEndChar: buildConfig.ahkOmitEndChar,
        includeDotAliases: buildConfig.ahkIncludeDotAliases,
        endChar: ' ',
      });
      setText(result.nextText);
      if (result.matchedEntry && result.matchedShortcut) {
        setLastMatch({ from: result.matchedShortcut, to: result.matchedEntry.output });
      }
      return;
    }
    setText(val);
  };

  const insertSample = (token: string) => {
    const prefix = text && !text.endsWith(' ') && !text.endsWith('\n') ? `${text} ` : text;
    setText(prefix + token);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-teal-700" />
          <h2 className="text-sm font-semibold text-slate-900">실시간 샌드박스 테스트</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setText('');
            setLastMatch(null);
          }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          title="입력창 비우기"
        >
          <RotateCcw className="h-3 w-3" />
          초기화
        </button>
      </div>

      {/* Mode Selector */}
      <div className="mb-2.5 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
        {(
          [
            { id: 'mac', label: 'Mac / iOS' },
            { id: 'ahk-standard', label: 'AHK 정석' },
            { id: 'ahk-ime', label: 'AHK IME' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-md py-1.5 transition ${
              mode === m.id
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'ahk-ime' && (
        <div className="mb-2.5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
          <span className="text-slate-600">Windows IME 상태 시뮬레이션</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setImeLang('ko')}
              className={`rounded px-2 py-0.5 font-medium ${
                imeLang === 'ko'
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              한글 (ko)
            </button>
            <button
              type="button"
              onClick={() => setImeLang('en')}
              className={`rounded px-2 py-0.5 font-medium ${
                imeLang === 'en'
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              영문 (en)
            </button>
          </div>
        </div>
      )}

      <textarea
        id="sandbox-input"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={3}
        placeholder="단축어 입력 후 Space를 눌러 치환 결과를 확인하세요 (예: ;ㅇㅎ + Space)"
        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-xs placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {SAMPLE_TOKENS.map((tok) => (
            <button
              key={tok}
              type="button"
              onClick={() => insertSample(tok)}
              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 hover:border-teal-500 hover:text-teal-800"
            >
              {tok}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSpaceCommit}
          className="shrink-0 rounded-md bg-teal-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-800"
        >
          Space 확정
        </button>
      </div>

      {lastMatch && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1.5 text-xs text-teal-900">
          <Sparkles className="h-3.5 w-3.5 text-teal-700" />
          <span>치환됨:</span>
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">{lastMatch.from}</code>
          <span>→</span>
          <span className="text-base leading-none">{lastMatch.to}</span>
        </div>
      )}
    </section>
  );
};
