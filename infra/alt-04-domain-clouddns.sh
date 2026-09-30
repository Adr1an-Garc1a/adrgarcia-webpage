#!/usr/bin/env bash
# ALTERNATIVE (not used): Cloud DNS instead of Hostinger DNS. Custom domain: Cloud DNS zone + Cloud Run domain mappings for
#      adrgarcia.com and www.adrgarcia.com (managed HTTPS certificate included).
#
# Run it in phases (it is idempotent, re-run until everything is ✔):
#   ./04-domain-dns.sh zone      → creates the zone and prints the 4 nameservers
#   (change the nameservers in Hostinger → see docs/DNS-HOSTINGER.md)
#   ./04-domain-dns.sh verify    → proves domain ownership to Google (TXT record)
#   ./04-domain-dns.sh map       → maps the domain to Cloud Run and writes A/AAAA/CNAME
#   ./04-domain-dns.sh status    → shows DNS propagation + certificate status
source "$(dirname "$0")/lib.sh"
load_config
PHASE="${1:-status}"
FQDN="${DOMAIN}."

add_or_replace() { # name type ttl rrdata...
  local name="$1" type="$2" ttl="$3"; shift 3
  if gcloud dns record-sets describe "$name" --type="$type" --zone="$DNS_ZONE" >/dev/null 2>&1; then
    gcloud dns record-sets update "$name" --type="$type" --ttl="$ttl" --rrdatas="$(IFS=,; echo "$*")" --zone="$DNS_ZONE" --quiet >/dev/null
  else
    gcloud dns record-sets create "$name" --type="$type" --ttl="$ttl" --rrdatas="$(IFS=,; echo "$*")" --zone="$DNS_ZONE" --quiet >/dev/null
  fi
  ok "${type} ${name} → $*"
}

phase_zone() {
  if gcloud dns managed-zones describe "$DNS_ZONE" >/dev/null 2>&1; then
    ok "Zona '${DNS_ZONE}' ya existe"
  else
    log "Creando zona pública ${FQDN} en Cloud DNS…"
    gcloud dns managed-zones create "$DNS_ZONE" \
      --dns-name="$FQDN" \
      --description="Zona DNS de ${DOMAIN}" \
      --visibility=public \
      --quiet
  fi
  # Only Google's CAs may issue certificates for this domain.
  add_or_replace "$FQDN" CAA 3600 '0 issue "pki.goog"' '0 issue "letsencrypt.org"' '0 iodef "mailto:'"${ADMIN_EMAIL:-gadrianjua@gmail.com}"'"'

  echo
  warn "IMPORTANTE antes de cambiar los nameservers en Hostinger:"
  echo "  Al delegar el dominio, Hostinger deja de responder por él. Si usas correo de"
  echo "  Hostinger (u otro), copia primero sus registros MX / TXT (SPF, DKIM, DMARC) a"
  echo "  Cloud DNS con:  gcloud dns record-sets create … --zone=${DNS_ZONE}"
  echo
  log "Nameservers que debes poner en Hostinger (Dominios → ${DOMAIN} → DNS / Nameservers):"
  gcloud dns managed-zones describe "$DNS_ZONE" --format='value(nameServers)' | tr ';' '\n' | sed 's/\.$//; s/^/    /'
  echo
  echo "Luego ejecuta:  infra/alt-04-domain-clouddns.sh verify"
}

phase_verify() {
  if gcloud domains list-user-verified --format='value(id)' 2>/dev/null | grep -qx "$DOMAIN"; then
    ok "${DOMAIN} ya está verificado para tu cuenta"; return
  fi
  log "Abriendo Google Search Console para verificar ${DOMAIN}…"
  echo "  En Search Console elige 'Proveedor de nombres de dominio' → 'Otro' y copia el"
  echo "  registro TXT (google-site-verification=…). NO lo pegues en Hostinger: lo creo"
  echo "  aquí en Cloud DNS."
  gcloud domains verify "$DOMAIN" || true
  read -r -p "Pega el valor TXT completo: " TXT
  [[ "$TXT" == google-site-verification=* ]] || die "El valor debe empezar con google-site-verification="
  add_or_replace "$FQDN" TXT 300 "\"${TXT}\""
  echo
  echo "Espera a que los nameservers de Hostinger apunten a Cloud DNS (puede tardar de"
  echo "minutos a 48 h) y pulsa 'Verificar' en Search Console. Comprueba con:"
  echo "    dig +short NS ${DOMAIN}      ·      dig +short TXT ${DOMAIN}"
  echo
  echo "Cuando Search Console confirme, ejecuta:  infra/alt-04-domain-clouddns.sh map"
}

map_one() { # domain
  local d="$1"
  if gcloud beta run domain-mappings describe --domain="$d" --region="$REGION" >/dev/null 2>&1; then
    ok "Mapeo ${d} ya existe"
  else
    log "Mapeando ${d} → servicio ${SERVICE}…"
    gcloud beta run domain-mappings create --service="$SERVICE" --domain="$d" --region="$REGION" --quiet >/dev/null
  fi
  # Copy the records Cloud Run asks for into Cloud DNS.
  local rows type rr
  declare -A byType=()
  rows="$(gcloud beta run domain-mappings describe --domain="$d" --region="$REGION" \
    --flatten='status.resourceRecords[]' \
    --format='csv[no-heading](status.resourceRecords.type,status.resourceRecords.rrdata)')"
  while IFS=, read -r type rr; do
    [[ -z "$type" ]] && continue
    [[ "$type" == "CNAME" && "$rr" != *. ]] && rr="${rr}."
    byType[$type]+="${byType[$type]:+ }${rr}"
  done <<<"$rows"
  for type in "${!byType[@]}"; do
    # shellcheck disable=SC2086
    add_or_replace "${d}." "$type" 300 ${byType[$type]}
  done
}

phase_map() {
  gcloud domains list-user-verified --format='value(id)' | grep -qx "$DOMAIN" \
    || die "Primero verifica el dominio:  infra/alt-04-domain-clouddns.sh verify"
  map_one "$DOMAIN"
  map_one "www.${DOMAIN}"
  echo
  ok "Registros creados. Google emitirá el certificado HTTPS automáticamente (15 min – 24 h)."
  echo "Revisa el avance con:  infra/alt-04-domain-clouddns.sh status"
}

phase_status() {
  log "Nameservers públicos de ${DOMAIN}:"
  (command -v dig >/dev/null && dig +short NS "$DOMAIN" | sed 's/^/    /') || nslookup -type=NS "$DOMAIN" || true
  log "Estado de los mapeos (Ready = certificado emitido):"
  gcloud beta run domain-mappings list --region="$REGION" \
    --format='table(metadata.name:label=DOMINIO, status.conditions[0].type:label=CONDICIÓN, status.conditions[0].status:label=OK, status.conditions[0].message:label=DETALLE)' || true
}

case "$PHASE" in
  zone) phase_zone ;;
  verify) phase_verify ;;
  map) phase_map ;;
  status) phase_status ;;
  *) die "Fase desconocida '${PHASE}'. Usa: zone | verify | map | status" ;;
esac
