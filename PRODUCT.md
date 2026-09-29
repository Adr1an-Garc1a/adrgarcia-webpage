# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain static HTML/CSS/JS (ES modules, no framework, no runtime dependencies). The user asked for "HTML/CSS/JS unless something else fits better"; static wins because the site is content-only, must be cheap to host on Cloud Run (scale to zero) and must keep the attack surface minimal. Served by an unprivileged nginx container, built by Cloud Build, stored in Artifact Registry.

## Users

- **Recruiters and hiring managers** (primary): scanning in 30–90 seconds for role fit, seniority, certifications and a way to reach out. Often on mobile, often from a LinkedIn link.
- **Clients, partners and peers in the Google Cloud ecosystem**: validating credibility before a meeting or PoC.
- Adrián himself: sends the link as his calling card in sales and presales conversations.

## Product Purpose

Personal brand site for Adrián García Juárez, Google Cloud Customer Engineer at Xertica.ai (CDMX). Success = a visitor understands in one viewport who he is and why to trust him, verifies any certification in one click (Credly in a new tab), and contacts him or downloads the CV.

## Positioning

Six current Google Cloud certifications (3 Professional: Cloud Architect, Data Engineer, Cloud Security Engineer; Associate Cloud Engineer; Cloud Digital Leader; Generative AI Leader) combined with a path that runs from hands-on infrastructure (Academy Infra, Cloud Analyst) to technical sales leadership (Presales, Technical Sales Leader, Customer Engineer). He speaks both engineering and business: FinOps, ROI, deal closure.

## Operating Context

Visitors arrive from LinkedIn, email signatures, proposals and QR codes at events. The domain is adrgarcia.com (registered at Hostinger, DNS in Cloud DNS). Hosted on the user's own GCP project.

## Capabilities and Constraints

- Bilingual: Spanish default, English toggle, remembered per visitor.
- Public contact: email + LinkedIn only. Phone number must never be published (also redacted from the downloadable CV).
- Certifications link to their Credly public URLs in a new tab (`noopener noreferrer`); certificate PDFs viewable in-page.
- Strict security headers (CSP without inline script, HSTS, no framing), no third-party trackers, no cookies.
- Must cost close to zero at low traffic.

## Brand Commitments

Real name: Adrián García Juárez. Real photo supplied (IMG_6053). Official Google Cloud badge artwork supplied by the user (must not be altered). Company logos (Xertica.ai, Servinformación, IPN/UPIICSA) used only to identify employers/education in the timeline.

## Evidence on Hand

- CV 2026 (EN) with quantified results: +38% annual business utility, ≈$260k+ upsell, +10% close rate, +42% presales utility, ≈40% faster sales cycle, $380K+ pipeline, 80+ proposals, 10–15% billing reduction for 15+ architectures, 30% faster provisioning, 20+ projects onboarded, 20+ architecture documents.
- 6 certificate PDFs with issue/expiry dates and credential IDs; 6 Credly URLs.
- No testimonials, client logos or case studies: do not fabricate any.

## Product Principles

1. Verifiable over claimed: every credential is one click from proof.
2. Scan first, depth on demand: headline facts visible immediately, details expand.
3. Business and engineering in the same breath.
4. Fast and private by construction: no trackers, no heavy JS.

## Accessibility & Inclusion

WCAG 2.1 AA. Full keyboard support, visible focus, `prefers-reduced-motion` respected, `lang` switches with the language toggle.
