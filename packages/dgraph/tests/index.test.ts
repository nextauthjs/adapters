import { DgraphAdapter, DgraphClient } from "../src";
import type { AppOptions } from "next-auth/internals";
import { runBasicTests } from "../../../basic-tests"

/**
* @todo Create a dummy database and store credentials somewhere
*/

const dgraph = new DgraphClient({
  endpoint: "",
  apiKey: ""
});

const dgraphAdapter = DgraphAdapter(dgraph);

runBasicTests({
  adapter: dgraphAdapter,

  db: {
    async disconnect() {
      return await dgraph.clean();
    },
    async session(sessionToken) {
      return await dgraph.getSession(sessionToken);
    },
    async expireSession(sessionToken, expires) {
      if (expires.getTime() < Date.now()) {
        await dgraph.deleteSession(sessionToken);
        return null;
      } else {
        return await dgraph.updateSession(sessionToken, { expires });
      }
    },
    async user(id) {
      return await dgraph.getUserById(id);
    },
    async account(providerId, providerAccountId) {
      return await dgraph.getAccount(providerId, providerAccountId);
    },
    async verificationRequest(identifier, token) {
      return (await dgraph.getVerificationRequest(identifier, token)) ?? null;
    }
  }
});
