import { UserModel } from "@/server/db/models";
import type { DatabaseMigration } from "./types";

const BATCH_SIZE = 100;

export const addAuthFieldsMigration: DatabaseMigration = {
  checksum: "0002-add-auth-fields-v1",
  id: "0002",
  name: "add-auth-fields",
  recovery:
    "If this migration fails, verify user documents and rerun. The operation is idempotent.",
  async run() {
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    let cursorId: unknown = null;

    while (true) {
      const query = cursorId ? { _id: { $gt: cursorId } } : {};
      const users = await UserModel.find(query, {
        sessionVersion: 1,
        rolesVersion: 1,
        pinEnabled: 1,
        failedPinAttempts: 1,
      })
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .lean<
          {
            _id: unknown;
            sessionVersion?: number;
            rolesVersion?: number;
            pinEnabled?: boolean;
            failedPinAttempts?: number;
          }[]
        >();

      if (users.length === 0) {
        break;
      }

      for (const user of users) {
        cursorId = user._id;

        const isMissingFields =
          user.sessionVersion === undefined ||
          user.rolesVersion === undefined ||
          user.pinEnabled === undefined ||
          user.failedPinAttempts === undefined;

        if (!isMissingFields) {
          skipped += 1;
          continue;
        }

        try {
          await UserModel.updateOne(
            { _id: user._id },
            {
              $set: {
                sessionVersion: user.sessionVersion ?? 1,
                rolesVersion: user.rolesVersion ?? 1,
                pinEnabled: user.pinEnabled ?? false,
                failedPinAttempts: user.failedPinAttempts ?? 0,
              },
            },
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
