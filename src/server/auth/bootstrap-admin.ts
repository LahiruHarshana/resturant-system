import { connectToDatabase } from "@/server/db/connect";
import { UserModel, RoleModel } from "@/server/db/models";
import { hashPassword } from "./password";

async function bootstrapAdmin() {
  const name = process.env.BOOTSTRAP_ADMIN_NAME;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error("Missing BOOTSTRAP_ADMIN_* environment variables.");
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("Bootstrap password must be at least 12 characters long.");
    process.exit(1);
  }

  await connectToDatabase();

  const superAdminRole = await RoleModel.findOne({ name: "super_admin" });

  if (!superAdminRole) {
    console.error("Could not find 'super_admin' role. Ensure DB is seeded.");
    process.exit(1);
  }

  const existingUser = await UserModel.findOne({ email });

  if (existingUser) {
    const hasRole = existingUser.roles.includes(superAdminRole._id); // IGNORE-ROLE-GUARD-CHECK
    if (!hasRole) {
      await UserModel.updateOne(
        { _id: existingUser._id },
        { $addToSet: { roles: superAdminRole._id } },
      );
      console.log(`Granted super_admin role to existing user: ${email}`);
    } else {
      console.log(
        `User ${email} already exists and is a super_admin. Skipping.`,
      );
    }
    // We intentionally do not overwrite the password to keep it idempotent/safe
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);

  await UserModel.create({
    email,
    name,
    passwordHash,
    roles: [superAdminRole._id],
    isActive: true,
    sessionVersion: 1,
    rolesVersion: 1,
    pinEnabled: false,
    failedPinAttempts: 0,
  });

  console.log(`Created bootstrap super_admin user: ${email}`);
  process.exit(0);
}

// Check if we are not running this in a test environment where we might want to export it instead
if (process.env.NODE_ENV !== "test" && require.main === module) {
  bootstrapAdmin().catch((err) => {
    console.error("Bootstrap failed:", err);
    process.exit(1);
  });
}

export { bootstrapAdmin };
