exit_after_auth = true
pid_file = "/tmp/vault-agent-auth.pid"

vault {
  address = "https://vault:8200"
  ca_cert = "/vault/tls/ca.crt"
}

auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path   = "/vault/creds/auth.role_id"
      secret_id_file_path = "/vault/creds/auth.secret_id"
      remove_secret_id_file_after_reading = false
    }
  }
}

template_config {
  exit_on_retry_failure = true
}

template {
  source      = "/vault/agent/templates/db.env.tpl"
  destination = "/secrets/db.env"
  perms       = "0640"
  error_on_missing_key = true
}

template {
  source      = "/vault/agent/templates/jwt_private.pem.tpl"
  destination = "/secrets/jwt_private.pem"
  perms       = "0600"
  error_on_missing_key = true
}

template {
  source      = "/vault/agent/templates/refresh_secret.tpl"
  destination = "/secrets/refresh_secret"
  perms       = "0600"
  error_on_missing_key = true
}

template {
  source      = "/vault/agent/templates/google_client_secret.tpl"
  destination = "/secrets/google_client_secret"
  perms       = "0600"
  error_on_missing_key = true
}