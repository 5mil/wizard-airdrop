/**
 * ai-engine.js
 * AI assistance layer powered by NVIDIA Nemotron via NVIDIA NIM API.
 * Uses the OpenAI-compatible endpoint at https://integrate.api.nvidia.com/v1
 *
 * Supported models (user-selectable):
 *   nvidia/llama-3.3-nemotron-super-49b-v1.5  — best reasoning, tool calling, chat
 *   nvidia/llama-3.1-nemotron-70b-instruct    — balanced instruct
 *   nvidia/nemotron-4-340b-instruct           — largest, for complex generation
 *
 * The NVIDIA NIM free tier provides 1,000 inference credits on signup
 * at https://build.nvidia.com and 40 requests/minute rate limit.
 * Users supply their own NVIDIA_API_KEY — never hardcoded here.
 *
 * Reference: https://build.nvidia.com/nvidia/llama-3_3-nemotron-super-49b-v1_5
 */

const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export const NEMOTRON_MODELS = [
  {
    id:          'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    label:       'Nemotron Super 49B',
    description: 'Best for reasoning, tool calling, and token design guidance. 131K context.',
    recommended: true,
  },
  {
    id:          'nvidia/llama-3.1-nemotron-70b-instruct',
    label:       'Nemotron 70B Instruct',
    description: 'Balanced instruction-following and chat. Great for metadata writing.',
    recommended: false,
  },
  {
    id:          'nvidia/nemotron-4-340b-instruct',
    label:       'Nemotron-4 340B',
    description: 'Largest model. Best for synthetic data, complex creative generation, and deep analysis.',
    recommended: false,
  },
];

/**
 * Core chat completion call to NVIDIA NIM.
 * @param {string} apiKey     — user-supplied NVIDIA API key
 * @param {string} model      — model id from NEMOTRON_MODELS
 * @param {Array}  messages   — OpenAI-format message array
 * @param {object} options    — optional overrides { temperature, max_tokens, stream }
 * @returns {Promise<string>} — assistant reply text
 */
export async function nemotronChat(apiKey, model, messages, options = {}) {
  if (!apiKey) throw new Error('NVIDIA API key is required. Get one free at https://build.nvidia.com');
  const body = {
    model,
    messages,
    temperature:  options.temperature  ?? 0.6,
    top_p:        options.top_p        ?? 1,
    max_tokens:   options.max_tokens   ?? 1024,
    stream:       options.stream       ?? false,
  };
  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NVIDIA NIM error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * AI-assisted token name and symbol suggestions.
 * @param {string} apiKey
 * @param {string} concept  — short description of the token concept
 * @param {string} model
 */
export async function suggestTokenIdentity(apiKey, concept, model = NEMOTRON_MODELS[0].id) {
  const messages = [
    {
      role: 'system',
      content: 'You are a creative crypto token naming expert. Suggest token names and symbols that are memorable, relevant, and appropriate for Solana. Always return a JSON array of 5 suggestions, each with fields: name, symbol, tagline.',
    },
    {
      role: 'user',
      content: `Suggest 5 Solana token identity options for this concept: "${concept}". Return JSON only.`,
    },
  ];
  const raw = await nemotronChat(apiKey, model, messages, { temperature: 0.85, max_tokens: 512 });
  try {
    const json = raw.match(/\[.*\]/s)?.[0];
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

/**
 * AI-assisted metadata description writer.
 * @param {string} apiKey
 * @param {string} name     — token name
 * @param {string} symbol   — token symbol
 * @param {string} concept  — optional additional context
 * @param {string} model
 */
export async function writeTokenDescription(apiKey, name, symbol, concept = '', model = NEMOTRON_MODELS[0].id) {
  const messages = [
    {
      role: 'system',
      content: 'You write concise, compelling token metadata descriptions for Solana tokens. Max 280 characters. No jargon. Return only the description text.',
    },
    {
      role: 'user',
      content: `Write a description for a Solana token named "${name}" with symbol "${symbol}". Additional context: ${concept || 'none'}.`,
    },
  ];
  return nemotronChat(apiKey, model, messages, { temperature: 0.7, max_tokens: 200 });
}

/**
 * AI-assisted authority recommendation.
 * Analyzes the token's intended use and recommends keep/revoke settings.
 * @param {string} apiKey
 * @param {string} useCase — e.g. "community rewards token", "limited edition NFT-style token"
 * @param {string} model
 */
export async function recommendAuthorities(apiKey, useCase, model = NEMOTRON_MODELS[0].id) {
  const messages = [
    {
      role: 'system',
      content: 'You are a Solana token governance expert. Given a token use case, recommend mint authority, freeze authority, and metadata update authority settings (keep/revoke/transfer). Return JSON with fields: mint, freeze, update, each with: action (keep|revoke|transfer), rationale (string).',
    },
    {
      role: 'user',
      content: `What authority settings do you recommend for a Solana token with this use case: "${useCase}"? Return JSON only.`,
    },
  ];
  const raw = await nemotronChat(apiKey, model, messages, { temperature: 0.4, max_tokens: 512 });
  try {
    const json = raw.match(/\{.*\}/s)?.[0];
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

/**
 * AI-assisted extension recommendation.
 * @param {string} apiKey
 * @param {string} useCase
 * @param {string} model
 */
export async function recommendExtensions(apiKey, useCase, model = NEMOTRON_MODELS[0].id) {
  const messages = [
    {
      role: 'system',
      content: 'You are a Solana Token-2022 expert. Given a token use case, recommend which Token-2022 extensions to enable. Available: metadataPointer, tokenMetadata, transferHook, transferFee, permanentDelegate, nonTransferable. Return JSON array of recommended extension IDs with a rationale field for each.',
    },
    {
      role: 'user',
      content: `Which Token-2022 extensions would you recommend for: "${useCase}"? Return JSON array only.`,
    },
  ];
  const raw = await nemotronChat(apiKey, model, messages, { temperature: 0.4, max_tokens: 512 });
  try {
    const json = raw.match(/\[.*\]/s)?.[0];
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

/**
 * AI-assisted airdrop strategy advisor.
 * @param {string} apiKey
 * @param {object} context  — { holderCount, tokenName, goal }
 * @param {string} model
 */
export async function adviseAirdropStrategy(apiKey, context, model = NEMOTRON_MODELS[0].id) {
  const messages = [
    {
      role: 'system',
      content: 'You are a Solana airdrop strategy advisor. Given holder count, token name, and goal, recommend a distribution strategy including filter settings. Return JSON with fields: strategy (string), filterSuggestions (object with keys: topPercent, minBalance, hardCap), rationale (string).',
    },
    {
      role: 'user',
      content: `Advise on an airdrop strategy for "${context.tokenName}" token with ${context.holderCount} holders. Goal: "${context.goal}". Return JSON only.`,
    },
  ];
  const raw = await nemotronChat(apiKey, model, messages, { temperature: 0.5, max_tokens: 600 });
  try {
    const json = raw.match(/\{.*\}/s)?.[0];
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}
