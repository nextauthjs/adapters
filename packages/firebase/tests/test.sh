#!/usr/bin/env bash

CONTAINER_NAME=next-auth-firebase-test
export FIRESTORE_PORT=8080
export FIRESTORE_PROJECT_ID=next-auth-firebase-test
export FIRESTORE_EMULATOR_HOST=127.0.0.1:${FIRESTORE_PORT}

# Start db
docker run -d --rm \
  --name ${CONTAINER_NAME} \
  --env "FIRESTORE_PROJECT_ID=${FIRESTORE_PROJECT_ID}" \
  --env "PORT=${FIRESTORE_PORT}" \
  --publish ${FIRESTORE_PORT}:8080 \
  mtlynch/firestore-emulator-docker

echo "Waiting 10 sec for db to start..."
sleep 10

# Create tables and indeces
# TODO: Seed firestore docker container

# Always stop container, but exit with 1 when tests are failing
if npx jest;then
    docker stop ${CONTAINER_NAME}
else
    docker stop ${CONTAINER_NAME} && exit 1
fi