/**
 * wallet.js — wallet provider detection, connect, disconnect
 *
 * Security: private keys never leave the wallet extension.
 * This module only calls connect(), publicKey, and signTransaction().
 */
import { APP, resetSession } from './state.js';
import { $, log, setPanel } from './ui.js';

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function detectProvider() {
  if (window.solflare?.isSolflare)        return window.solflare;
  if (window.phantom?.solana?.isPhantom)  return window.phantom.solana;
  if (window.solana?.isPhantom)           return window.solana;
  if (window.backpack?.isBackpack)        return window.backpack;
  return null;
}

export async function connectWallet() {
  const provider = detectProvider();
  APP.provider = provider;

  if (!provider) {
    setPanel('mobilePanel', true);
    $('mobileTitle').textContent = 'Wallet not detected';
    $('mobileText').textContent = isMobile()
      ? 'Open this page inside Phantom, Solflare, or Backpack mobile browser.'
      : 'Install Phantom, Solflare, or Backpack in Chrome, then reload.';
    log('No wallet provider found.');
    return;
  }

  try {
    log('Connecting wallet\u2026');
    const res = await provider.connect({ onlyIfTrusted: false });
    const pk = res?.publicKey?.toString() || provider.publicKey?.toString() || null;
    if (!pk) throw new Error('No public key returned.');
    APP.walletPubkey = pk;
    setPanel('mobilePanel', false);
    log(`Wallet connected: ${pk}`);
  } catch (e) {
    log(`Connection failed: ${e.message || e}`);
  }
}

export async function disconnectWallet() {
  try {
    if (APP.provider?.disconnect) await APP.provider.disconnect();
  } catch (_) {}

  resetSession();

  const ids = ['holdersChip', 'holdersList', 'feePanel', 'pipeBar'];
  ids.forEach(id => {
    const el = $(id);
    if (el) el.style.display = 'none';
  });

  const hInfo = $('holdersInfo');
  if (hInfo) hInfo.style.display = 'none';

  setPanel('stepFilter', false);
  setPanel('step2', false);

  const umd = $('utilityMintDisplay');
  if (umd) umd.textContent = 'Not created yet.';

  log('Wallet disconnected.');
}

/**
 * Re-attach a previously connected session (page reload).
 * Called from main.js on window load.
 */
export function tryResumeSession() {
  const provider = detectProvider();
  if (provider?.publicKey) {
    APP.provider = provider;
    APP.walletPubkey = provider.publicKey.toString();
    log(`Existing session: ${APP.walletPubkey}`);
    return true;
  }
  return false;
}
