# Handoff: Studioesque Design System (as of Nov 11, 2026)

Moving from a Cowork chat to Claude Code in VS Code. This file is the single source of truth for state and next steps. The older `../HANDOFF.md` (one level up) covers only the portfolio site as of Oct 2 and is stale for this project; it is still accurate for the portfolio's own architecture.

Repos (both in `Portfolio-2026.code-workspace`):

- `studioesque-design-system/` : this repo. Git history from Nov 9, 5 commits, no remote yet.
- `joefarquharson.github.io/` : the live portfolio, separate git repo. Its earlier uncommitted edits (link colors, `.code` color, wave hero) and the color-page `srcset` fix are committed and pushed (Nov 9, `6f4fdc4`, `f6de7bc`).

## Done

1. **Extraction.** Generic CSS/JS/SVG copied verbatim into `src/`. Excluded: hero*, splash, waves SVGs, images, HTML pages, `wip-r8k3t5/`.
2. **`sds-` rename.** 122 classes, 7 ids, all custom properties (about 1,800 refs), `data-theme` -> `data-sds-theme` (plus tooltip/placement attrs), event `sds:sectionchange`. Map in `docs/rename-map.json`, applied by `scripts/rename.mjs`.
3. **Heading scale inverted.** `--sds-heading-1..5` compact default, `--sds-display-1..5` large, opt-in `.sds-scale-display`. `body.subpage` removed. Sizes verified equal to the old output at 1200/800/400px by parsing CSS (not rendered).
4. **Brackets + borders are one opt-in unit** (`src/css/extras/sds-brackets.css`). Core with the extras and tokens substituted back is byte-identical to the previous CSS; with extras absent there are no bracket URLs and no hard-coded 1px frame shadows.
5. **Section ids replaced** by `.sds-content--tinted`, `--accent`, `--full-bleed` (+ `--sds-section-background`, `--sds-section-accent`).
6. **Portfolio color tokens moved out** of `colors.css` into `docs/portfolio-migration/portfolio-tokens.css` (26 lines, verified identical).
7. `.profile-link` removed from the system's `animations.css` (stays in the portfolio); `--black-60` and link colors fixed.

## Decisions Joe has made

- **Type scale (Nov 11, revised):** Compact h1-h5: 48/36/24/20/16 (desktop), 36/30/20/18/14 (<=960), 30/24/18/16/12 (<=480). Display: 60/48/30/24/18, 48/36/24/20/16, 36/30/20/18/14. `--sds-font-size-6xlarge` 84 -> 96 (unused so far). Headings use the weight tokens (dark 675). `strong` semibold everywhere (opt-in base). `.sds-code` medium weight. Text classes renamed: `.sds-prose` (was `.sds-body`), `.sds-body` (was `.sds-body-small`), `.sds-eyebrow` (was `.sds-leader`).

- Name: Studioesque Design System, prefix `sds`. License: MIT. Public repo is fine.
- Brackets and borders ship together as one opt-in.
- Headings: compact is default; homepage keeps larger headings via `.sds-scale-display` on its body. Hero text sizes are independent of `h1`/`h2`.
- h1 sizes (Nov 9): homepage / display scale 60 / 48 / 36px, subpages / compact scale 48 / 36 / 30px (at >960 / ≤960 / ≤480). This is one step smaller than the old portfolio (72/60/48 and 60/48/36) on purpose.
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

