import { createDefinedIndexes } from "@/server/db/indexes";
import {
  getMigrationStatus,
  runPendingMigrations,
} from "@/server/db/migration-runner";
import { connectForDatabaseScript } from "./runtime";

async function main() {
  const command = process.argv[2] ?? "status";
  const repeat = Number(process.env.DB_SCRIPT_REPEAT ?? "1");
  const runtime = await connectForDatabaseScript();

  try {
    console.log(`Using safe database: ${runtime.databaseName}`);
    await createDefinedIndexes();

    if (command === "run") {
      for (let iteration = 1; iteration <= repeat; iteration += 1) {
        const results = await runPendingMigrations();
        const skipped = results.filter((r) => r.skipped).length;
        const mutated = results.filter((r) => !r.skipped).length;
        console.log(
          `Migration run ${iteration}: processed=${results.length}, skipped=${skipped}, mutated=${mutated}`,
        );
      }
    } else if (command === "status") {
      const status = await getMigrationStatus();
      console.log(`Migration status entries: ${status.length}`);
      for (const entry of status) {
        console.log(`${entry.id} ${entry.name}: ${entry.status}`);
      }
    } else {
      throw new Error(`Unknown migration command: ${command}`);
    }
  } finally {
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Migration command failed",
  );
  process.exit(1);
});
