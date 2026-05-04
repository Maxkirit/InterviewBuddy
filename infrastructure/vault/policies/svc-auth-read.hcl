# KV v2 read access for svc-auth secrets
path "kv/data/svc/auth/*" {
  capabilities = ["read"]
}

path "kv/metadata/svc/auth/*" {
  capabilities = ["list"]
}