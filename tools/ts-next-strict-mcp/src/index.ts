import { StdioServerTransport, Server } from "@modelcontextprotocol/sdk/server";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { runTSC, runESLint } from "./run.js";

const server = new Server(
  {
    name: "ts-next-strict-mcp",
    version: "0.1.0",
    description: "Runs tsc --noEmit and ESLint; returns structured diagnostics."
  },
  { capabilities: { tools: {} } }
);

server.tool(
  {
    name: "tsc_check",
    description: "Run TypeScript type check with --noEmit in cwd",
    inputSchema: {
      type: "object",
      properties: { cwd: { type: "string", description: "project dir", default: "." } },
      required: []
    }
  },
  async (args) => ({ content: [{ type: "json", data: await runTSC(args?.cwd ?? ".") }] })
);

server.tool(
  {
    name: "eslint_check",
    description: "Run ESLint and return issues",
    inputSchema: {
      type: "object",
      properties: {
        cwd: { type: "string", default: "." },
        pattern: { type: "string", default: "." },
        fix: { type: "boolean", default: false }
      },
      required: []
    }
  },
  async (args) => ({ content: [{ type: "json", data: await runESLint(args?.cwd ?? ".", args?.pattern ?? ".", !!args?.fix) }] })
);

const transport = new StdioServerTransport();
await server.connect(transport);
