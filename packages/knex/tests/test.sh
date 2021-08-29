#!/usr/bin/env bash

npx knex migrate:up 20210829103643_init-next-auth-db.js

# Always stop container, but exit with 1 when tests are failing
if npx -y jest;then
    npx knex migrate:down 20210829103643_init-next-auth-db.js
else
    npx knex migrate:down 20210829103643_init-next-auth-db.js && exit 1
fi

