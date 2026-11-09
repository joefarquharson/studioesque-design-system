/**
 * nav-underline.js
 * Animated underline for desktop global header nav links.
 *
 * Fix: prevents the "first move" animation from x=0 (left edge of the nav/viewport)
 * by keeping transitions disabled until AFTER the underline has been positioned
 * at the active link at least once.
 *
 * Usage:
 *   import { initNavUnderline } from './js/nav-underline.js';
 *   initNavUnderline();
 *
 * Options (all optional):
 *   nav       Element|selector   '#sds-main-nav ul.sds-nav-links'
 *             (must contain the .sds-nav-underline element)
 *   header    Element|selector   '#sds-global-header' (height = scroll offset)
 *   links     selector           'a[href*="#"]', looked up inside nav
 *   sections  selector|NodeList  'main section[id]'
 *
 * A link is active when its fragment matches the id of the section in view.
 * Same-page ("#about") and cross-page ("index.html#about") hrefs both work.
 * With no match, the first link is treated as active.
 */

import { onReady, onLoad } from './lib/ready.js';
import { resolve, resolveAll } from './lib/dom.js';

const DEFAULTS = {
  nav: "#sds-main-nav ul.sds-nav-links",
  header: "#sds-global-header",
  links: 'a[href*="#"]',
  sections: "main section[id]",
};

let initialized = false;

export function initNavUnderline(options = {}) {
  if (initialized) return;
  initialized = true;

  const config = { ...DEFAULTS, ...options };
  const desktopMQ = window.matchMedia("(min-width: 769px)");

  const setup = () => {
    const nav = resolve(config.nav);
    if (!nav) return;

    const underline = nav.querySelector(".sds-nav-underline");
    if (!underline) return;

    // Matches both same-page ("#about") and cross-page ("index.html#about")
    // fragment links, so nav links still work when clicked from a page that
    // doesn't have that section itself.
    const links = resolveAll(config.links, nav);
    // Sections are optional: a page may have none, or none whose id matches
    // a nav href. Only `links` is required — syncToActiveSection() falls back
    // to the first link when no section match is found, so hover animation
    // still works even when scroll-based active-section detection can't apply.
    const sections = resolveAll(config.sections);
    if (!links.length) return;

    // --- IMPORTANT: keep transitions OFF until we have placed it correctly once ---
    // This prevents any first-time animation from translateX(0).
    underline.classList.add("sds-no-underline-transition");

    // Inject a small style for the "no transition" state (keeps this file self-contained)
    // If you prefer CSS-only, move this rule into your stylesheet.
    const style = document.createElement("style");
    style.textContent = `
      @media (min-width: 769px) {
        .sds-no-underline-transition {
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    const getHeaderOffset = () => {
      // Use the real header height (+1px fudge) to match your header-colors.js logic
      const header = resolve(config.header);
      if (!header) return 100;
      return Math.ceil(header.getBoundingClientRect().height) + 1;
    };

    const getActiveSectionId = () => {
      const scrollPos = window.scrollY + getHeaderOffset();
      // "" never matches a link, so it falls through to links[0]
      let activeId = sections[0]?.id || "";

      for (const section of sections) {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        if (scrollPos >= top && scrollPos < bottom) {
          activeId = section.id || "";
          break;
        }
      }
      return activeId;
    };

    const setUnderlineToLink = (a) => {
      if (!a) return;

      // Use offsets to avoid viewport-based math/jank during scroll
      const left = a.offsetLeft;
      const width = a.offsetWidth;

      underline.style.transform = `translateX(${left}px)`;
      underline.style.width = `${width}px`;
    };

    let hasInitialized = false;

    const syncToActiveSection = () => {
      const id = getActiveSectionId();
      // Fall back to the first nav link (Home) when nothing matches — e.g.
      // on subpages where no section id lines up with a nav href. Without
      // this fallback, the function returned early and the code below that
      // enables the underline's transition (see hasInitialized) never ran,
      // permanently leaving it snapping instead of sliding on hover.
      // .hash (not getAttribute) so "index.html#about" still matches "#about" —
      // .hash is parsed off the resolved URL, ignoring whatever path precedes it.
      const activeLink = links.find((a) => a.hash === `#${id}`) || links[0];
      if (!activeLink) return;

      // 1) Always position correctly (with transitions currently OFF)
      setUnderlineToLink(activeLink);

      // 2) After first correct placement, enable transitions for future moves
      if (!hasInitialized) {
        hasInitialized = true;

        // Ensure the browser has applied the transform/width before enabling transitions
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            underline.classList.remove("sds-no-underline-transition");
          });
        });
      }
    };

    // Debounced sync — used when leaving a link without immediately entering
    // another. The 100ms window absorbs quick link-to-link transitions through
    // the flex gap so the underline doesn't "bounce" to the active section.
    let syncTimer = null;
    const scheduledSync = () => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(syncToActiveSection, 100);
    };
    const cancelScheduledSync = () => {
      clearTimeout(syncTimer);
      syncTimer = null;
    };

    // Hover/focus moves underline (after transitions enabled, it'll animate)
    links.forEach((a) => {
      a.addEventListener("mouseenter", () => {
        cancelScheduledSync();
        setUnderlineToLink(a);
      });
      a.addEventListener("focus", () => setUnderlineToLink(a));

      // Leaving a link: if the destination is not another nav link
      // (e.g. the theme toggle, the gap between items, or outside the ul),
      // schedule a restore. The theme toggle lives inside ul.sds-nav-links so
      // mouseleave on the ul itself never fires for that transition.
      a.addEventListener("mouseleave", (e) => {
        const goingToNavLink = links.some(
          (l) => l === e.relatedTarget || l.contains(e.relatedTarget)
        );
        if (!goingToNavLink) scheduledSync();
      });
    });

    // Exiting the ul entirely (above/below) — restore immediately, no debounce
    nav.addEventListener("mouseleave", () => {
      cancelScheduledSync();
      syncToActiveSection();
    });
    nav.addEventListener("focusout", (e) => {
      if (!nav.contains(e.relatedTarget)) syncToActiveSection();
    });

    // Scroll updates (rAF throttled)
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!desktopMQ.matches) return;
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        syncToActiveSection();
        ticking = false;
      });
    });

    // Resize: snap (no animation) then re-enable transitions
    window.addEventListener("resize", () => {
      if (!desktopMQ.matches) return;

      underline.classList.add("sds-no-underline-transition");
      hasInitialized = false;
      syncToActiveSection();
    });

    // Initial sync ASAP + after load (fonts/layout)
    syncToActiveSection();
    onLoad(syncToActiveSection);
  };

  if (desktopMQ.matches) onReady(setup);

  desktopMQ.addEventListener("change", () => window.location.reload());
}