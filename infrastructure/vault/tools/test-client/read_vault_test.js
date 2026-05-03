// read_vault_test.js
const fs = require("fs");

const VAULT_ADDR = process.env.VAULT_ADDR;
const ROLE_ID_FILE = process.env.ROLE_ID_FILE;
const SECRET_ID_FILE = process.env.SECRET_ID_FILE;
const KV_API_PATH = process.env.VAULT_KV_API_PATH;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Vault can briefly return 503 "Vault is sealed" during startup/unseal windows.
 * This retry keeps the test (and real services) resilient without adding bash wait scripts everywhere.
 */
async function loginWithRetry(role_id, secret_id, attempts = 30) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(`${VAULT_ADDR}/v1/auth/approle/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id, secret_id }),
    });

    if (res.ok) return res.json();

    const txt = await res.text();

    // Retry only on the transient sealed case
    if (res.status === 503 && txt.includes("sealed")) {
      await sleep(1000);
      continue;
    }

    throw new Error(`login failed: HTTP ${res.status} ${txt}`);
  }
  throw new Error("login failed: Vault stayed sealed too long");
}

async function kvGetWithRetry(path, token, attempts = 30) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(`${VAULT_ADDR}${path}`, {
      headers: { "X-Vault-Token": token },
    });

    if (res.ok) return res.json();

    const txt = await res.text();

    // KV v2 can briefly return 404 if seed is still writing or during startup windows
    if (res.status === 404) {
      await sleep(1000);
      continue;
    }

    throw new Error(`kv get failed: HTTP ${res.status} ${txt}`);
  }
  throw new Error("kv get failed: secret not found after retries");
}

async function main() {
  if (!VAULT_ADDR) throw new Error("VAULT_ADDR is not set");
  if (!ROLE_ID_FILE) throw new Error("ROLE_ID_FILE is not set");
  if (!SECRET_ID_FILE) throw new Error("SECRET_ID_FILE is not set");
  if (!KV_API_PATH) throw new Error("VAULT_KV_API_PATH is not set");

  const role_id = fs.readFileSync(ROLE_ID_FILE, "utf8").trim();
  const secret_id = fs.readFileSync(SECRET_ID_FILE, "utf8").trim();

  // 1) AppRole login => token (with retry)
  const loginJson = await loginWithRetry(role_id, secret_id);
  const token = loginJson?.auth?.client_token;
  if (!token) throw new Error("login ok but no client_token in response");

  // 2) Read KV v2 secret (API path uses /data/)
  const kvJson = await kvGetWithRetry(KV_API_PATH, token);
  console.log("[svc-vault-test] OK: secret read");
  console.log(JSON.stringify(kvJson, null, 2));
}

main().catch((e) => {
  console.error("[svc-vault-test] ERROR:", e.message);
  process.exit(1);
});