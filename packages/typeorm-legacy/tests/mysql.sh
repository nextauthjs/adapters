#!/usr/bin/env bash
set -e 

until docker exec docker_mysql_1 mysqladmin ping -u nextauth --password=password 2> /dev/null
do
  echo "Waiting for mysql.."
  sleep 10
done

node ./tests/mysql.js