FROM postgres:16


COPY --chmod=+x ./entrypoint.sh /docker-entrypoint-initdb.d/entrypoint.sh
EXPOSE 5432

RUN ["echo", "'Hello World!!"]

#ENTRYPOINT [ "/docker-entrypoint-initdb.d/entrypoint.sh" ]