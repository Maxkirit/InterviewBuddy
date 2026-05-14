#!/usr/bin/env sh
set -eu

echo "[seed] RUN started at $(date -Iseconds)"
echo "[seed] container hostname: $(hostname)"

: "${VAULT_ADDR:?}"
: "${VAULT_CACERT:?}"

apk add --no-cache curl jq openssl >/dev/null

INIT_JSON="/bootstrap/secrets/vault-init.json"
MANIFEST="/bootstrap/tools/seed-manifest.txt"

if [ ! -f "$INIT_JSON" ]; then
  echo "[seed] ERROR: missing $INIT_JSON" >&2
  exit 1
fi

if [ ! -f "$MANIFEST" ]; then
  echo "[seed] ERROR: missing $MANIFEST" >&2
  exit 1
fi

TMP_DIR="/tmp/vault-seed"
mkdir -p "$TMP_DIR"

STORE="$TMP_DIR/store.json"
SECRET_CACHE="$TMP_DIR/secret-cache.json"

echo '{}' > "$STORE"
echo '{}' > "$SECRET_CACHE"

echo "[seed] waiting for Vault API..."

VAULT_READY=0

for i in $(seq 1 120); do
  if curl -sS --cacert "$VAULT_CACERT" "$VAULT_ADDR/v1/sys/health" >/dev/null 2>&1; then
    VAULT_READY=1
    break
  fi
  sleep 1
done

if [ "$VAULT_READY" != "1" ]; then
  echo "[seed] ERROR: Vault API did not become reachable" >&2
  exit 1
fi

ROOT_TOKEN="$(jq -r .root_token "$INIT_JSON")"

if [ -z "$ROOT_TOKEN" ] || [ "$ROOT_TOKEN" = "null" ]; then
  echo "[seed] ERROR: root token not found in $INIT_JSON" >&2
  exit 1
fi

kv_to_api_path() {
  kvpath="$1"

  echo "/v1/$(echo "$kvpath" | sed 's#^kv/#kv/data/#')"
}

read_kv_data() {
  api_path="$1"
  out="$TMP_DIR/read.json"

  code="$(
    curl -sS \
      --cacert "$VAULT_CACERT" \
      -H "X-Vault-Token: $ROOT_TOKEN" \
      -o "$out" \
      -w "%{http_code}" \
      "$VAULT_ADDR$api_path" || true
  )"

  case "$code" in
    200)
      jq '.data.data // {}' "$out"
      ;;
    404)
      echo '{}'
      ;;
    *)
      echo "[seed] ERROR: failed to read $api_path from Vault, HTTP $code" >&2
      cat "$out" >&2 || true
      exit 1
      ;;
  esac
}

read_kv_field_or_empty() {
  api_path="$1"
  field="$2"

  read_kv_data "$api_path" \
    | jq -er --arg k "$field" 'select(.[$k] != null) | .[$k]' 2>/dev/null \
    || true
}

cache_has_secret() {
  secret_name="$1"

  jq -e --arg k "$secret_name" 'has($k)' "$SECRET_CACHE" >/dev/null
}

cache_get_secret() {
  secret_name="$1"

  jq -r --arg k "$secret_name" '.[$k]' "$SECRET_CACHE"
}

cache_set_secret() {
  secret_name="$1"
  value="$2"

  jq --arg k "$secret_name" \
     --arg v "$value" \
     '.[$k] = $v' \
     "$SECRET_CACHE" > "$SECRET_CACHE.tmp"

  mv "$SECRET_CACHE.tmp" "$SECRET_CACHE"
}

vault_random_base64() {
  bytes="${1:-32}"
  out="$TMP_DIR/random.json"

  curl -sS --fail \
    --cacert "$VAULT_CACERT" \
    -H "X-Vault-Token: $ROOT_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST "$VAULT_ADDR/v1/sys/tools/random/$bytes" \
    -d '{"format":"base64"}' > "$out"

  jq -r '.data.random_bytes' "$out"
}

generate_secret_value() {
  secret_name="$1"

  case "$secret_name" in
    svc_auth_jwt_private_key)
      openssl genrsa 2048 2>/dev/null
      ;;
    *)
      vault_random_base64 32
      ;;
  esac
}

get_or_create_secret_value() {
  secret_name="$1"

  if cache_has_secret "$secret_name"; then
    echo "[seed] reused cached secret:$secret_name" >&2
    cache_get_secret "$secret_name"
    return
  fi

  value="$(generate_secret_value "$secret_name")"
  cache_set_secret "$secret_name" "$value"

  echo "[seed] generated new secret:$secret_name" >&2
  echo "$value"
}

init_store_path_if_needed() {
  api_path="$1"

  if jq -e --arg p "$api_path" 'has($p)' "$STORE" >/dev/null; then
    return
  fi

  existing_data="$(read_kv_data "$api_path")"

  jq --arg p "$api_path" \
     --argjson data "$existing_data" \
     '.[$p] = {data: $data}' \
     "$STORE" > "$STORE.tmp"

  mv "$STORE.tmp" "$STORE"
}

