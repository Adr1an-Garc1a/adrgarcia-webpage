#!/usr/bin/env bash
# 99 — Remove everything this project created (irreversible).
source "$(dirname "$0")/lib.sh"
load_config
warn "Esto elimina el servicio, los mapeos de dominio, la zona DNS, el trigger, el repositorio de imágenes y las cuentas de servicio de ${PROJECT_ID}."
confirm "¿Seguro que quieres borrarlo todo?" || exit 0
set +e
gcloud builds triggers delete "deploy-${SERVICE}" --region="$REGION" --quiet
for d in "$DOMAIN" "www.${DOMAIN}"; do gcloud beta run domain-mappings delete --domain="$d" --region="$REGION" --quiet; done
gcloud run services delete "$SERVICE" --region="$REGION" --quiet
gcloud artifacts repositories delete "$REPO" --location="$REGION" --quiet
gcloud storage rm -r "gs://${PROJECT_ID}-build-src" --quiet
if gcloud dns managed-zones describe "$DNS_ZONE" >/dev/null 2>&1; then
  gcloud dns record-sets list --zone="$DNS_ZONE" --format='csv[no-heading](name,type)' | while IFS=, read -r n t; do
    [[ "$t" == "NS" || "$t" == "SOA" ]] || gcloud dns record-sets delete "$n" --type="$t" --zone="$DNS_ZONE" --quiet
  done
  gcloud dns managed-zones delete "$DNS_ZONE" --quiet
fi
gcloud iam service-accounts delete "$DEPLOYER_SA" --quiet
gcloud iam service-accounts delete "$RUNTIME_SA" --quiet
ok "Recursos eliminados. Recuerda regresar los nameservers de Hostinger a los originales."
