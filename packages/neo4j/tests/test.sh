#!/usr/bin/env bash

# Is the waych flag passed to the script?
while getopts w flag
do
  case "${flag}" in
    w) watch=true;;
  esac
done

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
NEO4J_USER=neo4j
NEO4J_PASS=password
CONTAINER_NAME=next-auth-neo4j-test

# Start db
docker run -d --rm \
  -e NEO4J_AUTH=${NEO4J_USER}/${NEO4J_PASS} \
  -e NEO4J_USER=${NEO4J_USER} \
  -e NEO4J_PASS=${NEO4J_PASS} \
  --name "${CONTAINER_NAME}" \
  -p7474:7474 -p7687:7687 \
  -v=$SCRIPT_DIR/resources:/var/lib/neo4j/resources \
  neo4j:4.2.0

echo \"Waiting 20 sec for db to start...\" && sleep 20

# Create constraints
docker exec \
  -i "${CONTAINER_NAME}" \
  sh -c 'exec cypher-shell -u ${NEO4J_USER} -p ${NEO4J_PASS} -f /var/lib/neo4j/resources/constraints.cypher'

if $watch; then
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
