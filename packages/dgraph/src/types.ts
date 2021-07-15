export type userId = string;
export type sessionId = string;
export type userEmail = string;
export type providerId = string;
export type providerAccountId = string;

export interface CreateUserInput {
  name?: string;
  email?: userEmail;
  image?: string;
  emailVerified?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface UpdateUserInput {
  name?: string | null;
  email?: userEmail | null;
  image?: string | null;
  emailVerified?: Date;
  updatedAt: Date;
}

export interface LinkAccountInput {
  providerId: string;
  providerType: string;
  providerAccountId: string;
  refreshToken?: string;
  accessToken?: string;
  accessTokenExpires?: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: userId;
  };
}
export interface CreateSessionInput {
  expires: Date;
  sessionToken: string;
  accessToken: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: userId | unknown;
  };
}
export interface UpdateSessionInput {
  expires?: Date;
  updatedAt?: Date;
}
export interface CreateVerificationRequestInput {
  identifier: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  expires: Date;
}

export interface DGraphConstructor {
  endpoint: string;
  apiKey: string;
  jwtSecret?: string;
  adminSecret?: string;
  authHeader?: string;
}
