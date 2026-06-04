/**
 * The custom Kid-GPA. Does the Ghost Persona Architect's job ahead of time for
 * the kid-presentation use-case: a fixed persona, kid constraints, the
 * read/memorize/under-a-minute rules, and the kid form shortlist — all baked
 * into one system prompt. One Claude call turns the 5 answers into a speech.
 */

import { KID_FORMS, KID_FORM_NAMES } from "./shortlist.js";

/** The 5 questions the landing page asks (raw material — no imposed structure). */
export interface KidAnswers {
  made?: string; // What did you make?
  why?: string; // Why did you make it?
  coolest?: string; // What's the coolest / trickiest part?
  built?: string; // How did you build it?
  next?: string; // What happens next / what to remember?
}

/** Target speaking pace for a 9-year-old, in words per second (with pauses). */
export const WORDS_PER_SECOND = 2;
/** Aim for this; never exceed HARD_WORD_CAP. ~95 words ≈ ~48s. */
export const TARGET_WORDS = 95;
export const HARD_WORD_CAP = 120;

const FORM_MENU = KID_FORMS.map(
  (f) => `- ${f.name} (use when ${f.useWhen}): ${f.beats.join(" → ")}`,
).join("\n");

/** Stable system prompt — kept byte-stable so it caches well. */
export const KID_GPA_SYSTEM = `You are a warm, excited show-and-tell coach. You help a kid tell the story of something they built and will say OUT LOUD on stage at a hackathon.

YOUR ONE JOB: turn what the kid tells you into a short speech they can READ, MEMORIZE, and SAY in UNDER ONE MINUTE.

HARD RULES (never break these):
1. LENGTH: The speech must be about ${TARGET_WORDS} words and NEVER more than ${HARD_WORD_CAP} words. A kid speaks slowly — ${HARD_WORD_CAP} words already takes about a minute. Shorter is better.
2. EASY TO READ: Use small, common words a 9-year-old reads with ease. No big or grown-up words. No jargon. Short sentences (about 10 words or fewer).
3. EASY TO MEMORIZE: Give it a simple shape with a clear start, middle, and end. Use one short line the kid can repeat or land on (a little hook). Avoid tongue-twisters and long lists.
4. EASY TO SAY OUT LOUD: Put ONE sentence per line in the speech. Warm, proud, and excited — never salesy, never boastful.
5. TRUE: Only use facts the kid gave you. Do NOT invent details. If something is missing, keep it general and short.

PICK A STORY SHAPE: Choose the ONE shape from this menu that best fits the kid's app, then write the speech in that shape:
${FORM_MENU}

Return the speech, 3 to 5 short slide bullets (each 8 words or fewer), and one tiny memorize tip for the kid.`;

/** Build the per-request user message from the kid's answers. */
export function buildUserMessage(answers: KidAnswers): string {
  const lines: string[] = [];
  if (answers.made?.trim()) lines.push(`- What they made: ${answers.made.trim()}`);
  if (answers.why?.trim()) lines.push(`- Why they made it: ${answers.why.trim()}`);
  if (answers.coolest?.trim()) lines.push(`- The coolest or trickiest part: ${answers.coolest.trim()}`);
  if (answers.built?.trim()) lines.push(`- How they built it: ${answers.built.trim()}`);
  if (answers.next?.trim()) lines.push(`- What is next or what to remember: ${answers.next.trim()}`);

  if (lines.length === 0) {
    return "The kid didn't share any details. Write a short, friendly, general speech for a kid who built a fun app at a hackathon and is proud of it. Keep it light and do not invent specific facts.";
  }
  return `Here is what the kid told me about their app:\n${lines.join("\n")}`;
}

/** JSON schema for the structured output (kept within structured-output limits). */
export const KID_SPEECH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    form_picked: {
      type: "string",
      enum: KID_FORM_NAMES,
      description: "Which story shape from the menu you used.",
    },
    speech: {
      type: "string",
      description: "The speech to read out loud, ONE sentence per line.",
    },
    slides: {
      type: "array",
      items: { type: "string" },
      description: "3 to 5 short slide bullets, each 8 words or fewer.",
    },
    memorize_tip: {
      type: "string",
      description: "One tiny, friendly tip to help the kid remember the speech.",
    },
  },
  required: ["form_picked", "speech", "slides", "memorize_tip"],
} as const;
