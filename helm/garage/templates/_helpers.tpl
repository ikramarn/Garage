{{- define "garage.image" -}}
{{- /* prefer per-component tag when available, else fall back to global */ -}}
{{- $tag := (get .Values.imageTags .name) | default .Values.image.tag -}}
{{- printf "%s/%s/garage-%s:%s" .Values.registry .Values.owner .name $tag -}}
{{- end -}}

{{- define "garage.labels" -}}
app.kubernetes.io/name: garage-{{ .name }}
app.kubernetes.io/instance: {{ $.Release.Name }}
app.kubernetes.io/part-of: garage
{{- end -}}

{{- /* Fullname helper for naming shared resources like ConfigMap */ -}}
{{- define "garage.fullname" -}}
{{- printf "%s-env" .Release.Name -}}
{{- end -}}