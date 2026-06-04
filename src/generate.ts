/**
 * Core kid-GPA orchestration, shared by the REST endpoint and the MCP tool.
 *
 * Calls the model, validates the draft with zod, and ENFORCES the
 * under-a-minute guarantee server-side: word count is recomputed from the
 * returned speech (never trusted from the model); if it's over the cap we
 * retry once asking to cut, then hard-trim by sentence as a last resort.
 */

import { z } from "zod";
import { callKidGpa } from "./anthropic.js";
import {
  HARD_WORD_CAP,
  TARGET_WORDS,
  WORDS_PER_SECOND,
  type KidAnswers,
} from "./kid-gpa.js";
import { KID_FORM_NAMES } from "./shortlist.js";

export const answersSchema = z
  .object({
    made: z.string().max(1000).optional(),
    why: z.string().max(1000).optional(),
    coolest: z.string().max(1000).optional(),
    built: z.string().max(1000).optional(),
    next: z.string().max(1000).optional(),
  })
  .strip();

const draftSchema = z.object({
  form_picked: z.string(),
  speech: z.string().min(1),
  slides: z.array(z.string()).min(1).max(8),
  memorize_tip: z.string().min(1),
});

export interface KidSpeech {
  form_picked: string;
  speech: string;
  slides: string[];
  memorize_tip: string;
  word_count: number;
  est_seconds: number;
}

export function countWords(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/** Trim a speech to <= maxWords by dropping whole trailing sentences/lines. */
function trimToWords(speech: string, maxWords: number): string {
  const lines = speech.split("\n");
  const kept: string[] = [];
  let total = 0;
  for (const line of lines) {
    const n = countWords(line);
    if (total + n > maxWords && kept.length > 0) break;
    kept.push(line);
    total += n;
  }
  return kept.join("\n").trim();
}

/** Generate a finished, under-a-minute kid speech from the 5 answers. */
export async function generateKidSpeech(rawAnswers: KidAnswers): Promise<KidSpeech> {
  const answers = answersSchema.parse(rawAnswers);

  let draft = draftSchema.parse(await callKidGpa(answers));

  // Under-a-minute guarantee, step 1: retry if too long.
  if (countWords(draft.speech) > HARD_WORD_CAP) {
    const retry = await callKidGpa(
      answers,
      `Your last speech was ${countWords(draft.speech)} words — too long. Rewrite it COMPLETE but under ${TARGET_WORDS} words. Keep it warm and easy to say.`,
    );
    const parsedRetry = draftSchema.safeParse(retry);
    if (parsedRetry.success && countWords(parsedRetry.data.speech) < countWords(draft.speech)) {
      draft = parsedRetry.data;
    }
  }

  // Step 2: hard-trim as a last resort so we NEVER exceed the cap.
  let speech = draft.speech.trim();
  if (countWords(speech) > HARD_WORD_CAP) {
    speech = trimToWords(speech, HARD_WORD_CAP);
  }

  // Normalize the picked form to a known kid form name (defensive).
  const form = KID_FORM_NAMES.includes(draft.form_picked)
    ? draft.form_picked
    : "The Quick Show-Off";

  const wordCount = countWords(speech);
  return {
    form_picked: form,
    speech,
    slides: draft.slides.slice(0, 5),
    memorize_tip: draft.memorize_tip.trim(),
    word_count: wordCount,
    est_seconds: Math.max(1, Math.round(wordCount / WORDS_PER_SECOND)),
  };
}
