/**
 * ai-settings.js
 * Renders and manages the AI provider settings panel.
 * Supports all four tiers: NVIDIA NIM, Ollama, Custom server, mllm IoT bridge.
 *
 * Usage:
 *   import { renderAISettings } from './ai-settings.js';
 *   renderAISettings(document.getElementById('ai-settings-container'));
 */

import { APP }                                           from './state.js';
import { AI_PROVIDERS, pingProvider, getActiveProvider } from './ai-engine.js';

export function renderAISettings(container) {
  if (!container) return;
  container.innerHTML = buildHTML();
  attachListeners(container);
  syncUI(container);
}

// ---------------------------------------------------------------------------
// HTML scaffold
// ---------------------------------------------------------------------------

function buildHTML() {
  const cards = Object.values(AI_PROVIDERS).map(p => `
    <label class="provider-card" data-provider="${p.id}">
      <input type="radio" name="ai-provider" value="${p.id}">
      <div class="provider-card-inner">
        <span class="provider-tier-badge">Tier ${p.tier}</span>
        <span class="provider-label">${p.label}</span>
        <span class="provider-desc">${p.description}</span>
      </div>
    </label>
  `).join('');

  return `
    <div class="ai-settings-panel card animate-petal-in">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 class="section-heading" style="margin:0">🤖 AI Engine</h3>
        <button id="ai-settings-close" class="btn-secondary" style="padding:4px 12px;font-size:13px">✕ Close</button>
      </div>

      <p class="label" style="margin-bottom:10px">Select inference provider</p>
      <div class="provider-grid">${cards}</div>

      <div id="ai-provider-fields" class="card-soft" style="margin-top:16px"></div>

      <div id="ai-model-row" style="margin-top:14px">
        <label class="label">Model</label>
        <select id="ai-model-select" class="input-field" style="margin-top:6px"></select>
        <div id="ai-custom-model-row" style="display:none;margin-top:8px">
          <input id="ai-custom-model" class="input-field" placeholder="Enter model name exactly as served by your endpoint">
        </div>
      </div>

      <div style="margin-top:18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button id="ai-ping-btn" class="btn-primary">⚡ Test Connection</button>
        <span id="ai-ping-result" style="font-size:13px"></span>
      </div>

      <div id="ai-iot-guide" style="display:none;margin-top:20px" class="card-soft">
        <p class="label" style="margin-bottom:8px">📟 Raspberry Pi / ARM SBC Setup</p>
        <pre id="ai-iot-commands" style="font-family:var(--font-mono);font-size:12px;line-height:1.7;white-space:pre-wrap;overflow-x:auto"></pre>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <a href="https://github.com/UbiquitousLearning/mllm" target="_blank"
             class="btn-secondary" style="text-decoration:none;font-size:13px">mllm on GitHub ↗</a>
          <a href="https://github.com/ggml-org/llama.cpp" target="_blank"
             class="btn-secondary" style="text-decoration:none;font-size:13px">llama.cpp on GitHub ↗</a>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

function attachListeners(container) {
  container.querySelectorAll('input[name="ai-provider"]').forEach(radio => {
    radio.addEventListener('change', e => {
      APP.aiProvider = e.target.value;
      const p = AI_PROVIDERS[e.target.value];
      if (p?.defaultModel) APP.aiModel = p.defaultModel;
      syncUI(container);
    });
  });

  container.addEventListener('input', e => {
    if (e.target.id === 'ai-api-key')      APP.aiApiKey    = e.target.value.trim();
    if (e.target.id === 'ai-custom-url')   APP.aiCustomUrl = e.target.value.trim();
    if (e.target.id === 'ai-model-select') {
      APP.aiModel = e.target.value;
      const cr = container.querySelector('#ai-custom-model-row');
      if (cr) cr.style.display = e.target.value === '__custom__' ? 'block' : 'none';
    }
    if (e.target.id === 'ai-custom-model') APP.aiModel = e.target.value.trim();
  });

  container.querySelector('#ai-ping-btn')?.addEventListener('click', async () => {
    const btn    = container.querySelector('#ai-ping-btn');
    const result = container.querySelector('#ai-ping-result');
    btn.disabled    = true;
    btn.textContent = '⏳ Testing…';
    result.textContent = '';
    const { ok, latencyMs, error } = await pingProvider();
    btn.disabled    = false;
    btn.textContent = '⚡ Test Connection';
    result.textContent = ok ? `✅ Connected — ${latencyMs}ms` : `❌ ${error}`;
    result.style.color = ok ? 'var(--color-success)' : 'var(--color-warning)';
  });

  container.querySelector('#ai-settings-close')?.addEventListener('click', () => {
    container.closest('.ai-settings-overlay, #ai-settings-container')?.classList.add('hidden');
  });
}

// ---------------------------------------------------------------------------
// Sync UI from APP state
// ---------------------------------------------------------------------------

function syncUI(container) {
  const provider = AI_PROVIDERS[APP.aiProvider] || AI_PROVIDERS.ollama;

  container.querySelectorAll('.provider-card').forEach(card => {
    const active = card.dataset.provider === provider.id;
    card.classList.toggle('active', active);
    const radio = card.querySelector('input[type=radio]');
    if (radio) radio.checked = active;
  });

  // Credential / URL fields
  const fields = container.querySelector('#ai-provider-fields');
  let html = '';

  if (provider.requiresKey) {
    html += `
      <label class="label">NVIDIA API Key</label>
      <input id="ai-api-key" class="input-field" type="password"
             placeholder="nvapi-…" value="${APP.aiApiKey || ''}" style="margin-top:6px">
      <p style="font-size:12px;color:var(--color-text-muted);margin-top:6px">
        Free key (1,000 credits · 40 req/min) at
        <a href="${provider.setupUrl}" target="_blank">${provider.setupUrl}</a>
      </p>`;
  }

  if (provider.requiresUrl) {
    html += `
      <label class="label" style="display:block;${provider.requiresKey ? 'margin-top:14px' : ''}">Endpoint URL</label>
      <input id="ai-custom-url" class="input-field"
             placeholder="http://192.168.1.x:8080/v1"
             value="${APP.aiCustomUrl || ''}" style="margin-top:6px">
      <p style="font-size:12px;color:var(--color-text-muted);margin-top:6px">
        Full base URL of your OpenAI-compatible server (include <code>/v1</code>).
      </p>`;
    if (provider.examples?.length) {
      html += `<details style="margin-top:10px"><summary class="label" style="cursor:pointer">Common endpoints ▾</summary><ul style="font-size:12px;margin:8px 0 0 16px;line-height:2.2">`;
      provider.examples.forEach(ex => {
        html += `<li><strong>${ex.label}</strong> → <code>${ex.url}</code><br><span style="color:var(--color-text-muted)">${ex.cmd}</span></li>`;
      });
      html += '</ul></details>';
    }
  }

  if (!provider.requiresKey && !provider.requiresUrl) {
    html += `
      <p style="font-size:13px;color:var(--color-success);line-height:1.9">
        ✅ No key or custom URL needed.<br>
        Make sure Ollama is running and the model is pulled:
      </p>
      <code style="font-family:var(--font-mono);font-size:13px;display:block;margin-top:8px;padding:10px 14px;background:var(--color-cream-dark);border-radius:8px">
        ollama run ${provider.defaultModel}
      </code>
      <p style="font-size:12px;color:var(--color-text-muted);margin-top:8px">
        Install Ollama: <code style="font-family:var(--font-mono)">${provider.installCmd}</code>
      </p>`;
  }
  fields.innerHTML = html;

  // Model selector
  const modelRow       = container.querySelector('#ai-model-row');
  const modelSel       = container.querySelector('#ai-model-select');
  const customModelRow = container.querySelector('#ai-custom-model-row');

  if (provider.models?.length) {
    modelSel.innerHTML =
      provider.models.map(m =>
        `<option value="${m.id}" ${APP.aiModel === m.id ? 'selected' : ''}>${m.label} — ${m.note}</option>`
      ).join('') + `<option value="__custom__">Custom model name…</option>`;
    modelRow.style.display = 'block';
    if (customModelRow) customModelRow.style.display = 'none';
  } else {
    modelSel.innerHTML = `<option value="__custom__">Type model name below</option>`;
    modelRow.style.display = 'block';
    if (customModelRow) {
      customModelRow.style.display = 'block';
      const inp = customModelRow.querySelector('#ai-custom-model');
      if (inp) inp.value = APP.aiModel || '';
    }
  }

  // IoT Pi guide
  const iotGuide = container.querySelector('#ai-iot-guide');
  if (iotGuide) {
    const show = provider.id === 'mllm_bridge';
    iotGuide.style.display = show ? 'block' : 'none';
    if (show && provider.piExample) {
      const pre = container.querySelector('#ai-iot-commands');
      if (pre) pre.textContent = provider.piExample.join('\n');
    }
  }
}
