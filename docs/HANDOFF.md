# Handoff: Studioesque Design System (as of Nov 9, 2026)

Moving from a Cowork chat to Claude Code in VS Code. This file is the single source of truth for state and next steps. The older `../HANDOFF.md` (one level up) covers only the portfolio site as of Oct 2 and is stale for this project; it is still accurate for the portfolio's own architecture.

Repos (both in `Portfolio-2026.code-workspace`):

- `studioesque-design-system/` : this repo. Git history from Nov 9, 5 commits, no remote yet.
- `joefarquharson.github.io/` : the live portfolio, separate git repo. Last commit Oct 30. **Two uncommitted edits there, both made from the Cowork chat:** `styles/01-settings/colors.css` (link colors now built from `--l-*`/`--c-blue-*`/`--h-blue`) and `styles/02-base/typography.css` (`.code` color `--black-60` -> `--black-a60`). Commit or review them before anything else.

## Done

1. **Extraction.** Generic CSS/JS/SVG copied verbatim into `src/`. Excluded: hero*, splash, waves SVGs, images, HTML pages, `wip-r8k3t5/`.
2. **`sds-` rename.** 122 classes, 7 ids, all custom properties (about 1,800 refs), `data-theme` -> `data-sds-theme` (plus tooltip/placement attrs), event `sds:sectionchange`. Map in `docs/rename-map.json`, applied by `scripts/rename.mjs`.
3. **Heading scale inverted.** `--sds-heading-1..5` compact default, `--sds-display-1..5` large, opt-in `.sds-scale-display`. `body.subpage` removed. Sizes verified equal to the old output at 1200/800/400px by parsing CSS (not rendered).
4. **Brackets + borders are one opt-in unit** (`src/css/extras/sds-brackets.css`). Core with the extras and tokens substituted back is byte-identical to the previous CSS; with extras absent there are no bracket URLs and no hard-coded 1px frame shadows.
5. **Section ids replaced** by `.sds-content--tinted`, `--accent`, `--full-bleed` (+ `--sds-section-background`, `--sds-section-accent`).
6. **Portfolio color tokens moved out** of `colors.css` into `docs/portfolio-migration/portfolio-tokens.css` (26 lines, verified identical).
7. `.profile-link` removed from the system's `animations.css` (stays in the portfolio); `--black-60` and link colors fixed.

## Decisions Joe has made

- Name: Studioesque Design System, prefix `sds`. License: MIT. Public repo is fine.
- Brackets and borders ship together as one opt-in.
- Headings: compact is default; homepage keeps larger headings via `.sds-scale-display` on its body. Hero text sizes are independent of `h1`/`h2`.
- Section ids are portfolio-specific: replaced by generic modifiers (done).
- `.profile-link` lives in the portfolio.
- Leave the known undeclared custom properties alone for now (see CLAUDE.md).
- Distribution plan: GitHub tags (+ npm); the portfolio will vendor `dist/` or use a pinned jsDelivr link, never `@latest`. Hosting is GitHub Pages now, dedicated hosting later.

## Next steps, in order

**Step 0: housekeeping. DONE (Nov 9)**
- The two portfolio edits were committed and pushed (portfolio commit `6f4fdc4`).

**Step 1: JS shape. DONE (Nov 9): ES modules + init()**
- Joe chose ES modules. Every `src/js/*.js` now exports an idempotent `initX()` (`initTheme`, `initHeaderColors`, `initMenu`, `initNavUnderline`, `initOutsideGrid`, `initTooltip`, `initWorkGallery`, `initContactForm`); importing a file has no side effects. `src/js/index.js` re-exports them and adds `init(options)`, which starts everything (`{ key: false }` skips a module). `src/js/lib/ready.js` (`onReady` / `onLoad`) makes a late `init()` (after DOMContentLoaded or load) still work; header-colors keeps its deliberate wait-for-DOMContentLoaded timing.
- Behavior is unchanged: every hard-coded id/map/color is still in place, and the init functions take no options yet. Step 2 adds the per-module options (`init({ theme: {...}, headerColors: {...} })`).
- Verified in headless Chrome (smoke page with sds markup): all eight modules act, no errors, double `init()` is a no-op, and `init()` after window load works. Not yet tested against real portfolio pages (Step 3).
- Node v26 installed Nov 9; `npm run check` passes and all modules pass `node --check` and import cleanly under Node (no DOM access at import time).

