/**
 * main.js — Wizard Airdrop bootstrap
 *
 * Imports all modules, wires event listeners, initialises the wizard UI.
 * All business logic lives in the individual modules.
 */

import { APP }                     from './state.js';
import { log, trunc }              from './ui.js';
import { connectWallet, tryResumeSession } from './wallet.js';
import { fetchAllHolders, getApiKey }      from './helius.js';
import { applyFilters, resetFilters }      from './filters.js';
import { showFees }                        from './fees.js';
import { executeAirdrop }                  from './airdrop.js';
import { buildReviewPanel }                from './token-builder.js';
import { initNav, goStep }                 from './nav.js';
import { applyArtManifest }               from './art.js';

// ====================================================================
// Wallet display
// ====================================================================
function updateWalletDisplay() {
  const el = document.getElementById('wallet-display');
  if (el) el.textContent = APP.walletPubkey ? trunc(APP.walletPubkey) : '';

  ['btn-connect', 'btn-connect-hero'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.textContent = APP.walletPubkey ? trunc(APP.walletPubkey) : 'Connect Wallet';
  });
}

// ====================================================================
// Holder loading (Step 7)
// ====================================================================
window.loadHolders = async function () {
  const keyInput  = document.getElementById('helius-key');
  const mintInput = document.getElementById('mint-input');
  const summary   = document.getElementById('holders-summary');
  const listEl    = document.getElementById('holders-list');
  const logEl     = document.getElementById('log-panel');

  const apiKey = keyInput && keyInput.value.trim();
  const mint   = mintInput && mintInput.value.trim();

  if (!apiKey) { alert('Enter your Helius API key first.'); return; }
  if (!mint)   { alert('Paste a target token mint address first.'); return; }

  logLine(logEl, `Loading holders for ${mint}…`);

  try {
    const holders = await fetchAllHolders(mint, apiKey);
    APP.holders = holders;

    logLine(logEl, `Done — ${holders.length} unique holder(s) sorted by balance desc.`);

    if (summary) {
      summary.style.display = 'flex';
      const countEl = document.getElementById('holders-count');
      const supEl   = document.getElementById('holders-supply');
      if (countEl) countEl.textContent = `${holders.length} holders`;
      if (supEl)   supEl.textContent   = `Total supply: ${holders.reduce((a, h) => a + BigInt(h.amount ?? 0), 0n)}`;
    }

    if (listEl) {
      listEl.innerHTML = '';
      const preview = holders.slice(0, 50);
      preview.forEach((h, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'padding:8px 16px;border-bottom:1px solid rgba(90,140,90,0.12);font-family:var(--font-mono);font-size:12px;color:var(--color-silver);';
        row.textContent = `${String(i + 1).padStart(3, '\u00a0')}. ${h.owner}  ·  ${h.amount}`;
        listEl.appendChild(row);
      });
      if (holders.length > 50) {
        const more = document.createElement('div');
        more.style.cssText = 'padding:10px 16px;font-size:12px;color:var(--color-ash);';
        more.textContent = `… +${holders.length - 50} more`;
        listEl.appendChild(more);
      }
    }

    await showFees(holders.length);
  } catch (err) {
    logLine(logEl, `Error: ${err.message || err}`, 'err');
  }
};

// ====================================================================
// Filter application
// ====================================================================
window.applyFilters = function () {
  applyFilters();
  const summary = document.getElementById('filter-summary');
  if (summary) {
    summary.textContent = `${APP.filteredHolders ? APP.filteredHolders.length : (APP.holders && APP.holders.length) || 0} recipients after filters`;
  }
};

// ====================================================================
// Airdrop amount
// ====================================================================
window.updateAirdropAmount = function (val) {
  APP.airdropAmount = val;
  updateAirdropSummary();
};

function updateAirdropSummary() {
  const el = document.getElementById('airdrop-summary');
  if (!el) return;
  const recipients = (APP.filteredHolders || APP.holders || []).length;
  const amount     = APP.airdropAmount || 0;
  el.textContent = `${recipients} recipients × ${amount} tokens = ${recipients * amount} tokens total`;
}

// ====================================================================
// Execute airdrop
// ====================================================================
window.executeAirdrop = async function () {
  const logEl = document.getElementById('log-panel');
  logLine(logEl, 'Starting airdrop…');
  try {
    await executeAirdrop(msg => logLine(logEl, msg));
    logLine(logEl, '✨ Airdrop complete!', 'ok');
  } catch (err) {
    logLine(logEl, `Airdrop error: ${err.message || err}`, 'err');
  }
};

// ====================================================================
// Token creation (Step 6)
// ====================================================================
window.createToken = async function () {
  const btn   = document.getElementById('btn-create-token');
  const logEl = document.getElementById('log-panel');
  if (btn) btn.disabled = true;
  logLine(logEl, 'Creating token…');
  try {
    const { createMint } = await import('./token-builder.js');
    await createMint(msg => logLine(logEl, msg));
    logLine(logEl, '✨ Token created!', 'ok');
  } catch (err) {
    logLine(logEl, `Error: ${err.message || err}`, 'err');
    if (btn) btn.disabled = false;
  }
};

// ====================================================================
// Review confirm checkbox
// ====================================================================
function initReviewConfirm() {
  const checkbox = document.getElementById('confirm-check');
  const createBtn = document.getElementById('btn-create-token');
  if (!checkbox || !createBtn) return;
  checkbox.addEventListener('change', () => {
    createBtn.disabled = !checkbox.checked;
  });
}

// ====================================================================
// Log helper
// ====================================================================
function logLine(el, msg, cls = 'info') {
  if (!el) return;
  const line = document.createElement('div');
  line.className = `log-${cls}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ====================================================================
// DOMContentLoaded boot
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Apply mystical art manifest to all images
  applyArtManifest();

  // Init navigation, step buttons, AI modal, scroll reveal
  initNav();

  // Restore wallet session
  if (tryResumeSession()) updateWalletDisplay();

  // Wire wallet connect buttons
  ['btn-connect', 'btn-connect-hero'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      await connectWallet();
      updateWalletDisplay();
    });
  });

  // Review step: listen for step change to build review panel
  document.addEventListener('wizard:stepchange', ({ detail: { step } }) => {
    if (step === 6) buildReviewPanel();
    if (step === 9) updateAirdropSummary();
  });

  // Review confirm gate
  initReviewConfirm();

  // Persist Helius API key
  const keyInput = document.getElementById('helius-key');
  if (keyInput) {
    const saved = localStorage.getItem('helius_api_key');
    if (saved) keyInput.value = saved;
    keyInput.addEventListener('input', () =>
      localStorage.setItem('helius_api_key', keyInput.value.trim())
    );
  }

  log('🌲 Wizard Airdrop ready.');
});
