import fs from "node:fs";
import path from "node:path";

export const HORROR_LINE =
  "The baby is asleep in my arms when the unplugged monitor begins to sing her lullaby in my voice, from right behind me.";

export const DEFAULT_OUTPUT_PATH = "/output/entry.txt";

export interface GateAudit {
  ok: boolean;
  line: string;
  codePoints: number;
  bytes: number;
  problems: string[];
}

const BANNED_PATTERNS: RegExp[] = [
  /mirror/i,
  /doll/i,
  /basement/i,
  /closet/i,
  /attic/i,
  /under the bed/i,
  /i live alone/i,
];

export function auditHorrorLine(raw: string): GateAudit {
  const problems: string[] = [];
  const codePoints = Array.from(raw).length;
  const bytes = Buffer.byteLength(raw, "utf8");

  if (codePoints < 1 || codePoints > 200) {
    problems.push(`length ${codePoints} is outside 1..200 code points`);
  }
  if (!raw.isWellFormed()) {
    problems.push("not valid UTF-8 (lone surrogate)");
  }
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(raw)) {
    problems.push("contains a CR, LF or control character");
  }
  if (raw.length > 0 && raw.trim() !== raw) {
    problems.push("leading or trailing whitespace");
  }
  if (raw.trim().length === 0) {
    problems.push("only whitespace");
  }
  const terminators = raw.match(/[.!?]/g) ?? [];
  if (terminators.length > 1 || (terminators.length === 1 && !/[.!?]$/.test(raw))) {
    problems.push("not a single sentence");
  }
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(raw)) {
      problems.push(`contains banned cliche ${pattern.source}`);
    }
  }

  return { ok: problems.length === 0, line: raw, codePoints, bytes, problems };
}

export function emitHorrorLine(destination?: string): GateAudit {
  const audit = auditHorrorLine(HORROR_LINE);
  if (!audit.ok) {
    return audit;
  }
  const target = destination ?? process.env.OUTPUT_PATH ?? DEFAULT_OUTPUT_PATH;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, HORROR_LINE, "utf8");
  return audit;
}

export function formatAuditSummary(audit: GateAudit): string {
  const summary = `ok=${audit.ok} chars=${audit.codePoints} bytes=${audit.bytes}`;
  return [summary, ...audit.problems.map((problem) => `problem: ${problem}`)].join("\n");
}

export function verifyDeterministicBytes(first: Uint8Array, second: Uint8Array): boolean {
  return first.length === second.length && first.every((byte, index) => byte === second[index]);
}
