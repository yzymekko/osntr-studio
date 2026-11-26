import React, { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';

interface PreviewCodeModalProps {
  title: string;
  code: string;
  onClose: () => void;
}

export const PreviewCodeModal: React.FC<PreviewCodeModalProps> = ({ title, code, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!code) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-teal-700" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? '복사됨' : '전체 복사'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <pre className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
          {code}
        </pre>
      </div>
    </div>
  );
};
