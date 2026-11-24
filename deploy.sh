#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
SRC="las-vegas-grand-canyon-guide.html"
MSG="${1:-docs: 가이드 업데이트}"

[ -f "$SRC" ] || { echo "$SRC 파일이 없습니다." >&2; exit 1; }

read -r -s -p "일정 비밀번호: " SITE_PASSWORD
printf '\n'
printf '%s' "$SITE_PASSWORD" | node protect-site.mjs "$SRC" index.html
unset SITE_PASSWORD

gitleaks detect --redact
git add index.html deploy.sh protect-site.mjs
git commit -m "$MSG"
git push origin main
