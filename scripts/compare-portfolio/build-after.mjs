// Builds a throwaway "after" copy of the portfolio wired to the design system,
// following the HANDOFF Step 5 checklist. Never writes to the portfolio repo.
//   node build-after.mjs <portfolioRoot> <sdsRoot> <outDir>
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const [portfolio, sds, out] = process.argv.slice(2).map((p) => resolve(p));
const PAGES = ['index.html', 'print.html', 'identity.html'];
const PORTFOLIO_CSS = ['hero.css', 'hero-interactive.css', 'hero-waves.css', 'splash.css'];

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'wip-r8k3t5'), { recursive: true });
mkdirSync(join(out, 'styles/04-components'), { recursive: true });
mkdirSync(join(out, 'js'), { recursive: true });

for (const p of PAGES) cpSync(join(portfolio, 'wip-r8k3t5', p), join(out, 'wip-r8k3t5', p));
for (const c of PORTFOLIO_CSS) cpSync(join(portfolio, 'styles/04-components', c), join(out, 'styles/04-components', c));
cpSync(join(portfolio, 'js/hero-interactive.js'), join(out, 'js/hero-interactive.js'));

// 1. Rename (before any symlinks exist, so the walk stays inside out/)
execFileSync('node', [join(sds, 'scripts/rename.mjs'), '--write', '--skip-src', '--dir', out], { stdio: 'inherit' });

// 2. System + portfolio wiring
symlinkSync(join(portfolio, 'assets'), join(out, 'assets'));
symlinkSync(join(sds, 'src'), join(out, 'sds'));
cpSync(join(sds, 'docs/portfolio-migration/portfolio-tokens.css'), join(out, 'styles/portfolio-tokens.css'));
cpSync(join(sds, 'docs/portfolio-migration/portfolio-js-config.js'), join(out, 'js/sds-config.js'));

writeFileSync(join(out, 'styles/portfolio.css'), `/* Portfolio layer, loaded after the design system */
@import "portfolio-tokens.css";
${PORTFOLIO_CSS.map((c) => `@import "04-components/${c}";`).join('\n')}

/* Section modifiers (docs/PHASE-2.md "Portfolio migration: section modifiers") */
#work    { --sds-section-background: var(--sds-color-background-accent-work);
           --sds-section-accent: var(--sds-color-accent-work); }
#about   { --sds-section-background: var(--sds-color-background-accent-about);
           --sds-section-accent: var(--sds-color-accent-about); }
#contact { --sds-section-background: var(--sds-color-background-accent-contact);
           --sds-section-accent: var(--sds-color-accent-contact); }
#related-work { --sds-section-background: var(--sds-color-background-accent-related-work); }
`);

const sectionClasses = {
  work: 'sds-content sds-content--tinted sds-content--accent sds-content--full-bleed',
  about: 'sds-content sds-content--tinted sds-content--accent',
  contact: 'sds-content sds-content--tinted sds-content--accent',
  'related-work': 'sds-content sds-content--tinted sds-content--full-bleed',
};

const report = [];
for (const p of PAGES) {
  const f = join(out, 'wip-r8k3t5', p);
  let html = readFileSync(f, 'utf8');
  const must = (re, to, what) => {
    if (!re.test(html)) { report.push(`${p}: NOT FOUND ${what}`); return; }
    html = html.replace(re, to);
  };

  must(/<link rel="stylesheet" href="\.\.\/styles\/main\.css" \/>/,
    `<link rel="stylesheet" href="../sds/css/index.css" />
    <link rel="stylesheet" href="../sds/css/extras/sds-brackets.css" />
    <link rel="stylesheet" href="../styles/portfolio.css" />`, 'main.css link');

  // Classic SDS script tags -> one module; keep portfolio-only hero script
  const hasHero = /js\/hero-interactive\.js/.test(html);
  html = html.replace(/\s*<script src="\.\.\/js\/[\w-]+\.js" defer><\/script>/g, '');
  must(/<\/head>/, `    <script type="module">
        import { init } from '../sds/js/index.js';
        import { sdsOptions } from '../js/sds-config.js';
        init(sdsOptions);
    </script>${hasHero ? '\n    <script src="../js/hero-interactive.js" defer></script>' : ''}
</head>`, '</head>');

  // Head theme script: new key, legacy fallback
  must(/localStorage\.getItem\('theme'\)/, "(localStorage.getItem('sds-theme') || localStorage.getItem('theme'))", "head script storage key");

  must(/<body class="subpage">|<body>/, p === 'index.html' ? '<body class="sds-scale-display">' : '<body>', 'body tag');

  for (const [id, cls] of Object.entries(sectionClasses)) {
    const re = new RegExp(`<section id="${id}"([^>]*?) class="[^"]*"`);
    if (re.test(html)) html = html.replace(re, `<section id="${id}"$1 class="${cls}"`);
  }
  // The #logos wrapper (logo-grid pages) is full-bleed (PHASE-2 migration notes)
  html = html.replace(/<div id="logos" class="sds-content">/, '<div id="logos" class="sds-content sds-content--full-bleed">');
  writeFileSync(f, html);
}
console.log(report.length ? report.join('\n') : 'all page edits applied');
