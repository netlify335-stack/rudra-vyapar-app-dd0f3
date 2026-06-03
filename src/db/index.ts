import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// We use the Supavisor connection pooler URL for IPv4 compatibility on Vercel.
// We must set prepare: false because transaction poolers don't support prepared statements.
const connectionString = "postgresql://vyapar_user:Vyapar_Demo_123%21%40%23@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

const globalForDb = globalThis as typeof globalThis & {
  __postgresClient?: ReturnType<typeof postgres>;
};

export const client =
  globalForDb.__postgresClient ??
  postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") globalForDb.__postgresClient = client;

export const db = drizzle(client);