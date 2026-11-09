/**
 * Studioesque Design System: JS entry point.
 *
 * Every behavior is an ES module exporting an idempotent init function.
 * Import only what a page needs, or call init() to start everything.
 *
 * Usage (everything):
 *   <script type="module">
 *     import { init } from './sds/js/index.js';
 *     init();
 *   </script>
 *
 * Usage (skip some):
 *   init({ contactForm: false, workGallery: false });
 *
 * Usage (pick and choose):
 *   import { initTheme, initMenu } from './sds/js/index.js';
 *   initTheme();
 *   initMenu();
 *
 * Modules are deferred and CORS-bound: serve pages over http(s), not file://.
 * The inline <head> script that sets data-sds-theme before first paint stays
 * a classic inline script; it cannot be a module.
 */

import { initTheme } from './theme.js';
import { initHeaderColors } from './header-colors.js';
import { initMenu } from './menu.js';
import { initNavUnderline } from './nav-underline.js';
import { initOutsideGrid } from './outside-grid.js';
import { initTooltip } from './tooltip.js';
import { initWorkGallery } from './work-gallery.js';
import { initContactForm } from './contact-form.js';

export {
    initTheme,
    initHeaderColors,
    initMenu,
    initNavUnderline,
    initOutsideGrid,
    initTooltip,
    initWorkGallery,
    initContactForm,
};

// theme listens for the sds:sectionchange event that headerColors dispatches,
// so it is registered first.
const modules = {
    theme: initTheme,
    headerColors: initHeaderColors,
    menu: initMenu,
    navUnderline: initNavUnderline,
    outsideGrid: initOutsideGrid,
    tooltip: initTooltip,
    workGallery: initWorkGallery,
    contactForm: initContactForm,
};

/**
 * Start every module. Pass `false` for a key to skip that module.
 * (Per-module option objects arrive with the Step 2 config work.)
 */
export function init(options = {}) {
    for (const [key, start] of Object.entries(modules)) {
        if (options[key] === false) continue;
        start();
    }
}
