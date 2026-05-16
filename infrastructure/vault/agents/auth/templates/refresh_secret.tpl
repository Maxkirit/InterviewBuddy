{{ with secret "kv/data/svc/auth/refresh_secret" -}}
{{ .Data.data.refresh_secret }}
{{- end }}