import { StdioServerTransport, Server } from "@modelcontextprotocol/sdk/server";
import fetch from "node-fetch";
import { execa } from "execa";

type Budgets = {
  mainKB?: number;        // default 500
  initialTotalMB?: number; // default 2
};

async function runNextBuild(cwd: string) {
  const proc = await execa("npx", ["next", "build"], { cwd, reject: false });
  const ok = proc.exitCode === 0;
  return { ok, stdout: proc.stdout, stderr: proc.stderr };
}

// naive parse: look for "First Load JS shared by all" line from Next analyzer
function parseNextBuildSizes(stdout: string) {
  // You can enhance this with a JSON analyzer if you enable it
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
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) };
  } finally {
    clearTimeout(t);
  }
}

const server = new Server(
  { name: "ci-guard-mcp", version: "0.1.0", description: "Next build + perf budgets + health checks" },
  { capabilities: { tools: {} } }
);

server.tool(
  {
    name: "premerge_guard",
    description: "Run Next build, enforce perf budgets, hit FE/BE health urls.",
    inputSchema: {
      type: "object",
      properties: {
        cwd: { type: "string", default: "frontend" },
        feHealthUrl: { type: "string", description: "e.g. https://jewgo.app/health" },
        beHealthUrl: { type: "string", description: "e.g. https://jewgo.onrender.com/health" },
        budgets: {
          type: "object",
          properties: {
            mainKB: { type: "number", default: 500 },
            initialTotalMB: { type: "number", default: 2 }
          }
        }
      }
    }
  },
  async (args) => {
    const cwd = (args?.cwd as string) ?? "frontend";
    const budgets = (args?.budgets as Budgets) ?? { mainKB: 500, initialTotalMB: 2 };

    const build = await runNextBuild(cwd);
    const sizes = parseNextBuildSizes(build.stdout || "");
    const sizeViolations = [];
    if (sizes.mainKB && budgets.mainKB && sizes.mainKB > budgets.mainKB) sizeViolations.push({ metric: "mainKB", actual: sizes.mainKB, budget: budgets.mainKB });
    if (sizes.initialTotalMB && budgets.initialTotalMB && sizes.initialTotalMB > budgets.initialTotalMB) sizeViolations.push({ metric: "initialTotalMB", actual: sizes.initialTotalMB, budget: budgets.initialTotalMB });

    const fe = args?.feHealthUrl ? await checkHealth(String(args.feHealthUrl)) : undefined;
    const be = args?.beHealthUrl ? await checkHealth(String(args.beHealthUrl)) : undefined;

    const ok = build.ok && sizeViolations.length === 0 && (!fe || fe.ok) && (!be || be.ok);

    return {
      content: [{
        type: "json",
        data: {
          ok,
          buildOk: build.ok,
          sizeViolations,
          sizes,
          feHealth: fe,
          beHealth: be
        }
      }]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
