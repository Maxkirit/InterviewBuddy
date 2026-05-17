exit_after_auth = true
pid_file = "/tmp/vault-agent-grafana.pid"

vault {
  address = "https://vault:8200"
  ca_cert = "/vault/tls/ca.crt"
}

auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path   = "/vault/creds/grafana.role_id"
      secret_id_file_path = "/vault/creds/grafana.secret_id"
      remove_secret_id_file_after_reading = false
    }
  }
}

template_config {
  exit_on_retry_failure = true
}

template {
  source = "/vault/agent/templates/grafana_admin_password.ctmpl"
  destination = "/run/secrets/grafana_admin_password"
  perms = "0444"
  error_on_missing_key = true
}