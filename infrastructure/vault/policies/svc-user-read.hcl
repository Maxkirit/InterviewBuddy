path "kv/data/svc/user/*" {
  capabilities = ["read"]
}

path "kv/metadata/svc/user/*" {
  capabilities = ["list"]
}