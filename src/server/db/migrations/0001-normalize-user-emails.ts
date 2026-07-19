import { UserModel } from "@/server/db/models";
import type { DatabaseMigration } from "./types";

const BATCH_SIZE = 100;

export const normalizeUserEmailsMigration: DatabaseMigration = {
  checksum: "0001-normalize-user-emails-v1",
  id: "0001",
  name: "normalize-user-emails",
  recovery:
    "If this migration fails, fix invalid user email records and rerun it. The operation is idempotent.",
  async run() {
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    let cursorId: unknown = null;

    while (true) {
      const query = cursorId ? { _id: { $gt: cursorId } } : {};
      const users = await UserModel.find(query, { email: 1 })
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .lean<{ _id: unknown; email: string }[]>();

      if (users.length === 0) {
        break;
      }

      for (const user of users) {
        cursorId = user._id;
        const normalizedEmail = user.email.trim().toLowerCase();

        if (normalizedEmail === user.email) {
          skipped += 1;
          continue;
        }

        try {
          await UserModel.updateOne(
            { _id: user._id },
            { $set: { email: normalizedEmail } },
          );
          processed += 1;
        } catch {
          failed += 1;
        }
      }
    }

    return { failed, processed, skipped };
  },
};
