import "server-only";

import { parseServerEnv } from "@/server/config/env-core";

export { parseServerEnv } from "@/server/config/env-core";
export type { ServerEnv } from "@/server/config/env-core";

export const env = parseServerEnv();
