{{- define "garage.image" -}}
{{- printf "%s/%s/garage-%s:%s" .Values.registry .Values.owner .name .Values.image.tag -}}
{{- end -}}

{{- define "garage.labels" -}}
app.kubernetes.io/name: garage-{{ .name }}
app.kubernetes.io/instance: {{ $.Release.Name }}
app.kubernetes.io/part-of: garage
{{- end -}}