/**
 * art.js — Curated mystical woods / wizard / magical art manifest.
 * All images: Unsplash free commercial use, no attribution required.
 * Applied site-wide for consistent immersive aesthetic.
 */
export const ART = {

  /* ── Hero ─────────────────────────────────────────────────── */
  hero: {
    url:  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80&auto=format&fit=crop',
    alt:  'Ancient misty forest at twilight with towering trees',
    credit: 'Unsplash'
  },

  /* ── Step section headers ──────────────────────────────────── */
  steps: [
    null, // 0-index placeholder
    {
      // Step 1 — Token Mode
      url:  'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=900&q=75&auto=format&fit=crop',
      alt:  'Mystical light rays breaking through ancient forest canopy',
    },
    {
      // Step 2 — Identity
      url:  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=900&q=75&auto=format&fit=crop',
      alt:  'Enchanted forest path lined with glowing ferns',
    },
    {
      // Step 3 — Art & Media
      url:  'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=900&q=75&auto=format&fit=crop',
      alt:  'Magical moonlit woodland clearing with mist',
    },
    {
      // Step 4 — Extensions
      url:  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=75&auto=format&fit=crop',
      alt:  'Ancient forest floor with glowing moss and twisted roots',
    },
    {
      // Step 5 — Authorities
      url:  'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=900&q=75&auto=format&fit=crop',
      alt:  'Dark enchanted woods with ethereal blue light filtering through',
    },
    {
      // Step 6 — Review
      url:  'https://images.unsplash.com/photo-1425065689771-6a5abe31cb12?w=900&q=75&auto=format&fit=crop',
      alt:  'Sunlit ancient woodland with cathedral-like tree canopy',
    },
    {
      // Step 7 — Holders
      url:  'https://images.unsplash.com/photo-1511497584788-876760111969?w=900&q=75&auto=format&fit=crop',
      alt:  'Dense ancient forest with mysterious fog and moss-covered trees',
    },
    {
      // Step 8 — Filters
      url:  'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=900&q=75&auto=format&fit=crop',
      alt:  'Mystical forest stream flowing over ancient moss-covered stones',
    },
    {
      // Step 9 — Airdrop
      url:  'https://images.unsplash.com/photo-1542546068979-b6affb46ea8f?w=900&q=75&auto=format&fit=crop',
      alt:  'Enchanted dark forest at night with magical glowing atmosphere',
    },
  ],

  /* ── Feature / mode cards ──────────────────────────────────── */
  modeClassic: {
    url:  'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=600&q=70&auto=format&fit=crop',
    alt:  'Ancient wizard staff leaning against mossy oak tree',
  },
  modeToken2022: {
    url:  'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=70&auto=format&fit=crop',
    alt:  'Glowing magical runes carved into ancient stone',
  },

  /* ── Footer ────────────────────────────────────────────────── */
  footer: {
    url:  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1600&q=60&auto=format&fit=crop',
    alt:  'Deep starlit forest with silhouetted ancient pines at night',
  },

  /* ── AI Engine modal backdrop ──────────────────────────────── */
  aiModal: {
    url:  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=70&auto=format&fit=crop',
    alt:  'Mystical mountain forest at dusk with magical atmosphere',
  },

  /* ── Ambient / fallback ────────────────────────────────────── */
  ambient: {
    url:  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=60&auto=format&fit=crop',
    alt:  'Atmospheric misty ancient forest',
  },
};

/**
 * Apply the art manifest to all step header images in the DOM.
 * Call once after DOMContentLoaded.
 */
export function applyArtManifest() {
  // Hero
  const heroImg = document.querySelector('.hero-img');
  if (heroImg) {
    heroImg.src = ART.hero.url;
    heroImg.alt = ART.hero.alt;
  }
  // Hero CSS bg fallback
  const heroBg = document.querySelector('.hero');
  if (heroBg) {
    heroBg.style.setProperty('--hero-photo', `url("${ART.hero.url}")`);
  }

  // Step headers
  document.querySelectorAll('.step').forEach(section => {
    const stepNum = parseInt(section.id.replace('step-', ''));
    const art = ART.steps[stepNum];
    if (!art) return;
    const img = section.querySelector('.step-bg-img');
    if (img) {
      img.src = art.url;
      img.alt = art.alt;
    }
    // Also set CSS custom property for CSS-driven versions
    section.style.setProperty('--step-photo', `url("${art.url}")`);
  });

  // Footer
  const footerImg = document.querySelector('.footer-bg img');
  if (footerImg) {
    footerImg.src = ART.footer.url;
    footerImg.alt = ART.footer.alt;
  }
}
