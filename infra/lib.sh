#!/usr/bin/env bash
# Shared helpers for the infra scripts. Source it, don't run it.
set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ROOT_DIR="$(cd "${INFRA_DIR}/.." && pwd)"

c_blue=$'\033[1;34m'; c_green=$'\033[1;32m'; c_yellow=$'\033[1;33m'; c_red=$'\033[1;31m'; c_off=$'\033[0m'
log()  { printf '%s▸ %s%s\n' "$c_blue" "$*" "$c_off"; }
ok()   { printf '%s✔ %s%s\n' "$c_green" "$*" "$c_off"; }
warn() { printf '%s! %s%s\n' "$c_yellow" "$*" "$c_off"; }
die()  { printf '%s✖ %s%s\n' "$c_red" "$*" "$c_off" >&2; exit 1; }

require() { command -v "$1" >/dev/null 2>&1 || die "Falta '$1'. Instálalo antes de continuar."; }

load_config() {
  local cfg="${INFRA_DIR}/config.env"
  [[ -f "$cfg" ]] || die "No existe infra/config.env. Copia infra/config.env.example y complétalo."
  # shellcheck disable=SC1090
  source "$cfg"
  : "${PROJECT_ID:?}" "${REGION:?}" "${SERVICE:?}" "${REPO:?}" "${DOMAIN:?}"
  DNS_ZONE="${DNS_ZONE:-}"   # only used by the optional Cloud DNS variant
  require gcloud
  gcloud config set project "$PROJECT_ID" >/dev/null 2>&1
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  RUNTIME_SA="web-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
  DEPLOYER_SA="cloudbuild-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
  IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE}"
  export PROJECT_ID PROJECT_NUMBER REGION SERVICE REPO DOMAIN DNS_ZONE RUNTIME_SA DEPLOYER_SA IMAGE
}

confirm() {
  local prompt="${1:-¿Continuar?}"
  read -r -p "${prompt} [y/N] " reply
  [[ "$reply" =~ ^[YySs]$ ]]
}
