import { type Page, expect } from "@playwright/test";

export const PASSWORD = "password123";

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}${Math.floor(Math.random() * 1000)}@e2e.test`;
}

/** "yyyy-MM-dd" for today plus `offset` days, in the browser's (UTC) calendar. */
export function day(offset: number): string {
  const date = new Date(Date.now() + offset * 86_400_000);
  return date.toISOString().slice(0, 10);
}

export async function signup(page: Page, email: string): Promise<void> {
  await page.goto("/signup");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/onboarding/);
}

export async function login(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/today|onboarding/);
}

/** Completes the three onboarding steps and skips the diagnostic. */
export async function onboard(page: Page): Promise<void> {
  await page.fill("#yearsOfExperience", "3");
  await page.click("button:has-text('React')");
  await page.click("button[type=submit]");
  await expect(page.getByRole("heading", { name: "Your target" })).toBeVisible();
  await page.click("label:has-text('Full-Stack Developer')");
  await page.click("button[type=submit]");
  await expect(page.getByRole("heading", { name: "Your time" })).toBeVisible();
  await page.click("button:has-text('Finish')");
  await page.waitForURL(/onboarding\/next/);
  await page.goto("/today");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
