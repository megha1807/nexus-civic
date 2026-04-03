#!/usr/bin/env bash
set -u

# Mission smoke test for:
# - NearGive (3005)
# - TerraScan (3006)
# - SentinelAI (3007)
#
# Usage:
#   chmod +x scripts/smoke-mission-routes.sh
#   ADMIN_TOKEN=<jwt> OFFICER_TOKEN=<jwt> ./scripts/smoke-mission-routes.sh
#
# Optional env vars:
#   BASE_NEAR_GIVE=http://localhost:3005
#   BASE_TERRA_SCAN=http://localhost:3006
#   BASE_SENTINEL_AI=http://localhost:3007

BASE_NEAR_GIVE="${BASE_NEAR_GIVE:-http://localhost:3005}"
BASE_TERRA_SCAN="${BASE_TERRA_SCAN:-http://localhost:3006}"
BASE_SENTINEL_AI="${BASE_SENTINEL_AI:-http://localhost:3007}"

ADMIN_TOKEN="${ADMIN_TOKEN:-}"
OFFICER_TOKEN="${OFFICER_TOKEN:-}"

PASS=0
FAIL=0
DONATION_ID=""
ANALYSIS_JOB_ID=""
PREDICTION_ID=""

print_step() {
  printf "\n[%s] %s\n" "$1" "$2"
}

run_request() {
  local name="$1"
  local expected="$2"
  shift 2

  local tmp_body
  tmp_body="$(mktemp)"

  local code
  code="$(curl -sS -o "$tmp_body" -w "%{http_code}" "$@")"

  if [[ "$code" == "$expected" ]]; then
    printf "PASS  %s (status %s)\n" "$name" "$code"
    PASS=$((PASS + 1))
  else
    printf "FAIL  %s (expected %s got %s)\n" "$name" "$expected" "$code"
    printf "      body: %s\n" "$(tr '\n' ' ' < "$tmp_body" | head -c 260)"
    FAIL=$((FAIL + 1))
  fi

  rm -f "$tmp_body"
}

extract_json_field() {
  local url="$1"
  local field="$2"
  local header_name="${3:-}"
  local header_value="${4:-}"

  local tmp_body
  tmp_body="$(mktemp)"

  if [[ -n "$header_name" ]]; then
    curl -sS -H "$header_name: $header_value" "$url" > "$tmp_body"
  else
    curl -sS "$url" > "$tmp_body"
  fi

  local value
  value="$(node -e '
    const fs = require("fs");
    const f = process.argv[1];
    const field = process.argv[2];
    try {
      const j = JSON.parse(fs.readFileSync(f, "utf8"));
      const parts = field.split(".");
      let cur = j;
      for (const p of parts) {
        cur = cur?.[p];
      }
      process.stdout.write(cur == null ? "" : String(cur));
    } catch {
      process.stdout.write("");
    }
  ' "$tmp_body" "$field")"

  rm -f "$tmp_body"
  printf "%s" "$value"
}

print_step "NearGive" "Checking donation and NGO routes on ${BASE_NEAR_GIVE}"

run_request "GET /api/donations (public)" "200" \
  -X GET "${BASE_NEAR_GIVE}/api/donations"

run_request "POST /api/donations (optionalAuth + multer, no file fallback)" "201" \
  -X POST "${BASE_NEAR_GIVE}/api/donations" \
  -H "Content-Type: application/json" \
  -d '{"itemName":"Blanket","category":"clothing","description":"Gently used blanket","lat":19.0760,"lng":72.8777,"address":"Mumbai"}'

DONATION_ID="$(extract_json_field "${BASE_NEAR_GIVE}/api/donations" "data.0._id")"

if [[ -n "$DONATION_ID" ]]; then
  run_request "GET /api/donations/:id (public)" "200" \
    -X GET "${BASE_NEAR_GIVE}/api/donations/${DONATION_ID}"

  if [[ -n "$ADMIN_TOKEN" ]]; then
    run_request "PATCH /api/donations/:id (authenticate)" "200" \
      -X PATCH "${BASE_NEAR_GIVE}/api/donations/${DONATION_ID}" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"status":"COLLECTED"}'
  else
    printf "SKIP  PATCH /api/donations/:id (set ADMIN_TOKEN to test authenticated path)\n"
  fi
else
  printf "SKIP  GET/PATCH donation by id (could not infer DONATION_ID)\n"
fi

if [[ -n "$ADMIN_TOKEN" ]]; then
  run_request "POST /api/ngos (admin only)" "201" \
    -X POST "${BASE_NEAR_GIVE}/api/ngos" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"name":"Helping Hands NGO","location":{"lat":19.082,"lng":72.88,"address":"Andheri"},"acceptedCategories":["clothing","food"],"maxCapacity":200,"currentLoad":10,"rating":4.6,"verified":true,"contactEmail":"ops@helpinghands.org"}'
