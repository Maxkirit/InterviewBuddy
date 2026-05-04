#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="${LOG_DIR:-./logs}"
mkdir -p "$LOG_DIR"

capture_logs() {
  local svc="$1"
  docker compose logs --no-color --tail=400 "$svc" > "$LOG_DIR/$svc.log" 2>&1 || true
}

wait_for_log() {
  local svc="$1"
  local pattern="$2"
  local timeout="${3:-180}"
  local start
  start="$(date +%s)"

  echo "[vault_up] waiting for $svc: /$pattern/ (timeout ${timeout}s)"
  while true; do
    capture_logs "$svc"
    if grep -qE "$pattern" "$LOG_DIR/$svc.log" 2>/dev/null; then
      echo "[vault_up] ok: $svc matched /$pattern/"
      return 0
    fi
    if (( $(date +%s) - start > timeout )); then
      echo "[vault_up] ERROR: timeout waiting for $svc /$pattern/"
      tail -n 120 "$LOG_DIR/$svc.log" || true
      return 1
    fi
    sleep 1
  done
}

echo "[vault_up] === VAULT STACK (profile=vault) ==="
docker compose --profile vault up -d --build vault-certgen vault
wait_for_log vault "Vault server started" 180

docker compose --profile vault up -d --no-build --no-recreate vault-bootstrap
wait_for_log vault-bootstrap "\[bootstrap\] DONE" 240

docker compose --profile vault up -d --no-build --no-recreate vault-seed
wait_for_log vault-seed "\[seed\] DONE" 180

echo "[vault_up] DONE. Logs written to $LOG_DIR/"
capture_logs vault-certgen
capture_logs vault
capture_logs vault-bootstrap
capture_logs vault-seed