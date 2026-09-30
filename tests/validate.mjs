#!/usr/bin/env node
// Quality + security gate for dist/. Zero dependencies; runs inside the
// Docker build so a failing check blocks the Cloud Build pipeline.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const failures = [];
const fail = (msg) => failures.push(msg);
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

if (!existsSync(dist)) {
  console.error('dist/ missing — run the build first');
  process.exit(1);
}
const files = walk(dist);
const pages = files.filter((f) => f.endsWith('.html'));

// 1) Private data must never ship (the phone number is redacted everywhere).
const FORBIDDEN = [/5585428956/, /55\s?8542\s?8956/, /\+52\s?55\s?8542/];
for (const f of files) {
  if (!/\.(html|js|css|json|txt|xml|webmanifest|svg|pdf)$/.test(f)) continue;
  const buf = readFileSync(f);
  const text = f.endsWith('.pdf') ? buf.toString('latin1') : buf.toString('utf8');
  for (const re of FORBIDDEN) if (re.test(text)) fail(`${f}: contains a private phone number`);
}

for (const file of pages) {
  const rel = file.slice(dist.length);
  const html = readFileSync(file, 'utf8');

  // 2) CSP compatibility: no inline JS, no inline styles, no inline handlers.
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    const body = m[2].trim();
    const isData = /type="application\/(ld\+)?json"/.test(attrs);
    if (body && !isData) fail(`${rel}: inline <script> found`);
    if (!body && !/\bsrc="\/[^"]+"/.test(attrs)) fail(`${rel}: script without same-origin src`);
    if (isData) {
      try {
        JSON.parse(body);
      } catch {
        fail(`${rel}: invalid JSON data block`);
      }
    }
  }
  if (/\sstyle="/.test(html)) fail(`${rel}: inline style attribute`);
  if (/<style[\s>]/.test(html)) fail(`${rel}: inline <style> block`);
  if (/\son[a-z]+="/i.test(html)) fail(`${rel}: inline event handler`);
  if (/https?:\/\/(?!adrgarcia\.com|www\.credly\.com|www\.linkedin\.com|mail\.google\.com\/mail\/\?view=cm|schema\.org|www\.w3\.org|www\.sitemaps\.org)/.test(
    html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
  ))
    fail(`${rel}: unexpected third-party URL`);

  // 3) Accessibility basics.
  if (!/<html lang="[a-z]{2}/.test(html)) fail(`${rel}: <html> missing lang`);
  if (!/<title>[^<]{10,}<\/title>/.test(html)) fail(`${rel}: missing <title>`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) fail(`${rel}: <img> without alt: ${m[0].slice(0, 80)}`);
  const h1 = (html.match(/<h1\b/g) || []).length;
  if (h1 !== 1) fail(`${rel}: expected exactly one <h1>, found ${h1}`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) fail(`${rel}: duplicate ids ${[...new Set(dup)].join(', ')}`);
  for (const m of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g))
    for (const id of m[1].split(/\s+/)) if (!ids.includes(id)) fail(`${rel}: aria reference to missing #${id}`);

  // 4) Reverse-tabnabbing: every new-tab link needs noopener noreferrer.
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g))
    if (!/rel="[^"]*noopener[^"]*noreferrer|rel="[^"]*noreferrer[^"]*noopener/.test(m[0])) fail(`${rel}: target=_blank without rel=noopener noreferrer`);

  // 5) Every local asset reference resolves.
  for (const m of html.matchAll(/\s(?:src|href|srcset|imagesrcset)="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (!url.startsWith('/') || url.startsWith('//')) continue;
      const clean = url.split(/[?#]/)[0];
      const target = clean.endsWith('/') ? join(dist, clean, 'index.html') : join(dist, clean);
      if (!existsSync(target)) fail(`${rel}: broken reference ${url}`);
    }
  }
  // In-page anchors exist.
  for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!ids.includes(m[1])) fail(`${rel}: anchor #${m[1]} has no target`);
}

// 6) JS must not use DOM XSS sinks (Trusted Types is enforced by the CSP).
for (const f of files.filter((f) => extname(f) === '.js')) {
  const js = readFileSync(f, 'utf8');
  for (const sink of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function'])
    if (js.includes(sink)) fail(`${f.slice(dist.length)}: uses ${sink}`);
}

// 7) Both languages expose the same number of certifications and roles.
const count = (p, re) => (readFileSync(join(dist, p), 'utf8').match(re) || []).length;
for (const [label, re] of [
  ['cert cards', /class="cert-card /g],
  ['roles', /class="tl-role /g],
]) {
  const es = count('index.html', re);
  const en = count('en/index.html', re);
  if (es !== en) fail(`language parity: ${label} es=${es} en=${en}`);
}
if (count('index.html', /class="cert-card /g) !== 6) fail('expected 6 certification cards');

// 8) Contact is email + LinkedIn only: the CV is not published anywhere.
for (const f of files) if (/cv/i.test(f.slice(dist.length)) && /\.(pdf|webp|png|jpe?g)$/.test(f)) fail(`${f.slice(dist.length)}: CV file must not be published`);
for (const p of ['index.html', 'en/index.html']) {
  const html = readFileSync(join(dist, p), 'utf8');
  if (/\.pdf"[^>]*\sdownload\b|href="[^"]*cv[^"]*\.pdf"/i.test(html)) fail(`${p}: CV download link found`);
  // Every "email me" link opens a draft addressed to the right inbox.
  const mails = [...html.matchAll(/href="(mailto:[^"]+)"/g)].map((m) => m[1].replaceAll('&amp;', '&'));
  if (mails.length < 2) fail(`${p}: expected mailto links in the contact section`);
  if (!/class="hero-actions">[\s\S]*?mail\.google\.com\/mail\/\?view=cm/.test(html)) fail(`${p}: hero is missing the Gmail compose button`);
  for (const m of mails) {
    const u = new URL(m);
    if (u.pathname !== 'gadrianjua@gmail.com' || !u.searchParams.get('subject')) fail(`${p}: bad mailto ${m}`);
  }
}

if (failures.length) {
  console.error(`✖ ${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✔ dist/ passed ${pages.length} page checks and security gates`);
