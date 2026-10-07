import { describe, expect, it } from "vitest";

import { reportBookmarksFor } from "./service";

const USER = "63636363-6363-4636-8636-636363636363";
const A = "64646464-6464-4646-8646-646464646464";
const B = "65656565-6565-4656-8656-656565656565";

describe("report bookmarks", () => {
  it("toggles privately per user, newest first, and prunes", async () => {
    const bookmarks = reportBookmarksFor(USER);
    expect(await bookmarks.toggle(A)).toBe(true);
    expect(await bookmarks.toggle(B)).toBe(true);
    expect(await bookmarks.list()).toEqual([B, A]);
    expect(await bookmarks.toggle(B)).toBe(false);
    await bookmarks.prune([A]);
    expect(await bookmarks.list()).toEqual([]);
    expect(await reportBookmarksFor("66666666-6666-4666-8666-666666666666").list()).toEqual([]);
  });
});
