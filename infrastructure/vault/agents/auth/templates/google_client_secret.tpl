{{- with secret "kv/data/svc/auth/google" -}}
{{ .Data.data.client_secret }}
{{- end -}}