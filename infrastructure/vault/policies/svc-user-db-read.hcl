path "kv/data/svc/user-db/*" {
  capabilities = ["read"]
}

path "kv/metadata/svc/user-db/*" {
  capabilities = ["list"]
}