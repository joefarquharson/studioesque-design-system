# compare-portfolio

Pixel and behavior comparison of the live portfolio against a throwaway copy of
it wired to the design system. Never writes to the portfolio repo.

```sh
SDS=$(pwd); PORTFOLIO=../joefarquharson.github.io; OUT=/tmp/sds-compare
node scripts/compare-portfolio/build-after.mjs $PORTFOLIO . $OUT/after
(cd $PORTFOLIO && python3 -m http.server 8801) &      # before
(cd $OUT/after && python3 -m http.server 8802) &      # after
node scripts/compare-portfolio/run.mjs . $OUT          # writes $OUT/results.json, shots/, diffs/
```

`build-after.mjs` applies the HANDOFF Step 5 checklist to copies of
`index.html`, `print.html`, `identity.html`: `rename.mjs --skip-src`, system CSS +
`sds-brackets.css` + portfolio tokens + section modifiers, one module script
calling `init(sdsOptions)`, new storage key in the head script, `subpage` removed,
`sds-scale-display` on the homepage body, `#logos` full-bleed.

`run.mjs` (uses `playwright-core` with the installed Chrome):

1. Viewport tiles (900px tall) down each page at 1200 / 800 / 400, light and dark,
   for before, after, and after without `sds-brackets.css`. One-shot `fullPage`
   screenshots hang on these tall pages in this environment.
2. Tile-by-tile pixel diff (red = changed) into `diffs/`.
3. Real wheel scrolling through every section, reading the header's computed
   colors, underline, forced-dark class, theme-color meta.
4. Theme toggle + storage keys, mobile menu open / Escape.

Env: `PAGES=a.html,b.html`, `NO_NOBRACKETS=1`, `SHOTS_ONLY=1`.

Known noise: the interactive hero's live color animates, so its header color can
differ in the 4th decimal and the hero meta color can be caught mid-tween; the
tile capture waits only 150ms after each scroll, so a header color change at a
section boundary can be missed (the real-scroll check in step 3 is authoritative).
