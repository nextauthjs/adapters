#!/usr/bin/env bash

docker run -d --rm --name next-auth-mysql-test \
  -e MYSQL_DATABASE=next-auth \
  -e MYSQL_ROOT_PASSWORD=password \
  -p 3306:3306 \
  mysql:8 \
  --default-authentication-plugin=mysql_native_password

echo \"Waiting 20 sec for db to start...\" && sleep 20

docker exec -i next-auth-mysql-test sh -c 'exec mysql -uroot -ppassword next-auth' < ./tests/mysql/schema.sql


# Stop container, but exit with 1 if tests failed
if npx jest tests/mysql --detectOpenHandles --forceExit
then docker stop next-auth-mysql-test
fi

docker stop next-auth-mysql-test && exit 1