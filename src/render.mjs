import { site, t, experience, education, certifications, skills } from './content.mjs';

// ---------- helpers ----------
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
// Minimal, safe inline markdown: escape first, then **bold** → <strong>.
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const loc = (v, lang) => (typeof v === 'object' && v !== null ? v[lang] : v);

const ym = (iso) => iso.split('-').map(Number);
const fmtMonth = (iso, L) => {
  const [y, m] = ym(iso);
  return `${L.months[m - 1]} ${y}`;
};
const fmtDate = (iso, L) => {
  const [y, m, d] = ym(iso);
  return `${d} ${L.months[m - 1]} ${y}`;
};
const duration = (start, end, L) => {
  if (!end) return '';
  const [sy, sm] = ym(start);
  const [ey, em] = ym(end);
  const total = (ey - sy) * 12 + (em - sm) + 1; // inclusive, matches the CV
  const y = Math.floor(total / 12);
  const m = total % 12;
  const parts = [];
  if (y) parts.push(`${y} ${y === 1 ? L.dur.y : L.dur.ys}`);
  if (m) parts.push(`${m} ${m === 1 ? L.dur.m : L.dur.ms}`);
  return parts.join(' ');
};

const icon = (name, cls = 'icon') =>
  `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

const ext = 'target="_blank" rel="noopener noreferrer"';

// Pre-filled email draft (subject + greeting) for the mail client and for Gmail on the web.
const mailto = (L) =>
  `mailto:${site.email}?subject=${encodeURIComponent(L.contact.subject)}&body=${encodeURIComponent(L.contact.mailBody)}`;
const gmail = (L) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(site.email)}&su=${encodeURIComponent(L.contact.subject)}&body=${encodeURIComponent(L.contact.mailBody)}`;

// Decorative neon shapes (pure CSS/SVG, aria-hidden). Positions live in CSS per field.
const NEON = {
  hero: ['ring green', 'dot blue', 'tri pink', 'square yellow', 'plus purple', 'ring orange', 'dot red', 'pill blue'],
  exp: ['ring purple', 'plus green', 'dot orange', 'tri blue'],
  certs: ['square pink', 'ring yellow', 'dot green', 'plus red', 'tri purple'],
  contact: ['ring green', 'tri yellow', 'plus pink', 'dot blue', 'square orange', 'ring purple'],
};
const triangle = '<svg viewBox="0 0 40 36"><path d="M20 3 37 33H3z"/></svg>';
const neon = (set) =>
  `<div class="neon-field neon-${set}" aria-hidden="true">${NEON[set]
    .map((k, i) => {
      const [shape, color] = k.split(' ');
      return `<span class="nf nf-${shape} c-${color}" data-depth="${(i % 4) + 1}">${shape === 'tri' ? triangle : ''}</span>`;
    })
    .join('')}</div>`;

const monthsBetween = (start, end) => {
  const [sy, sm] = ym(start);
  const [ey, em] = ym(end);
  return (ey - sy) * 12 + (em - sm) + 1;
};
const monthSet = (roles) => {
  const set = new Set();
  for (const r of roles) {
    const [sy, sm] = ym(r.start);
    const [ey, em] = ym(r.end || r.start);
    for (let i = sy * 12 + sm; i <= ey * 12 + em; i++) set.add(i);
  }
  return set;
};
// Experience accumulated up to a date (unique months, no double counting).
const cumulativeUntil = (end) => {
  const [ey, em] = ym(end);
  const limit = ey * 12 + em;
  return [...monthSet(experience.flatMap((g) => g.roles))].filter((i) => i <= limit).length;
};
// 56 months → "4.5+", 51 → "4+", 24 → "2"
const halfYears = (months) => {
  const h = Math.floor((months / 12) * 2) / 2;
  const txt = Number.isInteger(h) ? String(h) : h.toFixed(1);
  return h * 12 < months ? `${txt}+` : txt;
};
const fmtMonths = (total, L) => {
  const y = Math.floor(total / 12);
  const m = total % 12;
  const parts = [];
  if (y) parts.push(`${y} ${y === 1 ? L.dur.y : L.dur.ys}`);
  if (m) parts.push(`${m} ${m === 1 ? L.dur.m : L.dur.ms}`);
  return parts.join(' ');
};

