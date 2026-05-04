# Where we store log files produced by the Vault orchestration script (tools/vault_up.sh)
LOG_DIR := ./logs

# Declare these targets as "phony". Make will always run them when called.
.PHONY: vault-up vault-reset app-up app-build test-up test-build test-all test-logs reset-all status

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

# Full reset: stop EVERYTHING (vault + app + test) and remove ALL associated volumes.
reset-all:
	@docker compose --profile vault --profile app --profile test down -v --remove-orphans


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


# ---------------------------
# TEST STACK (profile=test)
# ---------------------------

# Start the vault-test container (requires the vault profile too because it depends on vault services).
# Note: this does NOT guarantee Vault bootstrap/seed order by itself; that's why we usually run `make vault-up` first.
test-up:
	@docker compose --profile vault --profile test up -d

# Same as test-up but rebuilds images.
test-build:
	@docker compose --profile vault --profile test up -d --build

# Convenience: run the full Vault preparation + start the test container + show last 200 lines of its logs.
# The small sleep avoids a race where logs are still empty right after the container starts.
test-all:
	@$(MAKE) vault-up
	@$(MAKE) test-up
	@sleep 2
	@docker compose --profile vault --profile test logs --tail=200 vault-test

# Show last 200 lines of vault-test logs (useful for quick debugging).
test-logs:
	@docker compose --profile vault --profile test logs --tail=200 vault-test