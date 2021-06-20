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
postgres:13.3 

echo \"Waiting 20 sec for db to start...\" && sleep 20

# Run sequelize migrations
npx sequelize-cli db:migrate --config ./tests/postgres/db/config/config.json --migrations-path ./tests/postgres/db/migrations --models-path ./tests/postgres/db/models

# Always stop container, but exit with 1 when tests are failing
if npx jest tests/postgres --detectOpenHandles --forceExit;then
    docker stop "${CONTAINER_NAME}"
else
    docker stop "${CONTAINER_NAME}" && exit 1
fi
