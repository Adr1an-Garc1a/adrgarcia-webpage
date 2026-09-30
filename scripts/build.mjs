#!/usr/bin/env node
// Zero-dependency static build: public/ + rendered pages -> dist/
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage, render404 } from '../src/render.mjs';
import { site } from '../src/content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const dist = join(root, 'dist');

rmSync(dist, { recursive: true, force: true });
cpSync(pub, dist, { recursive: true });

// Cache-busting token: hash of every asset (CSS, JS and images), so replacing a
// photo under the same file name still reaches browsers that cached the old one.
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const h = createHash('sha256');
for (const f of walk(join(pub, 'assets')).sort()) h.update(readFileSync(f));
const build = h.digest('hex').slice(0, 10);

const write = (rel, html) => {
  const out = join(dist, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html.replaceAll('__BUILD__', build));
};

write('index.html', renderPage('es'));
write('en/index.html', renderPage('en'));
write('404.html', render404('es'));
write('en/404.html', render404('en'));

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${['/', '/en/']
  .map(
    (p) => `  <url>
    <loc>${site.url}${p}</loc>
    <lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="es" href="${site.url}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${site.url}/en/"/>
  </url>`
  )
  .join('\n')}
</urlset>
`
);

console.log(`Built dist/ (build ${build})`);
