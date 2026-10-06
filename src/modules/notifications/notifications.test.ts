import { describe, expect, it } from "vitest";

import { runScheduledJobs } from "@/lib/services/scheduler";

import { JsonNotificationRepository } from "./repository.json";
import { NotificationService } from "./service";

const userId = "66666666-6666-4666-8666-666666666666";

const sample = (dedupeKey: string) => ({
  type: "SYSTEM" as const,
  title: "Hello",
  body: "World",
  href: "/today",
  dedupeKey,
});

describe("NotificationService", () => {
  it("creates once per dedupe key, counts unread and marks read", async () => {
    const service = new NotificationService(new JsonNotificationRepository(userId));
    expect(await service.notify(sample("a"))).not.toBeNull();
    expect(await service.notify(sample("a"))).toBeNull();
    const second = await service.notify(sample("b"));
    expect(await service.unreadCount()).toBe(2);

    await service.markRead(second?.id ?? "");
    expect(await service.unreadCount()).toBe(1);
    expect(await service.markAllRead()).toBe(1);
    expect(await service.unreadCount()).toBe(0);
  });

  it("rejects non-relative links", async () => {
    const service = new NotificationService(
      new JsonNotificationRepository("77777777-7777-4777-8777-777777777777"),
    );
    await expect(
      service.notify({ ...sample("x"), href: "https://evil.example" }),
    ).rejects.toThrow();
  });
});

describe("runScheduledJobs", () => {
  it("runs every job per user and isolates failures", async () => {
    const logs: string[] = [];
    const summary = await runScheduledJobs(
      [
        { name: "ok", run: async () => 2 },
        {
          name: "flaky",
          run: async ({ userId: id }) => {
            if (id === "u2") throw new Error("boom");
            return 1;
          },
        },
      ],
      ["u1", "u2"],
      new Date("2026-01-01T00:00:00Z"),
      (message) => logs.push(message),
    );
    expect(summary.results).toEqual({
      ok: { handled: 4, failures: 0 },
      flaky: { handled: 1, failures: 1 },
    });
    expect(logs[0]).toContain("job=flaky user=u2");
  });
});
