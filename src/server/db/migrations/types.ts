export type MigrationResult = {
  failed: number;
  processed: number;
  skipped: number;
};

export type DatabaseMigration = {
  checksum: string;
  id: string;
  name: string;
  recovery: string;
  run: () => Promise<MigrationResult>;
};
