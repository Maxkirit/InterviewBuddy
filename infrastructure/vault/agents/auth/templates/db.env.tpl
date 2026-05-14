{{ with secret "kv/data/svc/auth/db" -}}
DATABASE_URL=postgresql://{{ .Data.data.user }}:{{ .Data.data.password | urlquery }}@{{ .Data.data.host }}:{{ .Data.data.port }}/{{ .Data.data.database }}
{{- end }}