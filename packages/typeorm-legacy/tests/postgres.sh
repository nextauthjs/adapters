#!/usr/bin/env bash
set -e

until docker exec docker_postgres_1 pg_isready -h 127.0.0.1 -p 5432 -U nextauth 2> /dev/null
do
  echo "Waiting for postgres.."
  sleep 5;
done

node ./tests/postgres.js