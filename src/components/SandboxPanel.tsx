import React, { useMemo, useState } from 'react';
import { Keyboard, RotateCcw, Sparkles } from 'lucide-react';
import { simulateSpaceCommit, type SandboxMode } from '../engine/sandboxEngine';
import type { BuildConfig, OsntrEntry, RuleScheme } from '../types/osntr';

interface SandboxPanelProps {
  entries: OsntrEntry[];
  buildConfig: BuildConfig;
  scheme: RuleScheme;
}

export const SandboxPanel: React.FC<SandboxPanelProps> = ({ entries, buildConfig, scheme }) => {
  const [mode, setMode] = useState<SandboxMode>('mac');
  const [imeLang, setImeLang] = useState<'ko' | 'en'>('ko');
  const [text, setText] = useState('');
  const [lastMatch, setLastMatch] = useState<{ from: string; to: string } | null>(null);

  // Dynamically generate sample tokens matching the user's current RuleScheme!
  const sampleTokens = useMemo(() => {
    const p = scheme.symbolPrefix;
    const b = scheme.boldPrefix;
    const db = scheme.doubleBoldPrefix;
    const lowerBoldA =
      scheme.lowercasePosition === 'before'
        ? `${b}${scheme.lowercaseSeparator}a`
        : `${b}a${scheme.lowercaseSeparator}`;

    return [
      `${p}ㅇㅎ`,
      `${p}tm`,
      `${p}도씨`,
      `${b}A`,
      lowerBoldA,
      `${db}0`,
      `${p}${scheme.stemCircledOpen}A`,
    ];
  }, [scheme]);

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

  const modeHint =
    mode === 'mac'
      ? '한·영 구분 O · 대소문자 구분 X (예: ;tm만 ™으로 변환)'
      : mode === 'ahk-standard'
      ? '한·영 구분 X · 대소문자 구분 O (예: ;Dg→◉, ;dg→ⓖ)'
      : `한·영 자동 구분 O · 현재 ${imeLang === 'ko' ? '한글' : '영문'} 입력 상태`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Keyboard className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">실시간 타이핑 테스트</h2>
            <p className="text-[11px] text-slate-500">단축어 입력 후 Space를 눌러보세요</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setText('');
            setLastMatch(null);
          }}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          title="입력창 비우기"
        >
          <RotateCcw className="h-3 w-3" />
          지우기
        </button>
      </div>

      {/* Mode Selector */}
      <div className="mb-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
        {(
          [
            { id: 'mac', label: 'Mac · iOS' },
            { id: 'ahk-standard', label: 'Win 정석' },
            { id: 'ahk-ime', label: 'Win IME' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-lg py-1.5 transition ${
              mode === m.id
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mb-2.5 text-[11px] text-slate-500">{modeHint}</p>

      {mode === 'ahk-ime' && (
        <div className="mb-2.5 flex items-center justify-between rounded-xl border border-teal-200/70 bg-teal-50/50 px-3 py-1.5 text-xs">
          <span className="font-medium text-teal-900">가상 한/영 키 상태</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setImeLang('ko')}
              className={`rounded-md px-2.5 py-0.5 text-xs font-semibold transition ${
                imeLang === 'ko'
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              한글
            </button>
            <button
              type="button"
              onClick={() => setImeLang('en')}
              className={`rounded-md px-2.5 py-0.5 text-xs font-semibold transition ${
                imeLang === 'en'
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              영문
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
        placeholder={`여기에 ${scheme.symbolPrefix}ㅇㅎ 입력 후 Space...`}
        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-xs placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none"
      />

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {sampleTokens.map((tok) => (
            <button
              key={tok}
              type="button"
              onClick={() => insertSample(tok)}
              className="keycap hover:border-teal-500 hover:bg-teal-50 hover:text-teal-800 transition cursor-pointer"
            >
              {tok}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSpaceCommit}
          className="shrink-0 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
        >
          Space 확정
        </button>
      </div>

      {lastMatch && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-xs text-teal-900 border border-teal-200/60">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-700" />
          <span>변환 성공:</span>
          <span className="keycap bg-white">{lastMatch.from}</span>
          <span>→</span>
          <span className="text-base font-medium leading-none">{lastMatch.to}</span>
        </div>
      )}
    </section>
  );
};
