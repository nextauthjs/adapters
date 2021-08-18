import { Account, AccountSchema } from "./account"
import { User, UserSchema } from "./user"
import { Session, SessionSchema } from "./session"
import {
  VerificationToken,
  VerificationTokenSchema,
} from "./verification-token"

export default {
  Account: {
    model: Account,
    schema: AccountSchema,
  },
  User: {
    model: User,
    schema: UserSchema,
  },
  Session: {
    model: Session,
    schema: SessionSchema,
  },
  VerificationToken: {
    model: VerificationToken,
    schema: VerificationTokenSchema,
  },
}
