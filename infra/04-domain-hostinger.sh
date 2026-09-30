#!/usr/bin/env bash
# 04 — Custom domain with DNS managed at Hostinger (hPanel).
#      Cloud Run domain mappings for adrgarcia.com + www (managed HTTPS cert).
#
# Run in phases (idempotent, re-run until everything is ✔):
#   ./04-domain-hostinger.sh verify   → proves domain ownership to Google (TXT in Hostinger)
#   ./04-domain-hostinger.sh map      → creates the mappings and prints the records for hPanel
#   ./04-domain-hostinger.sh records  → prints the records again
#   ./04-domain-hostinger.sh status   → checks public DNS + certificate status
source "$(dirname "$0")/lib.sh"
load_config
PHASE="${1:-status}"
WWW="www.${DOMAIN}"

is_verified() { gcloud domains list-user-verified --format='value(id)' 2>/dev/null | grep -qx "$DOMAIN"; }

phase_verify() {
  if is_verified; then ok "${DOMAIN} ya está verificado para $(gcloud config get-value account 2>/dev/null)"; return; fi
  log "Abriendo Google Search Console para verificar ${DOMAIN}…"
  cat <<MSG
  1) En Search Console elige: Proveedor de nombres de dominio → "Otro".
  2) Copia el valor TXT (google-site-verification=…).
  3) En hPanel → Dominios → ${DOMAIN} → DNS / Nameservers → Registros DNS → Agregar registro:
        Tipo: TXT    Nombre: @    Valor: google-site-verification=…    TTL: 300 (o el mínimo)
  4) Espera 5–15 min y pulsa "Verificar" en Search Console.
     Comprueba antes con:  dig +short TXT ${DOMAIN}
MSG
  gcloud domains verify "$DOMAIN" || true
  echo
  echo "Cuando Search Console confirme, ejecuta:  infra/04-domain-hostinger.sh map"
}

map_one() {
  local d="$1"
  if gcloud beta run domain-mappings describe --domain="$d" --region="$REGION" >/dev/null 2>&1; then
    ok "Mapeo ${d} ya existe"
  else
    log "Mapeando ${d} → servicio ${SERVICE}…"
    gcloud beta run domain-mappings create --service="$SERVICE" --domain="$d" --region="$REGION" --quiet >/dev/null
    ok "Mapeo ${d} creado"
  fi
}

print_records() {
  echo
  log "Registros que debes tener en hPanel → Dominios → ${DOMAIN} → Registros DNS:"
  printf '  %-7s %-6s %s\n' "TIPO" "NOMBRE" "VALOR"
  for d in "$DOMAIN" "$WWW"; do
    local name="@"; [[ "$d" == "$WWW" ]] && name="www"
    gcloud beta run domain-mappings describe --domain="$d" --region="$REGION" \
      --flatten='status.resourceRecords[]' \
      --format='csv[no-heading](status.resourceRecords.type,status.resourceRecords.rrdata)' 2>/dev/null |
      while IFS=, read -r type rr; do
        [[ -z "$type" ]] && continue
        printf '  %-7s %-6s %s\n' "$type" "$name" "${rr%.}"
      done
  done
  cat <<MSG

  Antes de agregarlos, BORRA en hPanel los registros que Hostinger crea por defecto:
    • A / AAAA con nombre "@"   (apuntan al hosting o parking de Hostinger)
    • CNAME con nombre "www"    (apunta a ${DOMAIN} o a Hostinger)
  NO borres MX, TXT de SPF/DKIM/DMARC ni el TXT google-site-verification.
  TTL recomendado: 300 (5 min) mientras pruebas; luego puedes subirlo a 3600.
MSG
}

phase_map() {
  is_verified || die "Primero verifica el dominio:  infra/04-domain-hostinger.sh verify"
  map_one "$DOMAIN"
  map_one "$WWW"
  sleep 5
  print_records
  echo
  echo "Después de guardar en hPanel, revisa el avance con:  infra/04-domain-hostinger.sh status"
}

phase_status() {
  local has_dig=0; command -v dig >/dev/null && has_dig=1
  log "DNS público (debe coincidir con la tabla de 'records'):"
  if (( has_dig )); then
    echo "  A     @   → $(dig +short A "$DOMAIN" | tr '\n' ' ')"
    echo "  AAAA  @   → $(dig +short AAAA "$DOMAIN" | tr '\n' ' ')"
    echo "  CNAME www → $(dig +short CNAME "$WWW" | tr '\n' ' ')"
  else
    nslookup "$DOMAIN" || true; nslookup "$WWW" || true
  fi
  log "Estado de los mapeos (Ready=True → certificado HTTPS emitido):"
  gcloud beta run domain-mappings list --region="$REGION" \
    --format='table(metadata.name:label=DOMINIO, status.conditions[0].type:label=CONDICIÓN, status.conditions[0].status:label=OK, status.conditions[0].message:label=DETALLE)' || true
  echo
  echo "Prueba final:  curl -sI https://${DOMAIN} | head -3   ·   curl -sI https://${WWW} | grep -i location"
}

case "$PHASE" in
  verify) phase_verify ;;
  map) phase_map ;;
  records) print_records ;;
  status) phase_status ;;
  *) die "Fase desconocida '${PHASE}'. Usa: verify | map | records | status" ;;
esac
