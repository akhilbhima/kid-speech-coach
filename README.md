# kid-speech-coach 🎤

Turns a kid's five quick answers into a **short speech they can read, memorize, and say out loud in under a minute** — plus a few slide bullets. Built for a kids' hackathon, where kids present the apps they built.

It ships a **custom "kid-GPA"** (a kid-tuned take on AR3STOTLE Express's Ghost Persona Architect) three ways that share one brain:

- **Landing page** (`/`) — a friendly 5-question wizard. Every question is skippable. The finished speech shows up right in the page, big and easy to read.
- **REST API** (`POST /api/generate`) — what the page calls.
- **MCP server** (`POST /api/mcp`) — a `make_kid_speech` tool for AI clients (Claude, Cursor, …).

## How the kid-GPA works

One Claude call (`claude-sonnet-4-6`, structured output) with the rules baked into the system prompt:

- **Under a minute.** Target ~95 words, hard cap 120 (a kid speaks ~2 words/sec). The server **recomputes the word count** from the returned speech and, if it's over, **retries once** asking to cut, then **hard-trims** by sentence. The cap is never exceeded.
- **Easy to read / memorize / say.** Small words, short sentences, one sentence per line, a little repeatable hook.
- **Picks one of 7 kid story shapes** — real forms mined from AR3STOTLE Express's 926-form catalog (Big Idea Story #142, Underdog #100, Before & After #143, Quick Show-Off #141, Adventure #88, Happy Surprise #1, How-To #208), renamed for kids. See `src/shortlist.ts`.
- **Never invents facts** the kid didn't give.

Core logic: `src/kid-gpa.ts` (system prompt + shortlist), `src/generate.ts` (call + validate + the under-a-minute guarantee), `src/anthropic.ts` (the SDK call).

## Run locally

```bash
npm install
cp .env.example .env            # add your ANTHROPIC_API_KEY
npx vercel dev                  # serves the page + /api/* functions
```

Open the printed URL and walk the wizard.

## Deploy (Vercel)

```bash
npx vercel            # first deploy / link
npx vercel --prod     # production
```

Set **`ANTHROPIC_API_KEY`** in the Vercel project's Environment Variables (Settings → Environment Variables). Never commit it.

## Use the MCP tool

Point an MCP client at `https://<your-deploy>/api/mcp` (Streamable HTTP, stateless). It exposes one tool, `make_kid_speech`, with five optional string inputs (`made`, `why`, `coolest`, `built`, `next`) and returns the speech + slides + a memorize tip.

## Config

| Env var | Default | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required. |
| `KID_SPEECH_MODEL` | `claude-sonnet-4-6` | Optional model override. |
