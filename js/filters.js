/**
 * filters.js — multi-filter pipeline + UI bindings
 *
 * Pipeline order (when enabled):
 *   Sort → Include only → Balance range → Exclude → Top% → Bottom% →
 *   Top N → Bottom N → Every Nth → Random sample → Hard cap
 */
import { APP } from './state.js';
import { $, log } from './ui.js';

// ── Crypto-safe Fisher-Yates shuffle ────────────────────────────
function cryptoShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const r = new Uint32Array(1);
    crypto.getRandomValues(r);
    const j = r[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Helpers ──────────────────────────────────────────────────────
const togEl  = id => $(`tog-${id}`);
const isOn   = id => togEl(id)?.checked ?? false;
const numVal = (id, def) => { const v = parseInt($(`f-${id}`)?.value); return isNaN(v) ? def : v; };
const strVal = id => $(`f-${id}`)?.value ?? '';

// ── Core pipeline ────────────────────────────────────────────────
export function runPipeline() {
  if (!APP.allHolders.length) return { result: [], steps: [] };

  let pool = [...APP.allHolders];
  const steps = [];

  // 1. Sort
  if (isOn('sort')) {
    const mode = APP.sortMode;
    if      (mode === 'balDesc') pool.sort((a, b) => b.amount - a.amount);
    else if (mode === 'balAsc')  pool.sort((a, b) => a.amount - b.amount);
    else if (mode === 'random')  pool = cryptoShuffle(pool);
    else if (mode === 'alpha')   pool.sort((a, b) => a.owner.localeCompare(b.owner));
    steps.push(`Sort: ${mode}`);
  }

  // 2. Include only (whitelist)
  if (isOn('include')) {
    const addrs = strVal('includeList').split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const set = new Set(addrs);
    if (set.size) { pool = pool.filter(h => set.has(h.owner)); steps.push(`Include: ${set.size} addr`); }
  }

  // 3. Balance range
  if (isOn('balRange')) {
    const mn = numVal('balMin', 0);
    const mxRaw = strVal('balMax').trim();
    const mx = mxRaw === '' ? Infinity : Math.max(mn, parseInt(mxRaw) || 0);
    pool = pool.filter(h => h.amount >= mn && h.amount <= mx);
    steps.push(`Balance: ${mn}\u2013${mx === Infinity ? '\u221e' : mx}`);
  }

  // 4. Exclude list (blocklist)
  if (isOn('exclude')) {
    const addrs = strVal('excludeList').split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const set = new Set(addrs);
    if (set.size) { pool = pool.filter(h => !set.has(h.owner)); steps.push(`Exclude: ${set.size} addr`); }
  }

  // 5. Top %
  if (isOn('topPct')) {
    const pct  = Math.min(100, Math.max(1, numVal('topPct', 10)));
    const keep = Math.max(1, Math.round(pool.length * pct / 100));
    const set  = new Set([...pool].sort((a, b) => b.amount - a.amount).slice(0, keep).map(h => h.owner));
    pool = pool.filter(h => set.has(h.owner));
    steps.push(`Top ${pct}%`);
  }

  // 6. Bottom %
  if (isOn('botPct')) {
    const pct  = Math.min(100, Math.max(1, numVal('botPct', 10)));
    const keep = Math.max(1, Math.round(pool.length * pct / 100));
    const set  = new Set([...pool].sort((a, b) => a.amount - b.amount).slice(0, keep).map(h => h.owner));
    pool = pool.filter(h => set.has(h.owner));
    steps.push(`Bottom ${pct}%`);
  }

  // 7. Top N
  if (isOn('topN')) {
    const n   = Math.max(1, numVal('topN', 100));
    const set = new Set([...pool].sort((a, b) => b.amount - a.amount).slice(0, n).map(h => h.owner));
    pool = pool.filter(h => set.has(h.owner));
    steps.push(`Top ${n}`);
  }

  // 8. Bottom N
  if (isOn('botN')) {
    const n   = Math.max(1, numVal('botN', 100));
    const set = new Set([...pool].sort((a, b) => a.amount - b.amount).slice(0, n).map(h => h.owner));
    pool = pool.filter(h => set.has(h.owner));
    steps.push(`Bottom ${n}`);
  }

  // 9. Every Nth
  if (isOn('everyNth')) {
    const n = Math.max(2, numVal('everyNth', 2));
    pool = pool.filter((_, i) => i % n === 0);
    steps.push(`Every ${n}th`);
  }

  // 10. Random sample
  if (isOn('random')) {
    const n = Math.max(1, numVal('randomN', 50));
    pool = cryptoShuffle(pool).slice(0, Math.min(n, pool.length));
    steps.push(`Random ${n}`);
  }

  // 11. Hard cap (always last)
  if (isOn('cap')) {
    const n = Math.max(1, numVal('cap', 500));
    if (pool.length > n) { pool = pool.slice(0, n); steps.push(`Cap ${n}`); }
  }

  return { result: pool, steps };
}

// ── Live preview (no commit) ─────────────────────────────────────
export function livePreview() {
  if (!APP.allHolders.length) return;
  const { result, steps } = runPipeline();
  renderPipeBar(result.length, steps);
}

// ── Apply & commit to APP.holders ────────────────────────────────
export function applyFilter(onUpdate) {
  if (!APP.allHolders.length) { log('Load holders first.'); return; }
  const { result, steps } = runPipeline();
  APP.holders = result;
  const label = steps.length ? steps.join(' \u2192 ') : 'All holders';
  log(`Filters applied: ${label} \u2014 ${result.length} holders`);
  renderPipeBar(result.length, steps);
  renderHoldersList(result);
  if (typeof onUpdate === 'function') onUpdate();
}

// ── Reset all toggles ────────────────────────────────────────────
export function resetFilters(onUpdate) {
  document.querySelectorAll('.ftoggle').forEach(t => { t.checked = false; });
  document.querySelectorAll('.fcard').forEach(c => c.classList.remove('active'));
  APP.sortMode = 'balDesc';
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('on'));
  const defaultSort = document.querySelector('.sort-btn[data-sort="balDesc"]');
  if (defaultSort) defaultSort.classList.add('on');

  const pipeBar = $('pipeBar');
  if (pipeBar) pipeBar.style.display = 'none';
  const chip = $('targetChip');
  if (chip) chip.style.display = 'none';

  APP.holders = [...APP.allHolders];
  renderHoldersList(APP.holders);
  log(`Filters reset \u2014 all ${APP.holders.length} holders selected`);
  if (typeof onUpdate === 'function') onUpdate();
}

