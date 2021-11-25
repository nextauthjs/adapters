#!/usr/bin/env bash

CONTAINER_NAME=next-auth-dgraph
JEST_WATCH=false

export DGRAPH_JWT_SECRET_HS256="test"
export DGRAPH_VERIFICATION_KEY_HS256="test"
export DGRAPH_JWT_SECRET_RS256="-----BEGIN RSA PRIVATE KEY-----\n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\n-----END RSA PRIVATE KEY-----"
export DGRAPH_VERIFICATION_KEY_RS256='-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAxqyvd82VacXMBLUADZt+\neuSNUNJ276XgvH4HW4ms5iQZDgYIPKxyaZ+wk8EMYSB1dymJ3WQpm0JKHqgTW+z/\nedfYFQXkduHN/zoIpxMAMyZGsTBidGo0xJSHTCDCdYCCBlG9R1ljjhf0l9ChBP7W\n7lSXaRU/XS/tMH1qYMpsUwDav4G/RDI3A4t29JRGqU4mnFa5o3XBCxU4ANCp1JaQ\nevzAYox8EGPZ1YZGmhRgca51dBeed9QKqWjfXP4wboC1ppglm+kPgFUaCiXB8Kyf\nIixhlvzZiO4RLvZw+cILt586vXGzNy49eVUTiIOoTZuG/79pCeBS8BCbB4l6y274\ny42hUN83gHxQ32Y++DI40jz5iGN85Dj6yDDjKwvwqVhCx/kVJFrmyrTJz/E0cp38\nFeIi7D6e0eXj7G97K+wkNdc4oTs1DsDPzhO/7wxQOZIjvNp+DJAfxin5MbM+UKoo\npvJj3sUMHVrTteWxZg94mmLjg2KnJYBuSn8kiFPYQ0F5MjE7df4tDDTGJ/VEFIG5\nEkQffaNYhW0Z5ORLvW1R1Yd1/ew3UWo+mZ7XAUGLF6clsWSQvzSrrNMYzCk5Fa0L\nwvMtQdEVLL3q7/KsEHD7N78EVlmEDlOtC21UidUqXnawCE1QIjAHqFsNNPR2j0lg\nOoEjrGdzrvUg6hNV9m6CbSECAwEAAQ==\n-----END PUBLIC KEY-----'

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
--name ${CONTAINER_NAME}_UNSECURE \
dgraph/standalone

docker run -d --rm \
-p 8001:8000 -p 8081:8080 \
--name ${CONTAINER_NAME}_HS256 \
dgraph/standalone

docker run -d --rm \
-p 8002:8000 -p 8082:8080 \
--name ${CONTAINER_NAME}_RS256 \
dgraph/standalone

sed "s/<YOUR JWT SECRET HERE>/$DGRAPH_VERIFICATION_KEY_HS256/g;s/<YOUR AUTH HEADER HERE>/Authorization/g;s/<YOUR CUSTOM NAMESPACE HERE>/https:\/\/dgraph.io\/jwt\/claims/g;" src/graphql/secure.schema.gql > src/graphql/testHS256.schema.gql
sed '$d' src/graphql/secure.schema.gql > src/graphql/testRS256.schema.gql
echo "# Dgraph.Authorization {\"VerificationKey\":\"$DGRAPH_VERIFICATION_KEY_RS256\",\"Header\":\"<YOUR AUTH HEADER HERE>\",\"Namespace\":\"https://dgraph.io/jwt/claims\",\"Algo\":\"RS256\"}" >> src/graphql/testRS256.schema.gql

echo "Waiting 15 sec for db to start..." && sleep 15

if $JEST_WATCH; then
    # Run jest in watch mode
    npx jest tests --watch
    # Only stop the container after jest has been quit
    docker stop "${CONTAINER_NAME}_UNSECURE"
    docker stop "${CONTAINER_NAME}_HS256"
    docker stop "${CONTAINER_NAME}_RS256"
else
    # Always stop container, but exit with 1 when tests are failing
    if npx jest tests --detectOpenHandles --forceExit;then
      docker stop "${CONTAINER_NAME}_UNSECURE"
      docker stop "${CONTAINER_NAME}_HS256"
      docker stop "${CONTAINER_NAME}_RS256"
    else
      docker stop "${CONTAINER_NAME}_UNSECURE" &&
      docker stop "${CONTAINER_NAME}_HS256" &&
      docker stop "${CONTAINER_NAME}_RS256" && exit 1
    fi
fi
