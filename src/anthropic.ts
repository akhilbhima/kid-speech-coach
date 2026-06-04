/**
 * Minimal wrapper over the official Anthropic SDK for the kid-GPA's single
 * structured-output call. Sonnet 4.6 with `output_config.format` guarantees the
 * response is valid JSON matching KID_SPEECH_SCHEMA.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  KID_GPA_SYSTEM,
  KID_SPEECH_SCHEMA,
  buildUserMessage,
  type KidAnswers,
} from "./kid-gpa.js";

const MODEL = process.env.KID_SPEECH_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = 1200;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  if (!client) client = new Anthropic();
  return client;
}

/** Raw shape returned by the model (validated against KID_SPEECH_SCHEMA). */
export interface KidSpeechDraft {
  form_picked: string;
  speech: string;
  slides: string[];
  memorize_tip: string;
}

/**
 * One structured Claude call. `shortenNote` is appended on a retry to push the
 * model to cut an over-long draft.
 */
export async function callKidGpa(
  answers: KidAnswers,
  shortenNote?: string,
): Promise<KidSpeechDraft> {
  const userText = shortenNote
    ? `${buildUserMessage(answers)}\n\nIMPORTANT: ${shortenNote}`
    : buildUserMessage(answers);

  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: "text", text: KID_GPA_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userText }],
    // Constrain the response to our schema (Sonnet 4.6 supports structured outputs).
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: KID_SPEECH_SCHEMA as unknown as Record<string, unknown> },
    },
  } as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model returned no text content.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error("Model returned invalid JSON.");
  }
  return parsed as KidSpeechDraft;
}
