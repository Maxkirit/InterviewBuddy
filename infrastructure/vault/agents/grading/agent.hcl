pid_file = "/tmp/vault-agent-grading.pid"

vault {
  address = "https://vault:8200"
  ca_cert = "/vault/tls/ca.crt"
}

auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path   = "/vault/creds/grading.role_id"
      secret_id_file_path = "/vault/creds/grading.secret_id"
      remove_secret_id_file_after_reading = false
    }
  }

  sink "file" {
    config = {
      path = "/tmp/vault-token"
    }
  }
}

template {
  source      = "/vault/agent/templates/db.env.tpl"
  destination = "/secrets/db.env"
  perms       = "0640"
}