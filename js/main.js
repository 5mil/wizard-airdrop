/**
 * main.js — bootstrap: imports all modules and wires up event listeners
 *
 * This file should contain ONLY wiring logic.
 * All business logic lives in the other modules.
 */
import { APP } from './state.js';
import { $, log, showInfo, hideInfo, trunc, setPanel } from './ui.js';
import { connectWallet, disconnectWallet, tryResumeSession } from './wallet.js';
import { fetchAllHolders, getApiKey, getRpcUrl, getNet, getConnection } from './helius.js';
import { initFilterUI, applyFilter, resetFilters } from './filters.js';
import { showFees } from './fees.js';
import { createUtilityMint, runAirdrop } from './airdrop.js';

// ── Status bar ────────────────────────────────────────────────────
function updateStatus() {
  const ep = getRpcUrl();
  $('sWallet').textContent   = APP.walletPubkey ? trunc(APP.walletPubkey) : 'Not connected';
  $('sNet').textContent      = getNet();
  $('sEndpoint').textContent = ep ? ep.replace(/api-key=.+/, 'api-key=\u2022\u2022\u2022') : 'Enter API key \u2191';

  $('connectBtn').disabled    = !!APP.walletPubkey;
  $('disconnectBtn').disabled = !APP.walletPubkey;
  $('airdropBtn').disabled    = !(
    APP.walletPubkey &&
    APP.holders.length &&
    APP.utilityMint &&
    Number($('amtInput').value) > 0
  );

  if (!getApiKey()) {
    showInfo($('keyTip'), '\ud83d\udd11 Get a <strong>free</strong> Helius key at <a href="https://helius.dev" target="_blank">helius.dev</a>.', 'tip');
  } else {
    hideInfo($('keyTip'));
  }
}

// ── Load holders ──────────────────────────────────────────────────
async function loadHolders() {
  const holdersInfo = $('holdersInfo');
  if (!getApiKey()) { showInfo(holdersInfo, 'Enter your Helius API key first.', 'err'); return; }
  const mint = $('mintInput').value.trim();
  if (!mint) { showInfo(holdersInfo, 'Paste a target token mint first.', 'err'); return; }

  hideInfo(holdersInfo);
  $('holdersList').style.display = 'none';
  $('feePanel').style.display   = 'none';
  $('pipeBar').style.display    = 'none';
  $('targetChip').style.display = 'none';
  setPanel('stepFilter', false);
  setPanel('step2', false);
  updateStatus();

  log(`Loading holders for ${mint}\u2026`);
  const holders = await fetchAllHolders(mint);
  log(`Done \u2014 ${holders.length} unique holder(s) sorted by balance desc.`);

  const chip = $('holdersChip');
  if (chip) {
    chip.style.display = 'inline-flex';
    chip.textContent   = `${holders.length} holder${holders.length !== 1 ? 's' : ''}`;
  }

  if (!holders.length) {
    showInfo(holdersInfo, 'No holders found for this mint.', 'err');
    return;
  }

  showInfo(holdersInfo, `<strong>${holders.length}</strong> unique holder${holders.length !== 1 ? 's' : ''} with non-zero balance`);

  const list = $('holdersList');
  if (list) {
    list.style.display = 'block';
    list.textContent   = holders.slice(0, 30).map((h, i) => `${i + 1}. ${h.owner} (${h.amount})`).join('\n')
      + (holders.length > 30 ? `\n\u2026 +${holders.length - 30} more` : '');
  }

  setPanel('stepFilter', true);
  setPanel('step2', true);
  updateStatus();
  await showFees(holders.length);
}

// ── Wire up everything on load ────────────────────────────────────
window.addEventListener('load', () => {
  // Persist API key in localStorage (user's device only)
  const SK = 'helius_api_key';
  const saved = localStorage.getItem(SK);
  if (saved) $('apiKeyInput').value = saved;
  $('apiKeyInput').addEventListener('input', () => {
    localStorage.setItem(SK, $('apiKeyInput').value.trim());
    updateStatus();
  });

  // Filter UI
  initFilterUI(updateStatus);

  // Initial status
  updateStatus();
  log('Preparing the spellbook\u2026');

  // Check for existing wallet session
  if (tryResumeSession()) {
    updateStatus();
  } else if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    setPanel('mobilePanel', true);
    $('mobileTitle').textContent = 'Mobile tip';
    $('mobileText').textContent  = 'Open this page inside Phantom, Solflare, or Backpack mobile browser.';
    log('Mobile device detected.');
  } else {
    log('Ready \u2014 connect your wallet to begin.');
  }

  // ── Event listeners ──
  $('netSel').addEventListener('change', updateStatus);

  $('connectBtn').addEventListener('click', async () => {
    await connectWallet();
    updateStatus();
  });

  $('disconnectBtn').addEventListener('click', async () => {
    await disconnectWallet();
    updateStatus();
  });

  $('loadBtn').addEventListener('click', () =>
    loadHolders().catch(e => {
      log(`Load error: ${e.message || e}`);
      showInfo($('holdersInfo'), `Error: ${e.message || e}`, 'err');
    })
  );

  $('applyFilterBtn').addEventListener('click', () => applyFilter(() => {
    showFees(APP.holders.length);
    updateStatus();
  }));

  $('resetFilterBtn').addEventListener('click', () => resetFilters(() => {
    showFees(APP.holders.length);
    updateStatus();
  }));

  $('createMintBtn').addEventListener('click', () =>
    createUtilityMint(updateStatus).catch(e => log(`Mint error: ${e.message || e}`))
  );

  $('airdropBtn').addEventListener('click', () =>
    runAirdrop(updateStatus).catch(e => {
      log(`Airdrop error: ${e.message || e}`);
      showInfo($('airdropInfo'), `Error: ${e.message || e}`, 'err');
    })
  );

  $('amtInput').addEventListener('input', updateStatus);
});
