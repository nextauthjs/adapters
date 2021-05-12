import groq from "groq"

export const getUserByIdQuery = groq`
  *[_type == 'user' && _id == $id][0]
`

export const getUserByProviderAccountIdQuery = groq`
  *[_type == 'account' && providerId == $providerId && providerAccountId == $providerAccountId] {
    accessToken,
    accessTokenExpires,
    providerId,
    providerType,
    providerAccountId,
    user->
  }[0]
`

export const getUserByEmailQuery = groq`
  *[_type == 'user' && email == $email][0]
`
