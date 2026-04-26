#!/bin/bash
# Lumi push-report chain end-to-end smoke test.
# Usage: bash scripts/smoke-lumi.sh [BASE_URL]
# Default BASE_URL=https://aibuilding.zeabur.app
# Exit 0 = pass, non-zero = fail with diagnostic.

set -u
BASE="${1:-https://aibuilding.zeabur.app}"
NAME="smoke_$(date +%s)"
USER_ID="guest_smoke_$(date +%s)_$RANDOM"
ANSWERS=("時間自由" "客源不穩" "怕投資打水漂" "獨特方法" "我的判斷" "重複諮詢" "應該會")

fail() { echo "❌ FAIL: $1"; exit 1; }
pass() { echo "✅ $1"; }

echo "=== Lumi smoke test against $BASE ==="
echo "    user: $USER_ID  name: $NAME"

# Layer 0: service alive
HTTP=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/lumi" || echo "000")
[ "$HTTP" = "200" ] || fail "Layer 0: GET /lumi → HTTP $HTTP (service down or routing broken)"
pass "Layer 0: GET /lumi → 200"

# Layer 1: start session
START=$(curl -sS -X POST "$BASE/api/lumi/session/start" -H "Content-Type: application/json" \
  -d "{\"lineUserId\":\"$USER_ID\",\"displayName\":\"$NAME\"}")
SID=$(echo "$START" | jq -r '.sessionId // empty')
[ -n "$SID" ] || fail "Layer 1: session/start returned no sessionId. Body: $START"
pass "Layer 1: session/start → sessionId=$SID"

# Layer 2: answer 7 questions
LAST_RESP=""
for i in 1 2 3 4 5 6 7; do
  ANS="${ANSWERS[$((i-1))]}"
  LAST_RESP=$(curl -sS -X POST "$BASE/api/lumi/chat/send" -H "Content-Type: application/json" \
    -d "$(jq -n --arg sid "$SID" --arg t "$ANS" '{sessionId:$sid,text:$t}')")
  ERR=$(echo "$LAST_RESP" | jq -r '.error // empty')
  [ -z "$ERR" ] || fail "Layer 2: Q$i errored: $ERR"
done
pass "Layer 2: 7 questions answered without error"

# Layer 3: report generated
GEN=$(echo "$LAST_RESP" | jq -r '.reportGenerated // false')
[ "$GEN" = "true" ] || fail "Layer 3: reportGenerated != true. Last resp: $LAST_RESP"
RURL=$(echo "$LAST_RESP" | jq -r '.reportUrl // empty')
[ -n "$RURL" ] || fail "Layer 3: no reportUrl in response. Last resp: $LAST_RESP"
pass "Layer 3: report generated → $RURL"

# Layer 4: report URL renders (resolve relative url)
case "$RURL" in
  /*) FULL_URL="$BASE$RURL" ;;
  *)  FULL_URL="$RURL" ;;
esac
HTTP=$(curl -sS -o /tmp/smoke-report.html -w "%{http_code}" "$FULL_URL")
[ "$HTTP" = "200" ] || fail "Layer 4: GET reportUrl → HTTP $HTTP"
grep -q "造局診斷報告" /tmp/smoke-report.html || fail "Layer 4: report HTML missing title"
grep -q "lin.ee\|加 LINE" /tmp/smoke-report.html || fail "Layer 4: report HTML missing LINE @ CTA"
grep -q 'href="/live"\|報名 Bago 直播' /tmp/smoke-report.html || fail "Layer 4: report HTML missing 報名直播 CTA → /live"
pass "Layer 4: report HTML has LINE @ CTA + 報名直播 CTA"

# Layer 5: appears in leads dashboard
sleep 1
LEADS=$(curl -sS "$BASE/lumi/leads")
echo "$LEADS" | grep -q "$NAME" || fail "Layer 5: $NAME not in /lumi/leads"
pass "Layer 5: $NAME appears in /lumi/leads"

echo ""
echo "🟢 ALL LAYERS PASSED — Lumi flow end-to-end OK."
echo "    Note: Layer 6 (LINE @ Flex card actually delivered) requires real LINE userId + friend status — manual verify only."
exit 0
