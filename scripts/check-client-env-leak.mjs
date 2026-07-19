import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const clientOutputDirs = [
  join(root, ".next", "static"),
  join(root, ".next", "server", "app"),
];
const serverSecretSentinels = {
  AUTH_SECRET: "SERVER_ONLY_AUTH_SECRET_SENTINEL_05_1234567890",
  CLOUDINARY_URL: "cloudinary://SERVER_ONLY_CLOUDINARY_SENTINEL_05",
  MONGODB_URI:
    "mongodb://user:SERVER_ONLY_MONGODB_SENTINEL_05@localhost:27017/restaurant_prod",
  PUSHER_APP_ID: "SERVER_ONLY_PUSHER_APP_ID_SENTINEL_05",
  PUSHER_SECRET: "SERVER_ONLY_PUSHER_SECRET_SENTINEL_05",
  RESEND_API_KEY: "SERVER_ONLY_RESEND_SENTINEL_05",
  SENTRY_DSN: "https://SERVER_ONLY_SENTRY_SENTINEL_05@example.invalid/1",
};

const build = spawnSync("npx", ["next", "build"], {
  cwd: root,
  env: {
    ...process.env,
    APP_URL: "https://restaurant.example.invalid",
    AUTH_TRUST_HOST: "true",
    NEXT_PUBLIC_PUSHER_CLUSTER: "ap2",
    NEXT_PUBLIC_PUSHER_KEY: "PUBLIC_PUSHER_KEY_SENTINEL_05",
    NODE_ENV: "production",
    PUSHER_CLUSTER: "ap2",
    PUSHER_KEY: "PUBLIC_PUSHER_KEY_SENTINEL_05",
    ...serverSecretSentinels,
  },
  stdio: "inherit",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const leakedVariableNames = [];

for (const directory of clientOutputDirs) {
  if (!existsSync(directory)) {
    continue;
  }

  for (const filePath of listFiles(directory)) {
    const content = readFileSync(filePath, "utf8");

    for (const [variableName, sentinel] of Object.entries(
      serverSecretSentinels,
    )) {
      if (content.includes(sentinel)) {
        leakedVariableNames.push(variableName);
      }
    }
  }
}

if (leakedVariableNames.length > 0) {
  console.error(
    `Server-only environment values appeared in client output: ${[
      ...new Set(leakedVariableNames),
    ].join(", ")}`,
  );
  process.exit(1);
}

console.log(
  "Client environment leakage check passed for server-only sentinels.",
);

function listFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(path));
    } else {
      files.push(path);
    }
  }

  return files;
}
