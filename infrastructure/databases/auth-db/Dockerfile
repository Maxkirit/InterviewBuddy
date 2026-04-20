FROM postgres:18.3

COPY --chmod=+x ./entrypoint.sh /docker-entrypoint-initdb.d/entrypoint.sh

EXPOSE 8080

RUN ["echo", "'Hello World!!"]

#ENTRYPOINT [ "/docker-entrypoint-initdb.d/entrypoint.sh" ]