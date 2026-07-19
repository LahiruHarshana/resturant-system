import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('Seeding the database for E2E tests...');
  execSync('npm run db:seed-demo', { stdio: 'inherit' });
  console.log('Database seeded.');
}
