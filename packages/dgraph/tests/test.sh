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
--name "${CONTAINER_NAME}_UNSECURE" \
dgraph/standalone

echo "Waiting 15 sec for db to start..." && sleep 15

docker run -d --rm \
-p 8001:8000 -p 8081:8080 \
--name "${CONTAINER_NAME}_HS256" \
dgraph/standalone

echo "Waiting 15 sec for db to start..." && sleep 15

docker run -d --rm \
-p 8002:8000 -p 8082:8080 \
--name "${CONTAINER_NAME}_RS256" \
dgraph/standalone

echo "Waiting 15 sec for db to start..." && sleep 15

sed "s/<YOUR JWT SECRET HERE>/test/g;s/<YOUR AUTH HEADER HERE>/Authorization/g;s/<YOUR CUSTOM NAMESPACE HERE>/https:\/\/dgraph.io\/jwt\/claims/g;" src/graphql/secure.schema.gql > src/graphql/testHS256.schema.gql
sed '$d' src/graphql/secure.schema.gql > src/graphql/testRS256.schema.gql
echo  '# Dgraph.Authorization {"VerificationKey":"-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAxqyvd82VacXMBLUADZt+\neuSNUNJ276XgvH4HW4ms5iQZDgYIPKxyaZ+wk8EMYSB1dymJ3WQpm0JKHqgTW+z/\nedfYFQXkduHN/zoIpxMAMyZGsTBidGo0xJSHTCDCdYCCBlG9R1ljjhf0l9ChBP7W\n7lSXaRU/XS/tMH1qYMpsUwDav4G/RDI3A4t29JRGqU4mnFa5o3XBCxU4ANCp1JaQ\nevzAYox8EGPZ1YZGmhRgca51dBeed9QKqWjfXP4wboC1ppglm+kPgFUaCiXB8Kyf\nIixhlvzZiO4RLvZw+cILt586vXGzNy49eVUTiIOoTZuG/79pCeBS8BCbB4l6y274\ny42hUN83gHxQ32Y++DI40jz5iGN85Dj6yDDjKwvwqVhCx/kVJFrmyrTJz/E0cp38\nFeIi7D6e0eXj7G97K+wkNdc4oTs1DsDPzhO/7wxQOZIjvNp+DJAfxin5MbM+UKoo\npvJj3sUMHVrTteWxZg94mmLjg2KnJYBuSn8kiFPYQ0F5MjE7df4tDDTGJ/VEFIG5\nEkQffaNYhW0Z5ORLvW1R1Yd1/ew3UWo+mZ7XAUGLF6clsWSQvzSrrNMYzCk5Fa0L\nwvMtQdEVLL3q7/KsEHD7N78EVlmEDlOtC21UidUqXnawCE1QIjAHqFsNNPR2j0lg\nOoEjrGdzrvUg6hNV9m6CbSECAwEAAQ==\n-----END PUBLIC KEY-----","Namespace":"https://dgraph.io/jwt/claims","Header":"Authorization","Algo":"RS256"}' >> src/graphql/testRS256.schema.gql

curl -X POST localhost:8080/admin/schema --data-binary '@src/graphql/unsecure.schema.gql'
curl -X POST localhost:8081/admin/schema --data-binary '@src/graphql/testHS256.schema.gql'
curl -X POST localhost:8082/admin/schema --data-binary '@src/graphql/testRS256.schema.gql'

if $JEST_WATCH; then
    # Run jest in watch mode
    npx jest tests --watch
    # Only stop the container after jest has been quit
    docker stop "${CONTAINER_NAME}_UNSECURE" &&
    docker stop "${CONTAINER_NAME}_HS256" &&
    docker stop "${CONTAINER_NAME}_RS256"
else
    # Always stop container, but exit with 1 when tests are failing
    if npx jest tests --detectOpenHandles --forceExit;then
      docker stop "${CONTAINER_NAME}_UNSECURE" &&
      docker stop "${CONTAINER_NAME}_HS256" &&
      docker stop "${CONTAINER_NAME}_RS256"
    else
      docker stop "${CONTAINER_NAME}_UNSECURE" &&
      docker stop "${CONTAINER_NAME}_HS256" &&
      docker stop "${CONTAINER_NAME}_RS256" && exit 1
    fi
fi