**Step 2: decouple the JS. DONE (Nov 9)**
- Every `initX(options)` takes an options object; defaults are the generic `sds-` ids/selectors, and each file's header comment documents its options. `init()` passes `options[key]` through. Element options accept an Element or a selector (`src/js/lib/dom.js`).
- The portfolio's values moved verbatim to `docs/portfolio-migration/portfolio-js-config.js` (`sdsOptions`, passed as `init(sdsOptions)`): theme-color meta map, `initialSection: 'hero'`, `metaFallback`, `legacyStorageKey: 'theme'`, and the header `colors` entries (hero with `--sds-hero-live-*`, page-hero, work, about, contact, related-work).
- `theme.js`: options `toggle`, `metaLight`, `metaDark`, `storageKey` ('sds-theme'), `legacyStorageKey` (default null; copies a legacy value once, never deletes it), `metaColors` (null = meta tags untouched), `metaFallback`, `initialSection`. localStorage access is wrapped in try/catch. The header comment has the matching inline `<head>` snippet.
- `header-colors.js`: options `header`, `sections`, `colors`. Entries merge over the default entry, so partial entries are fine. Works without a header element.
- `menu.js`: `trigger`, `nav`, `links`. `nav-underline.js`: `nav`, `header`, `links`, `sections`; the `"hero"` fallback id is gone (no match -> first link, which is what the portfolio got anyway since Home is first). `outside-grid.js`: `element`, `bands`.
- `contact-form.js`: now driven by markup. Validates every `[required]` field in every `.sds-contact-form`; `type="email"` gets the format check; submit message is `.sds-form-submit-error`. Options `form`, `fields`, `submitError`, `messages`, `onValid(form, event)`. No field ids needed (the portfolio form already matches: name/email/message are `required`, company is not).
- Tooltip element id `tooltip` -> `sds-tooltip` (prefix rule; nothing referenced it).
- Comments reworded: page-hero.css, global-header.css (`.sds-header-light-forced` is a host hook), typography.css, visually-hidden.css, content.css, work-gallery.js.
- Verified in headless Chrome with two pages, defaults and `init(sdsOptions)`: no errors; per-section header colors, forced-dark header at related-work, meta colors per section and theme, nav underline per section, legacy key migration, `sds-theme` written on toggle, form messages (blank / email format / optional field untouched). Section detection was exercised via resize: headless Chrome here dispatches no scroll events, so real scrolling is still a Step 3 check.

**Step 3: verify in a real browser. DONE (Nov 9)**
- Harness: `scripts/compare-portfolio/` (README there). `playwright-core` dev dependency drives the installed Chrome. Builds a throwaway copy of the portfolio (index, print, identity) wired to the system per the Step 5 checklist, then compares it to the live portfolio.
- **index.html: pixel-identical** at 1200/800/400, light and dark (interactive hero included).
- **print.html, identity.html: pixel-identical except the page-hero title**, once `#logos` gets `sds-content--full-bleed` (a migration step, already in the checklist). `.sds-page-hero` h1 is one step smaller than the live site (48/36/30 vs. 60/48/36). **Resolved:** Joe confirmed the smaller subpage size, and moved the h1 tokens down one step: `--sds-heading-1` 48/36/30, `--sds-display-1` 60/48/36. Re-verified rendered: index h1 60/48/36 (visually hidden, so the homepage stays pixel-identical), print/identity h1 48/36/30.
- Real wheel scrolling on all three pages, both themes: header bg/logo/name/role colors, underline, forced-dark header at related-work, theme-color meta, and data-sds-theme match before at every section.
- Theme toggle (writes `sds-theme`, legacy `theme` untouched), mobile menu open + Escape, and the 400px menu screenshot match.
- Without `sds-brackets.css`: no brackets and no frame borders, as designed.
- `rename.mjs` gained `--skip-src`: without it, renaming another tree also rewrites `src/` comments that mention BEM modifiers (`--tinted` -> `--sds-tinted`). Use it in Step 5.
- Portfolio bugs found (exist before and after, not system issues): `identity.html:248` has full-width digits (`１１．５２４３`) in an SVG path in the related-work card CTA (console error); `index.html` requests a missing favicon (404).

