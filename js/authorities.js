/**
 * authorities.js
 * Handles keep / transfer / revoke logic for
 * mint authority, freeze authority, and metadata update authority.
 * Validates wallet control before allowing actions.
 */
import { APP } from './state.js';

export const AUTHORITY_TYPES = ['mint', 'freeze', 'update'];
export const AUTHORITY_ACTIONS = ['keep', 'transfer', 'revoke'];

/**
 * Returns true if the connected wallet currently controls the given authority.
 * authority: 'mint' | 'freeze' | 'update'
 */
export function walletControlsAuthority(authority) {
  const result = APP.tokenResult?.finalAuthorities;
  if (!result) return false; // token not yet created
  const val = result[authority];
  if (!val || val === 'NA' || val === 'revoked') return false;
  return val === APP.walletPubkey;
}

/**
 * Checks if a planned authority action is valid given current state.
 * Returns null if valid, or an error string if not.
 */
export function validateAuthorityAction(authority, action) {
  const draft = APP.tokenDraft.authorities?.[authority];
  if (!AUTHORITY_TYPES.includes(authority))
    return `Unknown authority type: ${authority}.`;
  if (!AUTHORITY_ACTIONS.includes(action))
    return `Unknown action: ${action}.`;
  if (action === 'transfer' && !draft?.destination?.trim())
    return `Transfer destination wallet address is required for ${authority} authority.`;
  return null;
}

/**
 * Builds a human-readable authority plan summary.
 * Used in the review screen.
 */
export function buildAuthorityPlan() {
  const auth = APP.tokenDraft.authorities || {};
  return AUTHORITY_TYPES.map(type => {
    const cfg = auth[type] || { action: type === 'freeze' ? 'revoke' : 'keep' };
    const dest = cfg.action === 'transfer' ? ` → ${cfg.destination}` : '';
    const irreversible = cfg.action === 'revoke' ? ' ⚠ IRREVERSIBLE' : '';
    return `${type.toUpperCase()} authority: ${cfg.action}${dest}${irreversible}`;
  });
}

/**
 * Returns whether any of the three authorities will be revoked.
 * Used to show the global irreversibility warning.
 */
export function hasIrreversibleActions() {
  const auth = APP.tokenDraft.authorities || {};
  return AUTHORITY_TYPES.some(t => auth[t]?.action === 'revoke');
}

/**
 * Returns a summary of what will remain mutable after finalization.
 */
export function getMutabilitySummary() {
  const auth = APP.tokenDraft.authorities || {};
  const status = {};
  AUTHORITY_TYPES.forEach(t => {
    const action = auth[t]?.action || 'keep';
    status[t] = action === 'revoke' ? 'locked' :
                action === 'transfer' ? `transferred to ${auth[t].destination}` :
                'retained by you';
  });
  return status;
}
