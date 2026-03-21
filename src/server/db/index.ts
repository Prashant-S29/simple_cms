import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";
import * as orgSchema from "./org";
import * as projectSchema from "./project";
import * as orgMemberSchema from "./orgMember";

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, {
  schema: { ...schema, ...orgSchema, ...projectSchema, ...orgMemberSchema },
});
