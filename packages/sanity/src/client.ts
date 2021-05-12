import type { User } from "next-auth"

export interface SignUpData {
  email: string
  password: string
  name?: string
  image?: string
}

export const signUp = async (data: SignUpData) => {
  const res = await fetch("/api/sanity/signUp", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json"
    }
  })
  const user = await res.json() as User
  return user
}
