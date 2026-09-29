#!/usr/bin/env bash
# 02 — First deployment (manual). Runs the same cloudbuild.yaml the trigger
# uses, then makes the service public. Later deploys happen automatically on push.
source "$(dirname "$0")/lib.sh"
load_config

# ---------------------------------------------------------------- Preflight
ME="$(gcloud config get-value account 2>/dev/null)"
log "Cuenta activa: ${ME}"
MY_ROLES="$(gcloud projects get-iam-policy "$PROJECT_ID" --flatten=bindings \
  --filter="bindings.members:user:${ME}" --format='value(bindings.role)' 2>/dev/null || true)"
if ! grep -qE 'roles/(owner|editor|cloudbuild.builds.editor)' <<<"$MY_ROLES"; then
  die "La cuenta ${ME} no tiene Owner/Editor/Cloud Build Editor en ${PROJECT_ID}.
   Cambia de cuenta (gcloud config set account TU_CUENTA) o pide que te den acceso."
fi

# 1) You must be allowed to "act as" the pipeline service account.
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" \
  --member="user:${ME}" --role="roles/iam.serviceAccountUser" --quiet >/dev/null

# 2) A staging bucket the pipeline SA can read (user-specified SAs do not get
#    access to the default *_cloudbuild bucket automatically).
STAGING_BUCKET="gs://${PROJECT_ID}-build-src"
if ! gcloud storage buckets describe "$STAGING_BUCKET" >/dev/null 2>&1; then
  log "Creando bucket de staging ${STAGING_BUCKET}…"
  gcloud storage buckets create "$STAGING_BUCKET" --location="$REGION" \
    --uniform-bucket-level-access --public-access-prevention --quiet
  gcloud storage buckets update "$STAGING_BUCKET" --lifecycle-file=<(echo '{"rule":[{"action":{"type":"Delete"},"condition":{"age":7}}]}') --quiet
fi
gcloud storage buckets add-iam-policy-binding "$STAGING_BUCKET" \
  --member="serviceAccount:${DEPLOYER_SA}" --role="roles/storage.objectViewer" --quiet >/dev/null
gcloud storage buckets add-iam-policy-binding "$STAGING_BUCKET" \
  --member="user:${ME}" --role="roles/storage.objectAdmin" --quiet >/dev/null
ok "Permisos listos (pueden tardar ~1 min en propagarse)"
sleep 20

TAG="manual-$(date +%Y%m%d-%H%M%S)"
log "Enviando build a Cloud Build (tag ${TAG})…"
gcloud builds submit "$ROOT_DIR" \
  --config="${ROOT_DIR}/cloudbuild.yaml" \
  --region="$REGION" \
  --gcs-source-staging-dir="${STAGING_BUCKET}/source" \
  --service-account="projects/${PROJECT_ID}/serviceAccounts/${DEPLOYER_SA}" \
  --substitutions="_REGION=${REGION},_REPO=${REPO},_SERVICE=${SERVICE},_TAG=${TAG}"
ok "Imagen construida, probada y desplegada"

# Public read access. Done here (with your user credentials) instead of in the
# pipeline, so the CI service account never needs permission to change IAM.
log "Permitiendo acceso público (allUsers → roles/run.invoker)…"
if ! gcloud run services add-iam-policy-binding "$SERVICE" --region="$REGION" \
  --member="allUsers" --role="roles/run.invoker" --quiet >/dev/null 2>&1; then
  warn "No se pudo otorgar acceso público. Si tu organización aplica la política"
  warn "'Domain restricted sharing' (iam.allowedPolicyMemberDomains), crea una excepción"
  warn "para este proyecto o usa: gcloud run services update ${SERVICE} --no-invoker-iam-check --region=${REGION}"
fi

URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"
ok "Sitio en línea: ${URL}"
log "Prueba rápida de cabeceras de seguridad:"
bash "${ROOT_DIR}/tests/smoke.sh" "$URL" || warn "Revisa las pruebas fallidas arriba"

echo
echo "Siguiente paso:  infra/03-github-trigger.sh  (CI/CD en cada push a ${BRANCH:-main})"