**Step 4: tooling and docs (IN PROGRESS)**
- DONE (Nov 9): base styles are opt-in. Three entry points: `index.css` (full, unchanged for the portfolio) = `sds-base.css` (opt-in: `02-base/reset.css`, `elements.css`, `motion.css`, the only unprefixed rules) + `sds-core.css` (tokens, `02-base/text.css`, layout, components, utilities). Base loads before core to keep the cascade. Moves: element typography -> `elements.css`; sds- text classes + `[data-sds-theme]` fix -> `text.css`; flow-space tokens -> `01-settings/typography.css` (work-gallery uses them); element transitions + `*` reduced-motion -> `motion.css`, with a scoped `[class*="sds-"]` reduced-motion rule kept in core; dead `.sds-grid-wrapper` rule in reset deleted (grid.css overrode it); `.sds-content-row` mobile max-width -> `content.css`. `check.mjs` now verifies all three entries and that index = base + core.
- Verified by computed-style diff (every property of every element and pseudo-element, 3 pages x 1200/400 x light/dark x normal/reduced motion, 6,640 boxes): old index.css vs new index.css 0 differences; `sds-base.css` + `sds-core.css` vs `index.css` 0 differences. Core alone: elements fall back to browser defaults, components keep sds styles, reduced motion still applies to sds elements.
- DONE (Nov 11): `npm run build` (`scripts/build.mjs`, esbuild 0.28.2 pinned as the one build dev dependency, Joe approved). Writes `dist/sds.css`, `sds-core.css`, `sds-base.css`, `sds-brackets.css`, `sds.js` (ESM: `init` + every `initX`), each also `.min` with a source map, plus `dist/assets/` (full copy of `src/assets`; CSS `url()`s rewritten to `./assets/...`). No syntax lowering (no `target`), so dist ships the same CSS features as src. `dist/` is gitignored; `package.json` exports `./dist/*`.
- Verified on the portfolio pages (3 pages x 1200/400 x light/dark x normal/reduced motion): `dist/sds.min.css` + `sds-brackets.min.css` vs `src` give 0 differences in every resolved property, except the hero's bracket URL (see the Step 5 note on custom-property URLs; same bytes, no visible change). `dist/sds.min.js` vs the src modules: 36 behavior checkpoints (load, 3 scroll positions, theme toggle, mobile menu), 0 differences, no new console errors.
- DONE (Nov 11): `.github/workflows/ci.yml` runs `npm ci`, `npm run check`, `npm run build` on every pull request and push to `main` (Node 24, read-only token). Simulated in a clean clone: passes; a broken `@import` fails both check and build. Not yet run on GitHub (no remote until Step 6).
- `release.yml` (publish on tag): deferred to Step 6; it needs the repo, the npm decision, and `"private"` off.
- Docs site in `docs/` (GitHub Pages): foundations (color/OKLCH, type, spacing, brackets, theming) and one page per component with live demo, light/dark toggle, markup snippet.
- DONE (Nov 11): `templates/starter/index.html`. One page: header (placeholder logo, mobile menu, nav underline, theme toggle), page hero, content section with buttons, a dark band (`data-sds-theme="dark"` + `--tinted` with `--sds-section-background: var(--sds-grey-90)`), contact form, footer. Links `src/` so it runs from the repo without a build; the header comment gives the `dist/` lines for real projects. Inline head theme script uses `sds-theme` only, with storage wrapped in try/catch. `init()` config is one entry: header colors for the dark band.
- Verified in Chrome at 1200/800/400 x light/dark: no console errors, no 404s, no horizontal scroll, h1 48/36/30. Behavior: underline follows About/Work/Contact, header goes dark over the band, empty submit and a bad email flag the fields, toggle persists across reload, mobile menu opens and closes on link click. With `sds-brackets.css` switched on, brackets and frame lines render.
- Found while building it: `forceDark` only swaps the header's bracket/border tokens; the header COLORS for a forced-dark section must be passed explicitly (as the portfolio config does). Works, but a host has to know it. Possible improvement (not done): have `forceDark` also apply dark header color defaults.
- Found: the grey scale stops at `--sds-grey-95` (L 23.9%), the same lightness as the dark page background, so a "dark band" and a tinted section can't both be distinct in dark mode with stock tokens. The starter avoids it (only one tinted section).

