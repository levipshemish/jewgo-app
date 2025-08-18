import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runTSC, runESLint } from "./run.js";

const server = new McpServer({
  name: "ts-next-strict-mcp",
  version: "0.1.0",
  description: "Runs tsc --noEmit and ESLint; returns structured diagnostics."
});

server.registerTool(
  "tsc_check",
  {
    description: "Run TypeScript type check with --noEmit in cwd",
    inputSchema: {
      cwd: z.string().default(".").describe("project dir")
    }
  },
  async ({ cwd }) => {
    const result = await runTSC(cwd);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.registerTool(
  "eslint_check",
  {
    description: "Run ESLint and return issues",
    inputSchema: {
      cwd: z.string().default("."),
      pattern: z.string().default("."),
      fix: z.boolean().default(false)
    }
  },
  async ({ cwd, pattern, fix }) => {
    const result = await runESLint(cwd, pattern, fix);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("TS/Next Strict MCP server is running...");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
