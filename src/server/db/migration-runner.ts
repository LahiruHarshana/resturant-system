import { MigrationLedgerModel } from "./models";
import { migrations } from "./migrations";

export async function getMigrationStatus() {
  const ledgers = await MigrationLedgerModel.find(
    {},
    {
      checksum: 1,
      completedAt: 1,
      failedCount: 1,
      migrationId: 1,
      name: 1,
      processedCount: 1,
      status: 1,
    },
  )
    .sort({ migrationId: 1 })
    .lean();

  return migrations.map((migration) => {
    const ledger = ledgers.find((entry) => entry.migrationId === migration.id);
    return {
      id: migration.id,
      name: migration.name,
      recovery: migration.recovery,
      status: ledger?.status ?? "PENDING",
    };
  });
}

export async function runPendingMigrations() {
  const results = [];

  for (const migration of migrations) {
    const existing = await MigrationLedgerModel.findOne(
      { migrationId: migration.id },
      { status: 1 },
    ).lean();

    if (existing?.status === "COMPLETED") {
      results.push({ id: migration.id, skipped: true });
      continue;
    }

    const startedAt = new Date();
    await MigrationLedgerModel.updateOne(
      { migrationId: migration.id },
      {
        $set: {
          checksum: migration.checksum,
          failedCount: 0,
          migrationId: migration.id,
          name: migration.name,
          processedCount: 0,
          startedAt,
          status: "RUNNING",
        },
      },
      { upsert: true },
    );

    try {
      const result = await migration.run();
      await MigrationLedgerModel.updateOne(
        { migrationId: migration.id },
        {
          $set: {
            completedAt: new Date(),
            failedCount: result.failed,
            processedCount: result.processed,
            status: result.failed > 0 ? "FAILED" : "COMPLETED",
          },
        },
      );
      results.push({ id: migration.id, ...result, skipped: false });
    } catch (error) {
      await MigrationLedgerModel.updateOne(
        { migrationId: migration.id },
        {
          $set: {
            errorSummary: sanitizeError(error),
            failedCount: 1,
            status: "FAILED",
          },
        },
      );
      throw error;
    }
  }

  return results;
}

function sanitizeError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown migration error";
  return message
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "[redacted-mongodb-uri]")
    .slice(0, 1_000);
}
