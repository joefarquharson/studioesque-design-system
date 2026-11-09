/**
 * Header Color Controller
 * Manages header theme variables based on the section currently in view.
 *
 * Update: header offset is now computed from the real header height (+1px)
 * so it stays correct above/below 960px (and any future layout changes).
 *
 * Usage:
 *   import { initHeaderColors } from './js/header-colors.js';
 *   initHeaderColors();
 *
 * Dispatches `sds:sectionchange` on document (theme.js listens for it).
 */

import { onLoad } from './lib/ready.js';

let initialized = false;

export function initHeaderColors() {
  if (initialized) return;
  initialized = true;

  const header = document.getElementById("sds-global-header");
  const sections = document.querySelectorAll("section");
  const root = document.documentElement;

  let currentSection = "";

  const sectionColors = {
    // Fallback for sections with no id (or an id not present below) — mirrors
    // the :root defaults in colors.css, keeping blur/transparency but using
    // the plain page background instead of a section-specific accent color.
    default: {
      headerBg: "oklch(from var(--sds-color-background) l c h / 0.9)",
      headerLogo: "var(--sds-color-logo)",
      headerName: "var(--sds-color-text)",
      headerRole: "var(--sds-color-text-meta)",
      headerUnderline: "var(--sds-color-accent)",
    },
    // --sds-hero-live-* are set by js/hero-interactive.js (opt-in interactive
    // hero only). Unset everywhere else, so each falls back to the static
    // hero value and this behaves exactly as before.
    hero: {
      // --sds-hero-live-header-bg: optional full override (unused for now — set
      // it to e.g. transparent on <html>); otherwise the live/static hero
      // color at 90%.
      headerBg: "var(--sds-hero-live-header-bg, oklch(from var(--sds-hero-live-bg, var(--sds-color-background-accent-hero)) l c h / 0.9))",
      headerLogo: "var(--sds-hero-live-text, var(--sds-color-accent-hero))",
      headerName: "var(--sds-hero-live-header-text, var(--sds-color-text))",
      headerRole: "var(--sds-hero-live-header-text, var(--sds-color-text))",
      headerUnderline: "var(--sds-hero-live-text, var(--sds-color-accent-hero))",
    },
    // Portfolio subpage hero (styles/04-components/page-hero.css) — plain
    // content background, no accent color. Identical to "default" today;
    // kept as its own explicit entry so it can diverge later without
    // relying on the id-not-found fallback.
    "page-hero": {
      headerBg: "oklch(from var(--sds-color-background) l c h / 0.9)",
      headerLogo: "var(--sds-color-logo)",
      headerName: "var(--sds-color-text)",
      headerRole: "var(--sds-color-text-meta)",
      headerUnderline: "var(--sds-color-accent)",
    },
    work: {
      headerBg: "oklch(from var(--sds-color-background) l c h / 0.9)",
      headerLogo: "var(--sds-color-accent-work)",
      headerName: "var(--sds-color-text)",
      headerRole: "var(--sds-color-text-meta)",
      headerUnderline: "var(--sds-color-accent-work)",
    },
    about: {
      headerBg: "oklch(from var(--sds-color-background-accent-about) l c h / 0.9)",
      headerLogo: "var(--sds-color-accent-about)",
      headerName: "var(--sds-color-text)",
      headerRole: "var(--sds-color-text-meta)",
      headerUnderline: "var(--sds-color-accent-about)",
    },
    contact: {
      headerBg: "oklch(from var(--sds-color-background) l c h / 0.9)",
      headerLogo: "var(--sds-color-accent-contact)",
      headerName: "var(--sds-color-text)",
      headerRole: "var(--sds-color-text-meta)",
      headerUnderline: "var(--sds-color-accent-contact)",
    },
    // "Related work" gallery (portfolio pages) — forced dark theme via
    // data-sds-theme="dark" on the section itself, independent of the page's
    // current light/dark toggle. var(--sds-color-background) etc. would follow
    // the ROOT's data-sds-theme (the header lives outside this section in the
    // DOM, so it doesn't inherit the section's forced-dark scope) — so
    // these values are the dark-theme recipe written out literally instead.
    // The underlying scale tokens (--sds-l-95, --sds-c-blue-95, --sds-white-a90,
    // etc.) are theme-independent, defined once in :root, so this stays
    // correct regardless of the root theme. Keep in sync with
    // [data-sds-theme="dark"] in colors.css if that recipe changes.
    "related-work": {
      headerBg: "oklch(from var(--sds-color-background-accent-related-work) l c h / 0.9)",
      headerLogo: "var(--sds-white-a90)",
      headerName: "var(--sds-white-a90)",
      headerRole: "var(--sds-white-a60)",
      headerUnderline: "oklch(var(--sds-l-40) var(--sds-c-blue-40) var(--sds-h-blue))",
      // See header-dark-forced handling below — the header is outside this
      // section's DOM subtree, so it can't pick up the section's
      // data-sds-theme="dark" via CSS alone. Flag it here so JS can swap it too.
      // (.sds-outside-grid has the same problem; js/outside-grid.js handles it.)
      forceDark: true,
    },
  };

  function updateSectionColors(sectionId) {
    // Unknown/unmapped section ids (or empty ids) fall back to the default
    // header treatment rather than silently keeping the previous colors.
    const colors = sectionColors[sectionId] || sectionColors.default;

    root.style.setProperty("--sds-color-header-bg", colors.headerBg);
    root.style.setProperty("--sds-color-header-logo", colors.headerLogo);
    root.style.setProperty("--sds-color-header-name", colors.headerName);
    root.style.setProperty("--sds-color-header-role", colors.headerRole);

    // The header's own corner brackets and faint borders: --sds-brackets /
    // --sds-color-border-faint normally only swap via [data-sds-theme="dark"] on
    // the ROOT, and #sds-global-header sits outside
    // every section's DOM subtree so it can't inherit a section-local
    // data-sds-theme="dark" override. header-dark-forced redeclares both custom
    // properties directly on #sds-global-header (see global-header.css), which
    // then cascades to every descendant that consumes them — including the
    // mobile nav menu nested inside the header.
    header.classList.toggle("sds-header-dark-forced", !!colors.forceDark);

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