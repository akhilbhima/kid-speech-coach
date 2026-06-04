/**
 * The custom MCP server (Streamable HTTP, stateless) — the "kid-GPA" exposed
 * for AI clients like Claude/Cursor. One tool: `make_kid_speech`. Mirrors the
 * transport setup in apps/engine/api/express-mcp.ts.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { generateKidSpeech } from "../src/generate.js";

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}
type VercelResponse = ServerResponse;

function buildServer(): McpServer {
  const server = new McpServer({ name: "kid-speech-coach", version: "1.0.0" });

  server.registerTool(
    "make_kid_speech",
    {
      title: "Make a kid's presentation speech",
      description:
        "Turn a kid's short answers about an app they built into a fun speech they can read, memorize, and say out loud in under a minute, plus a few slide bullets. All inputs are optional — skip any you don't have.",
      inputSchema: {
        made: z.string().optional().describe("What's the app called and what does it do?"),
        why: z.string().optional().describe("Who is it for, or what problem does it fix?"),
        coolest: z.string().optional().describe("The coolest or trickiest part."),
        built: z.string().optional().describe("What they used or learned while building it."),
        next: z.string().optional().describe("What's next, or what people should remember."),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      const result = await generateKidSpeech(args);
      const text =
        `🎤 My Speech (${result.form_picked} — about ${result.est_seconds} seconds, ${result.word_count} words)\n\n` +
        `${result.speech}\n\n` +
        `🖥️ My Slides\n${result.slides.map((s) => `- ${s}`).join("\n")}\n\n` +
        `💡 Tip to remember it: ${result.memorize_tip}`;
      return {
        content: [{ type: "text", text }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );

  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === "GET" || req.method === "DELETE") {
    // Stateless mode: no SSE stream, no sessions to delete.
    res.writeHead(req.method === "GET" ? 405 : 200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        req.method === "GET"
          ? { jsonrpc: "2.0", error: { code: -32000, message: "Use POST." }, id: null }
          : { ok: true },
      ),
    );
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Use POST." }, id: null }));
    return;
  }

  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  try {
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP transport error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null }));
    }
  }
}
