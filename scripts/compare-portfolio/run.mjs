// Before/after comparison of the live portfolio vs. the portfolio on SDS (see README.md).
//   node run.mjs <sdsRoot> <outDir>   (servers: before :8801, after :8802)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [sdsRoot, outDir] = process.argv.slice(2).map((p) => resolve(p));
const require = createRequire(join(sdsRoot, 'package.json'));
const { chromium } = require('playwright-core');

const PAGES = (process.env.PAGES || 'index.html,print.html,identity.html').split(',');
const WIDTHS = [1200, 800, 400];
const THEMES = ['light', 'dark'];
const VARIANTS_ALL = {
  before: { base: 'http://localhost:8801' + (process.env.SUB ?? '/wip-r8k3t5/') },
  after: { base: 'http://localhost:8802' + (process.env.SUB ?? '/wip-r8k3t5/') },
  'after-nobrackets': { base: 'http://localhost:8802' + (process.env.SUB ?? '/wip-r8k3t5/'), blockBrackets: true },
};
const VARIANTS = Object.fromEntries(Object.entries(VARIANTS_ALL).filter(([k]) => !process.env.NO_NOBRACKETS || k !== 'after-nobrackets'));
const shots = join(outDir, 'shots');
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });

async function openPage(variant, page, width, theme) {
  const v = VARIANTS[variant];
  const ctx = await browser.newContext({
    viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce', deviceScaleFactor: 1,
  });
  // Saved choice under the legacy key: before reads it; after's head script falls back to it
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
  if (v.blockBrackets) await ctx.route('**/sds-brackets.css', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('requestfailed', (r) => errors.push('FAILED ' + r.url()));
  p.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await p.goto(v.base + page, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  return { ctx, p, errors };
}

// ---------- 1. Screenshots (viewport tiles; one-shot fullPage hangs on these tall pages) ----------
const errorLog = {};
const tileCount = {};
const heights = {};
for (const variant of Object.keys(VARIANTS)) {
  for (const page of PAGES) for (const width of WIDTHS) for (const theme of THEMES) {
    const name = `${page.replace('.html', '')}__${width}__${theme}`;
    const { ctx, p, errors } = await openPage(variant, page, width, theme);
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    const height = await p.evaluate(() => document.documentElement.scrollHeight);
    heights[`${variant} ${name}`] = height;
    const n = Math.ceil(height / 900);
    for (let i = 0; i < n; i++) {
      await p.evaluate((y) => { scrollTo(0, y); dispatchEvent(new Event('scroll')); }, i * 900);
      await p.waitForTimeout(150);
      await p.screenshot({ path: join(shots, `${variant}__${name}__t${String(i).padStart(2, '0')}.png`), animations: 'disabled' });
    }
    tileCount[`${variant} ${name}`] = n;
    if (errors.length) errorLog[`${variant} ${name}`] = [...new Set(errors)];
    await ctx.close();
  }
}

// ---------- 2. Pixel diff (in a browser canvas, no extra deps) ----------
const diffCtx = await browser.newContext();
const dp = await diffCtx.newPage();
const diffs = [];
mkdirSync(join(outDir, 'diffs'), { recursive: true });
for (const page of PAGES) for (const width of WIDTHS) for (const theme of THEMES) {
  const base = `${page.replace('.html', '')}__${width}__${theme}`;
  const n = Math.min(tileCount[`before ${base}`], tileCount[`after ${base}`]);
  for (let t = 0; t < n; t++) {
  const name = `${base}__t${String(t).padStart(2, '0')}`;
  const a = readFileSync(join(shots, `before__${name}.png`)).toString('base64');
  const b = readFileSync(join(shots, `after__${name}.png`)).toString('base64');
  const r = await dp.evaluate(async ([a, b]) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const get = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = get(ia), db = get(ib);
    const out = new OffscreenCanvas(w, h), ox = out.getContext('2d'), od = ox.createImageData(w, h);
    let diff = 0, minY = Infinity, maxY = -1;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
      if (d > 24) { diff++; const y = Math.floor(i / 4 / w); minY = Math.min(minY, y); maxY = Math.max(maxY, y); od.data.set([255, 0, 0, 255], i); }
      else { const g = (da[i] + da[i + 1] + da[i + 2]) / 3; od.data.set([g, g, g, 60], i); }
    }
    ox.putImageData(od, 0, 0);
    const blob = await out.convertToBlob({ type: 'image/png' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { sizeA: `${ia.width}x${ia.height}`, sizeB: `${ib.width}x${ib.height}`, diffPx: diff, pct: +(100 * diff / (w * h)).toFixed(3), rows: diff ? [minY, maxY] : null, png: diff ? btoa(bin) : null };
  }, [a, b]);
  if (r.png) writeFileSync(join(outDir, 'diffs', `${name}.png`), Buffer.from(r.png, 'base64'));
  delete r.png;
  if (r.diffPx) diffs.push({ name, ...r });
  }
}
await diffCtx.close();

if (process.env.SHOTS_ONLY) { writeFileSync(join(outDir, 'results-shots.json'), JSON.stringify({ errorLog, heights, diffs }, null, 1)); await browser.close(); process.exit(0); }
// ---------- 3. Behavior with real scrolling ----------
const probe = () => {
  const h = document.querySelector('#global-header, #sds-global-header');
  const cs = (sel, prop) => { const el = h?.querySelector(sel); return el ? getComputedStyle(el)[prop] : null; };
  const u = h?.querySelector('.nav-underline, .sds-nav-underline');
  return {
    headerBg: h && getComputedStyle(h).backgroundColor,
    logo: cs('.header-identity svg, .sds-header-identity svg', 'color') + ' / ' + (h?.querySelector('.header-identity svg path, .sds-header-identity svg path') ? getComputedStyle(h.querySelector('.header-identity svg path, .sds-header-identity svg path')).fill : ''),
    name: cs('.name, .sds-header-name', 'color'),
    role: cs('.role, .sds-header-role', 'color'),
    underline: u ? `${u.style.transform} w=${u.style.width} ${getComputedStyle(u).backgroundColor}` : null,
    forcedDark: !!h?.className.match(/header-dark-forced/),
    meta: document.querySelector('meta[name="theme-color"]')?.content,
    theme: document.documentElement.getAttribute('data-theme') || document.documentElement.getAttribute('data-sds-theme'),
  };
};
const behavior = {};
for (const variant of ['before', 'after']) {
  for (const page of ['index.html', 'print.html', 'identity.html']) for (const theme of THEMES) {
    const { ctx, p } = await openPage(variant, page, 1200, theme);
    const ids = await p.evaluate(() => [...document.querySelectorAll('main section[id]')].map((s) => s.id));
    const rows = {};
    rows['(top)'] = await p.evaluate(probe);
    for (const id of ids) {
      // Real wheel scrolling so scroll events fire, landing just inside the section
      const target = await p.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + scrollY + 20 - (document.querySelector('#global-header, #sds-global-header')?.offsetHeight || 0), id);
      await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
      const delta = target - (await p.evaluate(() => scrollY));
      await p.mouse.move(600, 450);
      await p.mouse.wheel(0, delta);
      await p.waitForTimeout(350);
      rows[id] = await p.evaluate(probe);
    }
    behavior[`${variant} ${page} ${theme}`] = rows;
    await ctx.close();
  }
}

// Theme toggle + storage, mobile menu
const interactions = {};
for (const variant of ['before', 'after']) {
  const { ctx, p } = await openPage(variant, 'index.html', 1200, 'light');
  await p.click('#theme-toggle, #sds-theme-toggle');
  await p.waitForTimeout(400);
  const t = await p.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme') || document.documentElement.getAttribute('data-sds-theme'), theme_key: localStorage.getItem('theme'), sds_key: localStorage.getItem('sds-theme'), bodyBg: getComputedStyle(document.body).backgroundColor }));
  await ctx.close();
  const m = await openPage(variant, 'index.html', 400, 'light');
  await m.p.click('#menu-trigger, #sds-menu-trigger');
  await m.p.waitForTimeout(600);
  const menu = await m.p.evaluate(() => ({ open: /menu-open/.test(document.documentElement.className), expanded: document.querySelector('#menu-trigger, #sds-menu-trigger').getAttribute('aria-expanded') }));
  await m.p.screenshot({ path: join(shots, `${variant}__menu-open__400.png`) });
  await m.p.keyboard.press('Escape');
  await m.p.waitForTimeout(300);
  menu.closedByEscape = !/menu-open/.test(await m.p.evaluate(() => document.documentElement.className));
  await m.ctx.close();
  interactions[variant] = { toggle: t, menu };
}

await browser.close();
writeFileSync(join(outDir, 'results.json'), JSON.stringify({ errorLog, heights, diffs, behavior, interactions }, null, 1));
console.log('done');
