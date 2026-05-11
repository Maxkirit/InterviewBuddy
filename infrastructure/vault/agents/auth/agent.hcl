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

template {
  source      = "/vault/agent/templates/jwt_private.pem.tpl"
  destination = "/secrets/jwt_private.pem"
  perms       = "0600"
}