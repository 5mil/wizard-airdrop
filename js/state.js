/**
 * state.js — shared application state
 * All modules read/write through this object.
 * Covers token studio, authority management, and airdrop pipeline.
 */
export const APP = {
  // wallet
  provider:     null,
  walletPubkey: null,

  // ai engine
  aiApiKey:     null,
  aiModel:      'nvidia/llama-3.3-nemotron-super-49b-v1.5',

  // token draft — set during studio steps 1-5
  tokenDraft: {
    mode:           'classic',   // 'classic' | 'token2022'
    name:           '',
    symbol:         '',
    decimals:       9,
    initialSupply:  0,
    description:    '',
    website:        '',
    socials:        {},
    imageUrl:       '',
    bannerUrl:      '',
    metadataUri:    '',
    metadataFields: [],          // [{ key, value }]
    extensions: {
      metadataPointer:   false,
      tokenMetadata:     false,
      transferHook:      false,
      transferFee:       false,
      permanentDelegate: false,
      nonTransferable:   false,
    },
    extensionConfig: {},         // { transferHookProgramId, transferFeeBps, transferFeeMaxLamports, ... }
    authorities: {
      mint:   { action: 'keep',   destination: null },
      freeze: { action: 'revoke', destination: null },
      update: { action: 'keep',   destination: null },
    },
  },

  // result — populated after token creation
  tokenResult: {
    mintAddress:      null,
    metadataAddress:  null,
    finalAuthorities: null,   // { mint, freeze, update } — wallet pubkey or 'revoked' or 'NA'
    mutable:          true,
    extensions:       [],
  },

  // holders & airdrop
  allHolders:   [],
  holders:      [],
  utilityMint:  null,
  sortMode:     'balDesc',
  airdrop: {
    amountPerHolder:    1,
    selectedRecipients: [],
    estimatedFees:      null,
    logs:               [],
  },
};

export function resetTokenDraft() {
  APP.tokenDraft = {
    mode: 'classic', name: '', symbol: '', decimals: 9,
    initialSupply: 0, description: '', website: '', socials: {},
    imageUrl: '', bannerUrl: '', metadataUri: '', metadataFields: [],
    extensions: {
      metadataPointer: false, tokenMetadata: false, transferHook: false,
      transferFee: false, permanentDelegate: false, nonTransferable: false,
    },
    extensionConfig: {},
    authorities: {
      mint:   { action: 'keep',   destination: null },
      freeze: { action: 'revoke', destination: null },
      update: { action: 'keep',   destination: null },
    },
  };
  APP.tokenResult = { mintAddress: null, metadataAddress: null, finalAuthorities: null, mutable: true, extensions: [] };
}

export function resetHolders() {
  APP.allHolders  = [];
  APP.holders     = [];
  APP.utilityMint = null;
  APP.sortMode    = 'balDesc';
  APP.airdrop     = { amountPerHolder: 1, selectedRecipients: [], estimatedFees: null, logs: [] };
}

export function resetSession() {
  APP.provider     = null;
  APP.walletPubkey = null;
  APP.aiApiKey     = null;
  resetTokenDraft();
  resetHolders();
}
