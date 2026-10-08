import { type Page, expect, test } from "@playwright/test";

import { onboard, signup, uniqueEmail } from "./helpers";

/** Replaces the editor's code through Monaco's API (typing would trigger auto-close). */
async function setCode(page: Page, code: string): Promise<void> {
  await page.waitForFunction(() => {
    const monaco = (window as unknown as { monaco?: { editor: { getModels(): unknown[] } } })
      .monaco;
    return Boolean(monaco && monaco.editor.getModels().length > 0);
  });
  await page.evaluate((source) => {
    const monaco = (
      window as unknown as { monaco: { editor: { getModels(): { setValue(v: string): void }[] } } }
    ).monaco;
    monaco.editor.getModels()[0]!.setValue(source);
  }, code);
}

const JS_SOLUTION = `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
}`;

const PY_SOLUTION = `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
`;

test.describe.serial("coding practice", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await (await browser.newContext()).newPage();
    await signup(page, uniqueEmail("coder"));
    await onboard(page);
  });

  test("lists problems with today's set and opens the workspace", async () => {
    await page.goto("/practice/coding");
    await expect(page.getByRole("heading", { name: "Coding practice" })).toBeVisible();
    await expect(page.getByText("Today's practice set")).toBeVisible();
    await page.getByRole("link", { name: "Two Sum", exact: true }).first().click();
    await page.waitForURL(/\/practice\/coding\/two-sum/);
    await expect(page.getByRole("heading", { name: "Two Sum", level: 1 })).toBeVisible();
    await expect(page.getByText("Also on LeetCode")).toBeVisible();
  });

  test("JavaScript: a wrong answer, a runaway loop, then an accepted submission", async () => {
    await setCode(page, "function twoSum(nums, target) { return [0, 0]; }");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByText("Wrong answer").first()).toBeVisible({ timeout: 30_000 });

    await setCode(page, "function twoSum() { while (true) {} }");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByText("Time limit exceeded").first()).toBeVisible({ timeout: 30_000 });

    await setCode(page, JS_SOLUTION);
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Accepted")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Solved! Added to your progress.")).toBeVisible();
  });

  test("Python runs in the browser with Pyodide", async () => {
    await page.selectOption("#coding-language", "py");
    await setCode(page, "def two_sum(nums, target)\n    return []");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByText("Compile error")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/SyntaxError/)).toBeVisible();

    await setCode(page, PY_SOLUTION);
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Accepted")).toBeVisible({ timeout: 60_000 });
  });

  test("progress shows on the list and system design links to ScaleLab", async () => {
    await page.goto("/practice/coding?status=SOLVED");
    await expect(page.getByRole("link", { name: "Two Sum", exact: true })).toBeVisible();

    await page.goto("/practice/system-design");
    const link = page.getByRole("link", { name: /Design in ScaleLab/ }).first();
    await expect(link).toHaveAttribute("href", /\/play\?interview=url-shortener$/);
    await page.getByRole("button", { name: "Mark URL shortener as done" }).click();
    await expect(
      page.getByRole("button", { name: "Mark URL shortener as not done" }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText("1 / 15 practised")).toBeVisible();
  });
});
