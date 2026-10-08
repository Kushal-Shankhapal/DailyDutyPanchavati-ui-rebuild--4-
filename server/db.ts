// Fail-loud pg pool helper with dev/test database selection (engineering practice: Quasar P0.5/P0.6 analog).
// No police data leaves the machine; no cloud services. Local PostgreSQL only.

import pg from "pg";

export const DEV_DB = process.env.PANCHAVATI_DEV_DB ?? "panchavati3_dev";
export const TEST_DB = process.env.PANCHAVATI_TEST_DB ?? "panchavati3_test";

function baseConfig(): pg.ClientConfig {
  // DATABASE_URL wins if provided; otherwise local defaults (trust auth as postgres).
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  const host = process.env.PGHOST ?? "127.0.0.1";
  const port = Number(process.env.PGPORT ?? 5432);
  const user = process.env.PGUSER ?? "postgres";
  const password = process.env.PGPASSWORD; // optional under trust auth
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PGPORT: ${process.env.PGPORT} (fail loud at the boundary)`);
  }
  return { host, port, user, ...(password ? { password } : {}) };
}

/** Pool for the requested database. Fails loudly on unusable config. */
export function makePool(dbName: string): pg.Pool {
  if (!dbName || typeof dbName !== "string") {
    throw new Error(`Invalid database name: ${JSON.stringify(dbName)}`);
  }
  return new pg.Pool({ ...baseConfig(), database: dbName, max: 5 });
}

export function isTestRun(): boolean {
  return process.env.NODE_ENV === "test" || !!process.env.VITEST;
}

/** Pool for the database this process should operate on (test runs → test DB). */
export function currentPool(): pg.Pool {
  return makePool(isTestRun() ? TEST_DB : DEV_DB);
}
