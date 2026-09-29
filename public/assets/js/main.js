// Progressive enhancement only: every feature below degrades to plain links
// and fully visible content when JavaScript is unavailable.
// No HTML-string DOM sinks anywhere: the CSP enforces Trusted Types.

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const storage = {
  get(k) {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

/* ---------- theme ---------- */
function initTheme() {
  const btn = $('[data-theme-toggle]');
  if (!btn) return;
  const sync = () => {
    const dark = root.dataset.theme === 'dark';
    btn.setAttribute('aria-label', dark ? btn.dataset.labelLight : btn.dataset.labelDark);
    btn.setAttribute('aria-pressed', String(dark));
  };
  sync();
  btn.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    storage.set('theme', root.dataset.theme);
    sync();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (storage.get('theme')) return;
    root.dataset.theme = e.matches ? 'dark' : 'light';
    sync();
  });
}

/* ---------- header: scrolled state, mobile menu, active section ---------- */
function initHeader() {
  const header = $('[data-header]');
  const panel = $('[data-nav-panel]');
  const toggle = $('[data-menu-toggle]');
  if (!header) return;

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const close = () => {
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle?.addEventListener('click', () => {
    const open = !panel.classList.contains('is-open');
    panel.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) $('.nav-link', panel)?.focus();
  });
  panel?.addEventListener('click', (e) => {
    if (e.target.closest('a')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel?.classList.contains('is-open')) {
      close();
      toggle.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (panel?.classList.contains('is-open') && !e.target.closest('[data-header]')) close();
  });

  const links = new Map($$('[data-nav]').map((a) => [a.dataset.nav, a]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((a) => a.classList.remove('is-active'));
        const a = links.get(entry.target.id);
        if (a) {
          a.classList.add('is-active');
          a.setAttribute('aria-current', 'true');
        }
        links.forEach((l) => l !== a && l.removeAttribute('aria-current'));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  links.forEach((_, id) => {
    const s = document.getElementById(id);
    if (s) io.observe(s);
  });
  const hero = document.getElementById('top');
  if (hero)
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting)
        links.forEach((a) => {
          a.classList.remove('is-active');
          a.removeAttribute('aria-current');
        });
    }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
}

/* ---------- language switch keeps your place ---------- */
function initLangSwitch() {
  const a = $('[data-lang-switch]');
  if (!a) return;
  const map = {
    perfil: 'profile',
    experiencia: 'experience',
    certificaciones: 'certifications',
    habilidades: 'skills',
    contacto: 'contact',
  };
  const inverse = Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
  const lang = root.dataset.lang;
  a.addEventListener('click', () => {
    const current = $('[data-nav][aria-current]')?.dataset.nav;
    if (!current) return;
    const target = lang === 'es' ? map[current] : inverse[current];
    if (target) a.hash = target;
  });
}

/* ---------- reveal on scroll ---------- */
function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  // Stagger siblings inside the same grid for one orchestrated entrance.
  $$('.cert-grid, .skill-grid').forEach((grid) =>
    $$('.reveal', grid).forEach((el, i) => el.style.setProperty('--delay', `${(i % 3) * 90}ms`))
  );
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );
  els.forEach((el) => io.observe(el));
}

/* ---------- timeline: rail fills with scroll, nodes light up ---------- */
function initTimeline() {
  const tl = $('[data-timeline]');
  if (!tl) return;
  const fill = $('[data-rail-fill]', tl);
  const roles = $$('.tl-role', tl);

  let ticking = false;
  const update = () => {
    ticking = false;
    if (reduceMotion.matches) {
      fill.style.setProperty('--progress', '1');
      roles.forEach((r) => r.classList.add('is-lit'));
      return;
    }
    const r = tl.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * 0.62;
    const p = Math.min(1, Math.max(0, (start - r.top) / r.height));
    fill.style.setProperty('--progress', p.toFixed(4));
    const lineY = r.top + p * r.height;
    for (const role of roles) {
      const node = role.getBoundingClientRect().top + 26;
      role.classList.toggle('is-lit', node <= lineY + 1);
    }
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Collapsible achievements: expanded without JS; collapse all but the current role.
  $$('[data-toggle-points]', tl).forEach((btn, i) => {
    const card = btn.closest('.role-card');
    const label = $('span', btn);
    const set = (open) => {
      if (open) card.removeAttribute('data-collapsed');
      else card.setAttribute('data-collapsed', '');
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? btn.dataset.less : btn.dataset.more;
      requestAnimationFrame(onScroll);
    };
    btn.hidden = false;
    set(i === 0);
    btn.addEventListener('click', () => set(card.hasAttribute('data-collapsed')));
  });
}

/* ---------- certification cards: pointer tilt + glare ---------- */
function initTilt() {
  if (!finePointer.matches || reduceMotion.matches) return;
  const MAX = 9; // degrees
  $$('[data-tilt]').forEach((card) => {
    let raf = 0;
    const onMove = (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.setProperty('--ry', `${((x - 0.5) * MAX * 2).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((0.5 - y) * MAX * 2).toFixed(2)}deg`);
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      });
    };
    card.addEventListener('pointerenter', () => card.classList.add('is-tilting', 'is-hovered'));
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      card.classList.remove('is-tilting', 'is-hovered');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

/* ---------- hero portrait: gentle scroll parallax ---------- */
function initParallax() {
  const fig = $('[data-parallax] .portrait-frame');
  if (!fig || reduceMotion.matches) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = Math.min(window.scrollY, 800);
    fig.style.setProperty('--py', `${(y * 0.06).toFixed(1)}px`);
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
}

/* ---------- copy email ---------- */
function initCopy() {
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.classList.add('is-done');
        toast(btn.dataset.copied);
        setTimeout(() => btn.classList.remove('is-done'), 2000);
      } catch {
        window.location.href = `mailto:${btn.dataset.copy}`;
      }
    });
  });
}

