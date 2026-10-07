import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("landing, topic guides and community reports are public and indexable", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "PrepStack" })).toBeVisible();

    await page.click("text=Interview topics");
    await page.waitForURL(/\/topics$/);
    const firstTopic = page.locator("main ul a").first();
    const name = await firstTopic.innerText();
    await firstTopic.click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText("How deep to go")).toBeVisible();
    // Canonical link for SEO.
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", /\/topics\//);

    await page.goto("/reports");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Interview experiences");

    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /interviews");
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("/topics/");
  });

  test("private pages require signing in", async ({ page, request }) => {
    for (const path of ["/today", "/interviews/tracker", "/intel", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
    expect((await request.get("/api/account/export")).status()).toBe(401);
    expect((await request.post("/api/cron/run")).status()).toBe(401);
  });
});
