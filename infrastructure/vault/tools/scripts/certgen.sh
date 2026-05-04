#!/usr/bin/env sh
set -eu

TLS_DIR="/tls"

CA_KEY="$TLS_DIR/ca.key"
CA_CRT="$TLS_DIR/ca.crt"
VAULT_KEY="$TLS_DIR/vault.key"
VAULT_CSR="$TLS_DIR/vault.csr"
VAULT_CRT="$TLS_DIR/vault.crt"
VAULT_EXT="$TLS_DIR/vault.ext"

: "${VAULT_UID:?}"
: "${VAULT_GID:?}"

mkdir -p "$TLS_DIR"

# Idempotent: if certs already exist, do nothing
if [ -f "$CA_CRT" ] && [ -f "$VAULT_CRT" ] && [ -f "$VAULT_KEY" ]; then
  echo "[certgen] TLS certs already exist in $TLS_DIR"
  ls -l "$TLS_DIR"
  exit 0
fi

echo "[certgen] Installing openssl..."
apk add --no-cache openssl >/dev/null

echo "[certgen] Generating CA + Vault server certs in $TLS_DIR"

# 1) CA key + cert (10 years)
openssl genrsa -out "$CA_KEY" 4096
openssl req -x509 -new -nodes -key "$CA_KEY" -sha256 -days 3650 \
  -subj "/CN=InterviewBuddy Vault Dev CA" \
  -out "$CA_CRT"

# 2) Vault server key + CSR
openssl genrsa -out "$VAULT_KEY" 4096
openssl req -new -key "$VAULT_KEY" -subj "/CN=vault" -out "$VAULT_CSR"

# 3) SAN file: IMPORTANT for TLS validity
cat > "$VAULT_EXT" <<EOF
subjectAltName = @alt_names
extendedKeyUsage = serverAuth
keyUsage = digitalSignature, keyEncipherment

[alt_names]
DNS.1 = vault
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

# 4) Sign server cert
openssl x509 -req -in "$VAULT_CSR" -CA "$CA_CRT" -CAkey "$CA_KEY" -CAcreateserial \
  -out "$VAULT_CRT" -days 825 -sha256 -extfile "$VAULT_EXT"

# Make Vault able to read its TLS key without world-readable perms
chown "${VAULT_UID}:${VAULT_GID}" "$VAULT_KEY" "$VAULT_CRT" "$CA_CRT"

chmod 600 "$CA_KEY" "$VAULT_KEY"
chmod 644 "$CA_CRT" "$VAULT_CRT"

echo "[certgen] Done. Contents:"
ls -l "$TLS_DIR"