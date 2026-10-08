import { type Browser, type Page, expect, test } from "@playwright/test";

import { day, fillStable, onboard, signup, uniqueEmail } from "./helpers";

async function newUser(browser: Browser, prefix: string, name: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signup(page, uniqueEmail(prefix));
  await onboard(page);
  await page.goto("/practice/mock");
  await page.waitForLoadState("networkidle");
  await fillStable(page, "#mock-name", name);
  await page.click("#mock-agree");
  await page.click("button:has-text('Join mock interviews')");
  await expect(page.getByRole("navigation", { name: "Mock interview sections" })).toBeVisible();
  return page;
}

test.describe.serial("peer mock interviews and readiness passport", () => {
  let host: Page;
  let guest: Page;

  test("two people post and book a mock interview and see only display names", async ({
    browser,
  }) => {
    host = await newUser(browser, "host", "Hema");
    await host.goto("/practice/mock?tab=post");
    await host.waitForLoadState("networkidle");
    await fillStable(host, "#slot-date", day(3));
    await fillStable(host, "#slot-time", "18:00");
    await host.locator("#slot-topics button[role=checkbox]").first().click();
    await fillStable(host, "#slot-link", "https://meet.example.com/hema-room");
    await host.click("button:has-text('Post slot')");
    await expect(host.getByText("Slot posted.")).toBeVisible();

    guest = await newUser(browser, "guest", "Gopal");
    await guest.goto("/practice/mock?tab=slots&all=1");
    const slot = guest.locator("li", { hasText: "Hema" }).first();
    await slot.getByRole("button", { name: "Book" }).click();
    await guest.locator("#book-topics button[role=checkbox]").first().click();
    await guest.click("button:has-text('Confirm booking')");
    await guest.waitForURL(/\/practice\/mock\/sessions\//, { timeout: 90_000 });
    await expect(guest.getByRole("heading", { name: "Mock interview with Hema" })).toBeVisible();
    await expect(guest.getByRole("link", { name: "Join meeting" })).toHaveAttribute(
      "href",
      "https://meet.example.com/hema-room",
    );
    expect(await guest.content()).not.toMatch(/host\.\d+.*@e2e\.test/);

    await host.goto("/practice/mock");
    await host.locator("a[href^='/practice/mock/sessions/']").first().click();
    await expect(host.getByRole("heading", { name: "Mock interview with Gopal" })).toBeVisible();
    await expect(host.getByText(/Questions to ask Gopal/)).toBeVisible();
  });

  test("a readiness passport is shared by private link and can be turned off", async ({
    browser,
  }) => {
    await host.goto("/profile/passport");
    await host.waitForLoadState("networkidle");
    await host.click("button:has-text('Create share link')");
    const linkInput = host.getByLabel("Share link");
    await expect(linkInput).toBeVisible();
    const path = new URL(await linkInput.inputValue()).pathname;

    const viewer = await (await browser.newContext()).newPage();
    await viewer.goto(path);
    await expect(viewer.getByRole("heading", { level: 1 })).toHaveText("Hema");
    await expect(viewer.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    host.once("dialog", (dialog) => dialog.accept());
    await host.click("button:has-text('Turn off sharing')");
    await expect(host.getByRole("button", { name: "Create share link" })).toBeVisible();
    expect((await viewer.goto(path))?.status()).toBe(404);
  });
});
