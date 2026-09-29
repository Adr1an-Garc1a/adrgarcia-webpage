#!/usr/bin/env bash
# 01 — Base infrastructure (idempotent; safe to re-run).
#   • Enables only the APIs this project needs
#   • Artifact Registry repo with a cleanup policy (keeps storage in the free tier)
#   • Two least-privilege service accounts:
#       web-runtime          → identity of the Cloud Run service (no roles at all)
#       cloudbuild-deployer  → identity of the CI/CD pipeline (build, push, deploy)
source "$(dirname "$0")/lib.sh"
load_config

log "Proyecto: ${PROJECT_ID} (${PROJECT_NUMBER}) · región ${REGION}"

log "Habilitando APIs…"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  dns.googleapis.com \
  secretmanager.googleapis.com \
  --quiet
ok "APIs habilitadas"

# ---------------------------------------------------------------- Artifact Registry
if gcloud artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1; then
  ok "Artifact Registry '${REPO}' ya existe"
else
  log "Creando repositorio Docker '${REPO}' en ${REGION}…"
  gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Imágenes del sitio ${DOMAIN}" \
    --quiet
  ok "Repositorio creado"
fi

log "Aplicando política de limpieza (conserva las 5 imágenes más recientes)…"
POLICY_FILE="$(mktemp)"
cat >"$POLICY_FILE" <<'JSON'
[
  {
    "name": "keep-5-most-recent",
    "action": { "type": "Keep" },
    "mostRecentVersions": { "keepCount": 5 }
  },
  {
    "name": "delete-older-than-14d",
    "action": { "type": "Delete" },
    "condition": { "tagState": "ANY", "olderThan": "1209600s" }
  }
]
JSON
gcloud artifacts repositories set-cleanup-policies "$REPO" \
  --location="$REGION" --policy="$POLICY_FILE" --no-dry-run --quiet >/dev/null
rm -f "$POLICY_FILE"
ok "Política de limpieza activa"

# ---------------------------------------------------------------- Service accounts
ensure_sa() {
  local name="$1" display="$2"
  if gcloud iam service-accounts describe "${name}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1; then
    ok "Cuenta de servicio ${name} ya existe"
  else
    gcloud iam service-accounts create "$name" --display-name="$display" --quiet
    ok "Cuenta de servicio ${name} creada"
  fi
}
ensure_sa web-runtime "Cloud Run runtime — ${DOMAIN} (sin permisos)"
ensure_sa cloudbuild-deployer "Cloud Build — build, push y deploy de ${SERVICE}"

log "Asignando permisos mínimos al pipeline…"
# Push images only to this repository (not project-wide).
gcloud artifacts repositories add-iam-policy-binding "$REPO" --location="$REGION" \
  --member="serviceAccount:${DEPLOYER_SA}" --role="roles/artifactregistry.writer" --quiet >/dev/null
# Deploy new revisions (cannot change IAM policies on the service).
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${DEPLOYER_SA}" --role="roles/run.developer" --condition=None --quiet >/dev/null
# Write build logs.
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${DEPLOYER_SA}" --role="roles/logging.logWriter" --condition=None --quiet >/dev/null
# Act as the runtime SA only (not every SA in the project).
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:${DEPLOYER_SA}" --role="roles/iam.serviceAccountUser" --quiet >/dev/null
ok "IAM listo (principio de mínimo privilegio)"

cat <<MSG

${c_green}Bootstrap completo.${c_off}
  Imagen:            ${IMAGE}
  SA runtime:        ${RUNTIME_SA}
  SA pipeline:       ${DEPLOYER_SA}

Siguiente paso:  infra/02-first-deploy.sh
MSG
