// Verifies the @imports of index.css, sds-base.css and sds-core.css resolve (and that
// index.css = base + core), and that every url() asset in src/css exists. Zero dependencies.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cssRoot = join(root, "src/css");
let errors = 0;
const fail = (m) => { console.error("FAIL " + m); errors++; };

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// 1. @imports of the three entry points
//    index.css = full bundle; sds-base.css = opt-in element layer; sds-core.css = the rest
const ENTRIES = ["index.css", "sds-base.css", "sds-core.css"];
const importsOf = {};
for (const entry of ENTRIES) {
  const css = readFileSync(join(cssRoot, entry), "utf8");
  importsOf[entry] = [...css.matchAll(/@import\s+"([^"]+)"/g)].map((m) => m[1]);
  for (const i of importsOf[entry]) if (!existsSync(join(cssRoot, i))) fail(`${entry}: @import not found: ${i}`);
}
const imported = new Set(importsOf["index.css"].map((i) => join(cssRoot, i)));

// 1b. index.css must be exactly sds-base.css + sds-core.css (no drift between bundles)
const base = new Set(importsOf["sds-base.css"]), core = new Set(importsOf["sds-core.css"]);
for (const i of base) if (core.has(i)) fail(`imported by both sds-base.css and sds-core.css: ${i}`);
const union = new Set([...base, ...core]), full = new Set(importsOf["index.css"]);
for (const i of full) if (!union.has(i)) fail(`index.css imports ${i}, but neither sds-base.css nor sds-core.css does`);
for (const i of union) if (!full.has(i)) fail(`${base.has(i) ? "sds-base.css" : "sds-core.css"} imports ${i}, but index.css does not`);

// 2. css files on disk that index.css never imports
for (const f of walk(cssRoot)) {
  if (ENTRIES.some((e) => f === join(cssRoot, e)) || !f.endsWith(".css") || f.includes("/extras/")) continue;
  if (!imported.has(f)) console.warn("WARN not imported: " + f.replace(root + "/", ""));
}

// 2b. extras/ are opt-in on purpose and are not imported by index.css

// 3. url() assets (skips placeholders like url('...') and data URIs)
for (const f of walk(cssRoot).filter((p) => p.endsWith(".css"))) {
  const css = readFileSync(f, "utf8");
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    const u = m[1];
    if (u === "..." || u.startsWith("data:") || u.startsWith("http")) continue;
    if (!existsSync(resolve(dirname(f), u))) fail(`${f.replace(root + "/", "")}: missing asset ${u}`);
  }
}

console.log(errors ? `\n${errors} problem(s)` : "OK: imports and assets resolve");
process.exit(errors ? 1 : 0);
