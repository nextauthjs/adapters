# PouchDB Adapter

> A PouchDB adapter for next-auth

Depending on your architecture you can :

1. Serverless or server setup: use PouchDB's http adapter to reach any database compliant with the CouchDB protocol (CouchDB, Cloudant, ...)
1. Server setup : use any other PouchDB compatible adapter(in particular leveldb, ...)
1. Server setup : use PouchDB's powerful sync features together with its memory-adapter and any other persistent adapter to build a memory-first caching strategy that would boost your authentication layer performance

## Usage

```js
// Setup your Pouchdb instance as you like (adapter, whatever...)
// Your PouchDB MUST provide and use the pouchdb-find plugin - it is used to manage indexes inside @next-auth/pouchdb-adapter
PouchDB.plugin(require("pouchdb-adapter-leveldb")).plugin(
  require("pouchdb-find")
) // /!\ Don't forget this plugin
// Pick your favorite adapter
const pouchdb = new PouchDB("auth_db", { adapter: "leveldb" }) // or memory, http, ...
// Now you can initialize the adapter
// FYI: when you call getAdapter, it checks if the indexes are available and create them if needed (nextAuthUserByEmail, nextAuthAccountByProviderId, nextAuthSessionByToken, nextAuthVerificationRequestByToken)
const pouchdbAdapter = PouchDBAdapter({ pouchdb })
const adapter = await pouchdbAdapter.getAdapter({
  //... pass your appOptions here ...
  adapter: pouchdbAdapter,
})
```

## Memory-first caching strategy (server architecture)

You are responsible for managing synchronisation if you want to go with the memory-first caching strategy.

I suggest that you do one way, one-off replication at startup from the persistent db into the in-memory db, then two-way, continuous, retriable sync.

For more, see : <https://pouchdb.com/api.html#sync>
