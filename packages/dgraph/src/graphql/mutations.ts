import { userFragment, accountFragment, sessionFragment } from "./fragments"
export const createUser = /* GraphQL */ `
  mutation createUserMutation($input: [AddUserInput!]!) {
    addUser(input: $input) {
      user {
        ...UserFragment
      }
    }
  }
  ${userFragment}
`

export const deleteVerificationRequest = /* GraphQL */ `
  mutation deleteVerificationRequest(
    $token: String = ""
    $identifier: String = ""
  ) {
    deleteVerificationRequest(
      filter: {
        and: { token: { eq: $token }, identifier: { eq: $identifier } }
      }
    ) {
      verificationRequest {
        token
        identifier
        expires
      }
    }
  }
`
export const updateUser = /* GraphQL */ `
  mutation updateUser($id: [ID!] = "", $input: UserPatch) {
    updateUser(input: { filter: { id: $id }, set: $input }) {
      user {
        ...UserFragment
      }
    }
  }
  ${userFragment}
`
export const deleteUser = /* GraphQL */ `
  mutation deleteUser($id: [ID!] = "") {
    deleteUser(filter: { id: $id }) {
      numUids
      user {
        accounts {
          id
        }
        sessions {
          id
        }
      }
    }
  }
`
export const deleteUserAccountsAndSessions = /* GraphQL */ `
  mutation deleteUserAccountsAndSessions($accounts: [ID!], $sessions: [ID!]) {
    deleteAccount(filter: { id: $accounts }) {
      numUids
    }
    deleteSession(filter: { id: $sessions }) {
      numUids
    }
  }
`
export const linkAccount = /* GraphQL */ `
  mutation linkAccount($input: [AddAccountInput!]!) {
    addAccount(input: $input) {
      account {
        ...AccountFragment
      }
    }
  }
  ${accountFragment}
`
export const unlinkAccount = /* GraphQL */ `
  mutation unlinkAccount(
    $providerAccountId: String = ""
    $provider: String = ""
  ) {
    deleteAccount(
      filter: {
        and: {
          providerAccountId: { eq: $providerAccountId }
          provider: { eq: $provider }
        }
      }
    ) {
      numUids
    }
  }
`
export const addSession = /* GraphQL */ `
  mutation addSession($input: [AddSessionInput!]!) {
    addSession(input: $input) {
      session {
        ...SessionFragment
      }
    }
  }
  ${sessionFragment}
`
export const deleteSession = /* GraphQL */ `
  mutation deleteSession($sessionToken: String = "") {
    deleteSession(filter: { sessionToken: { eq: $sessionToken } }) {
      numUids
    }
  }
`
export const updateSession = /* GraphQL */ `
  mutation updateSession($input: SessionPatch = {}, $sessionToken: String) {
    updateSession(
      input: { filter: { sessionToken: { eq: $sessionToken } }, set: $input }
    ) {
      session {
        ...SessionFragment
      }
    }
  }
  ${sessionFragment}
`

export const createVerificationRequest = /* GraphQL */ `
  mutation createVerificationRequest($input: [AddVerificationRequestInput!]!) {
    addVerificationRequest(input: $input) {
      numUids
    }
  }
`

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
`
