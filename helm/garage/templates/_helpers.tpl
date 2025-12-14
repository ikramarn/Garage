{{- define "garage.image" -}}
{{- /* If a full image spec override is provided, use it */ -}}
{{- $spec := (get .Values.imageSpec .name) -}}
{{- if $spec -}}
{{- printf "%s" $spec -}}
{{- else -}}
	{{- /* prefer per-component tag when available, else fall back to global */ -}}
	{{- $tag := (get .Values.imageTags .name) | default .Values.image.tag -}}
	{{- /* derive repo from override or registry/owner */ -}}
	{{- $repo := (get .Values.imageRepos .name) | default (printf "%s/%s/garage-%s" .Values.registry .Values.owner .name) -}}
	{{- $base := printf "%s:%s" $repo $tag -}}
	{{- /* Append digest if provided for immutable deployments */ -}}
	{{- $digest := (get .Values.imageDigests .name) -}}
	{{- if $digest -}}
	{{- printf "%s@sha256:%s" $base $digest -}}
	{{- else -}}
	{{- printf "%s" $base -}}
	{{- end -}}
{{- end -}}
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