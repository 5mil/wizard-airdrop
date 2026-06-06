/**
 * token-builder.js
 * Constructs Solana mint creation transactions.
 * Supports both classic SPL Token and Token-2022 programs.
 */
import { APP } from './state.js';

const TOKEN_PROGRAM_ID       = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID  = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const MINT_SPACE             = 82;
const MINT_2022_BASE_SPACE   = 234; // base before extensions

/**
 * Returns the correct token program ID based on current draft mode.
 */
export function getProgramId() {
  return APP.tokenDraft.mode === 'token2022'
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
}

/**
 * Validates the token draft before building any transaction.
 * Returns an array of error strings (empty = valid).
 */
export function validateDraft() {
  const d = APP.tokenDraft;
  const errors = [];
  if (!d.name?.trim())                           errors.push('Token name is required.');
  if (!d.symbol?.trim())                         errors.push('Token symbol is required.');
  if (d.symbol?.length > 10)                     errors.push('Symbol must be 10 characters or fewer.');
  if (!Number.isInteger(d.decimals) || d.decimals < 0 || d.decimals > 9)
                                                 errors.push('Decimals must be an integer 0–9.');
  if (!d.initialSupply || d.initialSupply <= 0)  errors.push('Initial supply must be greater than 0.');
  if (d.mode === 'token2022') {
    const ext = d.extensions || {};
    if (ext.transferHook && !ext.transferHookProgramId?.trim())
      errors.push('Transfer Hook requires a hook program ID.');
    if (ext.transferFee) {
      if (d.extensionConfig?.transferFeeBps == null)
        errors.push('Transfer Fee requires a basis-points value.');
      if (!d.extensionConfig?.transferFeeMaxLamports)
        errors.push('Transfer Fee requires a max fee (lamports).');
    }
  }
  return errors;
}

/**
 * Builds a human-readable summary of the full token draft.
 * Used in the Review & Finalize step.
 */
export function buildReviewSummary() {
  const d   = APP.tokenDraft;
  const ext = d.extensions || {};
  const auth = d.authorities || {};
  const enabledExt = Object.entries(ext)
    .filter(([k, v]) => v && k !== 'transferHookProgramId')
    .map(([k]) => k);

  return {
    mode:            d.mode === 'token2022' ? 'Token-2022' : 'Classic SPL',
    name:            d.name,
    symbol:          d.symbol,
    decimals:        d.decimals,
    initialSupply:   d.initialSupply.toLocaleString(),
    description:     d.description || '(none)',
    website:         d.website || '(none)',
    metadataUri:     d.metadataUri || '(none)',
    extensions:      enabledExt.length ? enabledExt.join(', ') : 'None',
    mintAuthority:   auth.mint?.action || 'keep',
    freezeAuthority: auth.freeze?.action || 'revoke',
    updateAuthority: auth.update?.action || 'keep',
    mutable:         auth.update?.action !== 'revoke',
  };
}

/**
 * Returns estimated space needed for the mint account.
 * Token-2022 accounts are larger depending on active extensions.
 */
export function estimateMintSpace() {
  if (APP.tokenDraft.mode !== 'token2022') return MINT_SPACE;
  const ext = APP.tokenDraft.extensions || {};
  let space = MINT_2022_BASE_SPACE;
  if (ext.transferFee)      space += 108;
  if (ext.transferHook)     space += 68;
  if (ext.metadataPointer)  space += 64;
  if (ext.permanentDelegate) space += 32;
  return space;
}
