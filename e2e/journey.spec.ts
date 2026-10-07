import { type Page, expect, test } from "@playwright/test";

import { PASSWORD, day, onboard, signup, uniqueEmail } from "./helpers";

/**
 * The core loop: track an interview → debrief → share an anonymized report →
 * moderator approves → it is public without personal details → the author
 * exports their data and deletes the account (removing the report).
 */
test.describe.serial("interview journey", () => {
  const email = uniqueEmail("candidate");
  let page: Page;
  let roundId = "";
  let reportUrl = "";

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("signs up and onboards", async () => {
    await signup(page, email);
    await onboard(page);
    await expect(page.getByText("What to study today")).toBeVisible();
  });

  test("tracks an application with a round that took place yesterday", async () => {
    await page.goto("/interviews/tracker");
    await page.click("button:has-text('New application')");
    await page.fill("#companyName", "Initrode");
    await page.fill("#jobTitle", "Frontend Engineer");
    await page.click("button:has-text('Add application')");
    await page.waitForURL(/app=/);
    await page.click("button:has-text('Add round')");
    await page.fill("#date", day(-1));
    await page.fill("#startTime", "10:00");
    await page.click("summary:has-text('People')");
    await page.fill("#hr-name", "Priya Sharma");
    await page.click("button:has-text('Schedule round')");
    await expect(page.locator("[data-slot=sheet-content] li:has-text('Round 1')")).toBeVisible();
  });

  test("Today asks for a debrief, which feeds review", async () => {
    await page.goto("/today");
    const card = page.locator("[data-slot=card]:has-text('Debriefs to write')");
    await expect(card).toContainText("Initrode");
    await card.getByRole("link", { name: "Write" }).click();
    await page.waitForURL(/\/debrief$/);
    roundId = page.url().split("/rounds/")[1]?.split("/")[0] ?? "";
    expect(roundId).toMatch(/^[0-9a-f-]{36}$/);

    await page.fill("#q-0-text", "How does React reconcile lists with keys?");
    await page.locator("label:has-text('Missed')").first().click();
    await page.locator("fieldset:has-text('How did it go?') label:has-text('3')").click();
    await page.locator("fieldset:has-text('Difficulty') label:has-text('4')").click();
    await page.fill("#debrief-feedback", "Priya said the panel liked the system design part");
    await page.click("button:has-text('Save debrief')");
    await expect(page.getByText("Debrief saved.")).toBeVisible();

    await page.goto("/practice/review");
    await expect(page.getByText("How does React reconcile lists with keys?")).toBeVisible();
  });

  test("shares an anonymized version after previewing it", async () => {
    await page.goto(`/interviews/rounds/${roundId}/share`);
    await page.fill("#report-summary", "Thanks Priya Sharma, call me on 9876543210.");
    await page.click("button:has-text('Preview public version')");
    const preview = page.locator("#share-preview");
    await expect(preview).toContainText("[name removed]");
    await expect(preview).toContainText("[phone removed]");
    await expect(preview).not.toContainText("Priya");
    await expect(page.getByRole("button", { name: "Publish anonymously" })).toBeDisabled();
    await page.click("#share-confirm");
    await page.click("button:has-text('Publish anonymously')");
    await expect(page.getByText("Thanks for sharing!")).toBeVisible();
    await expect(page.getByText("Awaiting moderation")).toBeVisible();
  });

  test("a moderator approves it and it becomes public without personal details", async ({
    browser,
  }) => {
    const admin = await browser.newPage();
    await signup(admin, "admin@e2e.test");
    await admin.goto("/admin/moderation");
    await expect(admin.getByText("Initrode").first()).toBeVisible();
    await admin.getByRole("button", { name: "Approve" }).first().click();
    await expect(admin.getByRole("link", { name: /pending \(0\)/i })).toBeVisible();
    await admin.close();

    await page.goto("/reports");
    await page.locator("main li a[href^='/reports/']", { hasText: "Initrode" }).first().click();
    await page.waitForURL(/\/reports\/[0-9a-f-]+$/);
    reportUrl = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: "Initrode" })).toBeVisible();
    const html = await page.content();
    for (const secret of ["Priya", "9876543210", "panel liked"]) expect(html).not.toContain(secret);
  });

  test("exports own data and deletes the account with its reports", async () => {
    const response = await page.request.get("/api/account/export");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.account.email).toBe(email);
    expect(JSON.stringify(data.rounds)).toContain("Priya Sharma");

    await page.goto("/profile");
    await page.click("button:has-text('Delete my account')");
    await page.check("input[value=REMOVE]");
    await page.fill("#delete-password", PASSWORD);
    await page.fill("#delete-confirm", "DELETE");
    await page.click("button:has-text('Delete account permanently')");
    await page.waitForURL(/deleted=1/);
    await expect(
      page.getByText("Your account and all your private data were deleted."),
    ).toBeVisible();

    expect((await page.request.get(reportUrl)).status()).toBe(404);
    await page.goto("/login");
    await page.fill("input[name=email]", email);
    await page.fill("input[name=password]", PASSWORD);
    await page.click("button[type=submit]");
    await expect(page.locator("[data-slot=alert]")).toBeVisible();
  });
});
