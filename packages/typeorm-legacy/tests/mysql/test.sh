#!/usr/bin/env bash

MYSQL_DATABASE=next-auth
MYSQL_ROOT_PASSWORD=password
CONTAINER_NAME=next-auth-mysql-test


# Start db
docker run -d --rm \
-e MYSQL_DATABASE=${MYSQL_DATABASE} \
-e MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD} \
--name "${CONTAINER_NAME}" \
-p 3306:3306 \
mysql:8 \
--default-authentication-plugin=mysql_native_password

echo "Waiting 20 sec for db to start..."
sleep 20

# Always stop container, but exit with 1 when tests are failing
if npx jest tests/mysql;then
    docker stop "${CONTAINER_NAME}"
else
    docker stop "${CONTAINER_NAME}" && exit 1
fi
