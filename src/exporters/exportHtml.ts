import type { OsntrEntry } from '../types/osntr';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildHtmlCheatsheet(entries: OsntrEntry[]): string {
  const categories = Array.from(new Set(entries.map((e) => e.category)));
  const dataJson = JSON.stringify(
    entries.map((e) => ({
      id: e.id,
      group: e.group,
      category: e.category,
      output: e.output,
      mac: e.macShortcut,
      ahkStd: e.ahkStandardShortcuts,
      ahkIme: e.ahkImeShortcuts,
      scope: e.languageScope,
      diff: e.macShortcut !== e.ahkStandardShortcuts[0],
      fe0e: e.forceTextPresentation,
      note: e.note || '',
    }))
  ).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OSNTR v0.8.1 치트시트 (${entries.length}종)</title>
  <style>
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
      --accent: #0f766e;
      --accent-soft: #f0fdfa;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .container { max-width: 1120px; margin: 0 auto; padding: 28px 20px 60px; }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 24px; letter-spacing: -0.02em; }
    .subtitle { color: var(--muted); font-size: 13px; margin-top: 4px; }
    .controls {
      display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
      background: var(--surface); border: 1px solid var(--border);
      padding: 12px; border-radius: 12px; margin-bottom: 18px;
      position: sticky; top: 12px; z-index: 10;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
    }
    input[type="search"], select {
      border: 1px solid var(--border); border-radius: 8px;
      padding: 8px 12px; font-size: 14px; background: #fff; color: var(--text);
    }
    input[type="search"] { flex: 1; min-width: 220px; }
    label.toggle {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 13px; color: var(--text); cursor: pointer;
      padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border);
      background: #fff; user-select: none;
    }
    .count { font-size: 13px; color: var(--muted); margin-left: auto; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 10px;
    }
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 10px; padding: 12px; cursor: pointer;
      transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
      display: flex; flex-direction: column; gap: 8px;
    }
    .card:hover { border-color: var(--accent); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15, 118, 110, 0.08); }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .glyph { font-size: 26px; line-height: 1.1; font-weight: 500; }
    .cat { font-size: 11px; color: var(--muted); background: #f1f5f9; padding: 2px 7px; border-radius: 99px; }
    .shortcuts { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
    .lbl { color: var(--muted); font-size: 11px; }
    code { font-family: var(--mono); background: #f1f5f9; padding: 1px 6px; border-radius: 5px; font-size: 12px; }
    .diff-badge { font-size: 10px; color: #b45309; background: #fef3c7; padding: 1px 6px; border-radius: 4px; }
    .toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #0f172a; color: #fff; padding: 8px 16px; border-radius: 99px;
      font-size: 13px; opacity: 0; pointer-events: none; transition: opacity 0.2s;
    }
    .toast.show { opacity: 1; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>OSNTR v0.8.1 치트시트</h1>
        <div class="subtitle">카드를 클릭하면 출력 기호가 클립보드에 복사됩니다.</div>
      </div>
    </header>
    <div class="controls">
      <input id="q" type="search" placeholder="기호, 단축어(;ㅇㅎ, ;Dg), 카테고리 검색..." />
      <select id="cat">
        <option value="">전체 카테고리 (${categories.length})</option>
        ${categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
      </select>
      <label class="toggle">
        <input id="diffOnly" type="checkbox" />
        Mac ≠ AHK만 보기
      </label>
      <span class="count" id="count"></span>
    </div>
    <div class="grid" id="grid"></div>
  </div>
  <div class="toast" id="toast">복사되었습니다</div>
  <script>
    const DATA = ${dataJson};
    const qEl = document.getElementById('q');
    const catEl = document.getElementById('cat');
    const diffEl = document.getElementById('diffOnly');
    const gridEl = document.getElementById('grid');
    const countEl = document.getElementById('count');
    const toastEl = document.getElementById('toast');
    let timer;

    function showToast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => toastEl.classList.remove('show'), 1400);
    }

    function render() {
      const q = qEl.value.trim().toLowerCase();
      const cat = catEl.value;
      const diffOnly = diffEl.checked;
      const filtered = DATA.filter(item => {
        if (cat && item.category !== cat) return false;
        if (diffOnly && !item.diff) return false;
        if (!q) return true;
        return (
          item.output.toLowerCase().includes(q) ||
          item.mac.toLowerCase().includes(q) ||
          item.ahkStd.some(s => s.toLowerCase().includes(q)) ||
          item.ahkIme.some(s => s.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q)
        );
      });
      countEl.textContent = filtered.length + ' / ' + DATA.length + '개';
      gridEl.innerHTML = '';
      for (const item of filtered) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = \`
          <div class="card-top">
            <span class="glyph">\${item.output}</span>
            <span class="cat">\${item.category}</span>
          </div>
          <div class="shortcuts">
            <div class="row"><span class="lbl">Mac</span><code>\${item.mac}</code></div>
            <div class="row"><span class="lbl">AHK 정석</span><code>\${item.ahkStd.join(', ')}</code></div>
            <div class="row"><span class="lbl">AHK IME (\${item.scope})</span><code>\${item.ahkIme.join(', ')}</code></div>
          </div>
          \${item.diff ? '<div><span class="diff-badge">Mac ≠ AHK</span></div>' : ''}
        \`;
        card.addEventListener('click', () => {
          navigator.clipboard.writeText(item.output).then(() => {
            showToast('복사됨: ' + item.output);
          });
        });
        gridEl.appendChild(card);
      }
    }
    qEl.addEventListener('input', render);
    catEl.addEventListener('change', render);
    diffEl.addEventListener('change', render);
    render();
  </script>
</body>
</html>`;
}
