<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img height="150px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>
   <h3 align="center">NextAuth.js Adapters</h3>
   <p align="center">Adapter Repository for NextAuth.js</p>
</p>

## Overview

NextAuth.js is a complete open source authentication solution for [Next.js](http://nextjs.org/) applications.

It is designed from the ground up to support Next.js and Serverless environments.

## Getting Started

This repository is a lerna mono-repo which is home to multiple next-auth adapters maintained by the community to support any database.

### Adapters

Currently, these are experimental adapters and we would appreciate feedback on them!

The two adapters with the "legacy" suffix are the adapters that currently ship with the core `next-auth` package. In the future, we will be doing the following two things though:

1. Removing them from the core package in the short-term
2. Replacing them with their more up-to-date versions in the medium-term.

Of course, we will announce and document any such changes thoroughly before taking any action. This changes are tenatively slated for `v4.0.0`.

| Adapter        | Version                                                                                                                                                                   | Docs                                                                           | NPM                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| typeorm-legacy | [![npm](https://img.shields.io/npm/v/@next-auth/typeorm-legacy-adapter?label=version&style=flat-square)](https://www.npmjs.com/package/@next-auth/typeorm-legacy-adapter) | [adapters/typeorm](https://next-auth.js.org/adapters/typeorm/typeorm-overview) | [@next-auth/typeorm-legacy-adapter](https://npm.im/@next-auth/typeorm-legacy-adapter) |
| prisma         | [![npm](https://img.shields.io/npm/v/@next-auth/prisma-adapter?label=version&style=flat-square)](https://www.npmjs.com/package/@next-auth/prisma-adapter)                 | [adapters/prisma](https://next-auth.js.org/adapters/prisma)                    | [@next-auth/prisma-adapter](https://npm.im/@next-auth/prisma-adapter)                 |
| prisma-legacy  | [![npm](https://img.shields.io/npm/v/@next-auth/prisma-legacy-adapter?label=version&style=flat-square)](https://www.npmjs.com/package/@next-auth/prisma-legacy-adapter)   | [adapters/prisma-legacy](https://next-auth.js.org/adapters/prisma-legacy)      | [@next-auth/prisma-legacy-adapter](https://npm.im/@next-auth/prisma-legacy-adapter)   |
| fauna          | [![npm](https://img.shields.io/npm/v/@next-auth/fauna-adapter?label=version&style=flat-square)](https://www.npmjs.com/package/@next-auth/fauna-adapter)                   | [adapters/fauna](https://next-auth.js.org/adapters/fauna)                      | [@next-auth/fauna-adapter](https://npm.im/@next-auth/fauna-adapter)                   |
| dynamodb       | [![npm](https://img.shields.io/npm/v/@next-auth/dynamodb-adapter?label=version&style=flat-square)](https://www.npmjs.com/package/@next-auth/dynamodb-adapter)             | [adapters/dynamodb](https://next-auth.js.org/adapters/dynamodb)                | [@next-auth/dynamodb-adapter](https://npm.im/@next-auth/dynamodb-adapter)             |
| firebase       | [![npm](https://img.shields.io/npm/v/@next-auth/firebase-adapter?label=version&style=flat-square)](https://www.npmjs.com/package/@next-auth/firebase-adapter)             | [adapters/firebase](https://next-auth.js.org/adapters/firebase)                | [@next-auth/firebase-adapter](https://npm.im/@next-auth/firebase-adapter)             |
| pouchdb        | [![npm](https://img.shields.io/npm/v/@next-auth/pouchdb-adapter?label=version&style=flat-square)](https://www.npmjs.com/package/@next-auth/pouchdb-adapter)               | [adapters/pouchdb](https://next-auth.js.org/adapters/pouchdb)                  | [@next-auth/pouchdb-adapter](https://npm.im/@next-auth/pouchdb-adapter)               |

## Contributing

[Creating a database adapter](https://next-auth.js.org/tutorials/creating-a-database-adapter)

If you already have an adapter you would like to add, please create a Pull Request and we will work with you to get it officially supported!

If you would like to also take on the maintenance of the adapter, let us know, and we would be happy to add you as a maintainer to the repository.

## TypeScript

We have an official TypeScript [`Adapter` Interface](https://github.com/nextauthjs/next-auth/blob/main/types/adapters.d.ts), which should make complying with the existing adapter structure and the common tests, etc. much easier.

## Testing

We have developed a basic set of tests that apply to all adapters, i.e. to which all adapters should conform and pass. The code can be found in [`basic-tests.ts`](https://github.com/nextauthjs/adapters/blob/main/basic-tests.ts), and specific implementations of which can be found in the `/tests` subdirectory of each currently available adapter.

All adapter tests should also run against a local instance of the particular database / ORM being tested. For example, for TypeORM we spin up MySQL and PostgreSQL instances via docker, seed them, and execute the test suite separately against both backends.

## Publishing

- [Lerna Independent Mode with Semver](https://samhogy.co.uk/2018/08/lerna-independent-mode-with-semver.html)

## License

ISC
