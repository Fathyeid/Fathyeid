#!/usr/bin/env bash
# يبني محتوى «موسوعة الطفل» ويتحقق منه: bash scripts/kids/build.sh
# يستخدم مصادر التحقق نفسها التي ينزّلها scripts/quiz/build.sh (المصحف والصحيحان من npm).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CACHE="${QUIZ_SRC_CACHE:-${TMPDIR:-/tmp}/athar-quiz-sources}"
mkdir -p "$CACHE"
fetch() { if [ ! -d "$CACHE/$2/package" ]; then mkdir -p "$CACHE/$2" && (cd "$CACHE/$2" && npm pack "$1" --silent >/dev/null && tar xzf ./*.tgz); fi; }
fetch quran-json@3.1.2 quran
fetch sahih-al-bukhari@3.1.7 bukhari
fetch sahih-muslim@1.1.2 muslim
python3 -I "$ROOT/scripts/kids/build.py" \
  --quran "$CACHE/quran/package/dist/quran.json" \
  --bukhari "$CACHE/bukhari/package/data/bukhari.json.gz" \
  --muslim "$CACHE/muslim/package/data/muslim.json.gz"