// ---------- icon sprite (authored, single 1.75 stroke) ----------
const sprite = `
<svg xmlns="http://www.w3.org/2000/svg" class="sprite" aria-hidden="true">
  <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></symbol>
  <symbol id="i-linkedin" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3.5"/><path d="M8 10.5V16M8 7.6v.1M11.5 16v-5.5M11.5 13c0-1.6 1-2.7 2.4-2.7 1.4 0 2.1 1 2.1 2.6V16"/></symbol>
  <symbol id="i-file" viewBox="0 0 24 24"><path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></symbol>
  <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/></symbol>
  <symbol id="i-external" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></symbol>
  <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5v-2A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5"/></symbol>
  <symbol id="i-chev-left" viewBox="0 0 24 24"><path d="m14.5 6-6 6 6 6"/></symbol>
  <symbol id="i-chev-right" viewBox="0 0 24 24"><path d="m9.5 6 6 6-6 6"/></symbol>
  <symbol id="i-chev-down" viewBox="0 0 24 24"><path d="m6 9.5 6 6 6-6"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></symbol>
  <symbol id="i-zoom" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5M10.5 8v5M8 10.5h5"/></symbol>
  <symbol id="i-cloud" viewBox="0 0 24 24"><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.2 4.7 4.7 0 0 0 7 18.5z"/></symbol>
  <symbol id="i-briefcase" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18M10.5 12.5v1.5h3v-1.5"/></symbol>
  <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></symbol>
  <symbol id="i-home" viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5z"/></symbol>
  <symbol id="i-route" viewBox="0 0 24 24"><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H16a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h7.5"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 5 6v5.5c0 4.3 3 8 7 9.5 4-1.5 7-5.2 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/></symbol>
</svg>`;