**Step 2: decouple the JS (the main remaining Phase 2 work)**
- Each `initX()` gains an `options = {}` argument with the current hard-coded values as defaults; `init()` in `index.js` passes `options[key]` through when it is an object.
- `theme.js`: replace the hardcoded `META_THEME_COLORS` map and default `'hero'` with config; element ids from config or `sds-` defaults; localStorage key `theme` -> `sds-theme` with a one-time fallback read of the legacy `theme` key (github.io projects share one origin).
- `header-colors.js`: replace the `sectionColors` map (keyed by portfolio ids) with config or `data-sds-header-*` attributes per section; drop `--sds-hero-live-*` (set by `hero-interactive.js`, which is not in the system); the generic `default` entry stays. Currently it still references the removed `--sds-color-*-accent-*` tokens, so header theming is broken in the system until this lands.
- `nav-underline.js`, `menu.js`: hardcoded ids `sds-global-header`, `sds-main-nav`, `sds-menu-trigger`, a `"hero"` fallback section id, and the assumption of `index.html#section` links; make configurable.
- `contact-form.js`: host-owned field ids (`#contact-name`, `#contact-email`, `#contact-message`, `#contact-submit-error`) and `#contact`; scope by `.sds-contact-form` and `name` attributes.
- Reword comments that mention "portfolio" / "homepage" (page-hero.css, typography.css, header-colors.js).
- Keep each script working with no config (sensible defaults) wherever possible.

**Step 3: verify in a real browser (Claude Code can do this)**
- Serve the portfolio with the system's CSS/JS swapped in (or a throwaway demo page in `docs/`), screenshot before/after for index, print-packaging-environment, logos at 1200/800/400px, light and dark, with and without `sds-brackets.css`. Check: headings, header color changes while scrolling, theme toggle, mobile menu, nav underline, outside-grid dark bands, logo grid brackets, image-block theme swap.

**Step 4: tooling and docs**
- `scripts/build.mjs` (esbuild or lightningcss): bundle `dist/sds.css`, `sds.min.css`, `sds.js` with assets alongside so CSS `url()` paths still resolve; add `npm run build`.
- GitHub Actions: `ci.yml` (check + build on PR), `release.yml` (publish on tag).
- Docs site in `docs/` (GitHub Pages): foundations (color/OKLCH, type, spacing, brackets, theming) and one page per component with live demo, light/dark toggle, markup snippet.
- `templates/starter/`: minimal page wired to the system.
- Decide whether `reset.css` and bare-element typography ship in core or an opt-in `sds-base.css`.

**Step 5: migrate the portfolio (last, separate checklist; edit the portfolio repo only now)**
- Copy `docs/portfolio-migration/portfolio-tokens.css` in; load after the system CSS.
- `node scripts/rename.mjs --dir <portfolio>` to rename its HTML; review the diff. Excludes `.profile-link`.
- Add the section modifier CSS/classes from `docs/PHASE-2.md` ("Portfolio migration: section modifiers").
- Remove `class="subpage"` from subpages; add `sds-scale-display` to the homepage `<body>`.
- Give `.profile-link` its own `transition` (the system no longer provides it).
- Update the inline `<head>` theme script to the new localStorage key (and fallback) and `data-sds-theme`.
- Import `sds-brackets.css` to keep the current look.
- Vendor `dist/` (or pinned CDN link); delete the duplicated copies.

**Step 6: publish**
- Put the real GitHub username/org in `package.json`, create the repo, push, tag `v0.1.0`, then (optionally) npm publish and flip `"private"` off.

## Open items and risks

- Everything so far was verified by reading/parsing CSS and JS, never by rendering. Step 3 is the biggest risk reducer.
- Unprefixed bare-element rules (`h1`, `p`, `img`) can collide with a host project's CSS; Step 4 decides how to ship them.
- Known undeclared custom properties (intentionally left): `--sds-color-background-knockout` (typography.css, with `!important`), `--sds-color-background-token`, `--sds-color-border-strong`, `--sds-line-height-tight`, `--sds-line-height-medium`, `--sds-color-background-offset`. `--sds-content-start/-end` are read with fallbacks and never set (fine).
- `.sds-outside-grid`'s diagonal-lines pattern is always on (not gated like brackets).
- The design-system repo has no remote; commit regularly, since the Cowork backup of the pre-rename state was only in a scratch folder.
