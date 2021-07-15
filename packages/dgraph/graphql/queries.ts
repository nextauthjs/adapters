export const getUserById = /* GraphQL */ `
  query getUserById($id: ID!) {
    getUser(id: $id) {
      createdAt
      email
      emailVerified
      id
      image
      name
      updatedAt
      emailVerified
    }
  }
`;
export const getUserByEmail = /* GraphQL */ `
  query getUserByEmail($email: String = "") {
    queryUser(filter: { email: { eq: $email } }) {
      createdAt
      email
      emailVerified
      id
      image
      name
      updatedAt
      emailVerified
    }
  }
`;
export const getVerificationRequest = /* GraphQL */ `
  query getVerificationRequest($identifier: String = "", $token: String = "") {
    queryVerificationRequest(filter: { and: { identifier: { eq: $identifier }, token: { eq: $token } } }) {
      expires
      identifier
      token
    }
  }
`;
export const getAccount = /* GraphQL */ `
  query getUserByAccount($providerAccountId: String = "", $providerId: String = "") {
    queryAccount(filter: { and: { providerAccountId: { eq: $providerAccountId }, providerId: { eq: $providerId } } }) {
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
`;
export const getUserByAccount = /* GraphQL */ `
  query getUserByAccount($providerAccountId: String = "", $providerId: String = "") {
    queryAccount(filter: { and: { providerAccountId: { eq: $providerAccountId }, providerId: { eq: $providerId } } }) {
      user {
        createdAt
        email
        emailVerified
        id
        image
        name
        updatedAt
        emailVerified
      }
      id
    }
  }
`;
export const getSession = /* GraphQL */ `
  query getSession($sessionToken: String = "") {
    querySession(filter: { sessionToken: { eq: $sessionToken } }) {
      accessToken
      createdAt
      expires
      id
      sessionToken
      updatedAt
      user {
        createdAt
        email
        emailVerified
        id
        image
        name
        updatedAt
        emailVerified
      }
    }
  }
`;