/* ---------- document viewer (CV + certificates) ---------- */
function initViewer() {
  const dlg = $('[data-viewer]');
  const dataEl = $('#viewer-docs');
  if (!dlg || !dataEl || typeof dlg.showModal !== 'function') return;

  let docs;
  try {
    docs = JSON.parse(dataEl.textContent);
  } catch {
    return;
  }
  const title = $('#viewer-title', dlg);
  const zoomBtn = $('[data-viewer-zoom]', dlg);
  const img = document.createElement('img');
  img.decoding = 'async';
  zoomBtn.append(img);
  const pager = $('[data-viewer-pager]', dlg);
  const cur = $('[data-viewer-current]', dlg);
  const total = $('[data-viewer-total]', dlg);
  const prev = $('[data-viewer-prev]', dlg);
  const next = $('[data-viewer-next]', dlg);
  const openA = $('[data-viewer-open]', dlg);
  const dlA = $('[data-viewer-download]', dlg);
  const verifyA = $('[data-viewer-verify]', dlg);
  const stage = $('[data-viewer-stage]', dlg);
  let doc = null;
  let page = 0;
  let opener = null;

  const show = (i) => {
    page = Math.max(0, Math.min(doc.pages.length - 1, i));
    zoomBtn.classList.add('is-loading');
    img.onload = () => zoomBtn.classList.remove('is-loading');
    img.src = doc.pages[page];
    img.alt = `${doc.title} — ${page + 1}/${doc.pages.length}`;
    cur.textContent = String(page + 1);
    prev.disabled = page === 0;
    next.disabled = page === doc.pages.length - 1;
    stage.scrollTo({ top: 0, left: 0 });
  };

  const open = (key, trigger) => {
    doc = docs[key];
    if (!doc) return false;
    opener = trigger;
    title.textContent = doc.title;
    openA.href = doc.pdf;
    dlA.href = doc.pdf;
    verifyA.hidden = !doc.verify;
    if (doc.verify) verifyA.href = doc.verify;
    pager.hidden = doc.pages.length < 2;
    total.textContent = String(doc.pages.length);
    zoomBtn.setAttribute('aria-pressed', 'false');
    show(0);
    dlg.showModal();
    document.body.classList.add('has-dialog');
    $('[data-viewer-close]', dlg).focus();
    return true;
  };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-viewer]');
    if (!t) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // let users open the PDF in a new tab
    if (open(t.dataset.openViewer, t)) e.preventDefault();
  });
  $('[data-viewer-close]', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close(); // backdrop click
  });
  dlg.addEventListener('close', () => {
    document.body.classList.remove('has-dialog');
    img.removeAttribute('src');
    opener?.focus();
  });
  prev.addEventListener('click', () => show(page - 1));
  next.addEventListener('click', () => show(page + 1));
  zoomBtn.addEventListener('click', () => {
    const z = zoomBtn.getAttribute('aria-pressed') !== 'true';
    zoomBtn.setAttribute('aria-pressed', String(z));
  });
  dlg.addEventListener('keydown', (e) => {
    if (!doc || doc.pages.length < 2) return;
    if (e.key === 'ArrowRight') show(page + 1);
    if (e.key === 'ArrowLeft') show(page - 1);
  });
}

/* ---------- boot ---------- */
initTheme();
initHeader();
initLangSwitch();
initReveal();
initTimeline();
initTilt();
initParallax();
initCopy();
initViewer();
