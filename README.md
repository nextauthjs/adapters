<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img width="150px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>
   <h3 align="center">NextAuth.js Adapters</h3>
   <p align="center">Adapter Repository for NextAuth.js</p>
</p>

## Overview

NextAuth.js is a complete open source authentication solution for [Next.js](http://nextjs.org/) applications.

It is designed from the ground up to support Next.js and Serverless environments.

## Getting Started

This repository is a lerna mono-repo which is home to multiple next-auth adapters maintained by the community to support any database.

### Adapters

Currently, there are the following adapters ready for use

- [typeorm-legacy](./packages/typeorm-legacy/README.md)
- [prisma](./packages/prisma/README.md)
- [prisma-legacy](./packages/prisma-legacy/README.md)
- [faunadb](./packages/fauna/README.md)
- [dynamodb](./packages/dynamodb/README.md)
- [firebase](./packages/firebase/README.md)

## Contributing

[Creating a database adapter](https://next-auth.js.org/tutorials/creating-a-database-adapter)

If you already have an adapter you would like to add, please create a Pull Request and we will work with you to get it officially supported!

If you would like to also take on the maintenance of the adapter, let us know, and we would be happy to add you as a maintainer to the repository.

## TypeScript

We have an official TypeScript [`Adapter` Interface](https://github.com/nextauthjs/next-auth/blob/main/types/adapters.d.ts), which should make complying with the existing adapter structure and the common tests, etc. much easier.

## Publishing

- [Lerna Independent Mode with Semver](https://samhogy.co.uk/2018/08/lerna-independent-mode-with-semver.html)

## License

ISC
