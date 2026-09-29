#!/usr/bin/env bash
# 02 — First deployment (manual). Runs the same cloudbuild.yaml the trigger
# uses, then makes the service public. Later deploys happen automatically on push.
source "$(dirname "$0")/lib.sh"
load_config

TAG="manual-$(date +%Y%m%d-%H%M%S)"
log "Enviando build a Cloud Build (tag ${TAG})…"
gcloud builds submit "$ROOT_DIR" \
  --config="${ROOT_DIR}/cloudbuild.yaml" \
  --region="$REGION" \
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
