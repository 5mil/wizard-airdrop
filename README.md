# 🪄 Wizard Airdrop

A client-side Solana utility that loads SPL token holders via the [Helius DAS API](https://helius.dev), lets you build complex multi-filter targeting pipelines, and airdrops a utility token to every selected holder — all from a static web page.

**No backend. No build step. Works on GitHub Pages.**

---

## ✨ Features

- Load all holders of any SPL mint via Helius `getTokenAccounts` (paginated)
- Multi-filter pipeline: balance range, top/bottom %, top/bottom N, every Nth, random sample, include/exclude address lists, sort order, hard cap
- Live preview of filter results before applying
- SOL fee estimation (rent + tx cost)
- Create a utility SPL mint and airdrop to selected holders
- Wallet support: Phantom, Solflare, Backpack
- Helius API key persisted in `localStorage` (never sent anywhere except Helius)

---

## 📁 Project Structure

```
wizard-airdrop/
├── index.html          # Static HTML shell
├── package.json        # Dev scripts and metadata
├── README.md
├── css/
│   └── styles.css      # All styles
└── js/
    ├── main.js         # Bootstrap: wires all modules together
    ├── state.js        # Shared app state
    ├── ui.js           # DOM helpers, logging, info panels
    ├── wallet.js       # Wallet detection, connect, disconnect
    ├── helius.js       # RPC URL, DAS fetch, pagination
    ├── filters.js      # Filter pipeline + UI bindings
    ├── fees.js         # SOL fee estimation
    └── airdrop.js      # Mint creation + holder transfers
```

---

## 🚀 Running Locally

**Python (no install needed):**
```bash
python3 -m http.server 8080
# open http://localhost:8080
```

**Node (via npx):**
```bash
npx serve . -p 8080
```

Or just open `index.html` directly in a browser — it works as a local file too.

---

## 🌐 Deploying to GitHub Pages

1. Go to **Settings → Pages** in your repo
2. Set source to **Deploy from branch: `main`, folder: `/ (root)`**
3. Done — your app is live at `https://<username>.github.io/wizard-airdrop/`

No build step is needed. All files are static.

---

## 🔑 Environment & Secrets

| Secret | How it's handled |
|--------|------------------|
| Helius API key | User pastes into UI at runtime; optionally cached in `localStorage` on their device only |
| Wallet private key | Never touched — all signing is delegated to the injected wallet extension |
| RPC endpoint | Constructed client-side from the user's key + selected network |

**Nothing is hardcoded. Nothing is committed to the repo.**

For local development you may use any Helius free-tier key. Do not commit `.env` files or keys to this repository.

---

## 🔒 Security Model

- The app never has access to private keys — only the wallet extension does
- All Solana transactions are constructed in-browser and signed by the user via their wallet popup
- The Helius API key only has read access to on-chain token data
- No third-party analytics, trackers, or scripts beyond Solana Web3.js (loaded from unpkg CDN)
- CSP-friendly: no `eval`, no `innerHTML` on user-provided data

---

## 🧩 Extending the App

| Feature | Where to add it |
|---------|----------------|
| New filter type | `js/filters.js` → add a card to `index.html` + a step in `runPipeline()` |
| Bulk transfer batching | `js/airdrop.js` → modify the transfer loop |
| Custom token metadata | `js/helius.js` → add a DAS `getAsset` call |
| Persistent filter presets | `js/state.js` → serialize/deserialize from `localStorage` |
| Token-gated UI | `js/wallet.js` → check on-chain balance after connect |

---

## 📦 Dependencies

Runtime (CDN, no install):
- [`@solana/web3.js@1.98.0`](https://unpkg.com/@solana/web3.js@1.98.0/lib/index.iife.min.js)

Dev (optional local server):
- `python3` or `npx serve`

---

## License

MIT
