/**
 * Triggers scheduled jobs (reminders, debrief prompts, follow-ups).
 *
 *   npm run cron              run once (use with an OS scheduler, e.g. every 5 minutes)
 *   npm run cron -- --watch   run every 5 minutes until stopped
 *   npm run cron -- --watch=2 run every 2 minutes
 *
 * Reads APP_URL and CRON_SECRET from the environment (.env.local is loaded by npm script).
 */
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set. Add it to .env.local.");
  process.exit(1);
}

const watchArg = process.argv.find((arg) => arg.startsWith("--watch"));
const minutes = watchArg ? Number(watchArg.split("=")[1] ?? 5) : 0;
if (watchArg && (!Number.isFinite(minutes) || minutes < 1)) {
  console.error("--watch needs a whole number of minutes, at least 1.");
  process.exit(1);
}

async function runOnce() {
  const started = new Date();
  try {
    const response = await fetch(new URL("/api/cron/run", appUrl), {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error(`[cron] ${started.toISOString()} failed: HTTP ${response.status}`, body);
      return false;
    }
    const results = Object.entries(body.results ?? {})
      .map(
        ([name, value]) =>
          `${name}=${value.handled}${value.failures ? ` (${value.failures} failed)` : ""}`,
      )
      .join(" ");
    console.log(`[cron] ${started.toISOString()} users=${body.users} ${results}`);
    return true;
  } catch (error) {
    console.error(`[cron] ${started.toISOString()} could not reach ${appUrl}: ${error.message}`);
    return false;
  }
}

if (minutes) {
  console.log(`[cron] running every ${minutes} minute(s). Press Ctrl+C to stop.`);
  await runOnce();
  setInterval(runOnce, minutes * 60_000);
} else {
  process.exit((await runOnce()) ? 0 : 1);
}
