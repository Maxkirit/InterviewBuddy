exit_after_auth = true
pid_file = "/tmp/vault-agent-interview-store-db.pid"

vault {
  address = "https://vault:8200"
  ca_cert = "/vault/tls/ca.crt"
}

auto_auth {
  method {
    type = "approle"

    config = {
      role_id_file_path = "/vault/creds/interview-store-db.role_id"
      secret_id_file_path = "/vault/creds/interview-store-db.secret_id"
      remove_secret_id_file_after_reading = false
    }
  }
}

template_config {
  exit_on_retry_failure = true
}

template {
  source = "/vault/templates/interview_store_db_superuser_password.ctmpl"
  destination = "/secrets/interview_store_db_superuser_password"
  perms = "0444"
  error_on_missing_key = true
}

template {
  source = "/vault/templates/interview_store_db_admin_password.ctmpl"
  destination = "/secrets/interview_store_db_admin_password"
  perms = "0444"
  error_on_missing_key = true
}

template {
  source = "/vault/templates/interview_store_db_app_password.ctmpl"
  destination = "/secrets/interview_store_db_app_password"
  perms = "0444"
  error_on_missing_key = true
}