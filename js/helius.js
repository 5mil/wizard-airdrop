/**
 * helius.js — Helius DAS API config + getTokenAccounts pagination
 *
 * Security: API key is read from the UI input at call time.
 * It is never hardcoded or stored in the source.
 */
import { APP } from './state.js';
import { $, log } from './ui.js';

const LAMPORTS_PER_SOL = 1_000_000_000;

export function getNet()    { return $('netSel').value; }
export function getApiKey() { return $('apiKeyInput').value.trim(); }

export function getRpcUrl() {
  const key = getApiKey();
  if (!key) return null;
  return getNet() === 'devnet'
    ? `https://devnet.helius-rpc.com/?api-key=${key}`
    : `https://mainnet.helius-rpc.com/?api-key=${key}`;
}

export function getConnection() {
  const url = getRpcUrl();
  if (!url) throw new Error('Enter your Helius API key first.');
  return new window.solanaWeb3.Connection(url, 'confirmed');
}

export function lamportsToSol(lamports) {
  return (lamports / LAMPORTS_PER_SOL).toFixed(6) + ' SOL';
}

/**
 * Paginate through all token accounts for a given mint.
 * Returns [{owner, amount}] sorted descending by amount.
 * Sets APP.allHolders and APP.holders as a side effect.
 */
export async function fetchAllHolders(mint) {
  const url = getRpcUrl();
  if (!url) throw new Error('Enter your Helius API key first.');

  const PAGE_SIZE = 1000;
  let page = 1;
  const ownerMap = new Map(); // owner -> highest amount seen

  while (true) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'wizard-gta',
        method: 'getTokenAccounts',
        params: { mint, page, limit: PAGE_SIZE, options: { showZeroBalance: false } },
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} from Helius`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'DAS API error');

    const accounts = json.result?.token_accounts ?? [];
    if (!accounts.length) { log(`Page ${page}: 0 accounts \u2014 done.`); break; }

    let added = 0;
    for (const a of accounts) {
      if (!a.owner) continue;
      const amt = Number(a.amount ?? 0);
      if (amt <= 0) continue;
      if ((ownerMap.get(a.owner) ?? 0) < amt) ownerMap.set(a.owner, amt);
      added++;
    }

    log(`Page ${page}: ${accounts.length} accounts, ${added} non-zero \u2014 ${ownerMap.size} unique owners`);
    if (accounts.length < PAGE_SIZE) break;
    page++;
    await new Promise(r => setTimeout(r, 200)); // light rate-limit guard
  }

  const sorted = [...ownerMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([owner, amount]) => ({ owner, amount }));

  APP.allHolders = sorted;
  APP.holders    = [...sorted];
  return sorted;
}
