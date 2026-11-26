import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditHorrorLine, emitHorrorLine, formatAuditSummary, HORROR_LINE } from "./src/horror.ts";

function resolveRealPath(target: string): string {
  const resolved = path.resolve(target);
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

export function isDirectExecution(argvPath: string | undefined, moduleUrl: string): boolean {
  if (!argvPath) {
    return false;
  }
  return resolveRealPath(argvPath) === resolveRealPath(fileURLToPath(moduleUrl));
}

export function main(args: string[]): number {
  if (args.includes("--print")) {
    process.stdout.write(`${HORROR_LINE}\n`);
    return 0;
  }
  if (args.includes("--check-only")) {
    const audit = auditHorrorLine(HORROR_LINE);
    process.stdout.write(`${formatAuditSummary(audit)}\n`);
    return audit.ok ? 0 : 1;
  }
  const audit = emitHorrorLine();
  return audit.ok ? 0 : 1;
}

if (isDirectExecution(process.argv[1], import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
