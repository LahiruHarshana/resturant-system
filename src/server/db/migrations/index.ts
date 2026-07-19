import { normalizeUserEmailsMigration } from "./0001-normalize-user-emails";
import { addAuthFieldsMigration } from "./0002-add-auth-fields";

export const migrations = [
  normalizeUserEmailsMigration,
  addAuthFieldsMigration,
] as const;
