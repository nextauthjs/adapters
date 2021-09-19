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

echo "Waiting 10 sec for db to start..."
sleep 10

# Always stop container, but exit with 1 when tests are failing
if npx jest tests/postgresql/index.test.ts --detectOpenHandles --forceExit; then
  if CUSTOM_MODEL=1 npx jest tests/postgresql/index.custom.test.ts --detectOpenHandles --forceExit; then
    docker stop "${CONTAINER_NAME}"
  else
    docker stop "${CONTAINER_NAME}" && exit 1
  fi
else
    docker stop "${CONTAINER_NAME}" && exit 1
fi
