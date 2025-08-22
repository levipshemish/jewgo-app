import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
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

const server = new McpServer({
  name: "ci-guard-mcp",
  version: "0.1.0",
  description: "Next build + perf budgets + health checks"
});

server.registerTool(
  "premerge_guard",
  {
    description: "Run Next build, enforce perf budgets, hit FE/BE health urls.",
    inputSchema: {
      cwd: z.string().default("frontend"),
      feHealthUrl: z.string().optional().describe("e.g. https://jewgo.app/health"),
      beHealthUrl: z.string().optional().describe("e.g. https://jewgo-app-oyoh.onrender.com/health"),
      budgets: z.object({
        mainKB: z.number().default(500),
        initialTotalMB: z.number().default(2)
      }).optional()
    }
  },
  async ({ cwd, feHealthUrl, beHealthUrl, budgets }) => {
    const budgetsConfig = budgets ?? { mainKB: 500, initialTotalMB: 2 };

    const build = await runNextBuild(cwd);
    const sizes = parseNextBuildSizes(build.stdout || "");
    const sizeViolations = [];
    if (sizes.mainKB && budgetsConfig.mainKB && sizes.mainKB > budgetsConfig.mainKB) sizeViolations.push({ metric: "mainKB", actual: sizes.mainKB, budget: budgetsConfig.mainKB });
    if (sizes.initialTotalMB && budgetsConfig.initialTotalMB && sizes.initialTotalMB > budgetsConfig.initialTotalMB) sizeViolations.push({ metric: "initialTotalMB", actual: sizes.initialTotalMB, budget: budgetsConfig.initialTotalMB });

    const fe = feHealthUrl ? await checkHealth(feHealthUrl) : undefined;
    const be = beHealthUrl ? await checkHealth(beHealthUrl) : undefined;

    const ok = build.ok && sizeViolations.length === 0 && (!fe || fe.ok) && (!be || be.ok);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ok,
          buildOk: build.ok,
          sizeViolations,
          sizes,
          feHealth: fe,
          beHealth: be
        }, null, 2)
      }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("CI Guard MCP server is running...");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
