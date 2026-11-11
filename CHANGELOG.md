# Changelog

## 0.0.1 (unreleased)

- Type scale revised: compact h1-h5 48/36/24/20/16, display 60/48/30/24/18 (desktop), stepping down at 960 and 480. `.sds-code` is medium weight (was bold).
- Headings now use the weight tokens (`--sds-font-weight-bold`): each heading rule lists both axes in `font-variation-settings`. Light unchanged (700); dark headings are 675, matching the dark-mode weight shift of body text.
- `strong` is semibold everywhere (was only inside `.sds-caption`); the rule moved to the opt-in base (`02-base/elements.css`).
- Renamed text classes: `.sds-body` -> `.sds-prose` (the larger running-text style), `.sds-body-small` -> `.sds-body`, `.sds-leader` -> `.sds-eyebrow`. The portfolio renamed its own classes to match (`prose`, `body`, `eyebrow`), and the rename map is keyed to those names.
- `templates/starter/index.html`: minimal page wired to the system.
- CI workflow: check and build on pull requests and pushes to `main`.
- `npm run build` (esbuild) produces `dist/`: full, core, base, and brackets CSS bundles, an ES module JS bundle, minified copies with source maps, and assets.
- Base styles are opt-in: `index.css` = `sds-base.css` (element rules) + `sds-core.css`.
- Portfolio-specific section color and meta-theme-color tokens moved out of `colors.css`.
- Section modifiers `.sds-content--tinted/--accent/--full-bleed` replace the portfolio's per-id section rules.
- Brackets and frame borders are now opt-in via `extras/sds-brackets.css`.
- Headings: `--sds-heading-N` (compact default) / `--sds-display-N` with opt-in `.sds-scale-display`; removed `body.subpage`.
- All classes, custom properties, ids, data attributes, and events prefixed with `sds-`.
- Phase 1: extracted generic CSS, JS, and SVG assets from the portfolio site. Files copied verbatim, no renaming yet. Not usable as a library until Phase 2 (prefix rename, decoupling, opt-in brackets+borders).
