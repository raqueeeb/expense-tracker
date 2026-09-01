/**
 * A bcrypt hash of a passphrase that no account uses, at the same cost factor
 * as registration (12).
 *
 * Sign-in compares the submitted password against this when the email matches
 * no account, so that "no such user" and "wrong password" take the same time
 * to answer and cannot be told apart by an attacker enumerating addresses.
 *
 * It must stay a *syntactically valid* bcrypt hash: bcrypt.compare() rejects a
 * malformed hash in microseconds without doing any key derivation, which turns
 * the defence into the exact oracle it is meant to remove. The cost must also
 * match registration, or the two branches differ by a factor of 2^(12-cost).
 *
 * Guarded by dummy-hash.test.ts. Kept in its own module so that test does not
 * have to import NextAuth or the Prisma client.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$12$Jq9PfPAp9eYiNGqAVCLRuu1ffivsu6hgazK0DQbQON1MEVr2OZSbS";

/** Cost factor used by registerAction and changePassword. */
export const BCRYPT_COST = 12;
