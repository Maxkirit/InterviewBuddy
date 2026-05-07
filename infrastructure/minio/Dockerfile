FROM minio/minio:latest

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 9000 9001

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:9000/minio/health/live || exit 1

ENTRYPOINT ["/entrypoint.sh"]