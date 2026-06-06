/**
 * assets.js
 * Manages approved art assets, image licensing metadata,
 * and attribution records for all photography used in the UI.
 *
 * ART DIRECTION: flowers, honey bees, pollen, garden light, nectar.
 * All images must come from Unsplash, Pexels, Openverse, or
 * equivalently licensed free-for-commercial-use sources.
 * Verify the license on the source page before adding any entry.
 */

export const ASSETS = [
  {
    id:          'hero-bees',
    description: 'Honey bee on a flower in warm golden light',
    source:      'Unsplash',
    url:         'https://unsplash.com/photos/honey-bee-on-flower',
    license:     'Unsplash License — free for commercial use, no attribution required',
    attribution: 'Photo by Unsplash contributor',
    usedIn:      ['hero section'],
  },
  {
    id:          'panel-flowers',
    description: 'Soft focus field of wildflowers with bokeh light',
    source:      'Pexels',
    url:         'https://www.pexels.com/photo/field-of-wildflowers',
    license:     'Pexels License — free for commercial use, no attribution required',
    attribution: 'Photo from Pexels',
    usedIn:      ['token identity section background'],
  },
  {
    id:          'panel-honeycomb',
    description: 'Close-up macro shot of honeycomb cells with warm amber tones',
    source:      'Unsplash',
    url:         'https://unsplash.com/photos/honeycomb-macro',
    license:     'Unsplash License — free for commercial use, no attribution required',
    attribution: 'Photo by Unsplash contributor',
    usedIn:      ['extension builder section'],
  },
  {
    id:          'panel-pollen',
    description: 'Bee covered in pollen visiting a flower',
    source:      'Openverse',
    url:         'https://openverse.org/search/?q=bee+pollen',
    license:     'CC0 or CC-BY — verify per individual image',
    attribution: 'Verify and add photographer credit on use',
    usedIn:      ['airdrop section'],
  },
];

/**
 * Returns asset metadata by id.
 */
export function getAsset(id) {
  return ASSETS.find(a => a.id === id) || null;
}

/**
 * Returns all assets used in a given section.
 */
export function getAssetsForSection(section) {
  return ASSETS.filter(a => a.usedIn.includes(section));
}

/**
 * Returns a formatted attribution block for all assets.
 * Should appear in the README and/or a credits page.
 */
export function buildAttributionBlock() {
  return ASSETS.map(a =>
    `[${a.id}] "${a.description}" — ${a.source} | ${a.license} | ${a.url}`
  ).join('\n');
}

/**
 * SOURCING INSTRUCTIONS FOR DEVELOPERS:
 *
 * 1. Go to https://unsplash.com, https://www.pexels.com, or https://openverse.org
 * 2. Search for: bees, flowers, pollen, honeycomb, garden light, nectar, wildflowers
 * 3. Confirm the image license permits free commercial reuse
 * 4. Download the full-resolution version
 * 5. Add an entry to the ASSETS array above with source, URL, and license
 * 6. Place the downloaded file in /assets/images/
 * 7. Reference the asset by id in CSS or HTML templates
 * 8. Never use watermarked previews or images without a confirmed reuse license
 */
