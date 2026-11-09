/**
 * Header Color Controller
 * Manages header theme variables based on the section currently in view.
 *
 * Update: header offset is now computed from the real header height (+1px)
 * so it stays correct above/below 960px (and any future layout changes).
 *
 * Usage:
 *   import { initHeaderColors } from './js/header-colors.js';
 *   initHeaderColors();                // every section uses the default colors
 *   initHeaderColors({
 *     colors: {                        // keyed by section id
 *       intro:   { headerLogo: 'var(--sds-color-accent)' },
 *       gallery: { headerBg: '…', headerName: '…', forceDark: true },
 *     },
 *   });
 *
 * Options (all optional):
 *   header    Element|selector       '#sds-global-header'
 *   sections  selector|NodeList      'section'
 *   colors    { [sectionId]: entry } Each entry is merged over the default
 *             entry, so give only what differs. Pass `default` to change the
 *             fallback used for unlisted ids, sections without an id, and
 *             scroll positions outside every section.
 *
 * Entry fields (CSS values, set on <html> as --sds-color-header-*):
 *   headerBg, headerLogo, headerName, headerRole, headerUnderline,
 *   forceDark (boolean: adds .sds-header-dark-forced to the header, for a
 *   section that is forced dark with data-sds-theme="dark").
 *
 * Dispatches `sds:sectionchange` on document with { sectionId } ("default"
 * when no section matches). theme.js listens for it.
 */

import { onLoad } from './lib/ready.js';
import { resolve, resolveAll } from './lib/dom.js';

// Mirrors the :root defaults in colors.css, keeping blur/transparency but
// using the plain page background instead of a section-specific accent color.
const DEFAULT_ENTRY = {
  headerBg: "oklch(from var(--sds-color-background) l c h / 0.9)",
  headerLogo: "var(--sds-color-logo)",
  headerName: "var(--sds-color-text)",
  headerRole: "var(--sds-color-text-meta)",
  headerUnderline: "var(--sds-color-accent)",
};

const DEFAULTS = {
  header: "#sds-global-header",
  sections: "section",
  colors: {},
};

let initialized = false;

export function initHeaderColors(options = {}) {
  if (initialized) return;
  initialized = true;

  const config = { ...DEFAULTS, ...options };
  const header = resolve(config.header);
  const sections = resolveAll(config.sections);
  const root = document.documentElement;

  let currentSection = "";

  // Every entry is merged over the default, so partial entries are complete.
  const defaultEntry = { ...DEFAULT_ENTRY, ...config.colors.default };

  function updateSectionColors(sectionId) {
    // Unknown/unmapped section ids (or empty ids) fall back to the default
    // header treatment rather than silently keeping the previous colors.
    const entry = Object.hasOwn(config.colors, sectionId) ? config.colors[sectionId] : null;
    const colors = entry ? { ...defaultEntry, ...entry } : defaultEntry;

    root.style.setProperty("--sds-color-header-bg", colors.headerBg);
    root.style.setProperty("--sds-color-header-logo", colors.headerLogo);
    root.style.setProperty("--sds-color-header-name", colors.headerName);
    root.style.setProperty("--sds-color-header-role", colors.headerRole);

    // The header's own corner brackets and faint borders: --sds-brackets /
    // --sds-color-border-faint normally only swap via [data-sds-theme="dark"] on
    // the ROOT, and the header sits outside
    // every section's DOM subtree so it can't inherit a section-local
    // data-sds-theme="dark" override. header-dark-forced redeclares both custom
    // properties directly on the header (see global-header.css), which
    // then cascades to every descendant that consumes them — including the
    // mobile nav menu nested inside the header.
    header?.classList.toggle("sds-header-dark-forced", !!colors.forceDark);

    // Safe fallback if a section is missing headerUnderline
    root.style.setProperty(
      "--sds-color-header-underline",
      colors.headerUnderline || "var(--sds-color-accent)"
    );

    // Notify other modules (e.g. theme.js) that the active section changed
    document.dispatchEvent(new CustomEvent("sds:sectionchange", { detail: { sectionId } }));
  }

  // ---- Dynamic header offset (+1px fudge) ----
  // Using ceil avoids fractional heights causing off-by-1 boundary issues.
  let headerOffset = 98; // fallback until computed

  function computeHeaderOffset() {
    if (!header) return 98;
    return Math.ceil(header.getBoundingClientRect().height) + 1;
  }

  function applyHeaderOffset() {
    headerOffset = computeHeaderOffset();

    // Update observer margins so IntersectionObserver aligns with current header height
    // rootMargin: top = -headerOffset, bottom = -80% (keep your existing behavior)
    if (observer) {
      observer.disconnect();
      sections.forEach((section) => observer.observe(section));
    }
  }

  function updateHeaderBackground() {
    // Use computed header height instead of a hard-coded 97/81/etc.
    const scrollPos = window.scrollY + headerOffset;
    // Default fallback: no matching section (page has none, or scroll is
    // above/below all of them) gets the neutral header treatment, not hero.
    let activeSectionId = "default";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        activeSectionId = section.id || "default";
      }
    });

    if (currentSection !== activeSectionId) {
      currentSection = activeSectionId;
      updateSectionColors(activeSectionId);
    }
  }

  // ---- Scroll (rAF throttled) ----
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    window.requestAnimationFrame(() => {
      updateHeaderBackground();
      ticking = false;
    });
    ticking = true;
  });

  // ---- IntersectionObserver ----
  // NOTE: rootMargin is computed dynamically from headerOffset.
  let observer = null;

  function createObserver() {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) updateHeaderBackground();
        });
      },
      {
        rootMargin: `-${headerOffset}px 0px -80% 0px`,
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  // ---- Keep offset in sync with responsive header ----
  const refreshAll = () => {
    headerOffset = computeHeaderOffset();
    createObserver();
    updateHeaderBackground();
  };

  // Initial — deferred to DOMContentLoaded so offsetTop/offsetHeight values
  // are reliable. Running synchronously (during defer-script execution) can
  // produce incorrect section detection if layout hasn't fully settled yet,
  // which causes sds:sectionchange to fire with the wrong section ID and sets
  // the wrong theme-color on the meta tags.
  // A module runs before DOMContentLoaded, so the listener still fires when
  // init is called from one. Called later than that, the load (or immediate
  // onLoad) run below covers the initial pass.
  if (document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', refreshAll, { once: true });
  }

  // Recompute on load (fonts/layout settling) + resize (breakpoints)
  onLoad(refreshAll);
  window.addEventListener("resize", () => {
    // On resize we must rebuild the observer because rootMargin is not mutable.
    refreshAll();
  });
}