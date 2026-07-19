import { z } from "zod";

const optionalPublicString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

const publicEnvSchema = z.object({
  NEXT_PUBLIC_PUSHER_CLUSTER: optionalPublicString,
  NEXT_PUBLIC_PUSHER_KEY: optionalPublicString,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
});