// ── Init UI bindings (called once from main.js) ──────────────────
export function initFilterUI(onUpdate) {
  // Toggle cards
  document.querySelectorAll('.ftoggle').forEach(tog => {
    tog.addEventListener('change', () => {
      const id = tog.id.replace('tog-', '');
      const card = $(`fc-${id}`);
      if (card) card.classList.toggle('active', tog.checked);
      livePreview();
    });
  });

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      APP.sortMode = btn.dataset.sort;
      livePreview();
    });
  });

  // Numeric inputs — live preview
  ['balMin','balMax','topPct','botPct','topN','botN','everyNth','randomN','cap'].forEach(id => {
    const el = $(`f-${id}`);
    if (el) el.addEventListener('input', livePreview);
  });
  ['excludeList','includeList'].forEach(id => {
    const el = $(`f-${id}`);
    if (el) el.addEventListener('input', livePreview);
  });
}

// ── Internal renderers ───────────────────────────────────────────
function renderPipeBar(count, steps) {
  const bar   = $('pipeBar');
  const cnt   = $('pipeCount');
  const stps  = $('pipeSteps');
  const chip  = $('targetChip');

  if (!bar) return;
  bar.style.display = 'block';
  if (cnt) cnt.textContent = `\u2714 ${count} holder${count !== 1 ? 's' : ''} selected`;
  if (stps) {
    const labels = steps.length ? steps : ['All holders'];
    stps.innerHTML = labels.map(s => `<span class="pipe-step">${s}</span>`).join('\u2192');
  }
  if (chip) {
    chip.textContent = `${count} selected`;
    chip.style.display = 'inline-flex';
  }
}

function renderHoldersList(list) {
  const el = $('holdersList');
  if (!el) return;
  el.style.display = 'block';
  const preview = list.slice(0, 30).map((h, i) => `${i + 1}. ${h.owner} (${h.amount})`).join('\n');
  el.textContent = preview + (list.length > 30 ? `\n\u2026 +${list.length - 30} more` : '');
}
