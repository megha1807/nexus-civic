#!/usr/bin/env bash
set -euo pipefail

# Deterministic CI smoke test for:
# - NearGive (3005)
# - TerraScan (3006)
# - SentinelAI (3007)
#
# Required env:
#   ADMIN_TOKEN=<jwt>
#   OFFICER_TOKEN=<jwt>
#
# Optional env:
#   BASE_NEAR_GIVE=http://localhost:3005
#   BASE_TERRA_SCAN=http://localhost:3006
#   BASE_SENTINEL_AI=http://localhost:3007
#   FIXTURE_SUFFIX=ci
#   SENTINEL_PREDICTION_ID=<existing prediction id>
#   ANALYSIS_POLL_ATTEMPTS=20
#   ANALYSIS_POLL_SLEEP_SEC=2

BASE_NEAR_GIVE="${BASE_NEAR_GIVE:-http://localhost:3005}"
BASE_TERRA_SCAN="${BASE_TERRA_SCAN:-http://localhost:3006}"
BASE_SENTINEL_AI="${BASE_SENTINEL_AI:-http://localhost:3007}"
FIXTURE_SUFFIX="${FIXTURE_SUFFIX:-ci}"
SENTINEL_PREDICTION_ID="${SENTINEL_PREDICTION_ID:-}"
ANALYSIS_POLL_ATTEMPTS="${ANALYSIS_POLL_ATTEMPTS:-20}"
ANALYSIS_POLL_SLEEP_SEC="${ANALYSIS_POLL_SLEEP_SEC:-2}"

ADMIN_TOKEN="${ADMIN_TOKEN:?ADMIN_TOKEN is required}"
OFFICER_TOKEN="${OFFICER_TOKEN:?OFFICER_TOKEN is required}"

PASS=0

log() {
  printf "\n[%s] %s\n" "$1" "$2"
}

request() {
  local name="$1"
  local expected_code="$2"
  shift 2

  local body_file
  body_file="$(mktemp)"

  local code
  code="$(curl -sS -o "$body_file" -w "%{http_code}" "$@")"

  if [[ "$code" != "$expected_code" ]]; then
    printf "FAIL %s (expected %s got %s)\n" "$name" "$expected_code" "$code"
    printf "Body: %s\n" "$(tr '\n' ' ' < "$body_file" | head -c 500)"
    rm -f "$body_file"
    exit 1
  fi

  PASS=$((PASS + 1))
  printf "PASS %s (status %s)\n" "$name" "$code"
  printf "%s" "$body_file"
}

json_field() {
  local file="$1"
  local field="$2"

  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const field = process.argv[2];
    const parts = field.split(".");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    let cur = data;
    for (const p of parts) cur = cur?.[p];
    if (cur == null) process.exit(2);
    process.stdout.write(String(cur));
  ' "$file" "$field"
}

log "NearGive" "Creating fixed NGO fixture and donation, then validating read/update endpoints"

ngo_body="$(request "POST /api/ngos" "201" \
  -X POST "${BASE_NEAR_GIVE}/api/ngos" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Helping Hands ${FIXTURE_SUFFIX}\",\"location\":{\"lat\":19.082,\"lng\":72.88,\"address\":\"Andheri\"},\"acceptedCategories\":[\"clothing\",\"food\"],\"maxCapacity\":250,\"currentLoad\":20,\"rating\":4.7,\"verified\":true,\"contactEmail\":\"ops+${FIXTURE_SUFFIX}@helpinghands.org\"}")"
rm -f "$ngo_body"

request "GET /api/ngos/nearby" "200" \
  -X GET "${BASE_NEAR_GIVE}/api/ngos/nearby?lat=19.0760&lng=72.8777&radiusKm=10" >/dev/null

donation_body="$(request "POST /api/donations" "201" \
  -X POST "${BASE_NEAR_GIVE}/api/donations" \
  -H "Content-Type: application/json" \
  -d "{\"itemName\":\"Blanket-${FIXTURE_SUFFIX}\",\"category\":\"clothing\",\"description\":\"Gently used blanket for shelter homes\",\"lat\":19.0760,\"lng\":72.8777,\"address\":\"Mumbai\"}")"

DONATION_ID="$(json_field "$donation_body" "data._id")"
rm -f "$donation_body"

