import { createDefinedIndexes } from "@/server/db/indexes";
import { seedDatabase } from "@/server/db/seed";
import { connectForDatabaseScript } from "./runtime";

async function main() {
  const repeat = Number(process.env.DB_SCRIPT_REPEAT ?? "1");
  const runtime = await connectForDatabaseScript();

  try {
    console.log(`Running seed on safe database: ${runtime.databaseName}`);
    await createDefinedIndexes();
    for (let iteration = 1; iteration <= repeat; iteration += 1) {
      const result = await seedDatabase();
      console.log(
        `Seed run ${iteration}: created=${result.created}, updated=${result.updated}, skipped=${result.skipped}, failed=${result.failed}`,
      );
    }
  } finally {
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Seed command failed");
  process.exit(1);
});
