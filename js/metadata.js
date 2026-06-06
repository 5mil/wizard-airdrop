/**
 * metadata.js
 * Handles token metadata construction, validation, and
 * on-chain metadata update authority actions.
 * Supports both Metaplex-style off-chain URI metadata
 * and Token-2022 on-chain TokenMetadata extension fields.
 */
import { APP } from './state.js';

/**
 * Builds the off-chain metadata JSON object from the current draft.
 * This can be uploaded to IPFS/Arweave and the URI stored on-chain.
 */
export function buildMetadataJson() {
  const d = APP.tokenDraft;
  return {
    name:        d.name,
    symbol:      d.symbol,
    description: d.description || '',
    image:       d.imageUrl    || '',
    external_url: d.website   || '',
    attributes:  d.metadataFields || [],
    properties: {
      files:    d.imageUrl ? [{ uri: d.imageUrl, type: 'image/png' }] : [],
      category: 'token',
      creators: [{ address: APP.walletPubkey, share: 100 }],
    },
  };
}

/**
 * Returns a display-friendly list of metadata fields
 * set in the current draft, for the review screen.
 */
export function getMetadataFieldSummary() {
  const fields = APP.tokenDraft.metadataFields || [];
  if (!fields.length) return 'No custom fields defined.';
  return fields.map(f => `${f.key}: ${f.value}`).join('  |  ');
}

/**
 * Validates metadata fields before finalization.
 * Returns array of error strings.
 */
export function validateMetadata() {
  const d = APP.tokenDraft;
  const errors = [];
  if (d.imageUrl && !isValidUrl(d.imageUrl))
    errors.push('Image URL is not a valid URL.');
  if (d.website && !isValidUrl(d.website))
    errors.push('Website URL is not a valid URL.');
  if (d.metadataUri && !isValidUrl(d.metadataUri))
    errors.push('Metadata URI is not a valid URL.');
  const fields = d.metadataFields || [];
  fields.forEach((f, i) => {
    if (!f.key?.trim())   errors.push(`Field ${i + 1}: key is required.`);
    if (!f.value?.trim()) errors.push(`Field ${i + 1}: value is required.`);
  });
  return errors;
}

/**
 * Checks if metadata update authority is currently controllable.
 * If the authority is NA or already revoked, returns false.
 */
export function canUpdateMetadata() {
  const result = APP.tokenResult;
  if (!result?.finalAuthorities) return false;
  const upd = result.finalAuthorities.update;
  return upd && upd !== 'NA' && upd !== 'revoked';
}

function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}