request "GET /api/donations" "200" \
  -X GET "${BASE_NEAR_GIVE}/api/donations" >/dev/null

request "GET /api/donations/:id" "200" \
  -X GET "${BASE_NEAR_GIVE}/api/donations/${DONATION_ID}" >/dev/null

request "PATCH /api/donations/:id" "200" \
  -X PATCH "${BASE_NEAR_GIVE}/api/donations/${DONATION_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status":"COLLECTED"}' >/dev/null

log "TerraScan" "Triggering analysis, polling to completion, then validating alerts endpoints"

analysis_body="$(request "POST /api/analysis/trigger" "202" \
  -X POST "${BASE_TERRA_SCAN}/api/analysis/trigger" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"regionName\":\"Central Ward ${FIXTURE_SUFFIX}\",\"regionPolygon\":{\"type\":\"Polygon\",\"coordinates\":[[[72.85,19.05],[72.90,19.05],[72.90,19.10],[72.85,19.10],[72.85,19.05]]]}}")"

JOB_ID="$(json_field "$analysis_body" "jobId")"
rm -f "$analysis_body"

attempt=1
ANALYSIS_STATUS="PENDING"
ALERT_ID=""

while [[ "$attempt" -le "$ANALYSIS_POLL_ATTEMPTS" ]]; do
  poll_body="$(request "GET /api/analysis/:jobId (poll ${attempt})" "200" \
    -X GET "${BASE_TERRA_SCAN}/api/analysis/${JOB_ID}")"

  ANALYSIS_STATUS="$(json_field "$poll_body" "status" || true)"
  ALERT_ID="$(json_field "$poll_body" "alertId" || true)"
  rm -f "$poll_body"

  if [[ "$ANALYSIS_STATUS" == "COMPLETED" ]]; then
    break
  fi

  if [[ "$ANALYSIS_STATUS" == "FAILED" ]]; then
    echo "Analysis job failed"
    exit 1
  fi

  attempt=$((attempt + 1))
  sleep "$ANALYSIS_POLL_SLEEP_SEC"
done

if [[ "$ANALYSIS_STATUS" != "COMPLETED" ]]; then
  echo "Analysis job did not complete in time"
  exit 1
fi

request "GET /api/alerts" "200" \
  -X GET "${BASE_TERRA_SCAN}/api/alerts?page=1&limit=5" >/dev/null

if [[ -z "$ALERT_ID" ]]; then
  echo "Completed analysis did not return alertId"
  exit 1
fi

request "GET /api/alerts/:id" "200" \
  -X GET "${BASE_TERRA_SCAN}/api/alerts/${ALERT_ID}" >/dev/null

log "SentinelAI" "Validating prediction endpoints and strict dispatch flow"

request "GET /api/predictions/heatmap" "200" \
  -X GET "${BASE_SENTINEL_AI}/api/predictions/heatmap" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" >/dev/null

zones_body="$(request "GET /api/predictions/top-zones" "200" \
  -X GET "${BASE_SENTINEL_AI}/api/predictions/top-zones" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")"

if [[ -z "$SENTINEL_PREDICTION_ID" ]]; then
  SENTINEL_PREDICTION_ID="$(json_field "$zones_body" "0._id" || true)"
fi
rm -f "$zones_body"

if [[ -z "$SENTINEL_PREDICTION_ID" ]]; then
  echo "No prediction available for dispatch. Provide SENTINEL_PREDICTION_ID or pre-seed predictions."
  exit 1
fi

request "POST /api/dispatch/trigger" "200" \
  -X POST "${BASE_SENTINEL_AI}/api/dispatch/trigger" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"predictionId\":\"${SENTINEL_PREDICTION_ID}\"}" >/dev/null

request "GET /api/dispatch/active (admin)" "200" \
  -X GET "${BASE_SENTINEL_AI}/api/dispatch/active" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" >/dev/null

request "POST /api/dispatch/:id/ack (officer)" "200" \
  -X POST "${BASE_SENTINEL_AI}/api/dispatch/${SENTINEL_PREDICTION_ID}/ack" \
  -H "Authorization: Bearer ${OFFICER_TOKEN}" >/dev/null

log "Result" "All deterministic checks passed: ${PASS} assertions"
