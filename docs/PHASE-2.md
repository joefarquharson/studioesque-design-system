# Phase 2: rename, decouple, opt-in brackets

Findings from the Phase 1 extraction. Everything below is still true of the copied files.

## Decisions already made

- Prefix: `sds-` for classes, `--sds-` for custom properties, `data-sds-*` for attributes, `sds:` for custom events.
- Theme attribute: `data-theme` -> `data-sds-theme` (47 references across 12 files).
- Brackets and borders ship **together** as one opt-in unit. Default `--sds-brackets: none`; an extras file (`src/css/extras/sds-brackets.css`) sets the light/dark SVG URLs. Borders (inset box-shadow) are part of the same opt-in, so components need a border token too (e.g. `--sds-border-box-shadow` or a per-component gate) so that "off" means no brackets and no borders. Do not compose the 4-layer background list into a custom property on `:root` (var() resolves where declared, which breaks per-element dark theming).
- Distribution: GitHub tags + npm, `private: true` until first release. Portfolio will vendor `dist/` or use a pinned jsDelivr link.

## Portfolio-specific coupling found in the copied files

**colors.css**
- `--color-accent-hero`, `--color-background-accent-hero`, `--meta-theme-color-hero` (and the work/about/contact equivalents) in both light and dark blocks. Move to the portfolio or generalize.
- `--brackets` (light and dark) and diagonal-lines URLs: move behind the opt-in extras file.

**theme.js**
- Hardcoded `META_THEME_COLORS` map keyed by `hero/work/about/contact/related-work/profile`, default section `'hero'`.
- Hardcoded ids: `theme-toggle`, `theme-color-light`, `theme-color-dark`.

**header-colors.js**
- `sectionColors` map keyed to portfolio section ids, plus `--hero-live-*` variables from `hero-interactive.js` (which was NOT extracted). `#global-header` hardcoded.

**nav-underline.js / menu.js**
- Hardcoded `global-header`, `main-nav`, `menu-trigger` ids; `"hero"` fallback id; assumes `index.html#section` link style.

**global-header.css**
- References `--color-accent-hero`, and a comment about `hero-interactive.js`. Header styling is keyed to `#global-header`, `#main-nav`, `#menu-trigger` ids (10+ selectors). Consider class-based hooks.

**Section-id selectors in CSS**
- `content.css` (`#work`, `#about`, `#contact`, `#related-work`), `work-gallery.css` (`#work`, `#related-work`), `logo-grid.css` (`#logos`, `#related-work`), `outside-grid.css` and `outside-grid.js` (`#related-work`), `contact-form.js` (`#contact`), `animations.css` (`#main-nav`, `#menu-trigger`). These bake portfolio page structure into the system; replace with classes/modifiers.

**Comments and docs that say "portfolio"**
- `page-hero.css` header comment, `02-base/typography.css` line ~273 (homepage hero scale).

## Other Phase 2 items

- ~~JS files are classic scripts, not ES modules.~~ Decided and done: ES modules with idempotent `initX()` exports plus `src/js/index.js` (`init(options)`).
- Add `scripts/build.mjs` (esbuild/lightningcss) producing `dist/` with assets alongside CSS.
- Decide whether `reset.css` and base typography (bare `h1`, `p`, `img` selectors) ship in core or an opt-in `sds-base.css`.
- `work-gallery` placeholder copy, `logo-grid` examples: make neutral.
- Pick a license and the GitHub org/user.

## Rename map status (APPLIED to src/)

- `docs/rename-map.json`: 118 classes, 7 ids, custom-property rule, data attributes, event, storage key.
- `scripts/rename.mjs`: dry run by default; `--write` applies. Applied to `src/`; idempotent (a second run changes nothing). CSS allows compound selectors (`.a.b`, `ul.nav-links`); JS/HTML do not, because `body.setAttribute` and `el.dataset.tooltip` are member access, not classes. The script's `--dir <path>` option is how the portfolio's HTML pages get renamed later.
- Manual follow-ups after applying: see `manualFollowUps` in the map.

## Pre-existing issues found during the inventory (not caused by the rename)

Custom properties that are read with `var()` but never declared anywhere in `src/`. These silently resolve to nothing (or to the fallback):

- `--blue-30/40/60/70`: used by `--color-link`, `--color-link-hover`, `--color-link-active` in colors.css (light and dark). Link colors are probably broken. Only `--blue-05/10/20/50/80/90/95` exist.
- `--color-background-knockout` (typography.css:42, with `!important`), `--color-background-token`, `--black-60`, `--color-border-strong` (has a `currentColor` fallback), `--line-height-tight`, `--line-height-medium`, `--color-background-offset` (contact-form.css:48).
- `--content-start` / `--content-end` are consumed with fallbacks (4 / 10) and never set. Fine if intentional, worth documenting as component hooks.
- `.profile-link` in animations.css has no matching component. Likely portfolio-specific.
- Both `.form-error-text` (contact-form.js) and `.no-underline-transition` (injected `<style>` in nav-underline.js) exist only on the JS side.

## Phase 2 progress

