#!/usr/bin/env bash
# 05 — Cost guard-rail: monthly budget with e-mail alerts at 50 %, 90 % and 100 %.
# (A budget alerts; it does not cut spending. The real cap is --max-instances=2.)
source "$(dirname "$0")/lib.sh"
load_config
: "${BILLING_ACCOUNT:?Define BILLING_ACCOUNT en infra/config.env (gcloud billing accounts list)}"
gcloud services enable billingbudgets.googleapis.com --quiet

NAME="${SERVICE}-monthly"
if gcloud billing budgets list --billing-account="$BILLING_ACCOUNT" --format='value(displayName)' | grep -qx "$NAME"; then
  ok "Presupuesto '${NAME}' ya existe"; exit 0
fi
gcloud billing budgets create \
  --billing-account="$BILLING_ACCOUNT" \
  --display-name="$NAME" \
  --budget-amount="${BUDGET_AMOUNT:-5}${BUDGET_CURRENCY:-USD}" \
  --filter-projects="projects/${PROJECT_ID}" \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0 \
  --threshold-rule=percent=1.0,basis=forecasted-spend
ok "Presupuesto de ${BUDGET_AMOUNT:-5} ${BUDGET_CURRENCY:-USD}/mes creado (alertas por correo a los administradores de facturación)"
