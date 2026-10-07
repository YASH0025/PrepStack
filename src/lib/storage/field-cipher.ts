import { decrypt, encrypt } from "@/lib/services/crypto";

/**
 * Field-level encryption for JSON collections. Paths name string fields of a
 * record; `[]` steps into arrays, e.g. "title", "questions[].answerNotes".
 *
 * Records are decrypted right after reading and encrypted right before
 * writing, so repositories and services only ever see plain text while the
 * file on disk only holds ciphertext. Legacy plain-text values are accepted on
 * read and encrypted on the next write. Empty strings and nulls are kept as is.
 */
export interface FieldCipher {
  encodeRecords(records: unknown[]): unknown[];
  decodeRecords(records: unknown[]): unknown[];
}

const PREFIX = "enc:v1:";

function mapPath(value: unknown, steps: string[], fn: (text: string) => string): unknown {
  if (steps.length === 0) {
    return typeof value === "string" && value !== "" ? fn(value) : value;
  }
  const [step, ...rest] = steps as [string, ...string[]];
  if (step.endsWith("[]")) {
    const key = step.slice(0, -2);
    if (!isObject(value) || !Array.isArray(value[key])) return value;
    return {
      ...value,
      [key]: (value[key] as unknown[]).map((item) => mapPath(item, rest, fn)),
    };
  }
  if (rest.length === 0) {
    if (!isObject(value) || !(step in value)) return value;
    return { ...value, [step]: mapPath(value[step], [], fn) };
  }
  if (!isObject(value)) return value;
  return { ...value, [step]: mapPath(value[step], rest, fn) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Splits "questions[].answerNotes" into ["questions[]", "answerNotes"]. */
function parse(path: string): string[] {
  return path.split(/(?<=\[\])\.|\./);
}

export function fieldCipher(paths: string[]): FieldCipher {
  const parsed = paths.map(parse);
  const apply = (records: unknown[], fn: (text: string) => string) =>
    records.map((record) => parsed.reduce((acc, steps) => mapPath(acc, steps, fn), record));
  return {
    encodeRecords: (records) =>
      apply(records, (text) => (text.startsWith(PREFIX) ? text : encrypt(text))),
    decodeRecords: (records) =>
      apply(records, (text) => (text.startsWith(PREFIX) ? decrypt(text) : text)),
  };
}
