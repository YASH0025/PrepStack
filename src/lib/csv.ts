import { Readable } from "node:stream";

import { stringify } from "csv-stringify";

/**
 * Neutralises spreadsheet formula injection: a cell starting with = + - @ (or
 * a tab/CR) would be executed by Excel/Sheets, so it is prefixed with a quote.
 */
export function safeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/**
 * Streams rows as CSV (UTF-8 with BOM so Excel shows ₹ and other characters
 * correctly). Rows are generated on the fly and never stored.
 */
export function csvResponse(
  filename: string,
  header: string[],
  rows: Iterable<unknown[]>,
): Response {
  const stringifier = stringify({ header: true, columns: header, bom: true });
  const source = Readable.from(
    (function* () {
      for (const row of rows) yield row.map(safeCell);
    })(),
    { objectMode: true },
  );
  const stream = source.pipe(stringifier);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
