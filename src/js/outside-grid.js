/**
 * Outside-grid Band Clipping
 * Keeps the diagonal-line strips beside a forced-dark band (any full-width
 * child of <body> or <main> carrying data-sds-theme="dark", e.g. a dark gallery
 * section and #sds-global-footer) dark for exactly the part of the viewport that band
 * covers — including while it's only partly scrolled into view.
 *
 * .sds-outside-grid is one position:fixed overlay outside every section's DOM
 * subtree, so it can't inherit a section's data-sds-theme. Instead, this sets
 * two clip-paths on it (see styles/03-layout/outside-grid.css):
 *   --sds-outside-grid-dark-clip — the dark bands' on-screen rects (::after)
 *   --sds-outside-grid-page-clip — everything except those rects (::before)
 *
 * Usage:
 *   import { initOutsideGrid } from './js/outside-grid.js';
 *   initOutsideGrid();
 *
 * Options (all optional):
 *   element  Element|selector   '.sds-outside-grid'
 *   bands    selector|NodeList  'body > [data-sds-theme="dark"], main > [data-sds-theme="dark"]'
 */

import { onReady, onLoad } from './lib/ready.js';
import { resolve, resolveAll } from './lib/dom.js';

const DEFAULTS = {
  element: ".sds-outside-grid",
  bands: 'body > [data-sds-theme="dark"], main > [data-sds-theme="dark"]',
};

let initialized = false;

export function initOutsideGrid(options = {}) {
  if (initialized) return;
  initialized = true;
  const config = { ...DEFAULTS, ...options };
  onReady(() => setup(config));
}

function setup(config) {
  const outsideGrid = resolve(config.element);
  const bands = resolveAll(config.bands);

  if (outsideGrid && bands.length) {
    function updateClips() {
      const viewportHeight = window.innerHeight;
      const rects = [];

      // Bands are in document order, so their rects are in vertical order.
      // Adjacent bands (e.g. a dark section directly above #sds-global-footer)
      // merge into one rect so no sub-pixel seam shows between them.
      bands.forEach((band) => {
        const r = band.getBoundingClientRect();
        const top = Math.max(0, r.top);
        const bottom = Math.min(viewportHeight, r.bottom);
        if (bottom <= top) return;

        const last = rects[rects.length - 1];
        if (last && top - last.bottom < 1) {
          last.bottom = Math.max(last.bottom, bottom);
        } else {
          rects.push({ top, bottom });
        }
      });

      if (!rects.length) {
        outsideGrid.style.removeProperty("--sds-outside-grid-dark-clip");
        outsideGrid.style.removeProperty("--sds-outside-grid-page-clip");
        return;
      }

      // Each rect traced as its own loop in one polygon; the joins run
      // along the left edge (x = 0) and enclose no area. evenodd turns the
      // same loops into holes when appended after the full-viewport outline.
      const loops = rects
        .map(({ top, bottom }) =>
          `0 ${top}px, 100% ${top}px, 100% ${bottom}px, 0 ${bottom}px`)
        .join(", ");

      outsideGrid.style.setProperty(
        "--sds-outside-grid-dark-clip",
        `polygon(evenodd, ${loops})`
      );
      outsideGrid.style.setProperty(
        "--sds-outside-grid-page-clip",
        `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, ${loops})`
      );
    }

    // ---- Scroll (rAF throttled) ----
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      window.requestAnimationFrame(() => {
        updateClips();
        ticking = false;
      });
      ticking = true;
    }, { passive: true });

    // Layout can shift after first paint (fonts, images) and on breakpoints.
    updateClips();
    onLoad(updateClips);
    window.addEventListener("resize", updateClips);
  }
}
