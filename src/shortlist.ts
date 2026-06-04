/**
 * The kid shortlist — 7 narrative forms hand-picked from AR3STOTLE Express's
 * 926-form catalog (apps/engine/src/data/narrative-catalog.ts) for the
 * "a kid presents the app they built" use-case.
 *
 * Each entry is renamed for kids and given kid-simple beats. The `catalogId`
 * is the real taxonomy id the form maps to in Express; we keep it for
 * traceability (we don't call Express — this is a standalone kid-GPA).
 */

export interface KidForm {
  /** Kid-facing name. Also the value the model returns in `form_picked`. */
  name: string;
  /** When this shape fits — used in the system prompt menu. */
  useWhen: string;
  /** Kid-simple beats, in order. */
  beats: string[];
  /** The real AR3STOTLE catalog form this echoes. */
  catalogId: number;
  catalogName: string;
}

export const KID_FORMS: KidForm[] = [
  {
    name: "The Big Idea Story",
    useWhen: "you had a cool reason to start",
    beats: ["I noticed something", "I had a big idea", "I started building", "the tricky part", "it works now"],
    catalogId: 142,
    catalogName: "Brand Origin Story",
  },
  {
    name: "The Underdog",
    useWhen: "it was hard, or people didn't think you could",
    beats: ["people weren't sure", "I kept going", "look what I made"],
    catalogId: 100,
    catalogName: "Underdog (Tobias)",
  },
  {
    name: "The Before & After",
    useWhen: "your app makes something easier",
    beats: ["before, this was hard", "then I built my app", "now it's easy"],
    catalogId: 143,
    catalogName: "Customer Success Story",
  },
  {
    name: "The Quick Show-Off",
    useWhen: "you want to explain it fast and clear",
    beats: ["here's the problem", "here's my app", "here's the cool part", "try it"],
    catalogId: 141,
    catalogName: "Pitch Deck Story",
  },
  {
    name: "The Adventure",
    useWhen: "building it was a journey with bumps",
    beats: ["I set off to build it", "I hit tricky bits", "I figured them out", "I came back with my app"],
    catalogId: 88,
    catalogName: "Voyage and Return (Booker)",
  },
  {
    name: "The Happy Surprise",
    useWhen: "your app is fun or playful with a twist",
    beats: ["here's my app", "a bit more", "a fun surprise", "oh, that's why it's cool"],
    catalogId: 1,
    catalogName: "Kishōtenketsu",
  },
  {
    name: "The How-To",
    useWhen: "your app is a handy tool",
    beats: ["here's the problem", "how my app fixes it", "how to use it", "done"],
    catalogId: 208,
    catalogName: "Service Journalism / How-to",
  },
];

/** The kid-facing names, used as the structured-output enum for `form_picked`. */
export const KID_FORM_NAMES = KID_FORMS.map((f) => f.name);
