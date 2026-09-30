#!/usr/bin/env bash
# 작업용 HTML을 index.html로 복사해 GitHub Pages에 배포한다.
# 사용법: ./deploy.sh "커밋 메시지"
set -euo pipefail

cd "$(dirname "$0")"
SRC="las-vegas-grand-canyon-guide.html"
MSG="${1:-docs: 가이드 업데이트}"

[ -f "$SRC" ] || { echo "❌ $SRC 가 없습니다."; exit 1; }

# 스크립트 블록 문법 검사 (쉼표 누락 같은 실수를 커밋 전에 잡는다)
python3 - "$SRC" <<'PY'
import sys, io
s = io.open(sys.argv[1], encoding="utf-8").read()
i, j = s.index("<script>"), s.rindex("</script>")
io.open("/tmp/_lv_check.js", "w", encoding="utf-8").write(s[i+8:j])
PY
node --check /tmp/_lv_check.js || { echo "❌ JS 문법 오류 — 배포 중단"; exit 1; }
rm -f /tmp/_lv_check.js

cp "$SRC" index.html
git add index.html deploy.sh .gitignore
if git diff --cached --quiet; then
  echo "ℹ️  변경 없음 — 배포할 것이 없습니다."
  exit 0
fi
git commit -q -m "$MSG"
git push -q origin main
echo "✅ 배포 완료: https://solduma.github.io/lv26/"
echo "   (GitHub Pages 반영까지 보통 30~90초 걸립니다)"
