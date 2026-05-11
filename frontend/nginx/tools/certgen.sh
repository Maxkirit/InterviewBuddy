#!/bin/sh
set -eu

echo "[frontend-certgen] installing openssl..."
apk add --no-cache openssl >/dev/null

echo "[frontend-certgen] preparing /tls..."
mkdir -p /tls

if [ ! -f /tls/tls.key ] || [ ! -f /tls/tls.crt ]; then
  echo "[frontend-certgen] generating self-signed certificate..."

  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout /tls/tls.key \
    -out /tls/tls.crt \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:interview-buddy,IP:127.0.0.1"
else
  echo "[frontend-certgen] certificate already exists"
fi

chmod 600 /tls/tls.key
chmod 644 /tls/tls.crt

echo "[frontend-certgen] DONE"
ls -l /tls
