# Studioesque Design System (SDS)

Tokens, layout, and components for Studioesque projects. Extracted from the portfolio site (`joefarquharson.github.io`).

**Status: Phase 1 (extraction) complete. Not yet usable in other projects.** Selectors and tokens are still unprefixed, and portfolio-specific pieces are still wired in. See `docs/PHASE-2.md` for what's next.

## Structure

```
src/
  css/
    index.css            # full bundle, import order matters
    01-settings/         # tokens: colors (OKLCH), dimensions, typography, motion
    02-base/             # reset, base typography
    03-layout/           # 12-col buffer grid, sections, outside-grid
    04-components/       # one file per component
    05-utilities/        # animations, visually-hidden
  js/                    # classic scripts (theme, menu, nav-underline, ...)
  assets/svg/            # details (brackets, diagonal-lines), icons, theme-toggle
docs/                    # docs site + planning notes (GitHub Pages later)
templates/starter/       # minimal starter page (later)
scripts/check.mjs        # verifies @imports and url() assets resolve
scripts/build.mjs        # npm run build -> dist/
```

CSS asset URLs (e.g. `url('../../assets/svg/details/brackets.svg')`) resolve from `src/css/<layer>/` to `src/assets/`, so keep that relative layout.

## Optional: brackets + borders

The system's signature corner brackets and 1px frame lines are off by default. Import `src/css/extras/sds-brackets.css` (before or after `index.css`) to turn both on everywhere. See the comment at the top of that file for the four custom properties behind it.

## Build

```
npm run build
```

Writes `dist/`: `sds.css` (full), `sds-core.css` (without the element base layer), `sds-base.css`, `sds-brackets.css` (opt-in), and `sds.js` (ES module: `init()` plus each `initX()`), each also as `.min` with a source map, plus `assets/`. Keep `assets/` next to the CSS so the `url()`s resolve. `src/` works without building.

## Checks

```
npm run check
```

## License

[MIT](LICENSE). The license covers the code and assets in this repo, not the Studioesque name or the JF monogram. Fonts (Mona Sans, Geist Mono) are not bundled; load them from Google Fonts under their own open font licenses.

## Not decided yet

- GitHub username/org (placeholder in `package.json`)
