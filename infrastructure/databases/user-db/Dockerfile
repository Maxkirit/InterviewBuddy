FROM postgres:16


COPY ./init.sql /docker-entrypoint-initdb.d/init.sql
EXPOSE 5432

RUN ["echo", "'Hello World!!"]

#ENTRYPOINT [ "/docker-entrypoint-initdb.d/entrypoint.sh" ]