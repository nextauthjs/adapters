export const makeUserFragment = (
  customFields: string
): string => /* GraphQL */ `
  fragment UserFragment on User {
    email
    id
    image
    name
    emailVerified
    ${customFields}
  }
`

export const accountFragment = /* GraphQL */ `
  fragment AccountFragment on Account {
    id
    type
    provider
    providerAccountId
    expires_at
    token_type
    scope
    access_token
    refresh_token
    id_token
    session_state
    oauth_token_secret
    oauth_token
  }
`
export const sessionFragment = /* GraphQL */ `
  fragment SessionFragment on Session {
    expires
    id
    sessionToken
    user {
      id
      name
      email
    }
  }
`