put_store_field() {
  api_path="$1"
  field="$2"
  value="$3"

  init_store_path_if_needed "$api_path"

  jq --arg p "$api_path" \
     --arg k "$field" \
     --arg v "$value" \
     '.[$p].data[$k] = $v' \
     "$STORE" > "$STORE.tmp"

  mv "$STORE.tmp" "$STORE"
}

write_if_changed() {
  api_path="$1"
  payload="$2"

  current="$TMP_DIR/current.json"
  planned="$TMP_DIR/planned.json"

  read_kv_data "$api_path" > "$current"
  jq '.data' "$payload" > "$planned"

  if jq -e --slurp '.[0] == .[1]' "$current" "$planned" >/dev/null; then
    echo "[seed] unchanged $api_path, skipping write"
    return
  fi

  curl -sS --fail \
    --cacert "$VAULT_CACERT" \
    -H "X-Vault-Token: $ROOT_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST "$VAULT_ADDR$api_path" \
    -d @"$payload" >/dev/null

  echo "[seed] wrote $api_path"
}

parse_manifest_line() {
  line="$1"

  svc="$(echo "$line" | awk '{print $1}')"
  kvpath="$(echo "$line" | awk '{print $2}')"
  field="$(echo "$line" | awk '{print $3}')"
  source="$(echo "$line" | awk '{print $4}')"

  if [ -z "$svc" ] || [ -z "$kvpath" ] || [ -z "$field" ] || [ -z "$source" ]; then
    echo "[seed] ERROR: bad line: $line" >&2
    exit 1
  fi

  expected_prefix="kv/svc/$svc/"

  case "$kvpath" in
    "$expected_prefix"*)
      :
      ;;
    *)
      echo "[seed] ERROR: kv path '$kvpath' does not match service prefix '$expected_prefix'" >&2
      exit 1
      ;;
  esac
}

echo "[seed] pre-scan existing secrets from Vault..."

while IFS= read -r line || [ -n "$line" ]; do
  line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

  [ -z "$line" ] && continue
  echo "$line" | grep -q '^[#]' && continue

  parse_manifest_line "$line"

  case "$source" in
    secret:*)
      secret_name="${source#secret:}"
      api_path="$(kv_to_api_path "$kvpath")"
      existing_value="$(read_kv_field_or_empty "$api_path" "$field")"

      if [ -n "$existing_value" ]; then
        if cache_has_secret "$secret_name"; then
          cached_value="$(cache_get_secret "$secret_name")"

          if [ "$cached_value" != "$existing_value" ]; then
            echo "[seed] ERROR: inconsistent existing values for secret:$secret_name" >&2
            echo "[seed]        conflict found at $kvpath field=$field" >&2
            exit 1
          fi
        else
          cache_set_secret "$secret_name" "$existing_value"
          echo "[seed] found existing secret:$secret_name at $kvpath field=$field"
        fi
      fi
      ;;
    literal:*)
      :
      ;;
    *)
      echo "[seed] ERROR: unsupported source '$source' in line: $line" >&2
      echo "[seed]        expected literal:<value> or secret:<name>" >&2
      exit 1
      ;;
  esac
done < "$MANIFEST"

echo "[seed] cached secrets after pre-scan:"

if [ "$(jq 'keys | length' "$SECRET_CACHE")" = "0" ]; then
  echo "[seed]   <none>"
else
  jq -r 'keys[]' "$SECRET_CACHE" | sed 's/^/[seed]   - /'
fi

echo "[seed] reading manifest and building write plan: $MANIFEST"

while IFS= read -r line || [ -n "$line" ]; do
  line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

  [ -z "$line" ] && continue
  echo "$line" | grep -q '^[#]' && continue

  parse_manifest_line "$line"

  api_path="$(kv_to_api_path "$kvpath")"

  case "$source" in
    literal:*)
      value="${source#literal:}"
      display="$source"
      ;;
    secret:*)
      secret_name="${source#secret:}"
      value="$(get_or_create_secret_value "$secret_name")"
      display="$source"

      if ! cache_has_secret "$secret_name"; then
        echo "[seed] ERROR: internal cache failure for $secret_name" >&2
        exit 1
      fi
      ;;
    *)
      echo "[seed] ERROR: unsupported source '$source' in line: $line" >&2
      exit 1
      ;;
  esac

  put_store_field "$api_path" "$field" "$value"

  echo "[seed] plan: $kvpath <= $display (field=$field)"
done < "$MANIFEST"

COUNT="$(jq 'keys | length' "$STORE")"

if [ "$COUNT" = "0" ]; then
  echo "[seed] nothing to write"
  echo "[seed] DONE"
  exit 0
fi

echo "[seed] writing to Vault..."

jq -r 'keys[]' "$STORE" | while IFS= read -r api_path; do
  payload="$TMP_DIR/payload.json"

  jq --arg p "$api_path" '.[$p]' "$STORE" > "$payload"

  write_if_changed "$api_path" "$payload"
done

echo "[seed] DONE"