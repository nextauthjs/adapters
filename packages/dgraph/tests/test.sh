#!/usr/bin/env bash

CONTAINER_NAME=next-auth-dgraph
JEST_WATCH=false

# Is the watch flag passed to the script?
while getopts w flag
do
    case "${flag}" in
        w) JEST_WATCH=true;;
        *) continue;;
    esac
done

# Start db

docker run -d --rm \
-p 8000:8000 -p 8080:8080 \
--name $CONTAINER_NAME \
dgraph/standalone

echo "Waiting 15 sec for db to start..." && sleep 15

curl -X POST localhost:8080/admin/schema --data-binary '@src/graphql/test.schema.gql'

if $JEST_WATCH; then
    # Run jest in watch mode
    npx jest tests --watch
    # Only stop the container after jest has been quit
    docker stop "${CONTAINER_NAME}"
else
    # Always stop container, but exit with 1 when tests are failing
    if npx jest tests --detectOpenHandles --forceExit;then
        docker stop "${CONTAINER_NAME}"
    else
        docker stop "${CONTAINER_NAME}" && exit 1
    fi
fi
