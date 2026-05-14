# Where we store log files produced by the Vault orchestration script (tools/vault_up.sh)
LOG_DIR := ./logs

.PHONY: vault-up vault-reset app-up app-build reset-all

all: vault-up app-up

re: reset-all vault-up app-build


# ---------------------------
# VAULT STACK (profile=vault)
# ---------------------------

# Bring up the Vault stack in the correct order (certgen -> vault -> bootstrap -> seed),
# and write per-service logs into LOG_DIR.
# This is the "prepare Vault" step that must be run before starting services that depend on Vault.
vault-up:
	@LOG_DIR=$(LOG_DIR) ./tools/vault_up.sh

# Stop the Vault stack and remove its volumes (wipe Vault data, TLS, init material, creds, etc.).
# --remove-orphans removes containers that were created earlier but are no longer referenced.
vault-reset:
	@docker compose --profile vault down -v --remove-orphans

# Full reset: stop EVERYTHING (vault + app) and remove ALL associated volumes.
reset-all:
	@docker compose --profile vault --profile app down -v --remove-orphans


# ---------------------------
# APPLICATION STACK (profile=app)
# ---------------------------

# Start all "app" services without rebuilding images (fast iteration).
# Use this after `make vault-up` when Vault is ready.
app-up:
	@docker compose --profile app up -d

# Start all "app" services and rebuild images (when code/Dockerfiles changed).
app-build:
	@docker compose --profile app up -d --build
