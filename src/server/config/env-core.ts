import { z } from "zod";

const AUTH_SECRET_MIN_LENGTH = 32;

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

const requiredString = (name: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1, `${name} is required`),
  );

const booleanString = z.preprocess(
  (value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value !== "string") {
      return value;
    }

    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }

    return value;
  },
  z.boolean({ message: "AUTH_TRUST_HOST must be a boolean value" }),
);

const rawEnvSchema = z.object({
  APP_URL: requiredString("APP_URL"),
  AUTH_SECRET: requiredString("AUTH_SECRET"),
  AUTH_TRUST_HOST: booleanString,
  CLOUDINARY_URL: optionalString,
  MONGODB_URI: requiredString("MONGODB_URI"),
  NEXT_PUBLIC_PUSHER_CLUSTER: optionalString,
  NEXT_PUBLIC_PUSHER_KEY: optionalString,
  NODE_ENV: z.enum(["development", "test", "production"]),
  PUSHER_APP_ID: optionalString,
  PUSHER_CLUSTER: optionalString,
  PUSHER_KEY: optionalString,
  PUSHER_SECRET: optionalString,
  RESEND_API_KEY: optionalString,
  SENTRY_DSN: optionalString,
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
});

const serverEnvSchema = rawEnvSchema.superRefine((env, context) => {
  validateAppUrl(env.APP_URL, env.NODE_ENV, context);
  validateAuthSecret(env.AUTH_SECRET, context);
  validateMongoUri(env.MONGODB_URI, env.NODE_ENV, env.VERCEL_ENV, context);
  validateOptionalUrl("CLOUDINARY_URL", env.CLOUDINARY_URL, context);
  validateOptionalUrl("SENTRY_DSN", env.SENTRY_DSN, context);
  validateOptionalServiceKey("RESEND_API_KEY", env.RESEND_API_KEY, context);
  validatePusher(env, context);
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  input: Record<string, string | undefined> = process.env,
): ServerEnv {
  const parsed = serverEnvSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(formatEnvIssues(parsed.error.issues));
  }

  return parsed.data;
}

function validateAppUrl(
  appUrl: string,
  nodeEnv: ServerEnv["NODE_ENV"],
  context: z.RefinementCtx,
) {
  const url = parseUrl(appUrl);

  if (!url) {
    addIssue(context, "APP_URL", "APP_URL must be a valid absolute URL");
    return;
  }

  if (nodeEnv === "production" && url.protocol !== "https:") {
    addIssue(context, "APP_URL", "Production APP_URL must use HTTPS");
  }
}

function validateAuthSecret(authSecret: string, context: z.RefinementCtx) {
  if (authSecret.length < AUTH_SECRET_MIN_LENGTH) {
    addIssue(
      context,
      "AUTH_SECRET",
      `AUTH_SECRET must be at least ${AUTH_SECRET_MIN_LENGTH} characters`,
    );
  }
}

function validateMongoUri(
  mongodbUri: string,
  nodeEnv: ServerEnv["NODE_ENV"],
  vercelEnv: ServerEnv["VERCEL_ENV"],
  context: z.RefinementCtx,
) {
  const url = parseUrl(mongodbUri);

  if (!url || !["mongodb:", "mongodb+srv:"].includes(url.protocol)) {
    addIssue(
      context,
      "MONGODB_URI",
      "MONGODB_URI must be a valid MongoDB connection URI",
    );
    return;
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!databaseName) {
    addIssue(
      context,
      "MONGODB_URI",
      "MONGODB_URI must include a database name",
    );
    return;
  }

  const normalizedDatabaseName = databaseName.toLowerCase();
  const isProductionDatabase = /(^|[-_])(prod|production)([-_]|$)/.test(
    normalizedDatabaseName,
  );

  if (nodeEnv === "test") {
    if (isProductionDatabase || !normalizedDatabaseName.includes("test")) {
      addIssue(
        context,
        "MONGODB_URI",
        "Test mode must use a dedicated non-production test database name",
      );
    }

    return;
  }

  if (
    nodeEnv === "development" &&
    !/(dev|development|local)/.test(normalizedDatabaseName)
  ) {
    addIssue(
      context,
      "MONGODB_URI",
      "Development mode must use a development database name",
    );
  }

  if (nodeEnv === "production" && vercelEnv === "preview") {
    if (isProductionDatabase || !normalizedDatabaseName.includes("preview")) {
      addIssue(
        context,
        "MONGODB_URI",
        "Preview deployments must use a preview database name",
      );
    }

    return;
  }

  if (
    nodeEnv === "production" &&
    vercelEnv !== "preview" &&
    !isProductionDatabase
  ) {
    addIssue(
      context,
      "MONGODB_URI",
      "Production deployments must use a production database name",
    );
  }
}

function validateOptionalUrl(
  name: "CLOUDINARY_URL" | "SENTRY_DSN",
  value: string | undefined,
  context: z.RefinementCtx,
) {
  if (value && !parseUrl(value)) {
    addIssue(context, name, `${name} must be a valid URL when configured`);
  }
}

function validateOptionalServiceKey(
  name: "RESEND_API_KEY",
  value: string | undefined,
  context: z.RefinementCtx,
) {
  if (value && value.length < 12) {
    addIssue(context, name, `${name} is too short when configured`);
  }
}

function validatePusher(
  envValue: z.infer<typeof rawEnvSchema>,
  context: z.RefinementCtx,
) {
  const serverKeys = [
    "PUSHER_APP_ID",
    "PUSHER_KEY",
    "PUSHER_SECRET",
    "PUSHER_CLUSTER",
  ] as const;
  const publicKeys = [
    "NEXT_PUBLIC_PUSHER_KEY",
    "NEXT_PUBLIC_PUSHER_CLUSTER",
  ] as const;
  const allKeys = [...serverKeys, ...publicKeys];
  const configuredKeys = allKeys.filter((key) => Boolean(envValue[key]));

  if (configuredKeys.length > 0 && configuredKeys.length !== allKeys.length) {
    for (const key of allKeys) {
      if (!envValue[key]) {
        addIssue(context, key, `${key} is required when Pusher is configured`);
      }
    }
  }

  if (envValue.NODE_ENV === "production") {
    for (const key of allKeys) {
      if (!envValue[key]) {
        addIssue(context, key, `${key} is required in production`);
      }
    }
  }
}

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function addIssue(context: z.RefinementCtx, path: string, message: string) {
  context.addIssue({
    code: "custom",
    message,
    path: [path],
  });
}

function formatEnvIssues(issues: z.ZodIssue[]) {
  const messages = issues.map((issue) => {
    const variable = issue.path.join(".") || "environment";
    return `${variable}: ${issue.message}`;
  });

  return `Invalid environment configuration:\n${messages.join("\n")}`;
}
