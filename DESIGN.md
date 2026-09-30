# Design system — adrgarcia.com

Canon professional portfolio ("Estándar profesional", chosen by the user): calm, verifiable and fast. The source of truth is `public/assets/css/main.css` (`:root` tokens). This file documents them for future changes.

## Principles

1. **Proof before claims.** Every credential links to Credly (new tab) and to its PDF (in-page viewer).
2. **One accent.** Cobalt is the only brand color. Badge-gold appears only on *Professional* level chips.
3. **Mono only for data.** Geist Mono is reserved for dates, durations and IDs. Labels use Geist.
4. **Content visible without JS.** Motion and collapsing are enhancements. With JavaScript off, everything is expanded and visible.
5. **No eyebrows or kickers.** No gradient text, no side stripes, no glyph icons. Icons come from one authored 1.75-stroke SVG sprite.

## Tokens

### Color (OKLCH; light / dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | 0.984 0.003 250 | 0.17 0.02 264 | Page ground (cool paper / deep ink) |
| `--bg-sunk` | 0.962 0.006 255 | 0.145 0.02 264 | Alternate sections, tags |
| `--surface` | 1 0 0 | 0.21 0.024 264 | Cards, buttons |
| `--ink` / `--ink-2` / `--ink-3` | 0.20 / 0.43 / 0.55 | 0.955 / 0.78 / 0.66 | Text hierarchy (all ≥ 4.5:1 on `--bg`) |
| `--line` / `--line-strong` | 0.90 / 0.82 | 0.30 / 0.38 | Borders |
| `--accent` | 0.50 0.19 263 | 0.74 0.13 262 | Primary action, active states, timeline |
| `--accent-soft` | 0.95 0.028 263 | 0.28 0.06 263 | Hero field, "Actualidad" pill, node halo |
| `--gold-soft` / `--gold-ink` | 0.96 / 0.45 | 0.30 / 0.86 | *Professional* level chip only |
| `--panel` / `--panel-ink` | 0.24 0.06 264 / 0.97 | 0.26 0.07 264 | Closing contact panel |

Theme: follows `prefers-color-scheme`, can be toggled, and is remembered in `localStorage` (`theme`). It is applied before first paint by `theme-init.js`.

### Type

- Faces: **Geist** (variable 100–900) and **Geist Mono**, both self-hosted woff2 (OFL). No third-party font CDN.
- Scale: `--fs-xs` 13 · `--fs-sm` 15 · `--fs-base` 17 · `--fs-md` 20 · `--fs-lg` fluid 21.6–27 · `--fs-xl` fluid 32–50 · `--fs-display` fluid 48–96 px.
- Headings: weight 650, tracking −0.025 to −0.04 em, `text-wrap: balance`. Body: 1.6 line height, 62–68 ch measure.

### Space, radius, depth, motion

- Space (8 pt): `--s-1` 4 · `--s-2` 8 · `--s-3` 12 · `--s-4` 16 · `--s-5` 24 · `--s-6` 32 · `--s-7` 48 · `--s-8` 64 · `--s-9` 96. Sections use a fluid `--section-y` of 72–136 px.
- Radius: `--r-sm` 8 · `--r-md` 14 · `--r-lg` 22 (cards) · `--r-xl` 30 (photos, panel) · pills 999.
- Shadows: offset + soft blur only (`--shadow-sm/md/lg`). No zero-offset glows.
- Easing: `--ease-out` cubic-bezier(.16,1,.3,1). `--ease-spring` has no overshoot. Everything respects `prefers-reduced-motion`.

## Components

| Component | Class | Variants / states |
|---|---|---|
| Button | `.btn` | `.btn-primary`, `.btn-secondary`, `.btn-on-dark`; hover lifts 2 px; 48 px min height |
| Icon button | `.icon-btn` | 44 px target; `.icon-btn-lg` 48 px bordered |
| Header | `.site-header` | Sticky, blur; `.is-scrolled` border; mobile panel `.site-nav.is-open` |
| Hero proof pill | `.hero-proof` | 6 overlapping badges, fans out on hover |
| Timeline | `.timeline` › `.tl-group` › `.tl-role` › `.role-card` | Rail fills on scroll; `.is-lit` node; `[data-collapsed]` achievements; `.is-current` role |
| Certification card | `.cert-card` | `.level-professional/associate/foundational`; pointer tilt + glare; stretched Credly link; "Ver certificado" opens the viewer |
| Chips | `.chips`, `.role-tags` | Static tags |
| Pillar | `.pillars` › `.pillar.c-{color}` | Neon top border, tinted icon, small chips; lifts on hover (profile section) |
| Role scope | `.role-scope` | Segments / industries / countries / scope rows inside a role card (optional per role in `content.mjs`) |
| 404 | `.not-found`, `.e404-*` | Neon 404 digits, shortcut links, back-home button; ES at `/404.html`, EN at `/en/404.html` |
| Document viewer | `dialog.viewer` | Certificates only; pages as WebP; zoom toggle; open, download and verify actions |
| Toast | `.toast` | `role=status`, used for "Correo copiado" |

## Breakpoints

- `≤ 1000 px`: the certification grid goes to 2 columns. Skills are always 2×2 cards (1 column at ≤ 560 px).
- `≤ 960 px`: hero stacks (photo on top, 5:4).
- `≤ 860 px`: mobile nav; the timeline logo column collapses above the roles.
- `≤ 560 px`: 1-column grids; certification cards become horizontal.
- `≤ 480 px`: the hero lede is hidden so the primary actions stay in the first viewport.

## Content rules

- All copy (ES/EN) lives in `src/content.mjs`. Keep both languages in parity; `tests/validate.mjs` checks this.
- Never publish the phone number. The build fails if it appears in any file.
- Company logos identify employers only. Badge art is the official Credly/Google artwork and is not altered.
