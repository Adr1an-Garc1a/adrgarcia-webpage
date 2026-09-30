# Despliegue en Google Cloud (Cloud Run + Cloud Build + Artifact Registry)

Guía paso a paso para publicar **adrgarcia.com** con CI/CD y el menor costo posible.

```
GitHub (push a main)
   │  trigger 2nd gen
   ▼
Cloud Build ── docker build ─► validate.mjs (CSP, a11y, links, datos privados)
   │           smoke test ───► tests/smoke.sh (códigos + cabeceras de seguridad)
   │           push ─────────► Artifact Registry (conserva 5 imágenes)
   ▼           deploy
Cloud Run  (nginx sin root · 256 MiB · 0–2 instancias · escala a cero)
   ▲
DNS de Hostinger  adrgarcia.com (A/AAAA) · www (CNAME) ──► Cloud Run domain mapping
```

## 0. Requisitos

- `gcloud` (Google Cloud SDK) con el componente beta: `gcloud components install beta`
- Un proyecto de GCP con facturación activa y tu usuario como **Owner** (solo para el bootstrap).
- El código en un repositorio de GitHub (público o privado).
- `dig` o `nslookup` para comprobar DNS.

```bash
gcloud auth login
cp infra/config.env.example infra/config.env   # completa PROJECT_ID, GITHUB_OWNER, etc.
```

## 1. Infraestructura base

```bash
bash infra/01-bootstrap.sh
```

Esto hace lo siguiente (puedes volver a ejecutarlo sin riesgo):

| Recurso | Detalle |
|---|---|
| APIs | Run, Artifact Registry, Cloud Build, IAM y Secret Manager |
| Artifact Registry `web` | Docker, en `us-central1`, con política de limpieza (5 versiones, >14 días se borran) |
| SA `web-runtime` | Identidad de Cloud Run **sin ningún rol**: el sitio no llama a APIs |
| SA `cloudbuild-deployer` | `artifactregistry.writer` (solo en el repo) + `run.developer` + `logging.logWriter` + `serviceAccountUser` (solo sobre `web-runtime`) |

## 2. Primer despliegue

```bash
bash infra/02-first-deploy.sh
```

Construye con el mismo `cloudbuild.yaml` del CI y publica el servicio. El permiso `allUsers → run.invoker` lo das tú desde tu usuario, así el pipeline nunca puede modificar IAM. Al terminar ejecuta las pruebas de cabeceras contra la URL `*.run.app`, que tiene `noindex` para no competir con tu dominio en buscadores.

## 3. CI/CD en cada push

```bash
bash infra/03-github-trigger.sh
```

El script solo te pide un paso en el navegador: autorizar la app **Google Cloud Build** en GitHub e instalarla solo en tu repositorio. Desde ahí, cada push a `main` que toque el sitio hace esto:

1. Construye la imagen. `tests/validate.mjs` corre dentro del build; si falla, no se publica nada.
2. Levanta el contenedor y corre `tests/smoke.sh`: códigos HTTP, CSP, HSTS, `nosniff` y que no se filtre tu teléfono.
3. Hace push a Artifact Registry.
4. Despliega una nueva revisión en Cloud Run.

## 4. Dominio

Sigue **[DNS-HOSTINGER.md](DNS-HOSTINGER.md)**.

## 5. Alerta de presupuesto (opcional, recomendado)

```bash
bash infra/05-budget-alerts.sh    # requiere BILLING_ACCOUNT en config.env
```

## Costo estimado (tráfico de un sitio personal)

| Servicio | Uso típico | Costo |
|---|---|---|
| Cloud Run | < 2 M solicitudes/mes, 256 MiB, CPU solo durante la solicitud | Dentro de la capa gratuita |
| Artifact Registry | ~5 imágenes de ~30 MB (≈ 0.15 GB) | Dentro de los 0.5 GB gratis |
| Cloud Build | ~2 min por build | Capa gratuita: 2,500 min/mes en e2-standard-2 |
| DNS | Administrado en Hostinger | Incluido con tu dominio |
| **Total** | | **≈ USD 0 – 0.30 al mes** |

Las tablas de precios cambian. Revísalas en <https://cloud.google.com/run/pricing> y <https://cloud.google.com/build/pricing>.

### Por qué Cloud Run y no Cloud Storage

Un bucket sirve HTTPS con dominio propio solo detrás de un Load Balancer, y el balanceador cuesta ≈ USD 18 al mes aunque nadie visite el sitio. Cloud Run con *domain mapping* incluye el certificado administrado y escala a cero.

> **A tener en cuenta:** Google marca los *domain mappings* de Cloud Run como **Preview** y advierte de latencia extra. Para un portafolio personal funciona bien. Si algún día necesitas SLA, cambia a un **Application Load Balancer** (con Cloud Armor) o a **Firebase Hosting** con un *rewrite* a este servicio. El contenedor no cambia.

## Operación diaria

```bash
npm test                   # build + validaciones, en tu máquina
npm run serve              # vista previa local en http://localhost:5173
npm run docker:build && npm run docker:run && npm run smoke   # prueba el contenedor real
git push origin main       # despliega
```

- **Rollback:** `gcloud run services update-traffic adrgarcia-web --to-revisions=<REVISION>=100 --region=us-central1`
- **Logs:** `gcloud run services logs read adrgarcia-web --region=us-central1 --limit=50`
- **Editar contenido:** todo el texto (ES/EN), la experiencia y las certificaciones viven en `src/content.mjs`.
- **Renovar una certificación:** actualiza fechas y URL en `src/content.mjs` y reemplaza el PDF en `public/docs/certs/` y la vista previa en `public/assets/img/docs/`.
