---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: ["src/render.mjs"]
---

Scope: home page (es `/`, en `/en/`). Visitor mode: Persuade (visitor decides to contact / verify credentials).
Audience: recruiters and hiring managers scanning 30–90 s, often on mobile from LinkedIn; secondarily clients and Google Cloud partners.
Proof on hand: 6 Google Cloud certificates (PDF + Credly), quantified CV results, real photo, employer logos. No testimonials.
Constraints: no phone number, email + LinkedIn only, bilingual, strict CSP (no inline JS/CSS), near-zero hosting cost.

## Direction contract
THESIS: A professional, verifiable calling card — every claim is one click from proof. Refuses the dark-neon "cloud engineer" portfolio and the generic résumé template.
OWN-WORLD: Canon (user-chosen "Estándar profesional"). Cool paper-white ground, deep ink text, a single cobalt accent field; badge-gold only for Professional level; Geist for text, Geist Mono only for dates/IDs; rounded 14–30 px radii, soft offset shadows.
STORY: See who he is and his current role → believe it via six live badges → scan the career path → verify any credential on Credly or open the PDF → email or download CV.
FIRST VIEWPORT: Left 60 %: role line, two-line name (display 6 rem), tagline, lede, primary "Escríbeme", secondary "Ver CV", LinkedIn icon, then a proof pill with the 6 badges. Right 40 %: 4:5 portrait on a cobalt-tint field with location and company chips.
FORM: canon (standing exit taken by the user); seed key 903e4149 (roll ran degraded, no challengers).
FINISH: unreviewed and unverified until the finish reviewer returns ship.
Signature interaction: certification cards tilt toward the pointer with a glare and lift the badge in 3D; the timeline rail fills with scroll and lights each role node.
