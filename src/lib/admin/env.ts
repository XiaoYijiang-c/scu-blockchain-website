import { env } from "cloudflare:workers";

export interface AdminEnv {
  DB: D1Database;
  MEDIA: R2Bucket;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD_HASH?: string;
}
export const bindings = () => env as unknown as AdminEnv;
