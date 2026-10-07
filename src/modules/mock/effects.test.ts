import { describe, expect, it } from "vitest";

import { getContentService } from "@/modules/content/service";
import { notificationsFor } from "@/modules/notifications/service";
import { reviewServiceFor } from "@/modules/review/service";
import { seedContentIfMissing } from "@/seed";

import { syncMockForUser } from "./effects";
import { mockFor } from "./service";

const HOST = "d4d4d4d4-0000-4000-8000-000000000004";
const GUEST = "e5e5e5e5-0000-4000-8000-000000000005";

describe("syncMockForUser", () => {
  it("notifies and turns missed answers into the interviewee's own review cards, once", async () => {
    await seedContentIfMissing();
    const content = getContentService();
    const roleId = (await content.roles())[0]?.id as string;
    const topic = (await content.questions()).find((q) => q.format === "OPEN")?.topicId as string;
    for (const [id, name] of [
      [HOST, "Host"],
      [GUEST, "Guest"],
    ] as const) {
      await mockFor(id).join({
        displayName: name,
        roleId,
        band: "2-4",
        timezone: "UTC",
        showScore: false,
      });
    }
    const now = new Date("2026-10-07T08:00:00Z");
    const slot = await mockFor(HOST).postSlot(
      { date: "2026-10-08", time: "10:00", topics: [topic], meetingLink: null, note: "" },
      now,
    );
    const session = await mockFor(GUEST).bookSlot(slot.id, [topic], now);
    const asked = session.participants[1].questionIds;

    expect(await syncMockForUser(GUEST, now)).toBe(1); // "booked" notification
    expect(await syncMockForUser(GUEST, now)).toBe(0);

    await mockFor(HOST).submitFeedback(
      session.id,
      {
        ratings: { communication: 3, problemSolving: 2, technicalDepth: 2, structure: 3 },
        questions: asked.map((questionId, index) => ({
          questionId,
          rating: index === 0 ? "MISSED" : "NAILED",
        })),
        strengths: "",
        improvements: "",
      },
      new Date("2026-10-08T11:00:00Z"),
    );
    await syncMockForUser(GUEST, new Date("2026-10-08T11:05:00Z"));
    const cards = await reviewServiceFor(GUEST).list();
    expect(cards.filter((card) => card.sourceType === "MOCK_QUESTION")).toHaveLength(1);
    expect((await notificationsFor(GUEST).list()).map((n) => n.title)).toContain(
      "New mock interview feedback",
    );
    // The host's own data is untouched.
    expect(await reviewServiceFor(HOST).list()).toEqual([]);
    await syncMockForUser(GUEST, new Date("2026-10-08T11:06:00Z"));
    expect((await reviewServiceFor(GUEST).list()).length).toBe(cards.length);
  });
});
