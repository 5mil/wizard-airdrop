/**
 * state.js — shared application state
 * All modules read/write through this object instead of module-level globals.
 */
export const APP = {
  provider:     null,   // injected wallet provider
  walletPubkey: null,   // connected wallet address string
  allHolders:   [],     // [{owner, amount}] — full sorted list from Helius
  holders:      [],     // currently selected subset (used for airdrop)
  utilityMint:  null,   // created mint address string
  sortMode:     'balDesc',
};

export function resetHolders() {
  APP.allHolders = [];
  APP.holders    = [];
  APP.utilityMint = null;
  APP.sortMode    = 'balDesc';
}

export function resetSession() {
  APP.provider     = null;
  APP.walletPubkey = null;
  resetHolders();
}
