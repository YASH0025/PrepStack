import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/*
 * Runs before each test file (and before its imports are evaluated), so modules
 * that read env at import time see these values. Every test file gets its own
 * empty data folder.
 */
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "prepstack-test-"));
process.env.SESSION_SECRET ??= "test-session-secret-that-is-at-least-32-chars";
// 32 zero bytes, base64. Test-only key.
process.env.ENCRYPTION_KEY ??= "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
process.env.CRON_SECRET ??= "test-cron-secret-0123456789abcdef";