**Step 5: migrate the portfolio (last, separate checklist; edit the portfolio repo only now)**
- IN REVIEW (Nov 11): done on portfolio branch `sds-migration` (commit 316dc21), NOT merged or pushed; Joe reviews, then merge to main (= live). Joe's choices: vendor `dist/` as `sds/`; migrate every page incl. the 4 experiments and the 2 `_archive` pages; keep the meta-color quirk as-is. Every page keeps exactly the JS modules it loaded before (others passed `false`). Splash pages and chroma-tuner get `sds-scale-display`; subpages lose `subpage`. Portfolio's duplicate CSS/JS/SVGs deleted (SVGs byte-identical to `sds/assets/`).
- Real bug found and fixed: the bracket URL trap. `dist/sds-brackets.css` sets `url("./assets/...")`, and the portfolio's `splash.css` uses `var(--sds-brackets)` from `styles/04-components/`, so Chrome looked for `styles/04-components/assets/...` (404 on the splash layout at 800/400). Fix (portfolio side): `styles/portfolio.css` sets `--sds-brackets-light/-dark` to root-relative `/sds/assets/...`; `hero-interactive.css` likewise. **Possible system fix (not done):** have `build.mjs` inline the two bracket SVGs as data: URIs so no host ever hits this.
- Verified vs main (portfolio built with the pre-Nov-11 type scale, to isolate the migration): homepages, splash, index-harmony pixel-identical at 1200/800/400 x light/dark; behavior probes match (only the known hero-tween noise); computed styles of every body element match on all 9 pages except (a) the planned subpage title shrink, (b) homepage/splash h1 size (invisible on those pages), (c) the related-work phantom card at 400px: live = darker page background (looks like a bug), migrated = section background. **Joe to decide (c).** chroma-tuner differs only in its help text (now names `--sds-*` tokens). Then re-vendored with the new type scale (2dec858): no JS errors or 404s on any page.
- `compare-portfolio/run.mjs`: `SUB=/` for root pages; skips the menu check on pages without one. Run one comparison at a time.
- Copy `docs/portfolio-migration/portfolio-tokens.css` in; load after the system CSS.
- `node scripts/rename.mjs --dir <portfolio> --skip-src` to rename its HTML/CSS/JS (including `hero-interactive.js`); review the diff. Excludes `.profile-link`. `scripts/compare-portfolio/build-after.mjs` is a working reference for every edit in this list.
- Add `sds-content--full-bleed` to the `#logos` wrapper (logo-grid pages).
- Add the section modifier CSS/classes from `docs/PHASE-2.md` ("Portfolio migration: section modifiers").
- Remove `class="subpage"` from subpages; add `sds-scale-display` to the homepage `<body>`.
- Give `.profile-link` its own `transition` (the system no longer provides it).
- Update the inline `<head>` theme script to the new localStorage key (and fallback) and `data-sds-theme`. Its hero-color override for the meta tags stays portfolio-side.
- Copy `docs/portfolio-migration/portfolio-js-config.js` in; replace the nine `<script defer>` tags with one `<script type="module">` calling `init(sdsOptions)` (hero-interactive.js stays a portfolio script).
- Import `sds-brackets.css` to keep the current look.
- Vendor `dist/` (or pinned CDN link); delete the duplicated copies.
- **Before deleting the portfolio's own `/assets/svg/details/`:** `hero-interactive.css` overrides `--sds-brackets` with `url('../../assets/...')`. Chrome resolves a relative `url()` held in a custom property against the stylesheet where `var()` is used (the system's CSS), not where it is declared, so this path only works by matching folder depth. From `src/` it lands on `/sds/assets/`, from `dist/` on the portfolio's `/assets/`. Use a root-relative URL (`/assets/...` or the vendored `dist/assets/...`) there. The system's own `sds-brackets.css` is safe: in `dist/` it sits next to `sds.css`; in `src/` both files are two folders deep.

**Step 6: publish**
- Put the real GitHub username/org in `package.json`, create the repo, push, tag `v0.1.0`, then (optionally) npm publish and flip `"private"` off.

## Open items and risks

- Step 3 rendered and compared the real pages (see above); re-run `scripts/compare-portfolio` after system changes and during Step 5.
- Expected migration diff: subpage titles shrink one step (60/48/36 -> 48/36/30), by Joe's decision. Every other compared pixel matches.
- Unprefixed element rules now live only in opt-in `sds-base.css`. A host that skips it must provide `box-sizing: border-box` and zeroed margins itself (components assume both).
- Known undeclared custom properties (intentionally left): `--sds-color-background-knockout` (typography.css, with `!important`), `--sds-color-background-token`, `--sds-color-border-strong`, `--sds-line-height-tight`, `--sds-line-height-medium`, `--sds-color-background-offset`. `--sds-content-start/-end` are read with fallbacks and never set (fine).
- `.sds-outside-grid`'s diagonal-lines pattern is always on (not gated like brackets).
- Probable portfolio bug, preserved via `metaFallback: '#EB5125'`: a section with no meta entry (`page-hero` on subpages, or no section) sets the status bar to the LIGHT hero orange even in dark mode. Fix by adding `page-hero`/`default` entries to `metaColors` in the portfolio config (Joe's call on colors).
- Headless Chrome in this environment dispatches no scroll events, so scroll-driven behavior needs a rendering browser for Step 3 (e.g. Playwright as a dev dependency; ask Joe first).
- The design-system repo has no remote; commit regularly, since the Cowork backup of the pre-rename state was only in a scratch folder.
