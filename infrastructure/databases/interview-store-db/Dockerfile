FROM postgres:18.3

COPY --chmod=+x ./entrypoint.sh /docker-entrypoint-initdb.d/entrypoint.sh

EXPOSE 5432

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD pg_isready -U postgres

# the postgres image has a default entrypoint that runs all the scripts in initdb.d