// ---------- sections ----------
function head(lang, L) {
  const other = lang === 'es' ? 'en' : 'es';
  const url = site.url + L.path;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    url: site.url,
    image: `${site.url}/assets/img/og-image.jpg?v=__BUILD__`,
    jobTitle: 'Cloud Solutions Architect',
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Instituto Politécnico Nacional (UPIICSA)' },
    address: { '@type': 'PostalAddress', addressLocality: 'Ciudad de México', addressCountry: 'MX' },
    sameAs: [site.linkedin],
    knowsAbout: ['Google Cloud', 'AWS', 'Microsoft Azure', 'Data warehousing', 'Data governance', 'AI agents (ADK, A2A)', 'Technical presales', 'FinOps'],
    hasCredential: certifications.map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      name: `Google Cloud Certified ${c.name}`,
      url: c.credly,
      recognizedBy: { '@type': 'Organization', name: 'Google Cloud' },
    })),
  };
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(L.title)}</title>
<meta name="description" content="${esc(L.description)}">
<meta name="author" content="${esc(site.name)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f6f7f9" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1420" media="(prefers-color-scheme: dark)">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="${lang}" href="${url}">
<link rel="alternate" hreflang="${other}" href="${site.url}${t[other].path}">
<link rel="alternate" hreflang="x-default" href="${site.url}/">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(L.title)}">
<meta property="og:description" content="${esc(L.description)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${L.ogLocale}">
<meta property="og:image" content="${site.url}/assets/img/og-image.jpg?v=__BUILD__">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(site.name)} — Cloud Solutions Architect · Google Cloud">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/geist-variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" as="image" href="/assets/img/photo/portrait-800.avif?v=__BUILD__" type="image/avif" imagesrcset="/assets/img/photo/portrait-480.avif?v=__BUILD__ 480w, /assets/img/photo/portrait-800.avif?v=__BUILD__ 800w, /assets/img/photo/portrait-1200.avif?v=__BUILD__ 1200w" imagesizes="(min-width: 960px) 40vw, 90vw">
<link rel="stylesheet" href="/assets/css/main.css?v=__BUILD__">
<script src="/assets/js/theme-init.js?v=__BUILD__"></script>
<script type="module" src="/assets/js/main.js?v=__BUILD__"></script>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>`;
}

function header(lang, L) {
  const other = lang === 'es' ? 'en' : 'es';
  const ids = anchors(lang);
  const links = [
    ['about', ids.about],
    ['experience', ids.experience],
    ['certs', ids.certs],
    ['skills', ids.skills],
    ['contact', ids.contact],
  ]
    .map(([k, id]) => `<li><a class="nav-link" href="#${id}" data-nav="${id}">${esc(L.nav[k])}</a></li>`)
    .join('');
  return `<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="brand" href="#top" aria-label="${esc(site.name)}">
      <span class="brand-mark" aria-hidden="true">AG</span>
      <span class="brand-name">Adrián García</span>
    </a>
    <nav class="site-nav" id="nav-panel" aria-label="${lang === 'es' ? 'Principal' : 'Main'}" data-nav-panel>
      <ul class="nav-list">${links}</ul>
    </nav>
    <div class="header-actions">
      <a class="lang-switch" href="${t[other].path}" hreflang="${other}" lang="${t[other].htmlLang}" aria-label="${esc(L.langSwitch.aria)}" data-lang-switch>${esc(L.langSwitch.short)}</a>
      <button class="icon-btn theme-toggle" type="button" data-theme-toggle data-label-light="${esc(L.theme.toLight)}" data-label-dark="${esc(L.theme.toDark)}" aria-label="${esc(L.theme.toDark)}">
        ${icon('moon', 'icon icon-moon')}${icon('sun', 'icon icon-sun')}
      </button>
      <button class="icon-btn menu-toggle" type="button" aria-expanded="false" aria-controls="nav-panel" data-menu-toggle aria-label="${esc(L.menu)}">${icon('menu')}</button>
    </div>
  </div>
