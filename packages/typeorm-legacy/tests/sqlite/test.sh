#!/usr/bin/env bash

rm -f tests/sqlite/dev.db

jest tests/sqlite/index.test.ts

rm -f tests/sqlite/dev.db

CUSTOM_MODEL=1 jest tests/sqlite/index.custom.test.ts
