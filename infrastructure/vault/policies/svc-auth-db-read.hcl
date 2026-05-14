# KV v2 read access for auth-db secrets
path "kv/data/svc/auth-db/*" {
  capabilities = ["read"]
}

path "kv/metadata/svc/auth-db/*" {
  capabilities = ["list"]
}