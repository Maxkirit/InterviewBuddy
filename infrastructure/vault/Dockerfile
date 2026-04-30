FROM hashicorp/vault:2.0.0
USER root
RUN apk add --no-cache jq
USER vault

COPY conf/vault.hcl /vault/config/vault.hcl
COPY tools/wait_tls.sh /vault/tools/wait_tls.sh