Done:
- [x] `sds-` rename applied (classes, custom properties, ids, `data-sds-*`, `sds:sectionchange`); manual follow-ups done (`[class*="sds-morph-ray-"]`, dynamic `.sds-morph-ray-${i}`, `ul.sds-nav-links`).
- [x] Heading scale inverted: `--sds-heading-1..5` (compact, default) and `--sds-display-1..5` (large), opt-in `.sds-scale-display` on body/section/wrapper. `body.subpage` and its three breakpoint blocks are gone; `.sds-page-hero` pins its title by overriding the token. Verified equal to the pre-refactor sizes at 1200/800/400px for both scales (parsed from the CSS, not rendered).
- [x] `--black-60` -> `--black-a60` (`.sds-code`). Link colors fixed by Joe in `colors.css`.
- [x] `.profile-link` removed from `animations.css`. It stays in the portfolio (its CSS already lives in `splash.css`), which must give it its own `transition` when it consumes the system.

Still to do:
- [x] Section-id selectors replaced with three composable modifiers in `content.css`: `.sds-content--tinted` (background from `--sds-section-background`), `.sds-content--accent` (h2 / bullet / link-underline color from `--sds-section-accent`), `.sds-content--full-bleed` (content-area spans 12 columns). Tinted and accent are separate because the dark gallery band only wants a background. Same-specificity ties with typography.css resolve in the modifiers' favor by import order; the full-bleed selector (0-2-0) outranks section.css's responsive spans (0-1-0). The system no longer references any section id. (The accent/background color tokens in `colors.css` are now unused by the system; moving them out is the next item.)
- [x] Brackets + borders as one opt-in unit. Core resolves `--sds-brackets` from `--sds-brackets-light/dark` (fallback `none`) and every frame shadow's thickness from `--sds-frame-width` / `--sds-frame-width-neg` (fallback `0px`, so invisible). `src/css/extras/sds-brackets.css` supplies the two SVG URLs and 1px / -1px. Order-independent. Verified: core + extras, with the tokens substituted back, is byte-identical to the pre-change CSS in every file; with extras absent, core has no bracket URLs and no hard-coded 1px frame shadows. 73 shadow lines gated. Real control borders (buttons, form fields) are deliberately not gated. `.sds-outside-grid`'s diagonal-lines pattern is still always on (not requested; same technique would apply).
- [x] `colors.css`: the hero/work/about/contact/related-work accent, background, and `--sds-meta-theme-color-*` tokens (26 lines, light and dark) moved verbatim to `docs/portfolio-migration/portfolio-tokens.css` (checked line-for-line). The system keeps only the generic `--sds-color-accent`. Two dependents re-pointed: the header logo fill fallback now uses `--sds-color-logo`, and the phantom work card background uses `--sds-section-background` (with a `--sds-color-background` fallback). **Interim state:** `header-colors.js` and `theme.js` still reference the moved tokens by name until the JS config item below lands, so the system's header theming is not usable on its own yet.
- [x] `theme.js`, `header-colors.js`, `nav-underline.js`, `menu.js`, `contact-form.js` (+ `outside-grid.js`): hardcoded section ids / colors / element ids replaced with `initX(options)` and generic `sds-` defaults. Portfolio values in `docs/portfolio-migration/portfolio-js-config.js`. This resolves the interim state above. Details in HANDOFF Step 2.
- [ ] Remaining undeclared custom properties (see list above, minus the two fixed).
- [x] localStorage key `theme` -> `sds-theme`; legacy read via `legacyStorageKey` (off by default, the portfolio config sets `'theme'`).
- [x] Reword comments that say "portfolio"/"homepage".
- [x] JS converted to ES modules: each file exports an idempotent `initX()`, no import side effects; `src/js/index.js` re-exports them with `init(options)` (`{ key: false }` skips); `src/js/lib/ready.js` lets a late init still run. Behavior unchanged (options come with the config item above). Smoke-tested in headless Chrome.
- [ ] `scripts/build.mjs`.

Portfolio migration notes (for when it consumes the system):
- Remove `class="subpage"` from the subpages; add `sds-scale-display` to the homepage `<body>` (decision: keep the About h2 large).
- Run `node scripts/rename.mjs --dir <portfolio>` to rename its HTML, then review.

### Portfolio migration: section modifiers

Add to the portfolio's own stylesheet (these replace the old `#work`/`#about`/`#contact`/`#related-work` rules):

```css
#work    { --sds-section-background: var(--sds-color-background-accent-work);
           --sds-section-accent: var(--sds-color-accent-work); }
#about   { --sds-section-background: var(--sds-color-background-accent-about);
           --sds-section-accent: var(--sds-color-accent-about); }
#contact { --sds-section-background: var(--sds-color-background-accent-contact);
           --sds-section-accent: var(--sds-color-accent-contact); }
#related-work { --sds-section-background: var(--sds-color-background-accent-related-work); }
```

And add classes in the HTML:

- `#work`: `sds-content sds-content--tinted sds-content--accent sds-content--full-bleed`
- `#about`, `#contact`: `sds-content sds-content--tinted sds-content--accent`
- `#related-work`: `sds-content sds-content--tinted sds-content--full-bleed`
- the `#logos` wrapper on logos.html: `sds-content sds-content--full-bleed`
