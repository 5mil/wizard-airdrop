/**
 * ai-engine.js
 * Four-tier AI provider stack:
 *
 *  Tier 1 — NVIDIA NIM cloud      (Nemotron, max quality, requires API key)
 *  Tier 2 — Ollama local           (phi4-mini default — laptop/desktop, no key needed)
 *  Tier 3 — Custom OpenAI-compat   (llama.cpp, llamafile, LM Studio, Jan, vLLM)
 *  Tier 4 — mllm bridge            (Raspberry Pi / Android / ARM SBC / IoT edge)
 *
 * All tiers speak the OpenAI-compatible /v1/chat/completions interface.
 * Nothing is hardcoded — users supply keys/URLs in the AI settings panel.
 *
 * References:
 *   NVIDIA NIM : https://build.nvidia.com
 *   Ollama     : https://ollama.com
 *   llama.cpp  : https://github.com/ggml-org/llama.cpp
 *   mllm       : https://github.com/UbiquitousLearning/mllm
 */

import { APP } from './state.js';

// ---------------------------------------------------------------------------
// Provider catalog
// ---------------------------------------------------------------------------

export const AI_PROVIDERS = {
  ollama: {
    id:           'ollama',
    label:        'Ollama (Local)',
    description:  'Run models locally on your laptop or desktop. No API key needed. Install from ollama.com.',
    tier:         2,
    baseUrl:      'http://localhost:11434/v1',
    requiresKey:  false,
    requiresUrl:  false,
    defaultModel: 'phi4-mini',
    models: [
      { id: 'phi4-mini',    label: 'Phi-4 Mini 3.8B',  note: 'Best for low-end hardware. MIT. 128K ctx. ~3GB RAM.' },
      { id: 'qwen3:4b',    label: 'Qwen3 4B',          note: 'Strong reasoning + thinking mode. Apache 2.0. ~3GB RAM.' },
      { id: 'gemma3:4b',   label: 'Gemma 3 4B',        note: 'Multimodal capable. Apache 2.0. ~3GB RAM.' },
      { id: 'llama3.2:3b', label: 'Llama 3.2 3B',      note: 'CPU-only on 8GB RAM. Meta LLAMA license.' },
      { id: 'smollm3:3b',  label: 'SmolLM3 3B',        note: 'Fully open, reasoning capable. Apache 2.0. ~2GB RAM.' },
      { id: 'qwen3:0.6b',  label: 'Qwen3 0.6B',        note: 'Smallest capable reasoning model. ~400MB RAM.' },
    ],
    setupUrl:   'https://ollama.com',
    installCmd: 'curl -fsSL https://ollama.ai/install.sh | sh',
  },

  nvidia_nim: {
    id:           'nvidia_nim',
    label:        'NVIDIA NIM (Cloud)',
    description:  'Nemotron models via NVIDIA hosted inference. Best quality. Free API key at build.nvidia.com.',
    tier:         1,
    baseUrl:      'https://integrate.api.nvidia.com/v1',
    requiresKey:  true,
    requiresUrl:  false,
    defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    models: [
      { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', label: 'Nemotron Super 49B', note: 'Best reasoning + tool calling. 131K ctx.' },
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct',   label: 'Nemotron 70B',       note: 'Balanced instruct + chat.' },
      { id: 'nvidia/nemotron-4-340b-instruct',          label: 'Nemotron-4 340B',    note: 'Largest. Deep analysis + creative generation.' },
    ],
    setupUrl: 'https://build.nvidia.com',
    docsUrl:  'https://build.nvidia.com/nvidia/llama-3_3-nemotron-super-49b-v1_5',
  },

  custom_openai: {
    id:           'custom_openai',
    label:        'Custom Server',
    description:  'llama.cpp server, llamafile, LM Studio, Jan, vLLM — any OpenAI-compatible local endpoint.',
    tier:         3,
    baseUrl:      '',
    requiresKey:  false,
    requiresUrl:  true,
    defaultModel: '',
    models:       [],
    examples: [
      { label: 'llama.cpp server', url: 'http://127.0.0.1:8080/v1',  cmd: './llama-server -m model.gguf --port 8080' },
      { label: 'llamafile',        url: 'http://127.0.0.1:8080/v1',  cmd: './model.llamafile --server' },
      { label: 'LM Studio',        url: 'http://localhost:1234/v1',   cmd: 'Enable local server in LM Studio settings' },
      { label: 'Jan',              url: 'http://localhost:1337/v1',   cmd: 'Enable local API server in Jan settings' },
      { label: 'vLLM',             url: 'http://localhost:8000/v1',   cmd: 'vllm serve <model> --port 8000' },
    ],
    setupUrl: 'https://github.com/ggml-org/llama.cpp',
  },

  mllm_bridge: {
    id:           'mllm_bridge',
    label:        'mllm Bridge (IoT / Pi)',
    description:  'Raspberry Pi, ARM SBC, or Android running mllm or llama.cpp. Ideal for offline edge deployments.',
    tier:         4,
    baseUrl:      '',
    requiresKey:  false,
    requiresUrl:  true,
    defaultModel: 'qwen3:0.6b',
    models: [
      { id: 'tinyllama-1.1b', label: 'TinyLlama 1.1B', note: '637MB. ~15 t/s on Pi 5.' },
      { id: 'smollm2-1.7b',  label: 'SmolLM2 1.7B',   note: '~1GB. Beats Llama 3.2 1B. Pi 5 recommended.' },
      { id: 'llama3.2:3b',   label: 'Llama 3.2 3B',   note: '~2GB. 128K ctx. Pi 5 8GB+.' },
      { id: 'qwen3:0.6b',    label: 'Qwen3 0.6B',     note: '~400MB. ~25 t/s on Pi 5. Best speed/quality ratio.' },
      { id: 'gemma3:270m',   label: 'Gemma 3 270M',   note: '~200MB. ~40 t/s on Pi 5. Extreme edge.' },
    ],
    setupUrl: 'https://github.com/UbiquitousLearning/mllm',
    piExample: [
      '# On Raspberry Pi 5 — install llama.cpp',
      'sudo apt install build-essential cmake',
      'git clone https://github.com/ggml-org/llama.cpp && cd llama.cpp',
      'cmake -B build -DGGML_BLAS=ON && cmake --build build -j4',
      '',
      '# Download Qwen3 0.6B (~400MB)',
      'pip install huggingface_hub',
      'huggingface-cli download Qwen/Qwen3-0.6B-GGUF qwen3-0.6b-q4_k_m.gguf --local-dir ./',
      '',
      '# Serve OpenAI-compatible endpoint on your local network',
      './build/bin/llama-server -m qwen3-0.6b-q4_k_m.gguf --host 0.0.0.0 --port 8080',
      '',
      '# In wizard-airdrop AI settings:',
      '# Provider → mllm Bridge',
      '# URL     → http://<pi-ip-address>:8080/v1',
      '# Model   → qwen3:0.6b',
    ],
  },
};

// ---------------------------------------------------------------------------
// Active provider helpers
// ---------------------------------------------------------------------------

export function getActiveProvider() {
  return AI_PROVIDERS[APP.aiProvider] || AI_PROVIDERS.ollama;
}

export function getBaseUrl() {
  const p = getActiveProvider();
  return p.requiresUrl ? (APP.aiCustomUrl || '') : p.baseUrl;
}

export function getActiveModel() {
  return APP.aiModel || getActiveProvider().defaultModel || '';
}

// ---------------------------------------------------------------------------
// Core chat completion — works identically across all four tiers
// ---------------------------------------------------------------------------

/**
 * @param {Array}  messages  OpenAI message array
 * @param {object} options   { temperature, max_tokens }
 * @returns {Promise<string>}
 */
export async function aiChat(messages, options = {}) {
  const provider = getActiveProvider();
  const baseUrl  = getBaseUrl();
  const model    = getActiveModel();
  const apiKey   = APP.aiApiKey || 'ollama';

  if (!baseUrl)
    throw new Error(`Provider "${provider.label}" requires a URL. Set it in AI settings.`);
  if (provider.requiresKey && (!APP.aiApiKey || APP.aiApiKey === 'ollama'))
    throw new Error(`Provider "${provider.label}" requires an API key. Get one free at ${provider.setupUrl}`);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.6,
      top_p:       options.top_p       ?? 1,
      max_tokens:  options.max_tokens  ?? 1024,
      stream:      false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI error ${res.status} from "${provider.label}": ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Pings the active provider. Returns { ok, latencyMs, error }.
 */
export async function pingProvider() {
  const start = Date.now();
  try {
    await aiChat([{ role: 'user', content: 'Reply with one word: ready' }],
                 { max_tokens: 8, temperature: 0 });
    return { ok: true, latencyMs: Date.now() - start, error: null };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// AI assistance functions
// ---------------------------------------------------------------------------

export async function suggestTokenIdentity(concept) {
  const raw = await aiChat([
    { role: 'system', content: 'You are a creative Solana token naming expert. Return a JSON array of 5 objects, each with: name, symbol, tagline. JSON only, no markdown.' },
    { role: 'user',   content: `Suggest 5 Solana token identities for: "${concept}". JSON array only.` },
  ], { temperature: 0.85, max_tokens: 512 });
  try { return JSON.parse(raw.match(/\[.*\]/s)?.[0] || '[]'); } catch { return []; }
}

export async function writeTokenDescription(name, symbol, concept = '') {
  return aiChat([
    { role: 'system', content: 'Write a concise Solana token description under 280 characters. Plain language, no jargon. Return only the description text.' },
    { role: 'user',   content: `Token: "${name}" (${symbol}). Context: ${concept || 'none'}.` },
  ], { temperature: 0.7, max_tokens: 200 });
}

export async function recommendAuthorities(useCase) {
  const raw = await aiChat([
    { role: 'system', content: 'You are a Solana token governance expert. Return JSON with keys: mint, freeze, update. Each has: action (keep|revoke|transfer), rationale. JSON only, no markdown.' },
    { role: 'user',   content: `Recommend Solana token authority settings for: "${useCase}". JSON only.` },
  ], { temperature: 0.4, max_tokens: 512 });
  try { return JSON.parse(raw.match(/\{.*\}/s)?.[0] || 'null'); } catch { return null; }
}

export async function recommendExtensions(useCase) {
  const raw = await aiChat([
    { role: 'system', content: 'You are a Solana Token-2022 expert. Return a JSON array of recommended extension IDs with rationale. Available IDs: metadataPointer, tokenMetadata, transferHook, transferFee, permanentDelegate, nonTransferable. JSON array only, no markdown.' },
    { role: 'user',   content: `Which Token-2022 extensions for: "${useCase}"? JSON array only.` },
  ], { temperature: 0.4, max_tokens: 512 });
  try { return JSON.parse(raw.match(/\[.*\]/s)?.[0] || '[]'); } catch { return []; }
}

export async function adviseAirdropStrategy(holderCount, tokenName, goal) {
  const raw = await aiChat([
    { role: 'system', content: 'You are a Solana airdrop strategy advisor. Return JSON: { strategy, filterSuggestions: { topPercent, minBalance, hardCap }, rationale }. JSON only, no markdown.' },
    { role: 'user',   content: `Token: "${tokenName}", holders: ${holderCount}, goal: "${goal}". JSON only.` },
  ], { temperature: 0.5, max_tokens: 600 });
  try { return JSON.parse(raw.match(/\{.*\}/s)?.[0] || 'null'); } catch { return null; }
}
