path "kv/data/svc/grading-db/*" {
  capabilities = ["read"]
}

path "kv/metadata/svc/grading-db/*" {
  capabilities = ["list"]
}