# NextAuth.js adapters

Custom next-auth adapters maintained by the community to support any database.

[Creating a database adapter](https://next-auth.js.org/tutorials/creating-a-database-adapter)

If you already have an adapter you would like to add, please create a Pull Request.

In case you can also take on the maintenance of the adapter, let us know, and we can add you as a maintainer to the repository.

## Adapters

- [Prisma](./packages/prisma/README.md)
- [Fauna](./packages/fauna/README.md)
- [DynamoDB](./packages/dynamodb/README.md)
- [PouchDB](./packages/pouchdb/README.md)
- [Example](./packages/example/README.md)

### Legacy adapters

These are kept around for so we can provide a transition to `next-auth4.0` without breaking changes until 4.0 is released

- [Prisma (Legacy)](./packages/prisma-legacy/README.md)
- [TypeORM (Legacy)](./packages/typeorm-legacy/README.md)

## Publishing

- [Lerna Independent Mode with Semver](https://samhogy.co.uk/2018/08/lerna-independent-mode-with-semver.html)

## License

ISC
