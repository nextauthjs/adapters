// Account constraints

CREATE CONSTRAINT account_id_constraint
  IF NOT EXISTS
  ON (n:account) 
  ASSERT n.id IS UNIQUE;

// CREATE CONSTRAINT account_compound_id_constraint 
//   IF NOT EXISTS
//   ON (n:account) 
//   ASSERT n.compound_id IS UNIQUE;

// CREATE INDEX account_provider_account_id 
//   IF NOT EXISTS
//   FOR (n:Account)  
//   ON (n.provider_account_id);

// CREATE INDEX account_provider_id 
//   IF NOT EXISTS
//   FOR (n:Account)  
//   ON (n.provider_id);

// // Session constraints

// CREATE CONSTRAINT session_session_token_constraint 
//   IF NOT EXISTS
//   ON (n:Session) 
//   ASSERT n.session_token IS UNIQUE;

// CREATE CONSTRAINT session_access_token_constraint 
//   IF NOT EXISTS
//   ON (n:Session) 
//   ASSERT n.access_token IS UNIQUE;

// // User constraints

// CREATE CONSTRAINT user_email_constraint 
//   IF NOT EXISTS
//   ON (n:User) 
//   ASSERT n.email IS UNIQUE;

// // VerificationRequest constraints

// CREATE CONSTRAINT verification_request_token_constraint 
//   IF NOT EXISTS
//   ON (n:VerificationToken) 
//   ASSERT n.token IS UNIQUE;