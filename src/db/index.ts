import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// We use the direct connection URL because Netlify natively supports IPv6.
const connectionString = "postgresql://vyapar_user:Vyapar_Demo_123%21%40%23@db.dowlvvmlqsxlzrnccrvu.supabase.co:5432/postgres";

const globalForDb = globalThis as typeof globalThis & {
  __postgresClient?: ReturnType<typeof postgres>;
};

export const client =
  globalForDb.__postgresClient ??
  postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") globalForDb.__postgresClient = client;

export const db = drizzle(client);