else
  printf "SKIP  POST /api/ngos (set ADMIN_TOKEN to test admin path)\n"
fi

run_request "GET /api/ngos/nearby (public)" "200" \
  -X GET "${BASE_NEAR_GIVE}/api/ngos/nearby?lat=19.0760&lng=72.8777&radiusKm=5"

print_step "TerraScan" "Checking analysis and alerts routes on ${BASE_TERRA_SCAN}"

if [[ -n "$ADMIN_TOKEN" ]]; then
  run_request "POST /api/analysis/trigger (admin only)" "202" \
    -X POST "${BASE_TERRA_SCAN}/api/analysis/trigger" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"regionName":"Central Ward","regionPolygon":{"type":"Polygon","coordinates":[[[72.85,19.05],[72.90,19.05],[72.90,19.10],[72.85,19.10],[72.85,19.05]]]}}'

  ANALYSIS_JOB_ID="$(extract_json_field "${BASE_TERRA_SCAN}/api/analysis/trigger" "jobId" "Authorization" "Bearer ${ADMIN_TOKEN}")"
  if [[ -z "$ANALYSIS_JOB_ID" ]]; then
    ANALYSIS_JOB_ID="manual-job-id"
  fi
else
  printf "SKIP  POST /api/analysis/trigger (set ADMIN_TOKEN to test admin path)\n"
  ANALYSIS_JOB_ID="manual-job-id"
fi

run_request "GET /api/analysis/:jobId (public)" "200" \
  -X GET "${BASE_TERRA_SCAN}/api/analysis/${ANALYSIS_JOB_ID}"

run_request "GET /api/alerts (public)" "200" \
  -X GET "${BASE_TERRA_SCAN}/api/alerts?page=1&limit=5"

ALERT_ID="$(extract_json_field "${BASE_TERRA_SCAN}/api/alerts?page=1&limit=1" "alerts.0._id")"
if [[ -n "$ALERT_ID" ]]; then
  run_request "GET /api/alerts/:id (public)" "200" \
    -X GET "${BASE_TERRA_SCAN}/api/alerts/${ALERT_ID}"
else
  printf "SKIP  GET /api/alerts/:id (no alert available yet)\n"
fi

print_step "SentinelAI" "Checking predictions and dispatch routes on ${BASE_SENTINEL_AI}"

if [[ -n "$ADMIN_TOKEN" ]]; then
  run_request "GET /api/predictions/heatmap (admin)" "200" \
    -X GET "${BASE_SENTINEL_AI}/api/predictions/heatmap" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}"

  run_request "GET /api/predictions/top-zones (admin)" "200" \
    -X GET "${BASE_SENTINEL_AI}/api/predictions/top-zones" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}"
else
  printf "SKIP  Admin prediction routes (set ADMIN_TOKEN)\n"
fi

if [[ -n "$ADMIN_TOKEN" ]]; then
  PREDICTION_ID="$(extract_json_field "${BASE_SENTINEL_AI}/api/predictions/top-zones" "0._id" "Authorization" "Bearer ${ADMIN_TOKEN}")"
fi

if [[ -n "$ADMIN_TOKEN" && -n "$PREDICTION_ID" ]]; then
  run_request "POST /api/dispatch/trigger (admin)" "200" \
    -X POST "${BASE_SENTINEL_AI}/api/dispatch/trigger" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"predictionId\":\"${PREDICTION_ID}\"}"
else
  printf "SKIP  POST /api/dispatch/trigger (need ADMIN_TOKEN and prediction data)\n"
fi

if [[ -n "$ADMIN_TOKEN" ]]; then
  run_request "GET /api/dispatch/active (admin+officer)" "200" \
    -X GET "${BASE_SENTINEL_AI}/api/dispatch/active" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}"
else
  printf "SKIP  GET /api/dispatch/active (set ADMIN_TOKEN or OFFICER_TOKEN)\n"
fi

if [[ -n "$OFFICER_TOKEN" && -n "$PREDICTION_ID" ]]; then
  run_request "POST /api/dispatch/:id/ack (officer)" "200" \
    -X POST "${BASE_SENTINEL_AI}/api/dispatch/${PREDICTION_ID}/ack" \
    -H "Authorization: Bearer ${OFFICER_TOKEN}"
else
  printf "SKIP  POST /api/dispatch/:id/ack (need OFFICER_TOKEN and prediction data)\n"
fi

printf "\nSummary: PASS=%s FAIL=%s\n" "$PASS" "$FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
