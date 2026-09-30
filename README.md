# adrgarcia.com — Adrián García Juárez

Sitio personal bilingüe (ES/EN) de **Adrián García Juárez**, Cloud Solutions Architect con 6 certificaciones vigentes de Google Cloud. Es HTML/CSS/JS estático, sin frameworks ni dependencias en runtime. Se sirve desde **nginx sin privilegios en Cloud Run** y se despliega con **Cloud Build + Artifact Registry**.

## Qué incluye

- **Hero** con foto, CTA a correo (borrador con asunto), LinkedIn y la prueba de las 6 certificaciones.
- **Perfil** con tres pilares: implementación en la nube, de la necesidad a la propuesta de negocio, e industrias y mercados (micro SMB a Enterprise en México y LATAM).
- **Timeline interactivo** con los logos reales de Xertica.ai, Servinformación e IPN. El riel se llena al hacer scroll, cada puesto se ilumina y los logros se pueden expandir.
- **Certificaciones:** las tarjetas se inclinan hacia el cursor con brillo y el badge se eleva en 3D. Un clic abre Credly en una pestaña nueva, y "Ver certificado" abre el PDF en el visor integrado.
- **Visor de documentos accesible** (`<dialog>`): zoom, páginas, descarga y verificación. Funciona en móvil, porque muestra los PDF como imágenes y además ofrece el PDF original.
- **Tema claro/oscuro**, **ES/EN** con URLs propias (`/` y `/en/`, con `hreflang`), SEO (Open Graph, JSON-LD `Person`, sitemap) y `prefers-reduced-motion`.
- **Contacto solo por correo y LinkedIn.** El CV no se publica: el build falla si aparece un archivo o enlace de CV, o el número de teléfono.
- **Página 404** propia en ES y EN, con atajos a experiencia, certificaciones y correo.

## Estructura

```
src/content.mjs        ← TODO el contenido (ES/EN): experiencia, certificaciones, habilidades
src/render.mjs         ← plantillas HTML (con escape de todo el texto)
scripts/build.mjs      ← genera dist/ (sin dependencias)
public/                ← CSS, JS, fuentes, imágenes, PDFs
nginx/                 ← servidor + cabeceras de seguridad + CSP
tests/validate.mjs     ← puerta de calidad/seguridad (corre dentro del Docker build)
tests/smoke.sh         ← pruebas de cabeceras/códigos contra el contenedor
Dockerfile             ← multi-stage: node (build+tests) → nginx-unprivileged
cloudbuild.yaml        ← build → smoke test → push → deploy
infra/*.sh             ← infraestructura GCP paso a paso
docs/                  ← DEPLOY.md, DNS-HOSTINGER.md, discovery UX
PRODUCT.md, DESIGN.md  ← contexto de producto y sistema de diseño
.claude/skills/impeccable  ← skill de diseño Impeccable instalada para el proyecto
```

## Desarrollo

```bash
npm test            # build + validaciones
npm run serve       # http://localhost:5173
npm run docker:build && npm run docker:run   # contenedor real en :8080
npm run smoke       # pruebas de seguridad contra :8080
```

Requiere Node ≥ 20. No hay `npm install`, porque no hay dependencias.

## Despliegue

Ver **[docs/DEPLOY.md](docs/DEPLOY.md)** y **[docs/DNS-HOSTINGER.md](docs/DNS-HOSTINGER.md)**. En resumen:

```bash
cp infra/config.env.example infra/config.env   # edítalo
bash infra/01-bootstrap.sh
bash infra/02-first-deploy.sh
bash infra/03-github-trigger.sh
bash infra/04-domain-hostinger.sh verify   # TXT en Hostinger
bash infra/04-domain-hostinger.sh map      # crea mapeos e imprime los registros para hPanel
bash infra/04-domain-hostinger.sh status
bash infra/05-budget-alerts.sh      # opcional
```

## Seguridad

| Capa | Medida |
|---|---|
| Navegador | CSP estricta sin `unsafe-inline`, con **Trusted Types** (`require-trusted-types-for 'script'`); sin terceros, cookies ni trackers |
| Cabeceras | HSTS, `nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, COOP/CORP, Referrer-Policy y Permissions-Policy que niega todos los sensores |
| Código | Todo el texto se escapa al renderizar; el JS no usa sinks HTML (`innerHTML`, `eval`…), y el build lo verifica; `rel="noopener noreferrer"` en pestañas nuevas |
| Servidor | nginx sin root (uid 101), solo GET/HEAD, sin versión, *dotfiles* bloqueados, cuerpo máx. 1 KB, timeouts cortos, `*.run.app` con `noindex` |
| Contenedor | Multi-stage, sin herramientas de build en runtime, `apk upgrade`, `nginx -t` en build, compatible con FS de solo lectura |
| GCP | SA de runtime **sin roles**; SA de CI con mínimo privilegio (el repo, un servicio y un SA); el pipeline no puede cambiar IAM; `max-instances=2` limita costo y abuso; alerta de presupuesto |
| Datos | CV no publicado y teléfono bloqueado en el build; EXIF (GPS) eliminado de la foto; metadatos de PDF limpiados |

Mejoras opcionales cuando el sitio crezca: fijar las imágenes base por *digest*, activar Artifact Analysis (escaneo de vulnerabilidades, con costo) y poner un Load Balancer con Cloud Armor (WAF y rate limiting).
