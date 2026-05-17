path "kv/data/svc/grafana/*" {
  capabilities = ["read"]
}

path "kv/metadata/svc/grafana/*" {
  capabilities = ["list"]
}