import { execa } from "execa";
import stripAnsi from "strip-ansi";

export async function runTSC(cwd: string) {
  const proc = await execa("npx", ["tsc", "--noEmit"], { cwd, reject: false });
  const ok = proc.exitCode === 0;
  const out = stripAnsi(proc.stdout + "\n" + proc.stderr);
  // Roughly parse lines like: path/file.ts(12,5): error TS2345: ...
  const issues = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /\.tsx?\(\d+,\d+\): error/.test(l))
    .map((l) => {
      const m = l.match(/^(.*?\.(?:ts|tsx))\((\d+),(\d+)\): (error|warning) (TS\d+): (.*)$/);
      return m
        ? { file: m[1], line: +m[2], col: +m[3], level: m[4], code: m[5], message: m[6] }
        : { raw: l };
    });

  return { ok, count: issues.length, issues };
}

export async function runESLint(cwd: string, pattern: string, fix: boolean) {
  const args = ["eslint", pattern, "--format", "json"];
  if (fix) args.push("--fix");
  const proc = await execa("npx", args, { cwd, reject: false });
  let json: any[] = [];
  try { json = JSON.parse(proc.stdout || "[]"); } catch { /* ignore */ }
  const issues = json.flatMap((f) =>
    f.messages.map((m: any) => ({
      file: f.filePath,
      line: m.line,
      col: m.column,
      ruleId: m.ruleId,
      severity: m.severity === 2 ? "error" : "warning",
      message: m.message
    }))
  );
  return { ok: issues.length === 0, count: issues.length, issues };
}
