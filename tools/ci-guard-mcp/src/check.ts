import fetch from "node-fetch";
import { execa } from "execa";

async function runNextBuild(cwd: string) {
  const proc = await execa("npx", ["next", "build"], { cwd, reject: false });
  const ok = proc.exitCode === 0;
  return { ok, stdout: proc.stdout, stderr: proc.stderr };
}

function parseNextBuildSizes(stdout: string) {
  const initialTotalMB = (() => {
    const m = stdout.match(/First Load JS shared by all\s+([\d.]+)\s*MB/i);
    return m ? Number(m[1]) : undefined;
  })();
  const mainKB = (() => {
    const m = stdout.match(/\bmain\.js\b.*?([\d.]+)\s*kB/i);
    return m ? Number(m[1]) : undefined;
  })();
  return { initialTotalMB, mainKB };
}

async function checkHealth(url: string, timeoutMs = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    const ok = res.ok;
    const status = res.status;
    const text = await res.text().catch(() => "");
    return { ok, status, sample: text.slice(0, 200) };
  } catch (e) {
    return { ok: false, error: (e as Error).message || String(e) };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const cwd = process.argv[2] || "frontend";
  const feHealthUrl = process.argv[3];
  const beHealthUrl = process.argv[4];
  const mainKB = process.argv[5] ? Number(process.argv[5]) : 500;
  const initialTotalMB = process.argv[6] ? Number(process.argv[6]) : 2;
  
  try {
    const budgetsConfig = { mainKB, initialTotalMB };
    const build = await runNextBuild(cwd);
    const sizes = parseNextBuildSizes(build.stdout || "");
    const sizeViolations: any[] = [];
    
    if (sizes.mainKB && budgetsConfig.mainKB && sizes.mainKB > budgetsConfig.mainKB)
      sizeViolations.push({ metric: "mainKB", actual: sizes.mainKB, budget: budgetsConfig.mainKB });
    
    if (sizes.initialTotalMB && budgetsConfig.initialTotalMB && sizes.initialTotalMB > budgetsConfig.initialTotalMB)
      sizeViolations.push({ metric: "initialTotalMB", actual: sizes.initialTotalMB, budget: budgetsConfig.initialTotalMB });
    
    const fe = feHealthUrl ? await checkHealth(feHealthUrl) : undefined;
    const be = beHealthUrl ? await checkHealth(beHealthUrl) : undefined;
    
    const ok = build.ok && sizeViolations.length === 0 && (!fe || fe.ok) && (!be || be.ok);
    
    const result = {
      ok,
      buildOk: build.ok,
      sizeViolations,
      sizes,
      feHealth: fe,
      beHealth: be
    };
    
    console.log(JSON.stringify(result, null, 2));
    process.exit(ok ? 0 : 1);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
