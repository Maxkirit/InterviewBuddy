#!/usr/bin/env sh
set -eu

CERT="/vault/tls/vault.crt"
KEY="/vault/tls/vault.key"
HCL="/vault/config/vault.hcl"

echo "[vault] waiting for TLS files: $CERT and $KEY"

i=0
while true; do
  i=$((i+1))
  if [ "$i" -gt 60 ]; then
    echo "[vault] ERROR: TLS files not found after 60s"
    ls -l /vault/tls || true
    exit 1
  fi

  if [ -f "$CERT" ] && [ -f "$KEY" ]; then
    break
  fi

  sleep 1
done

echo "[vault] TLS files present, starting Vault..."
exec /bin/vault server -config="$HCL"