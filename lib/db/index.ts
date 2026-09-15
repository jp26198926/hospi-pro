import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: ReturnType<typeof postgres> | undefined;
};

const connectionString = process.env.DATABASE_URL!;

if (!globalForDb.conn) {
  globalForDb.conn = postgres(connectionString);
}

export const db = drizzle(globalForDb.conn, { schema });
