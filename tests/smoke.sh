#!/usr/bin/env bash
# Smoke test for a running container: status codes + security headers.
# Usage: tests/smoke.sh http://localhost:8080
set -euo pipefail
BASE="${1:-http://localhost:8080}"
fail=0
check() { if eval "$2"; then echo "  ✔ $1"; else echo "  ✖ $1"; fail=1; fi; }

echo "Smoke testing ${BASE}"
H="$(curl -fsSI "${BASE}/")"
header() { grep -qi "^$1:" <<<"$H"; }
# Read the whole body before grepping: piping curl into `grep -q` makes curl
# fail with SIGPIPE (exit 23) under pipefail when grep matches early.
body() { curl -s "${BASE}$1"; }

check "home returns 200"                   '[[ "$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/")" == 200 ]]'
check "english page returns 200"           '[[ "$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/en/")" == 200 ]]'
check "unknown path returns 404"           '[[ "$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/no-existe")" == 404 ]]'
check "POST is rejected (405)"             '[[ "$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/")" == 405 ]]'
check "dotfiles are hidden"                '[[ "$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/.git/config")" == 404 ]]'
check "CV PDF is not published"            '[[ "$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/docs/adrian-garcia-juarez-cv-2026-en.pdf")" == 404 ]]'
check "404 page has content"               'grep -q "Página no encontrada" <<<"$(body /no-existe)"'
check "english 404 page"                   'grep -q "Page not found" <<<"$(body /en/no-such-page)"'
check "certificate PDF is served"          '[[ "$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/docs/certs/professional-cloud-architect.pdf")" == 200 ]]'
check "Content-Security-Policy present"    'header Content-Security-Policy'
check "CSP forbids inline script"          '! grep -i "^content-security-policy:" <<<"$H" | grep -q "unsafe-inline"'
check "HSTS present"                       'header Strict-Transport-Security'
check "X-Content-Type-Options nosniff"     'grep -qi "^x-content-type-options: nosniff" <<<"$H"'
check "X-Frame-Options DENY"               'grep -qi "^x-frame-options: deny" <<<"$H"'
check "Referrer-Policy present"            'header Referrer-Policy'
check "Permissions-Policy present"         'header Permissions-Policy'
check "COOP same-origin"                   'grep -qi "^cross-origin-opener-policy: same-origin" <<<"$H"'
check "server version hidden"              '! grep -qiE "^server: nginx/[0-9]" <<<"$H"'
check "phone number not published"         '! grep -q "5585428956" <<<"$(body /)"'

exit $fail
