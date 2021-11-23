#!/usr/bin/env bash

JEST_WATCH=false
npx supabase start

# Is the watch flag passed to the script?
while getopts w flag
do
    case "${flag}" in
        w) JEST_WATCH=true;;
        *) continue;;
    esac
done

echo "Waiting 5 sec for db to start..." && sleep 5

docker exec \
-i "supabase-db" \
sh -c 'psql -h localhost -U postgres' < "$(pwd)/tests/empty.sql"

docker exec \
-i "supabase-db" \
sh -c 'psql -h localhost -U postgres' < "$(pwd)/supabase/schema.sql"

echo "Waiting 1 sec before running tests..." && sleep 1

if $JEST_WATCH; then
    # Run jest in watch mode
    npx jest tests --watch
    # Only stop the container after jest has been quit
    docker stop "${CONTAINER_NAME}"
else
    # Always stop container, but exit with 1 when tests are failing
    if npx jest;then
        npx supabase stop
    else
        npx supabase stop && exit 1
    fi
fi