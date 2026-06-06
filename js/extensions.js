/**
 * extensions.js
 * Extension catalog, validation, dependency rules,
 * and wallet support warnings for Token-2022 features.
 */

/**
 * Full catalog of supported Token-2022 extensions.
 * Each entry describes behavior, requirements, and wallet support.
 */
export const EXTENSION_CATALOG = [
  {
    id:          'metadataPointer',
    label:       'Metadata Pointer',
    description: 'Points the mint to a metadata account. Lets the token carry a reference to where metadata lives.',
    mustInitAtMint: true,
    dependencies: [],
    walletSupport: 'Phantom, Solflare, Backpack — supported.',
    docs: 'https://solana.com/docs/tokens/extensions/metadata',
  },
  {
    id:          'tokenMetadata',
    label:       'On-Chain Token Metadata',
    description: 'Stores name, symbol, URI, and custom fields directly on the mint account.',
    mustInitAtMint: true,
    dependencies: ['metadataPointer'],
    walletSupport: 'Phantom — supported. Solflare — supported.',
    docs: 'https://solana.com/docs/tokens/extensions/metadata',
  },
  {
    id:          'transferHook',
    label:       'Transfer Hook',
    description: 'Executes a custom program on every token transfer. Used for royalties, compliance, or custom logic.',
    mustInitAtMint: true,
    dependencies: [],
    requiresField: 'transferHookProgramId',
    walletSupport: 'Phantom — supported. Some wallets may require additional permission prompts.',
    docs: 'https://solana.com/developers/guides/token-extensions/transfer-hook',
  },
  {
    id:          'transferFee',
    label:       'Transfer Fee',
    description: 'Automatically withholds a fee on every transfer. Requires basis-point rate and max fee cap.',
    mustInitAtMint: true,
    dependencies: [],
    requiresFields: ['transferFeeBps', 'transferFeeMaxLamports'],
    walletSupport: 'Phantom — supported. Solflare — supported.',
    docs: 'https://www.quicknode.com/guides/solana-development/spl-tokens/token-2022/overview',
  },
  {
    id:          'permanentDelegate',
    label:       'Permanent Delegate',
    description: 'Grants a permanent authority to transfer or burn from any account holding this token.',
    mustInitAtMint: true,
    dependencies: [],
    walletSupport: 'Supported by most major wallets. Treat as a high-trust authority.',
    docs: 'https://solana.com/docs/tokens/extensions',
  },
  {
    id:          'nonTransferable',
    label:       'Non-Transferable (Soulbound)',
    description: 'Makes the token permanently non-transferable. Ideal for credentials, badges, or identity tokens.',
    mustInitAtMint: true,
    dependencies: [],
    walletSupport: 'Phantom — supported.',
    docs: 'https://solana.com/docs/tokens/extensions',
  },
];

/**
 * Returns list of extension IDs that are currently enabled in the draft.
 */
export function getEnabledExtensions(draft) {
  return EXTENSION_CATALOG
    .filter(ext => draft.extensions?.[ext.id])
    .map(ext => ext.id);
}

/**
 * Validates extension config against catalog rules.
 * Returns array of error strings.
 */
export function validateExtensions(draft) {
  const errors = [];
  if (draft.mode !== 'token2022') return errors;

  EXTENSION_CATALOG.forEach(ext => {
    if (!draft.extensions?.[ext.id]) return;

    // dependency check
    ext.dependencies?.forEach(dep => {
      if (!draft.extensions?.[dep])
        errors.push(`"${ext.label}" requires "${dep}" to also be enabled.`);
    });

    // required single field
    if (ext.requiresField && !draft.extensionConfig?.[ext.requiresField]?.trim())
      errors.push(`"${ext.label}" requires the field: ${ext.requiresField}.`);

    // required multi-fields
    ext.requiresFields?.forEach(field => {
      if (!draft.extensionConfig?.[field])
        errors.push(`"${ext.label}" requires the field: ${field}.`);
    });
  });

  // nonTransferable + transferFee are incompatible
  if (draft.extensions?.nonTransferable && draft.extensions?.transferFee)
    errors.push('"Non-Transferable" and "Transfer Fee" cannot both be enabled.');

  return errors;
}

/**
 * Returns catalog entry by id.
 */
export function getExtensionMeta(id) {
  return EXTENSION_CATALOG.find(e => e.id === id) || null;
}
