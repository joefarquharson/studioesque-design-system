// Verifies every @import in src/css/index.css resolves and every url() asset
// referenced from src/css exists on disk. Zero dependencies.
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

// 1. @imports
const index = readFileSync(join(cssRoot, "index.css"), "utf8");
const imported = new Set();
for (const m of index.matchAll(/@import\s+"([^"]+)"/g)) {
  imported.add(join(cssRoot, m[1]));
  if (!existsSync(join(cssRoot, m[1]))) fail(`@import not found: ${m[1]}`);
}

// 2. css files on disk that index.css never imports
for (const f of walk(cssRoot)) {
  if (f.endsWith("index.css") || !f.endsWith(".css")) continue;
  if (!imported.has(f)) console.warn("WARN not imported: " + f.replace(root + "/", ""));
}

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
