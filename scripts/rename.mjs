// Applies docs/rename-map.json to src/ (and optionally other dirs).
// Default is a DRY RUN that prints per-file replacement counts.
//   node scripts/rename.mjs                # dry run on src/
//   node scripts/rename.mjs --write        # apply
//   node scripts/rename.mjs --dir ../site  # also process another tree (html/css/js)
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const write = args.includes("--write");
const dirs = [join(root, "src")];
args.forEach((a, i) => { if (a === "--dir") dirs.push(resolve(args[i + 1])); });
const map = JSON.parse(readFileSync(join(root, "docs/rename-map.json"), "utf8"));
const excludeProps = new Set(map.customProperties.exclude || []);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const walk = (d) => readdirSync(d).flatMap((n) => {
  if (n === "node_modules" || n === ".git") return [];
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// longest names first so "work-card--focus" wins over "work-card"
const byLen = (o) => Object.entries(o).sort((a, b) => b[0].length - a[0].length);
const classes = byLen(map.classes);
const ids = byLen(map.ids);
const attrs = byLen(map.attributes);
const classAlt = classes.map(([k]) => esc(k)).join("|");
const classTo = map.classes;
const idTo = map.ids;
const idAlt = ids.map(([k]) => esc(k)).join("|");

const rules = [];
// .class in CSS selectors, comments, JS selector strings
// CSS may chain compound selectors (.a.b, body.x, ul.nav-links), so allow a word char before the dot.
// JS/HTML must NOT: `body.setAttribute`, `meta.content`, `dataset.tooltip` are member access, not classes.
rules.push(["class selectors (css)", new RegExp(`(?<!\\d)\\.(${classAlt})(?![\\w-])`, "g"), (_, n) => "." + classTo[n], [".css"]]);
rules.push(["class selectors (js/html)", new RegExp(`(?<![\\w-])\\.(${classAlt})(?![\\w-])`, "g"), (_, n) => "." + classTo[n], [".js", ".html"]]);
// HTML class="..." tokens and JS classList / className string args
const mapTokens = (s) => s.replace(/[A-Za-z_][\w-]*/g, (t) => classTo[t] ?? t);
rules.push(["html class attr", /\bclass="([^"]*)"/g, (_, v) => `class="${mapTokens(v)}"`]);
rules.push(["classList args", /classList\.(add|remove|toggle|contains|replace)\(([^)]*)\)/g,
  (_, fn, a) => `classList.${fn}(${a.replace(/(['"])([^'"]+)\1/g, (m, q, v) => q + mapTokens(v) + q)})`]);
rules.push(["className =", /className\s*=\s*(['"])([^'"]*)\1/g, (m, q, v) => m.replace(v, mapTokens(v))]);
// #id selectors, getElementById('x'), id="x", href="#x" (system ids only)
rules.push(["id selectors", new RegExp(`(?<![\\w&-])#(${idAlt})(?![\\w-])`, "g"), (_, n) => "#" + idTo[n]]);
rules.push(["getElementById", new RegExp(`getElementById\\((['"])(${idAlt})\\1\\)`, "g"), (_, q, n) => `getElementById(${q}${idTo[n]}${q})`]);
rules.push(["id attr", new RegExp(`\\bid=(["'])(${idAlt})\\1`, "g"), (_, q, n) => `id=${q}${idTo[n]}${q}`]);
// custom properties (declarations, var(), inline styles, setProperty)
rules.push(["custom properties", /(?<![\w-])--(?!sds-)([a-z0-9][\w-]*)/g, (m, n) => (excludeProps.has(m) ? m : `--sds-${n}`)]);
// data-* attributes and dataset keys
for (const [from, to] of attrs) {
  rules.push([`attr ${from}`, new RegExp(`(?<![\\w.-])${esc(from)}(?![\\w-])`, "g"), () => to]);
}
// events
for (const [from, to] of Object.entries(map.events)) {
  rules.push([`event ${from}`, new RegExp(`(["'])${esc(from)}\\1`, "g"), (_, q) => q + to + q]);
}

const totals = {};
let filesChanged = 0;
for (const dir of dirs) {
  for (const f of walk(dir)) {
    if (![".css", ".js", ".html"].includes(extname(f))) continue;
    // css custom props only apply to css/js/html; fine for all three
    let text = readFileSync(f, "utf8"), out = text, fileCounts = {};
    for (const [label, re, fn, only] of rules) {
      if (only && !only.includes(extname(f))) continue;
      out = out.replace(re, (...m) => { fileCounts[label] = (fileCounts[label] || 0) + 1; totals[label] = (totals[label] || 0) + 1; return fn(...m); });
    }
    if (out !== text) {
      filesChanged++;
      console.log(f.replace(root + "/", "") + ": " + Object.values(fileCounts).reduce((a, b) => a + b, 0) + " replacements");
      if (write) writeFileSync(f, out);
    }
  }
}
console.log("\n" + (write ? "APPLIED" : "DRY RUN") + ": " + filesChanged + " files");
for (const [k, v] of Object.entries(totals).sort((a, b) => b[1] - a[1])) console.log("  " + k.padEnd(22) + v);
console.log("\nManual follow-ups (see docs/rename-map.json -> manualFollowUps)");
