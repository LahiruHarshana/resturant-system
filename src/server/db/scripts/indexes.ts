import {
  assertNoMissingIndexes,
  createDefinedIndexes,
  verifyRequiredIndexes,
} from "@/server/db/indexes";
import { connectForDatabaseScript } from "./runtime";

async function main() {
  const runtime = await connectForDatabaseScript();

  try {
    console.log(`Verifying indexes on safe database: ${runtime.databaseName}`);
    await createDefinedIndexes();
    const verification = await verifyRequiredIndexes();
    assertNoMissingIndexes(verification);
    console.log(
      `Index verification passed for ${verification.length} collections.`,
    );
  } finally {
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Index verification failed",
  );
  process.exit(1);
});
