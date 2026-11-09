# Changelog

## 0.0.1 (unreleased)

- Brackets and frame borders are now opt-in via `extras/sds-brackets.css`.
- Headings: `--sds-heading-N` (compact default) / `--sds-display-N` with opt-in `.sds-scale-display`; removed `body.subpage`.
- All classes, custom properties, ids, data attributes, and events prefixed with `sds-`.
- Phase 1: extracted generic CSS, JS, and SVG assets from the portfolio site. Files copied verbatim, no renaming yet. Not usable as a library until Phase 2 (prefix rename, decoupling, opt-in brackets+borders).
