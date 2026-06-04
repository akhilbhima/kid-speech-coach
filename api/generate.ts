/**
 * REST endpoint the landing page calls. POST { answers: {made,why,...} } ->
 * the finished kid speech JSON. CORS-open + a small in-memory rate limit
 * (mirrors apps/engine/api/express-api.ts in AR3STOTLE Express).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { generateKidSpeech } from "../src/generate.js";

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}
type VercelResponse = ServerResponse;

const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const WINDOW_MS = 60 * 60 * 1000;

function allowed(ip: string): boolean {
  const now = Date.now();
  let e = rateMap.get(ip);
  if (!e || now > e.resetAt) {
    e = { count: 0, resetAt: now + WINDOW_MS };
    rateMap.set(ip, e);
  }
  e.count++;
  return e.count <= RATE_LIMIT;
}

function clientIp(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function json(res: VercelResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed. Use POST." });
    return;
  }
  if (!allowed(clientIp(req))) {
    json(res, 429, { error: "Too many speeches for now. Try again in a bit." });
    return;
  }

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as
      | { answers?: unknown }
      | undefined;
    const answers = (body?.answers ?? {}) as Record<string, unknown>;

    const result = await generateKidSpeech(answers);
    json(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    const isConfig = message.includes("ANTHROPIC_API_KEY");
    json(res, isConfig ? 503 : 500, {
      error: isConfig
        ? "The speech maker isn't set up yet (missing API key)."
        : "Could not make a speech right now. Please try again.",
    });
  }
}
