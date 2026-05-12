{{ with secret "kv/data/svc/auth/jwt" -}}
{{ .Data.data.private_pem }}
{{- end }}