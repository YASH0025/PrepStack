import { describe, expect, it } from "vitest";

import { getContentService } from "@/modules/content/service";
import { profileServiceFor } from "@/modules/profile/service";
import { trackerFor } from "@/modules/tracker/service";
import { seedContentIfMissing } from "@/seed";
import { readStored } from "@/test/stored";
import { passportPath } from "@/lib/storage/paths";

import { passportFor, publicPassport } from "./service";

const USER = "f6f6f6f6-0000-4000-8000-000000000006";

describe("readiness passport", () => {
  it("publishes a sanitized snapshot behind a revocable private link", async () => {
    await seedContentIfMissing();
    const content = getContentService();
    const track = (await content.activeTracks())[0];
    const role = (await content.roles(track?.id))[0];
    await profileServiceFor(USER).save(
      {
        displayName: "Prateek",
        stack: ["React"],
        yearsOfExperience: 6,
        trackId: track?.id as string,
        targetRoleId: role?.id as string,
        targetCompanies: ["Secret Target Co"],
        prepWindowDays: 30,
        dailyHours: 2,
        timezone: "Asia/Kolkata",
      },
      { completeOnboarding: true },
    );
    await trackerFor(USER).createApplication({
      companyName: "Hidden Employer",
      jobTitle: "SDE",
      technologies: [],
      jobLink: null,
      source: "LINKEDIN",
      referrerName: null,
      agency: null,
      appliedOn: null,
      status: "APPLIED",
      expectedSalary: "50 LPA",
      offeredSalary: null,
      offerJoiningDate: null,
      notes: null,
      followUpDate: null,
      outcome: null,
    });

    const passport = passportFor(USER);
    expect(await publicPassport("not-a-real-token-at-all-xyz")).toBeNull();
    const token = await passport.createLink();
    const snapshot = await publicPassport(token);
    expect(snapshot?.data.displayName).toBe("Prateek");
    expect(snapshot?.data.band).toBe("6+");
    expect(snapshot?.data.topics.total).toBeGreaterThan(0);

    // The public snapshot has no private details and no owner id…
    const published = JSON.stringify(snapshot);
    for (const secret of ["Secret Target Co", "Hidden Employer", "50 LPA", USER, token]) {
      expect(published).not.toContain(secret);
    }
    // …and the server-side link index stores only a hash of the token.
    expect(await readStored(passportPath("links.json"))).not.toContain(token);
    // The owner can copy the link again.
    expect((await passport.status()).token).toBe(token);

    // A new link revokes the old one; disabling removes the snapshot.
    const second = await passport.createLink();
    expect(await publicPassport(token)).toBeNull();
    expect(await publicPassport(second)).not.toBeNull();
    await passport.setDisplayName("P. Jadhav");
    expect((await publicPassport(second))?.data.displayName).toBe("P. Jadhav");
    await passport.disable();
    expect(await publicPassport(second)).toBeNull();
    expect((await passport.status()).enabled).toBe(false);

    // Double click / two tabs: only one link ends up live, and turning
    // sharing off revokes everything.
    const [x, y] = await Promise.all([passport.createLink(), passport.createLink()]);
    const live = [await publicPassport(x), await publicPassport(y)].filter(Boolean);
    expect(live).toHaveLength(1);
    await passport.disable();
    expect([await publicPassport(x), await publicPassport(y)]).toEqual([null, null]);
    expect(await readStored(passportPath("links.json"))).not.toContain(USER);

    await passport.createLink();
    await passport.removeAll();
    expect(await readStored(passportPath("snapshots.json"))).not.toContain("P. Jadhav");
  });
});
