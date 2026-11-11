# Studioesque Design System (SDS)

Plain HTML/CSS/JS design system extracted from the portfolio site (`../joefarquharson.github.io`). No framework. One build step (`npm run build`, esbuild) produces `dist/`; `src/` stays directly usable without it. Owner: Joe Farquharson (UX/UI designer, 25+ years; expert in design, leans on you for code). Be direct, skip design basics, give pros/cons/risks, and do exactly what's asked without touching unrelated code (note improvements separately).

Read `docs/PHASE-2.md` (progress + remaining work) and `docs/HANDOFF.md` (state, decisions, next steps) before starting.

## Commands

- `npm run check` : verifies every `@import` and `url()` asset resolves. Run after any CSS move/rename.
- `npm run build` : `scripts/build.mjs` (esbuild) writes `dist/` (sds.css, sds-core.css, sds-base.css, sds-brackets.css, sds.js, each + `.min`, plus `assets/`). Gitignored.
- `node scripts/rename.mjs` : dry-run of the `docs/rename-map.json` rename (`--write` applies, `--dir <path>` also processes another tree, `--skip-src` processes only that tree; always use it for the portfolio).
- `scripts/compare-portfolio/` : before/after pixel + behavior comparison against the live portfolio (Playwright + installed Chrome). See its README.

## Layout

```
src/css/index.css          full bundle = sds-base.css + sds-core.css in cascade order (import order matters)
src/css/sds-base.css       OPT-IN element layer: 02-base/reset.css, elements.css, motion.css (the only unprefixed rules)
src/css/sds-core.css       everything else: tokens, 02-base/text.css (sds- text classes), layout, components, utilities
src/css/01-settings ... 05-utilities   ITCSS-style layers, one file per component in 04-components
src/css/extras/            OPT-IN files, not imported by index.css (sds-brackets.css)
src/js/                    ES modules, each exports an idempotent initX(options) (options documented in each file header); index.js = init(options); lib/ helpers
src/assets/svg/            details, icons, theme-toggle (CSS url() paths depend on this depth)
dist/                      build output (gitignored)
.github/workflows/ci.yml   check + build on PRs and pushes to main
templates/starter/         index.html: minimal page wired to src/ (also a quick system test page)
docs/                      PHASE-2.md, HANDOFF.md, rename-map.json, portfolio-migration/
```

## Conventions

- Everything is prefixed: classes `sds-*`, custom properties `--sds-*`, attributes `data-sds-*`, events `sds:*`, ids `sds-*`. Never add an unprefixed selector or token. Bare element selectors (h1, p, img, *) are allowed ONLY in the opt-in base files `02-base/reset.css`, `elements.css`, `motion.css`; anything that must work without sds-base.css (core) stays prefixed (e.g. the core reduced-motion rule targets `[class*="sds-"]`). `npm run check` enforces that index.css = sds-base.css + sds-core.css.
- Per-instance values are inline custom properties (`--sds-logo-card-ratio`, `--sds-image-block-ratio`, `--sds-logo-caption-text`). Structural/layout variants are BEM `--modifier` classes (`.sds-image-block-media--natural`, `.sds-content--full-bleed`).
- Each component file starts with a header comment containing a copy-pasteable usage example. Keep that up to date.
- The system must not reference portfolio sections (`#work`, `#about`, ...) or portfolio colors. Section styling goes through `.sds-content--tinted` / `--accent` / `--full-bleed` plus `--sds-section-background` / `--sds-section-accent`.

## Gotchas that have already bitten this project

- **Theming is attribute-cascade.** `[data-sds-theme="dark"]` is a bare attribute selector and works on ANY element, not just `<html>`. `:root, [data-sds-theme="light"]` re-applies light values inside a dark context. Elements outside a themed element's DOM subtree (the fixed header, `.sds-outside-grid`) do not inherit it; they are handled by JS-toggled classes from `header-colors.js` / `outside-grid.js`.
- **`var()` inside a custom property resolves where it is DECLARED.** Don't compose themed values (like the 4-layer bracket background) into a `:root` custom property; it freezes the root theme. Keep the url/color as the token and compose in the component.
- **Specificity traps.** `body.x h1` beats plain `h1` inside media queries at every width. Prefer token overrides (see heading tokens) over selector overrides.
- **Flex items don't reliably cap a replaced element at its intrinsic width.** Use block + `max-width: 100%` + `margin-inline: auto` (see `.sds-image-block-media--natural`).
- **Percentage `max-height` can't resolve against an `auto`-height parent.**
- **`url()` inside a custom property** resolves (in Chrome) against the stylesheet where `var()` is USED, not where it's declared. Only works if both files sit at the same folder depth (true for `src/` and `dist/`). Hosts overriding `--sds-brackets*` should use root-relative or absolute URLs.
- **Images:** swapping to a 2x asset = add `srcset="img.png 2x"`, don't change CSS.
- **Brackets + borders are one opt-in unit.** Core reads `--sds-brackets-light/dark` (fallback `none`) and `--sds-frame-width` / `--sds-frame-width-neg` (fallback `0px`). Any new frame box-shadow must use the width tokens, not a literal `1px`, and any bracket background must use `var(--sds-brackets)`.
- **Headings:** `h1`-`h5` use `--sds-heading-N` (compact default); `.sds-scale-display` on body/section remaps to `--sds-display-N`. Responsive step-downs live in token values in `01-settings/typography.css`, never in per-selector media queries.
- **rename.mjs:** CSS may chain selectors (`.a.b`, `ul.nav-links`), but JS/HTML must not get the loose match (`body.setAttribute`, `el.dataset.tooltip` are member access).

## Verification

You can run a real browser here (the previous Cowork sandbox could not), so use it: serve the repo, screenshot the demo/portfolio pages before and after, check light and dark at 1200 / 800 / 400px. CSS reasoning alone has been the weak point of this project. Joe's portfolio pages (`../joefarquharson.github.io/*.html`) are the best real-world test pages, but do not edit them unless asked; they have their own git repo.

## Don't

- Don't edit `../joefarquharson.github.io` as part of design-system tasks (migration is a separate, last step with its own checklist in `docs/PHASE-2.md`).
- Don't add a framework or dependency without asking (esbuild is the approved build dependency).
- Don't fix the known undeclared custom properties (`--sds-color-background-knockout`, `-token`, `--sds-color-border-strong`, `--sds-line-height-tight/-medium`, `--sds-color-background-offset`); Joe chose to leave them for now.
- Package stays `"private": true` until Joe says to publish. GitHub username in `package.json` is still a placeholder.
