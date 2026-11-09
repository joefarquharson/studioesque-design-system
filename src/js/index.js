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
 * Usage (configure some, skip some):
 *   init({
 *     theme: { metaColors: { light: {…}, dark: {…} } },
 *     headerColors: { colors: { gallery: { forceDark: true } } },
 *     contactForm: false,
 *   });
 *
 * Each key takes that module's options object (see the header comment of
 * each file), `false` to skip it, or nothing for its defaults.
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
 * Start every module. options[key] is passed to that module's init;
 * `false` skips it.
 */
export function init(options = {}) {
    for (const [key, start] of Object.entries(modules)) {
        const moduleOptions = options[key];
        if (moduleOptions === false) continue;
        start(typeof moduleOptions === 'object' && moduleOptions !== null ? moduleOptions : {});
    }
}
