#!/usr/bin/env bash

PGUSER=nextauth
PGDATABASE=nextauth
PGPORT=5432
CONTAINER_NAME=next-auth-postgres-test

# Start db
docker run -d --rm \
-e POSTGRES_USER=${PGUSER} \
-e POSTGRES_DB=${PGDATABASE} \
-e POSTGRES_HOST_AUTH_METHOD=trust \
--name "${CONTAINER_NAME}" \
-p ${PGPORT}:5432 \
-v "$(pwd)/tests/postgresql/schema.sql":/docker-entrypoint-initdb.d/schema.sql \
postgres:13.3 

echo \"Waiting 20 sec for db to start...\" && sleep 20

# Always stop container, but exit with 1 when tests are failing
if npx jest tests/postgresql --detectOpenHandles --forceExit;then
    docker stop "${CONTAINER_NAME}"
else
    docker stop "${CONTAINER_NAME}" && exit 1
fi
