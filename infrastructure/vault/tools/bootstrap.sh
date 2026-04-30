#!/usr/bin/env sh
set -eu

: "${VAULT_ADDR:?}"
: "${VAULT_CACERT:?}"

# Tools needed (Vault image is Alpine-based)
apk add --no-cache curl jq >/dev/null

# Init material: persistent, NOT on repo/host
SECRETS_DIR="/bootstrap/secrets"
INIT_JSON="$SECRETS_DIR/vault-init.json"

# Per-service creds export (host gitignored)
CREDS_OUT_DIR="/bootstrap/creds-out"

# Inputs (mounted read-only)
POLICY_DIR="/bootstrap/policies"
SERVICES_FILE="/bootstrap/tools/services.txt"

mkdir -p "$SECRETS_DIR" "$CREDS_OUT_DIR"

echo "[bootstrap] VAULT_ADDR=$VAULT_ADDR"
echo "[bootstrap] waiting for Vault API..."

# Wait for Vault API to be reachable over HTTPS
i=0
while true; do
  i=$((i+1))
  if [ "$i" -gt 120 ]; then
    echo "[bootstrap] ERROR: Vault API not reachable"
    exit 1
  fi

  if curl -sS --cacert "$VAULT_CACERT" "$VAULT_ADDR/v1/sys/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
echo "[bootstrap] Vault API reachable"

# Init / ensure we have init material
if vault operator init -status >/dev/null 2>&1; then
  echo "[bootstrap] Vault already initialized"
  if [ ! -f "$INIT_JSON" ]; then
    echo "[bootstrap] ERROR: $INIT_JSON missing but Vault is initialized."
    echo "[bootstrap]        Cannot auto-unseal without unseal keys/root token."
    echo "[bootstrap]        Either restore $INIT_JSON (volume) or reset Vault state (docker compose down -v)."
    exit 1
  fi
else
  echo "[bootstrap] Vault not initialized -> initializing"
  umask 077
  vault operator init -format=json -key-shares=5 -key-threshold=3 > "$INIT_JSON"
  echo "[bootstrap] wrote $INIT_JSON"
fi

# Unseal if needed
SEALED="$(vault status -format=json | jq -r .sealed)"
if [ "$SEALED" = "true" ]; then
  echo "[bootstrap] Vault is sealed -> unsealing"
  for n in 0 1 2; do
    key="$(jq -r ".unseal_keys_b64[$n]" "$INIT_JSON")"
    vault operator unseal "$key" >/dev/null
  done
else
  echo "[bootstrap] Vault already unsealed"
fi

# Login with root token
ROOT_TOKEN="$(jq -r .root_token "$INIT_JSON")"
vault login "$ROOT_TOKEN" >/dev/null
echo "[bootstrap] logged in (root)"

# Enable KV v2 if not enabled
if vault secrets list -format=json | jq -e '."kv/"' >/dev/null 2>&1; then
  echo "[bootstrap] kv/ already enabled"
else
  echo "[bootstrap] enabling kv v2 at kv/"
  vault secrets enable -version=2 kv >/dev/null
fi

# Ensure AppRole auth enabled
if vault auth list -format=json | jq -e '."approle/"' >/dev/null 2>&1; then
  echo "[bootstrap] approle auth already enabled"
else
  echo "[bootstrap] enabling approle auth"
  vault auth enable approle >/dev/null
fi

# Sanity: services file must exist
if [ ! -f "$SERVICES_FILE" ]; then
  echo "[bootstrap] ERROR: missing $SERVICES_FILE"
  echo "[bootstrap]        Create it (e.g. with one line: auth)"
  exit 1
fi

echo "[bootstrap] provisioning services from $SERVICES_FILE"

# Read services list, ignore empty lines + comments
# Convention: service "auth" => role "svc-auth", policy "svc-auth-read", policy file "svc-auth-read.hcl"
while IFS= read -r svc || [ -n "$svc" ]; do
  # trim spaces
  svc="$(echo "$svc" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  # skip empty or comments
  [ -z "$svc" ] && continue
  echo "$svc" | grep -q '^[#]' && continue

  ROLE="svc-$svc"
  POLICY_NAME="svc-$svc-read"
  POLICY_FILE="$POLICY_DIR/$POLICY_NAME.hcl"

  if [ ! -f "$POLICY_FILE" ]; then
    echo "[bootstrap] ERROR: policy file missing for $svc: $POLICY_FILE"
    echo "[bootstrap]        Create it (KV v2 paths: kv/data/svc/$svc/* and kv/metadata/svc/$svc/*)."
    exit 1
  fi

  echo "[bootstrap] service=$svc role=$ROLE policy=$POLICY_NAME"

  # Apply policy (idempotent)
  vault policy write "$POLICY_NAME" "$POLICY_FILE" >/dev/null

  # Create/Update AppRole (idempotent)
  vault write "auth/approle/role/$ROLE" token_policies="$POLICY_NAME" >/dev/null

  # Export RoleID/SecretID (for docker secrets / mounts)
  ROLE_ID="$(vault read -field=role_id "auth/approle/role/$ROLE/role-id")"
  SECRET_ID="$(vault write -f -field=secret_id "auth/approle/role/$ROLE/secret-id")"

  umask 077
  echo "$ROLE_ID" > "$CREDS_OUT_DIR/$ROLE.role_id"
  echo "$SECRET_ID" > "$CREDS_OUT_DIR/$ROLE.secret_id"

  echo "[bootstrap] wrote $CREDS_OUT_DIR/$ROLE.role_id and $CREDS_OUT_DIR/$ROLE.secret_id"
done < "$SERVICES_FILE"

echo "[bootstrap] DONE"