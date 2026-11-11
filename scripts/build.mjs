// Builds dist/ from src/ with esbuild. `npm run build`.
//
//   dist/sds.css          full bundle (src/css/index.css = base + core)
//   dist/sds-core.css     core only (for hosts with their own reset / element styles)
//   dist/sds-base.css     opt-in element layer (load before sds-core.css)
//   dist/sds-brackets.css opt-in brackets + frame borders (extras/)
//   dist/sds.js           ES module: init() + every initX()
//   ... each also as .min.css / .min.js, with source maps for the minified files
//   dist/assets/          copy of src/assets (CSS url()s are rewritten to point here)
//
// Output targets the same browsers as the source: no syntax lowering, so
// what ships is what was tested.
import * as esbuild from "esbuild";
import { rmSync, cpSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");

const css = {
  "sds": "css/index.css",
  "sds-core": "css/sds-core.css",
  "sds-base": "css/sds-base.css",
  "sds-brackets": "css/extras/sds-brackets.css",
};
const js = { "sds": "js/index.js" };

rmSync(dist, { recursive: true, force: true });

const shared = {
  bundle: true,
  outdir: dist,
  outbase: src,
  logLevel: "warning",
  // url() assets keep their path under src/ (assets/svg/details/brackets.svg),
  // so they land on the same files the cpSync below copies.
  loader: { ".svg": "file" },
  assetNames: "[dir]/[name]",
};
const entries = (map, suffix) =>
  Object.entries(map).map(([name, file]) => ({ in: join(src, file), out: name + suffix }));

const builds = [];
for (const minify of [false, true]) {
  const suffix = minify ? ".min" : "";
  builds.push(
    esbuild.build({ ...shared, entryPoints: entries(css, suffix), minify, sourcemap: minify }),
    esbuild.build({ ...shared, entryPoints: entries(js, suffix), format: "esm", minify, sourcemap: minify }),
  );
}
await Promise.all(builds);

// Full asset tree (icons and theme-toggle SVGs are referenced from HTML, not CSS).
cpSync(join(src, "assets"), join(dist, "assets"), { recursive: true });

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(dist).filter((f) => !relative(dist, f).startsWith("assets"));
for (const f of files.sort()) {
  console.log(`  ${relative(root, f).padEnd(28)} ${(statSync(f).size / 1024).toFixed(1).padStart(6)} kB`);
}
console.log(`  dist/assets/                 ${walk(join(dist, "assets")).length} files`);
