import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../src");

const prohibitedPatterns = [
  // Examples to detect: user.role === "waiter", role === 'admin'
  /\buser\.roles?\s*===?\s*['"`]/,
  /\broles?\s*===?\s*['"`]/,
  // Examples to detect: roles.includes("kitchen")
  /\broles?\.includes\s*\(/,
];

let hasErrors = false;

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      line.trim().startsWith("//") ||
      line.includes("IGNORE-ROLE-GUARD-CHECK")
    ) {
      continue;
    }

    for (const pattern of prohibitedPatterns) {
      if (pattern.test(line)) {
        console.error(
          `\n❌ Prohibited role guard detected in ${path.relative(srcDir, filePath)}:${i + 1}`,
        );
        console.error(`   ${line.trim()}`);
        console.error(
          `   Reason: Do not use hard-coded role names for authorization. Use requirePermission() instead.`,
        );
        hasErrors = true;
      }
    }
  }
}

console.log("Scanning src/ for hard-coded role guards...");
scanDirectory(srcDir);

if (hasErrors) {
  console.error(
    "\n🚨 Scan failed. Hard-coded role guards found. Please fix them.",
  );
  process.exit(1);
} else {
  console.log("✅ Scan passed. No hard-coded role guards found.");
  process.exit(0);
}
