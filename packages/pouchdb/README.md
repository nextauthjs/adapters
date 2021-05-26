# PouchDB Adapter

> A PouchDB adapter for next-auth

Depending on your architecture you can use PouchDB's http adapter to reach any database compliant with the CouchDB protocol (CouchDB, Cloudant, ...) or use any other PouchDB compatible adapter (leveldb, in-memory, ...)

## Usage

```js
// Setup your Pouchdb instance as you like (adapter, whatever...)
PouchDB
  // Declare your adapter, here we use the leveldb adapter
  .plugin(require("pouchdb-adapter-leveldb"))
  //  Your PouchDB MUST provide and use the pouchdb-find plugin - it is internally by the adapter to build and manage indexes
  .plugin(
    require("pouchdb-find") // /!\ Don't forget this plugin
  )
const pouchdb = new PouchDB("auth_db", { adapter: "leveldb" })
// Now you can initialize the adapter
const pouchdbAdapter = PouchDBAdapter(pouchdb)
const adapter = await pouchdbAdapter.getAdapter({
  //... pass your appOptions here ...
  adapter: pouchdbAdapter,
})
```

## Memory-first caching strategy

If you need to boost your authentication layer performance, you may use PouchDB's powerful sync features together with its memory-adapter and any other persistent adapter to build a memory-first caching strategy.

You are responsible for managing synchronisation if you want to go with the memory-first caching strategy.

I suggest that you do one way, one-off replication at startup from the persistent db into the in-memory db, then two-way, continuous, retriable sync.

For more, see : <https://pouchdb.com/api.html#sync>

Caveat : this would probably not work in a serverless environment for various reasons (concurrency, serverless function startup time increase, etc.)
