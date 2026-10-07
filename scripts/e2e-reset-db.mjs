/**
 * Empties the end-to-end test database (E2E_DATABASE_URL) before a Playwright
 * run in Postgres mode. Refuses to touch a database whose name lacks "test" or "e2e".
 */
import pg from "pg";

const url = process.env.E2E_DATABASE_URL;
if (!url) process.exit(0);
const name = new URL(url).pathname.slice(1);
if (!/test|e2e/i.test(name)) {
  console.error(`Refusing to reset "${name}": the name must contain "test" or "e2e".`);
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query("drop schema if exists public cascade; create schema public;");
await client.query("drop schema if exists drizzle cascade;");
await client.end();
console.info(`[e2e] reset ${name}`);
