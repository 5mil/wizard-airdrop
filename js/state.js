/**
 * state.js — shared application state
 * Single source of truth for all modules.
 */
export const APP = {
  // wallet
  provider:     null,
  walletPubkey: null,

  // AI engine — defaults to Ollama (no key, no setup required)
  aiProvider:   'ollama',    // 'ollama' | 'nvidia_nim' | 'custom_openai' | 'mllm_bridge'
  aiApiKey:     null,        // only needed for nvidia_nim
  aiCustomUrl:  null,        // for custom_openai and mllm_bridge
  aiModel:      'phi4-mini', // default lightweight local model

  // token draft — set during studio steps 1–5
  tokenDraft: {
    mode:           'classic',  // 'classic' | 'token2022'
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
    metadataFields: [],         // [{ key, value }]
    extensions: {
      metadataPointer:   false,
      tokenMetadata:     false,
      transferHook:      false,
      transferFee:       false,
      permanentDelegate: false,
      nonTransferable:   false,
    },
    extensionConfig: {},
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
    finalAuthorities: null,
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
  APP.tokenResult = {
    mintAddress: null, metadataAddress: null,
    finalAuthorities: null, mutable: true, extensions: [],
  };
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
  APP.aiCustomUrl  = null;
  resetTokenDraft();
  resetHolders();
}