</header>`;
}

const anchors = (lang) =>
  lang === 'es'
    ? { about: 'perfil', experience: 'experiencia', certs: 'certificaciones', skills: 'habilidades', contact: 'contacto' }
    : { about: 'profile', experience: 'experience', certs: 'certifications', skills: 'skills', contact: 'contact' };

function hero(lang, L) {
  const H = L.hero;
  const ids = anchors(lang);
  const badges = certifications
    .map((c) => `<img src="/assets/img/badges/${c.slug}.webp" alt="" width="44" height="44" decoding="async">`)
    .join('');
  return `<section class="hero" id="top" aria-labelledby="hero-name" data-neon>
  ${neon('hero')}
  <div class="container hero-grid">
    <div class="hero-copy">
      <h1 class="hero-name" id="hero-name"><span class="line">Adrián</span> <span class="line">García Juárez</span></h1>
      <p class="hero-role"><span>${esc(H.role)}</span><span class="status-pill"><span class="status-dot" aria-hidden="true"></span>${esc(H.status)}</span></p>
      <p class="hero-tagline">${esc(H.tagline)}</p>
      <p class="hero-lede">${esc(H.lede)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="${esc(gmail(L))}" ${ext}>${icon('mail')}<span>${esc(L.contact.gmail)}</span><span class="visually-hidden"> ${esc(L.certs.newTab)}</span></a>
        <a class="btn btn-secondary" href="${site.linkedin}" ${ext}>${icon('linkedin')}<span>${esc(H.ctaLinkedin)}</span><span class="visually-hidden"> ${esc(L.certs.newTab)}</span></a>
      </div>
      <a class="hero-proof" href="#${ids.certs}">
        <span class="proof-badges" aria-hidden="true">${badges}</span>
        <span class="proof-text"><strong>${esc(H.proof)}</strong><span>${esc(H.proofDetail)}</span></span>
        ${icon('arrow', 'icon proof-arrow')}
      </a>
    </div>
    <figure class="hero-portrait" data-parallax>
      <div class="portrait-frame">
        <picture>
          <source type="image/avif" srcset="/assets/img/photo/portrait-480.avif?v=__BUILD__ 480w, /assets/img/photo/portrait-800.avif?v=__BUILD__ 800w, /assets/img/photo/portrait-1200.avif?v=__BUILD__ 1200w" sizes="(min-width: 960px) 40vw, 90vw">
          <source type="image/webp" srcset="/assets/img/photo/portrait-480.webp?v=__BUILD__ 480w, /assets/img/photo/portrait-800.webp?v=__BUILD__ 800w, /assets/img/photo/portrait-1200.webp?v=__BUILD__ 1200w" sizes="(min-width: 960px) 40vw, 90vw">
          <img src="/assets/img/photo/portrait-800.jpg?v=__BUILD__" width="800" height="1000" alt="${esc(H.photoAlt)}" fetchpriority="high" decoding="async">
        </picture>
      </div>
      <figcaption class="portrait-chip chip-location">${icon('pin')}<span>${esc(H.location)}</span></figcaption>
      <div class="portrait-chip chip-company" aria-hidden="true">${icon('cloud')}<span>Cloud Solutions Architect</span></div>
    </figure>
  </div>
</section>`;
}

function about(lang, L) {
  const A = L.about;
  const ids = anchors(lang);
  return `<section class="section about" id="${ids.about}" aria-labelledby="about-title">
  <div class="container about-grid">
    <div class="about-copy reveal">
      <h2 class="section-title" id="about-title">${esc(A.title)}</h2>
      ${A.body.map((p) => `<p>${esc(p)}</p>`).join('\n      ')}
      <dl class="facts">
        ${A.facts.map((f) => `<div class="fact"><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('')}
      </dl>
    </div>
    <figure class="about-scene reveal">
      <picture>
        <source type="image/webp" srcset="/assets/img/photo/scene-960.webp?v=__BUILD__ 960w, /assets/img/photo/scene-1500.webp?v=__BUILD__ 1500w" sizes="(min-width: 960px) 36vw, 90vw">
        <img src="/assets/img/photo/scene-960.jpg?v=__BUILD__" width="960" height="1280" alt="${esc(A.sceneAlt)}" loading="lazy" decoding="async">
      </picture>
    </figure>
  </div>
  <div class="container">
    <ul class="pillars" role="list">
      ${A.pillars
        .map(
          (p) => `<li class="pillar reveal c-${p.color}">
        <span class="pillar-icon">${icon(p.icon)}</span>
        <h3 class="pillar-title">${esc(p.title)}</h3>
        <p class="pillar-body">${esc(p.body)}</p>
        <ul class="pillar-chips" role="list">${p.chips.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      </li>`
        )
        .join('')}
    </ul>
  </div>
</section>`;
}

// Company logo with an optional dark-theme variant (two <img>, CSS picks one
// from [data-theme]; the hidden one is display:none so it is never fetched eagerly).
const logoImg = (logo, alt, hasDark, invert) => {
  const base = `tl-logo tl-logo-${logo}`;
  const light = `<img class="${base}${invert ? ' logo-ink' : ''}${hasDark ? ' logo-light' : ''}" src="/assets/img/logos/${logo}-logo.webp" alt="${esc(alt)}" decoding="async" loading="lazy">`;
  if (!hasDark) return light;
  return `${light}<img class="${base} logo-dark" src="/assets/img/logos/${logo}-logo-dark.webp" alt="${esc(alt)}" decoding="async" loading="lazy">`;
};

function careerSummary(lang, L) {
  const E = L.exp;
  const all = experience.flatMap((g) => g.roles);
  const start = all.map((r) => r.start).sort()[0];
  const end = all.map((r) => r.end).filter(Boolean).sort().at(-1);
  const byCompany = new Map();
  for (const g of experience) {
    const prev = byCompany.get(g.company);
    byCompany.set(g.company, { color: g.color, roles: [...(prev ? prev.roles : []), ...g.roles] });
  }
  for (const v of byCompany.values()) v.months = monthSet(v.roles).size;
  const legend = [...byCompany]
    .map(([name, v]) => `<li class="c-${v.color}"><span class="legend-swatch"></span><strong>${esc(name)}</strong> ${esc(fmtMonths(v.months, L))}</li>`)
    .join('');
  return `<div class="career-summary reveal">
      <p class="career-total"><strong>${esc(halfYears(cumulativeUntil(end)))}</strong><span>${esc(E.total)}</span></p>
      <p class="career-range"><time datetime="${start}">${fmtMonth(start, L)}</time> – <time datetime="${end}">${fmtMonth(end, L)}</time></p>
      <ul class="career-legend">${legend}<li class="c-${education.color}"><span class="legend-swatch"></span><strong>IPN</strong> ${education.start} – ${education.year}</li></ul>
    </div>`;
}

// Segments / industries / countries / scope of a role, when the content defines them.
const roleScope = (r, E, lang) => {
  if (!r.scope) return '';
  const rows = ['segments', 'industries', 'countries', 'stack']
    .filter((k) => r.scope[k])
    .map((k) => `<div><dt>${esc(E.scope[k])}</dt><dd>${esc(r.scope[k][lang])}</dd></div>`)
    .join('');
  return `<dl class="role-scope">${rows}</dl>`;
};

function timeline(lang, L) {
  const E = L.exp;
  const ids = anchors(lang);
  const groups = experience
    .map((g, gi) => {
      const first = g.roles[g.roles.length - 1].start;
      const last = g.roles[0].end;
      const y1 = first.slice(0, 4);
      const y2 = last ? last.slice(0, 4) : E.present;
      const range = y1 === y2 ? y1 : `${y1} – ${y2}`;
      const roles = g.roles
        .map((r) => {
          const dur = duration(r.start, r.end, L);
          const end = r.end ? `<time datetime="${r.end}">${fmtMonth(r.end, L)}</time>` : `<span class="is-present">${esc(E.present)}</span>`;
          return `<li class="tl-role reveal" data-role="${r.id}">
            <span class="tl-node" aria-hidden="true"></span>
            <article class="role-card${r.end ? '' : ' is-current'}">
              <header class="role-head">
                <h3 class="role-title">${esc(r.title[lang])}</h3>
                <p class="role-meta"><span class="role-company">${esc(g.company)}</span> · <time datetime="${r.start}">${fmtMonth(r.start, L)}</time> – ${end}${dur ? ` <span class="role-dur">· ${esc(dur)}</span>` : ''}</p>
              </header>
              <p class="role-summary">${esc(r.summary[lang])}</p>
              ${roleScope(r, E, lang)}
              <ul class="role-tags" aria-label="${lang === 'es' ? 'Temas' : 'Topics'}">${r.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
              <div class="role-points" id="pts-${r.id}" data-points>
                <ul>${r.points[lang].map((p) => `<li>${md(p)}</li>`).join('')}</ul>
              </div>
              <button class="role-toggle" type="button" aria-expanded="true" aria-controls="pts-${r.id}" data-toggle-points data-more="${esc(E.more)}" data-less="${esc(E.less)}" hidden>
                <span>${esc(E.less)}</span>${icon('chev-down')}
              </button>
            </article>
          </li>`;
        })
        .join('');
      const tenure = fmtMonths(monthSet(g.roles).size, L);
      const acc = halfYears(cumulativeUntil(last || first));
      return `<li class="tl-group c-${g.color}" data-group="${gi}">
        <div class="tl-ruler" aria-hidden="true">
          <span class="ruler-year">${esc(acc)} <small>${esc(E.yearsWord)}</small></span>
          <span class="ruler-tenure">${esc(tenure)}</span>
        </div>
        <div class="tl-company">
          ${logoImg(g.logo, g.company, g.logoDark, g.invertOnDark)}
          <span class="tl-range">${esc(range)}</span>
        </div>
        <ol class="tl-roles">${roles}</ol>
      </li>`;
    })
    .join('');
  const edu = `<li class="tl-group tl-edu c-${education.color}" data-group="edu">
        <div class="tl-ruler" aria-hidden="true">
          <span class="ruler-year">${esc(education.start)}</span>
          <span class="ruler-tenure">${esc(E.start)}</span>
        </div>
        <div class="tl-company">
          ${logoImg(education.logo, 'Instituto Politécnico Nacional', education.logoDark, false)}
          <span class="tl-range">${esc(education.start)} – ${esc(education.year)}</span>
        </div>
        <ol class="tl-roles">
          <li class="tl-role reveal">
            <span class="tl-node tl-node-edu" aria-hidden="true"></span>
            <article class="role-card role-card-edu">
              <header class="role-head">
                <h3 class="role-title">${esc(education.degree[lang])}</h3>
                <p class="role-meta">${esc(education.school)} · <time datetime="${education.start}">${education.start}</time> – <time datetime="${education.year}">${education.year}</time> <span class="role-dur">· ${esc(E.education)}</span></p>
              </header>
            </article>
          </li>
        </ol>
      </li>`;
  return `<section class="section experience" id="${ids.experience}" aria-labelledby="exp-title" data-neon>
  ${neon('exp')}
  <div class="container">
    <div class="section-head reveal">
      <h2 class="section-title" id="exp-title">${esc(E.title)}</h2>
      <p class="section-intro">${esc(E.intro)}</p>
    </div>
    ${careerSummary(lang, L)}
    <div class="timeline" data-timeline>
      <div class="tl-rail" aria-hidden="true"><span class="tl-rail-fill" data-rail-fill></span></div>
      <ol class="tl-groups">${groups}${edu}</ol>
    </div>
  </div>
</section>`;
}

function certs(lang, L) {
  const C = L.certs;
  const ids = anchors(lang);
  const cards = certifications
    .map(
      (c, i) => `<li class="cert-card reveal level-${c.level}" data-tilt data-index="${i}">
        <div class="cert-glare" aria-hidden="true"></div>
        <div class="cert-badge"><img src="/assets/img/badges/${c.slug}.webp" alt="" width="218" height="218" loading="lazy" decoding="async"></div>
        <p class="cert-level">${esc(C.levels[c.level])}</p>
        <h3 class="cert-name"><a class="cert-link" href="${c.credly}" ${ext}>${esc(c.name)}<span class="visually-hidden"> — ${esc(C.verify)} ${esc(C.newTab)}</span></a></h3>
        <p class="cert-desc">${esc(c.desc[lang])}</p>
        <dl class="cert-dates">
          <div><dt>${esc(C.issued)}</dt><dd><time datetime="${c.issued}">${fmtDate(c.issued, L)}</time></dd></div>
          <div><dt>${esc(C.expires)}</dt><dd><time datetime="${c.expires}">${fmtDate(c.expires, L)}</time></dd></div>
        </dl>
        <div class="cert-actions">
          <span class="cert-verify" aria-hidden="true">${icon('shield')}${esc(C.verify)}${icon('external', 'icon icon-sm')}</span>
          <a class="cert-view" href="/docs/certs/${c.slug}.pdf" data-open-viewer="${c.slug}">${icon('file', 'icon icon-sm')}<span>${esc(C.view)}</span></a>
        </div>
      </li>`
    )
    .join('');
  return `<section class="section certs" id="${ids.certs}" aria-labelledby="certs-title" data-neon>
  ${neon('certs')}
  <div class="container">
    <div class="section-head reveal">
      <h2 class="section-title" id="certs-title">${esc(C.title)}</h2>
      <p class="section-intro">${esc(C.intro)}</p>
    </div>
    <ul class="cert-grid" role="list">${cards}</ul>
  </div>
</section>`;
}

function skillsSection(lang, L) {
  const ids = anchors(lang);
  return `<section class="section skills" id="${ids.skills}" aria-labelledby="skills-title">
  <div class="container">
    <div class="section-head reveal"><h2 class="section-title" id="skills-title">${esc(L.skills.title)}</h2></div>
    <div class="skill-grid">
      ${skills
        .map(
          (g) => `<div class="skill-group reveal">
        <h3 class="skill-title">${esc(g.title[lang])}</h3>
        <ul class="chips">${g.items.map((it) => `<li>${esc(loc(it, lang))}</li>`).join('')}</ul>
      </div>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

function contact(lang, L) {
  const C = L.contact;
  const ids = anchors(lang);
  return `<section class="section contact" id="${ids.contact}" aria-labelledby="contact-title">
  <div class="container contact-inner reveal" data-neon>
    ${neon('contact')}
    <h2 class="contact-title" id="contact-title">${esc(C.title)}</h2>
    <p class="contact-body">${esc(C.body)}</p>
    <div class="contact-email">
      <a class="email-link" href="${esc(mailto(L))}" data-mailto>${esc(site.email)}</a>
      <button class="icon-btn copy-btn" type="button" data-copy="${site.email}" data-copied="${esc(C.copied)}" aria-label="${esc(C.copy)}">${icon('copy', 'icon icon-copy')}${icon('check', 'icon icon-check')}</button>
    </div>
    <div class="contact-actions">
      <a class="btn btn-primary btn-on-dark" href="${esc(mailto(L))}" data-mailto>${icon('mail')}<span>${esc(C.email)}</span></a>
      <a class="btn btn-secondary btn-on-dark" href="${esc(gmail(L))}" ${ext}>${icon('external')}<span>${esc(C.gmail)}</span><span class="visually-hidden"> ${esc(L.certs.newTab)}</span></a>
      <a class="btn btn-secondary btn-on-dark" href="${site.linkedin}" ${ext}>${icon('linkedin')}<span>${esc(C.linkedin)}</span><span class="visually-hidden"> ${esc(L.certs.newTab)}</span></a>
    </div>
  </div>
</section>`;
}

function footer(lang, L) {
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <p>© ${year} ${esc(L.footer.rights)}</p>
    <p class="footer-built">${esc(L.footer.built)}</p>
    <a class="footer-top" href="#top">${esc(L.footer.top)}</a>
  </div>
</footer>`;
}

function viewer(lang, L) {
  const V = L.viewer;
  const docs = {};
  for (const c of certifications) {
    docs[c.slug] = {
      title: `Google Cloud Certified — ${c.name}`,
      pdf: `/docs/certs/${c.slug}.pdf`,
      pages: [`/assets/img/docs/${c.slug}.webp`],
      ratio: '1584 / 1224',
      verify: c.credly,
    };
  }
  return `<dialog class="viewer" id="viewer" aria-labelledby="viewer-title" data-viewer>
  <div class="viewer-bar">
    <h2 class="viewer-title" id="viewer-title"></h2>
    <div class="viewer-tools">
      <a class="icon-btn" data-viewer-verify href="#" ${ext} aria-label="${esc(L.certs.verify)} ${esc(L.certs.newTab)}" hidden>${icon('shield')}</a>
      <a class="icon-btn" data-viewer-open href="#" ${ext} aria-label="${esc(V.open)} ${esc(L.certs.newTab)}">${icon('external')}</a>
      <a class="icon-btn" data-viewer-download href="#" download aria-label="${esc(V.download)}">${icon('download')}</a>
      <button class="icon-btn" type="button" data-viewer-close aria-label="${esc(V.close)}">${icon('close')}</button>
    </div>
  </div>
  <div class="viewer-stage" data-viewer-stage>
    <button class="viewer-page-img" type="button" data-viewer-zoom aria-label="${esc(V.zoom)}" aria-pressed="false"></button>
  </div>
  <div class="viewer-pager" data-viewer-pager hidden>
    <button class="icon-btn" type="button" data-viewer-prev aria-label="${esc(V.prev)}">${icon('chev-left')}</button>
    <span class="viewer-count" aria-live="polite"><span>${esc(V.page)}</span> <span data-viewer-current>1</span> ${esc(V.of)} <span data-viewer-total>1</span></span>
    <button class="icon-btn" type="button" data-viewer-next aria-label="${esc(V.next)}">${icon('chev-right')}</button>
  </div>
</dialog>
<script type="application/json" id="viewer-docs">${JSON.stringify(docs).replace(/</g, '\\u003c')}</script>`;
}

export function renderPage(lang) {
  const L = t[lang];
  return `<!doctype html>
<html lang="${L.htmlLang}" data-lang="${lang}">
${head(lang, L)}
<body>
${sprite}
<a class="skip-link" href="#main">${esc(L.skip)}</a>
${header(lang, L)}
<main id="main" tabindex="-1">
${hero(lang, L)}
${about(lang, L)}
${timeline(lang, L)}
${certs(lang, L)}
${skillsSection(lang, L)}
${contact(lang, L)}
</main>
${footer(lang, L)}
${viewer(lang, L)}
<div class="toast" role="status" aria-live="polite" data-toast></div>
</body>
</html>
`;
}

export function render404(lang) {
  const L = t[lang];
  const N = L.notFound;
  const ids = anchors(lang);
  const other = lang === 'es' ? 'en' : 'es';
  const links = [
    { href: `${L.path}#${ids.experience}`, icon: 'route', label: N.links.experience },
    { href: `${L.path}#${ids.certs}`, icon: 'shield', label: N.links.certs },
    { href: mailto(L), icon: 'mail', label: N.links.contact, mail: true },
  ];
  return `<!doctype html>
<html lang="${L.htmlLang}" data-lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(N.title)} — ${esc(site.name)}</title>
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/geist-variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/main.css?v=__BUILD__">
<script src="/assets/js/theme-init.js?v=__BUILD__"></script>
<script type="module" src="/assets/js/main.js?v=__BUILD__"></script>
</head>
<body class="page-404">
${sprite}
<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="brand" href="${L.path}" aria-label="${esc(site.name)} — ${esc(N.back)}">
      <span class="brand-mark" aria-hidden="true">AG</span>
      <span class="brand-name">Adrián García</span>
    </a>
    <div class="header-actions">
      <a class="lang-switch" href="${t[other].path}" hreflang="${other}" lang="${t[other].htmlLang}" aria-label="${esc(L.langSwitch.aria)}">${esc(L.langSwitch.short)}</a>
      <button class="icon-btn theme-toggle" type="button" data-theme-toggle data-label-light="${esc(L.theme.toLight)}" data-label-dark="${esc(L.theme.toDark)}" aria-label="${esc(L.theme.toDark)}">
        ${icon('moon', 'icon icon-moon')}${icon('sun', 'icon icon-sun')}
      </button>
    </div>
  </div>
</header>
<main id="main" class="not-found" data-neon>
  ${neon('hero')}
  <div class="container e404-inner">
    <p class="nf-code" aria-hidden="true"><span class="c-green">4</span><span class="e404-zero c-pink">0</span><span class="c-blue">4</span></p>
    <h1>${esc(N.title)}</h1>
    <p class="e404-body">${esc(N.body)}</p>
    <ul class="e404-links" role="list">
      ${links
        .map(
          (l) => `<li><a class="e404-link" href="${esc(l.href)}"${l.mail ? ' data-mailto' : ''}>${icon(l.icon)}<span>${esc(l.label)}</span>${icon('arrow', 'icon e404-arrow')}</a></li>`
        )
        .join('')}
    </ul>
    <a class="btn btn-primary" href="${L.path}">${icon('home')}<span>${esc(N.back)}</span></a>
  </div>
</main>
</body>
</html>
`;
}
