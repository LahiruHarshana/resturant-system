import { auth } from "@/auth";
import { UserModel } from "@/server/db/models";
import { connectToDatabase } from "@/server/db/connect";
import { AuthenticationError } from "./errors";

export { AuthenticationError };

/**
 * Authoritatively validates the current session against the database.
 * Throws an AuthenticationError if the session is invalid.
 * Returns the session if valid.
 */
export async function requireAuthentication() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  await connectToDatabase();

  const user = await UserModel.findById(session.user.id).select(
    "isActive sessionVersion",
  );

  if (!user || !user.isActive) {
    throw new AuthenticationError("User is no longer active");
  }

  if (user.sessionVersion !== session.user.sessionVersion) {
    throw new AuthenticationError("Session invalidated by security update");
  }

  return session;
}

/**
 * Requires the current session to have been authenticated via PASSWORD recently.
 * @param maxAgeMinutes How old the password authentication can be before rejecting.
 */
export async function requirePasswordReauthentication(maxAgeMinutes = 15) {
  const session = await requireAuthentication();

  const authMethod = session.user.authMethod;
  const authTime = session.user.authTime;

  if (authMethod !== "PASSWORD") {
    throw new AuthenticationError(
      "Password authentication required for this action",
    );
  }

  const ageMinutes = (Date.now() - (authTime || 0)) / 1000 / 60;
  if (ageMinutes > maxAgeMinutes) {
    throw new AuthenticationError(
      "Password reauthentication required (session too old)",
    );
  }

  return session;
}
