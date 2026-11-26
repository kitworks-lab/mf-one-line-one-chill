import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { auditHorrorLine, formatAuditSummary, HORROR_LINE, verifyDeterministicBytes } from "../src/horror.ts";
import { main } from "../main.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`verify failed: ${message}`);
  }
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "one-line-verify-"));
const firstPath = path.join(workDir, "first.txt");
const secondPath = path.join(workDir, "second.txt");
const previousOutput = process.env.OUTPUT_PATH;

try {
  process.env.OUTPUT_PATH = firstPath;
  assert(main([]) === 0, "first run exit code");
  process.env.OUTPUT_PATH = secondPath;
  assert(main([]) === 0, "second run exit code");

  const first = fs.readFileSync(firstPath);
  const second = fs.readFileSync(secondPath);
  assert(verifyDeterministicBytes(first, second), "outputs are not byte-for-byte identical");
  assert(first.toString("utf8") === HORROR_LINE, "output is not HORROR_LINE");
  assert(!first.toString("utf8").endsWith("\n"), "output has a trailing newline");
  assert(verifyDeterministicBytes(first, first), "identical bytes not reported equal");
  assert(!verifyDeterministicBytes(first, second.subarray(1)), "different lengths reported equal");
  assert(!verifyDeterministicBytes(Buffer.from("a"), Buffer.from("b")), "different bytes reported equal");

  const audit = auditHorrorLine(HORROR_LINE);
  assert(audit.ok, `gate rejected HORROR_LINE: ${audit.problems.join("; ")}`);
  assert(audit.codePoints >= 1 && audit.codePoints <= 200, "length outside 1..200");

  const summary = formatAuditSummary(audit);
  assert(summary === `ok=true chars=${audit.codePoints} bytes=${audit.bytes}`, `unexpected summary: ${summary}`);
  assert(formatAuditSummary(auditHorrorLine("")).includes("problem: length 0"), "summary omits problems");

  const negatives = [
    "",
    "   ",
    " leading space.",
    "two\nlines.",
    "tab\there.",
    "First one. Second one.",
    "The mirror in the hall.",
    "x".repeat(201),
  ];
  for (const candidate of negatives) {
    assert(!auditHorrorLine(candidate).ok, `negative case accepted: ${JSON.stringify(candidate)}`);
  }

  console.log(`line: ${HORROR_LINE}`);
  console.log(formatAuditSummary(audit));
  console.log("verify ok");
} finally {
  if (previousOutput === undefined) {
    delete process.env.OUTPUT_PATH;
  } else {
    process.env.OUTPUT_PATH = previousOutput;
  }
  fs.rmSync(workDir, { recursive: true, force: true });
}
