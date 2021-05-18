#!/usr/bin/env bash
set -e 

until docker exec docker_mssql_1 mssqladmin ping -u nextauth --password=password 2> /dev/null
do
  echo "Waiting for mysql.."
  sleep 10
done

node ./tests/mysql.js