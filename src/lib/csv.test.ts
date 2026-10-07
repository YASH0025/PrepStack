import { describe, expect, it } from "vitest";

import { csvResponse, safeCell } from "./csv";

describe("CSV export", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(safeCell('=HYPERLINK("http://evil")')).toBe('\'=HYPERLINK("http://evil")');
    expect(safeCell("+91 98765")).toBe("'+91 98765");
    expect(safeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(safeCell("Acme")).toBe("Acme");
    expect(safeCell(null)).toBe("");
    expect(safeCell(["React", "Node"])).toBe("React, Node");
  });

  it("streams a UTF-8 CSV with BOM, quoting and headers", async () => {
    const response = csvResponse(
      "x.csv",
      ["Company", "Salary"],
      [
        ["Acme, Inc", "₹30 LPA"],
        ['Quote "Co"', null],
      ],
    );
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    const bytes = new Uint8Array(await response.arrayBuffer());
    // UTF-8 byte order mark so Excel detects the encoding.
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text.split("\n").slice(0, 3)).toEqual([
      "Company,Salary",
      '"Acme, Inc",₹30 LPA',
      '"Quote ""Co""",',
    ]);
  });
});
