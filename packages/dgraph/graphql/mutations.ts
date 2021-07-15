export const createUser = /* GraphQL */ `
  mutation createUserMutation($input: [AddUserInput!]!) {
    addUser(input: $input) {
      user {
        email
        updatedAt
        name
        image
        id
        emailVerified
        email
        createdAt
      }
    }
  }
`;

export const deleteVerificationRequest = /* GraphQL */ `
  mutation deleteVerificationRequest($token: String = "", $identifier: String = "") {
    deleteVerificationRequest(filter: { and: { token: { eq: $token }, identifier: { eq: $identifier } } }) {
      numUids
    }
  }
`;
export const updateUser = /* GraphQL */ `
  mutation updateUser($id: [ID!] = "", $input: UserPatch) {
    updateUser(input: { filter: { id: $id }, set: $input }) {
      user {
        email
        updatedAt
        name
        image
        id
        emailVerified
        email
        createdAt
      }
    }
  }
`;
export const deleteUser = /* GraphQL */ `
  mutation deleteUser($id: [ID!] = "") {
    deleteUser(filter: { id: $id }) {
      numUids
    }
  }
`;
export const linkAccount = /* GraphQL */ `
  mutation linkAccount($input: [AddAccountInput!]!) {
    addAccount(input: $input) {
      account {
        accessToken
        createdAt
        accessTokenExpires
        id
        providerAccountId
        providerId
        providerType
        refreshToken
        updatedAt
        user {
          id
          name
          email
        }
      }
    }
  }
`;
export const unlinkAccount = /* GraphQL */ `
  mutation unlinkAccount($providerAccountId: String = "", $providerId: String = "") {
    deleteAccount(filter: { and: { providerAccountId: { eq: $providerAccountId }, providerId: { eq: $providerId } } }) {
      numUids
    }
  }
`;
export const addSession = /* GraphQL */ `
  mutation addSession($input: [AddSessionInput!]!) {
    addSession(input: $input) {
      session {
        accessToken
        expires
        createdAt
        id
        sessionToken
        updatedAt
        user {
          id
          name
          email
        }
      }
    }
  }
`;
export const deleteSession = /* GraphQL */ `
  mutation deleteSession($sessionToken: String = "") {
    deleteSession(filter: { sessionToken: { eq: $sessionToken } }) {
      numUids
    }
  }
`;
export const updateSession = /* GraphQL */ `
  mutation updateSession($id: [ID!] = "", $input: SessionPatch = {}) {
    updateSession(input: { filter: { id: $id }, set: $input }) {
      session {
        accessToken
        createdAt
        expires
        id
        sessionToken
        updatedAt
        user {
          id
          name
          email
        }
      }
    }
  }
`;

export const createVerificationRequest = /* GraphQL */ `
  mutation createVerificationRequest($input: [AddVerificationRequestInput!]!) {
    addVerificationRequest(input: $input) {
      numUids
    }
  }
`;

export const clean = /* GraphQL */ `
  mutation MyMutation {
    deleteUser(filter: {}) {
      numUids
    }
    deleteVerificationRequest(filter: {}) {
      numUids
    }
    deleteSession(filter: {}) {
      numUids
    }
    deleteAccount(filter: {}) {
      numUids
    }
  }
`;
