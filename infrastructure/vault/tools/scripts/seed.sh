#!/usr/bin/env sh
set -eu

: "${VAULT_ADDR:?}"
: "${VAULT_CACERT:?}"

apk add --no-cache curl jq >/dev/null

INIT_JSON="/bootstrap/secrets/vault-init.json"
MANIFEST="/bootstrap/tools/seed-manifest.txt"

if [ ! -f "$INIT_JSON" ]; then
  echo "[seed] ERROR: missing $INIT_JSON"
  exit 1
fi

if [ ! -f "$MANIFEST" ]; then
  echo "[seed] ERROR: missing $MANIFEST"
  exit 1
fi

echo "[seed] waiting for Vault API..."
for i in $(seq 1 120); do
  if curl -sS --cacert "$VAULT_CACERT" "$VAULT_ADDR/v1/sys/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

ROOT_TOKEN="$(jq -r .root_token "$INIT_JSON")"
if [ -z "$ROOT_TOKEN" ] || [ "$ROOT_TOKEN" = "null" ]; then
  echo "[seed] ERROR: root token not found in $INIT_JSON"
  exit 1
fi

TMP_DIR="/tmp/vault-seed"
mkdir -p "$TMP_DIR"

STORE="$TMP_DIR/store.json"
echo '{}' > "$STORE"

echo "[seed] reading manifest: $MANIFEST"

while IFS= read -r line || [ -n "$line" ]; do
  # trim
  line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

  # skip empty/comments
  [ -z "$line" ] && continue
  echo "$line" | grep -q '^[#]' && continue

  svc="$(echo "$line" | awk '{print $1}')"
  kvpath="$(echo "$line" | awk '{print $2}')"
  field="$(echo "$line" | awk '{print $3}')"
  source="$(echo "$line" | awk '{print $4}')"

  if [ -z "$svc" ] || [ -z "$kvpath" ] || [ -z "$field" ] || [ -z "$source" ]; then
    echo "[seed] ERROR: bad line: $line"
    exit 1
  fi

  # Safety: a service can only seed its own namespace.
  expected_prefix="kv/svc/$svc/"
  case "$kvpath" in
    "$expected_prefix"*) : ;;
    *)
      echo "[seed] ERROR: kv path '$kvpath' does not match service prefix '$expected_prefix'"
      exit 1
      ;;
  esac

  case "$source" in
    literal:*)
      value="${source#literal:}"
      display="$source"
      ;;
    secret:*)
      secret_name="${source#secret:}"
      secret_file="/run/secrets/$secret_name"

      if [ ! -f "$secret_file" ]; then
        echo "[seed] ERROR: missing docker secret file: $secret_file (from $source)"
        exit 1
      fi

      value="$(cat "$secret_file")"
      display="$source"
      ;;
    *)
      # Backward-compatible mode:
      # fourth field is directly interpreted as a Docker secret name.
      secret_name="$source"
      secret_file="/run/secrets/$secret_name"

      if [ ! -f "$secret_file" ]; then
        echo "[seed] ERROR: missing docker secret file: $secret_file (from $source)"
        exit 1
      fi

      value="$(cat "$secret_file")"
      display="secret:$source"
      ;;
  esac

  # Convert CLI path "kv/..." to KV v2 API path "/v1/kv/data/..."
  api_path="/v1/$(echo "$kvpath" | sed 's#^kv/#kv/data/#')"

  # Merge into one JSON payload per Vault API path:
  # {
  #   "/v1/kv/data/svc/auth/db": {
  #     "data": {
  #       "host": "...",
  #       "password": "..."
  #     }
  #   }
  # }
  jq --arg p "$api_path" \
     --arg k "$field" \
     --arg v "$value" \
     '.[$p].data[$k] = $v' \
     "$STORE" > "$STORE.tmp"

  mv "$STORE.tmp" "$STORE"

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

  curl -sS --fail --cacert "$VAULT_CACERT" \
    -H "X-Vault-Token: $ROOT_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST "$VAULT_ADDR$api_path" \
    -d @"$payload" >/dev/null

  echo "[seed] wrote $api_path"
done

echo "[seed] DONE"