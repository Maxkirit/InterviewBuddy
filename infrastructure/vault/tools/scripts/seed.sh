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

# Build a JSON payload per Vault path, then write once per path.
# For each line: <svc> <kv_path> <field> <secret_name>
TMP_DIR="/tmp/vault-seed"
mkdir -p "$TMP_DIR"

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
  secret_name="$(echo "$line" | awk '{print $4}')"

  if [ -z "$svc" ] || [ -z "$kvpath" ] || [ -z "$field" ] || [ -z "$secret_name" ]; then
    echo "[seed] ERROR: bad line: $line"
    exit 1
  fi

  secret_file="/run/secrets/$secret_name"
  if [ ! -f "$secret_file" ]; then
    echo "[seed] ERROR: missing docker secret file: $secret_file (from $secret_name)"
    exit 1
  fi

  value="$(cat "$secret_file")"

  # We seed only the service's own namespace as a safety net
  expected_prefix="kv/svc/$svc/"
  case "$kvpath" in
    "$expected_prefix"*) : ;;
    *)
      echo "[seed] ERROR: kv path '$kvpath' does not match service prefix '$expected_prefix'"
      exit 1
      ;;
  esac

  # Convert "kv/..." to API v2 "kv/data/..."
  api_path="/v1/$(echo "$kvpath" | sed 's#^kv/#kv/data/#')"

  # tmp file per api_path
  out="$TMP_DIR/$(echo "$api_path" | sed 's#[/ ]#_#g').json"

  # merge field into {"data":{...}}
  if [ -f "$out" ]; then
    jq --arg k "$field" --arg v "$value" '.data[$k]=$v' "$out" > "$out.tmp" && mv "$out.tmp" "$out"
  else
    jq -n --arg k "$field" --arg v "$value" '{data:{($k):$v}}' > "$out"
  fi

  echo "[seed] plan: $kvpath <= $secret_name (field=$field)"
done < "$MANIFEST"

echo "[seed] writing to Vault..."
for f in "$TMP_DIR"/*.json; do
  [ -e "$f" ] || break
  api_path="$(basename "$f" | sed 's#^_v1_##;s#_#/#g')"
  # we reconstructed filename; easier: store api_path inside file name is messy.
  # Instead, we re-derive from file content? We'll do a simple approach:
  # We stored file name based on api path; rebuild it:
  api_path="/$(echo "$(basename "$f" .json)" | sed 's#^_##;s#_#/#g')"

  curl -sS --cacert "$VAULT_CACERT" \
    -H "X-Vault-Token: $ROOT_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST "$VAULT_ADDR$api_path" \
    -d @"$f" >/dev/null

  echo "[seed] wrote $api_path"
done

echo "[seed] DONE"