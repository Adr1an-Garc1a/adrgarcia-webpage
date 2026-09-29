#!/usr/bin/env bash
# 03 — CI/CD: Cloud Build trigger (2nd gen) on every push to the main branch.
# Requires the code to be in GitHub. One browser step: authorize the Cloud Build
# GitHub App the first time.
source "$(dirname "$0")/lib.sh"
load_config
: "${GITHUB_OWNER:?}" "${GITHUB_REPO:?}" "${BRANCH:=main}" "${GH_CONNECTION:=github}"

# Cloud Build's service agent stores the GitHub token in Secret Manager.
CB_AGENT="service-${PROJECT_NUMBER}@gcp-sa-cloudbuild.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CB_AGENT}" --role="roles/secretmanager.admin" --condition=None --quiet >/dev/null
# The trigger's service account must be usable by the Cloud Build agent.
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" \
  --member="serviceAccount:${CB_AGENT}" --role="roles/iam.serviceAccountTokenCreator" --quiet >/dev/null

if gcloud builds connections describe "$GH_CONNECTION" --region="$REGION" >/dev/null 2>&1; then
  ok "Conexión '${GH_CONNECTION}' ya existe"
else
  log "Creando conexión con GitHub…"
  gcloud builds connections create github "$GH_CONNECTION" --region="$REGION" --quiet || true
fi

conn_stage() {
  gcloud builds connections describe "$GH_CONNECTION" --region="$REGION" --format='value(installationState.stage)'
}
STAGE="$(conn_stage)"
if [[ "$STAGE" != "COMPLETE" ]]; then
  URI="$(gcloud builds connections describe "$GH_CONNECTION" --region="$REGION" --format='value(installationState.actionUri)')"
  warn "Falta completar la conexión con GitHub (estado: ${STAGE})."
  echo "  Abre este enlace con la MISMA cuenta de Google que usa gcloud ($(gcloud config get-value account 2>/dev/null)):"
  echo "    ${URI}"
  echo "  • PENDING_USER_OAUTH   → autoriza 'Google Cloud Build' en GitHub."
  echo "  • PENDING_INSTALL_APP  → en la pantalla de Google elige 'Install in GitHub' / 'Update install',"
  echo "    selecciona la cuenta ${GITHUB_OWNER}, 'Only select repositories' → ${GITHUB_REPO} → Install/Save."
  echo "    Si la app ya estaba instalada, entra a https://github.com/settings/installations → Google Cloud Build"
  echo "    → Configure, agrega el repo y vuelve al enlace de arriba para que Google la vincule."
  echo "  También puedes hacerlo desde la consola: Cloud Build → Repositorios (2nd gen) → conexión '${GH_CONNECTION}'."
  echo
  log "Esperando a que la conexión quede lista (hasta 10 min; Ctrl+C para salir)…"
  for _ in $(seq 1 120); do
    STAGE="$(conn_stage)"
    [[ "$STAGE" == "COMPLETE" ]] && break
    sleep 5
  done
  [[ "$STAGE" == "COMPLETE" ]] || die "La conexión sigue en ${STAGE}. Revisa los pasos de arriba y vuelve a ejecutar el script."
fi
ok "Conexión con GitHub activa"

if ! gcloud builds repositories describe "$GITHUB_REPO" --connection="$GH_CONNECTION" --region="$REGION" >/dev/null 2>&1; then
  gcloud builds repositories create "$GITHUB_REPO" \
    --remote-uri="https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git" \
    --connection="$GH_CONNECTION" --region="$REGION" --quiet
fi
ok "Repositorio enlazado"

TRIGGER="deploy-${SERVICE}"
if gcloud builds triggers describe "$TRIGGER" --region="$REGION" >/dev/null 2>&1; then
  ok "Trigger '${TRIGGER}' ya existe"
else
  log "Creando trigger '${TRIGGER}' (push a ${BRANCH})…"
  gcloud builds triggers create github \
    --name="$TRIGGER" \
    --region="$REGION" \
    --repository="projects/${PROJECT_ID}/locations/${REGION}/connections/${GH_CONNECTION}/repositories/${GITHUB_REPO}" \
    --branch-pattern="^${BRANCH}$" \
    --build-config="cloudbuild.yaml" \
    --service-account="projects/${PROJECT_ID}/serviceAccounts/${DEPLOYER_SA}" \
    --substitutions="_REGION=${REGION},_REPO=${REPO},_SERVICE=${SERVICE}" \
    --included-files="public/**,src/**,scripts/**,nginx/**,tests/**,Dockerfile,cloudbuild.yaml,package.json" \
    --description="Build, test y deploy de ${DOMAIN} en cada push a ${BRANCH}" \
    --quiet
fi
ok "CI/CD listo: cada push a '${BRANCH}' construye, prueba y despliega."
echo "Siguiente paso:  infra/04-domain-dns.sh"
