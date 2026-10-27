# Vidya AI Content Agent — Design

**Team:** Alpha · **Client:** Vidya AI (fictional demo client) · **Date:** 2026-10-27
**Sources:** Project brief — https://fde-client-company-demos.aaryanptl.chatgpt.site/ · Client site — https://fde-client-company-demos.aaryanptl.chatgpt.site/vidya-ai

## 1. Intent and why

Vidya AI is an AI tutor for Class 6–12 CBSE/ICSE students. The buyers are parents and the users are students. Its marketing team needs a way to turn a topic or a news link into ready-to-review posts and ads that sound like Vidya: warm, patient, reassuring to worried parents, and never suggesting that the AI "just gives the answer".

We are building a Next.js web app. A Vidya marketer enters a topic or a link plus optional notes, ticks the content types they want, and clicks Generate. A multi-agent workflow (researchers → merger → drafter → checker → final report) runs as a **chain of separate API calls**. Each stage's output is **nested into the next stage's prompt**, and the result is a reviewed content pack. A human always reviews the output, and nothing is published or sent automatically.

Success for the Friday demo, as the brief requires:
- run one shared test topic end to end
- show the facts the agent retrieved and the content it produced
- show the image brief and the generated image
- explain one evaluation result, one failure, and one limitation

## 2. Goals

- **Input form**
  - **Topic** (text) and/or **Link** (URL). At least one is required, and both are allowed.
  - **Notes** (optional free text) to steer the agent, e.g. "push the 7-day free trial".
  - **Content type multi-select.** The user can tick any combination, and there is a "Select all" option:
    - Blog post (1)
    - LinkedIn post (1)
    - X thread (1)
    - Instagram caption (1)
    - Meta ads (3 variations)
    - Google ads (3 variations)
    - Image (an image brief plus one generated image)
- **Chained calls with prompt nesting** *(user's decision, which replaces the earlier "single call")*:
  - Each stage has its own API route, and inside it each agent makes its own AI call or calls.
  - The browser orchestrates the chain: it sends a stage's response as the input of the next call.
  - On the server, each stage's prompt nests the previous outputs in clearly tagged sections, e.g. `<research_facts>`, `<previous_draft>`, `<checker_feedback>`.
  - Research is distributed over several AI calls.
  - The UI shows live progress per stage and per piece, e.g. "Researching… / Drafting LinkedIn / Checking Google ads (attempt 2 of 3)".
- **Agent workflow:**
  1. **Research** (`/api/research`) runs four AI calls *(user's decision: 3 researchers + merger)*:
     - **Brand researcher.** Fetches and reads the Vidya AI site. It extracts products, prices, offers, pain points, approved proof points, tone, and constraints.
     - **Topic researcher.** Runs in parallel with the brand researcher. If a link was given, it fetches and reads the link. If only a topic was given, it does a web search. It returns relevant facts.
     - **Audience/angle researcher.** Runs after the first two, with their facts nested in its prompt. It works out which parent concerns this topic touches and suggests hooks and angles. Every angle must be grounded in a fact id.
     - **Merger.** Gets all three outputs nested in its prompt. It dedupes them and returns one fact sheet plus a list of angles.
     - Every fact is structured as `{ id, fact, sourceUrl }`.
  2. **Drafter** (`/api/draft`, one call per piece) writes only the selected pieces. The merged fact sheet, the angles and the user's notes are nested into its prompt. It uses only those facts and invents no stats or claims.
  3. **Checker** reviews each piece against a checklist (§5). It returns pass/fail plus specific reasons.
  4. **Revision loop, per piece.** A failed piece goes back to the drafter with the checker's feedback, up to **3 attempts in total**. Each retry gets every issue from every earlier attempt and is asked to edit the best draft so far, not rewrite it. Only **blocking** issues fail a check; minor ones are passed on as notes. If it still fails after the 3rd attempt, the piece is **held for review** rather than failed: the client sees the best attempt's reasoning, each blocking issue with the quoted line and a suggested fix, and which problems recurred across attempts. They can then **revise with a note** (one more draft→check round) or **use it anyway**. Pieces are independent, so one held ad does not block or redo the others.
  5. **Final report agent** assembles the pack: every piece with its status, attempts, checker reasoning, and the facts used, plus the image brief and image.
- **Results screen.** There is one card per piece:
  - **Passed card.** The post or ad is the main content, with a Copy button. A collapsed **"Show details"** section contains the checker reasoning, the number of passes taken, and the facts used.
  - **Failed card.** A clear "Failed" label, with the **failure reasoning as the main content**. "Show details" contains the last draft, the attempt history, and the facts.
  - **Image card.** The generated image is the main content. "Show details" holds the image brief.
  - **Research panel.** A section, collapsed by default, listing all retrieved facts with their sources. The demo needs this.

## 3. Non-goals

- No auto-publishing, scheduling, or posting to any platform.
- No user accounts, login, or database. Results live on the page only. Copy/download is enough.
- No token streaming. Each stage call returns complete JSON, and the progress shown comes from stages completing.
- No editing UI beyond copying text, since humans edit elsewhere.
- No multi-client support. Vidya AI is the only client, and its URL can be a config constant.

## 4. Anti-goals (a failure even if it "works")

- Content that implies Vidya AI does homework for the child or hands over answers.
- Invented statistics, testimonials, prices, or dates. Every claim must trace to a research fact.
- Promising things Vidya doesn't do: boards other than CBSE/ICSE, languages other than English/Hindi, replacing teachers or tuition.
- Tone that is pushy, fear-based, or aimed at students instead of parents.
- Any automatic sending or publishing.

## 5. Checker checklist

A piece passes only if all of these hold:
1. **Grounded.** Every factual claim (numbers, prices, features, dates) appears in the research facts.
2. **On-brand.** Warm, patient, and reassuring, addressed to parents, and consistent with "explains each step, never just gives the answer".
3. **Within constraints:**
   - CBSE/ICSE only, English/Hindi only
   - a supplement to school
   - correct offers: 7-day free trial with no card, ₹499/mo, ₹3,999/yr, and the coding course at ₹3,499 with its next batch on 10 Nov
4. **Channel rules met:**
   - X thread: each post ≤ 280 chars.
   - Google ads: headlines ≤ 30 chars, descriptions ≤ 90 chars.
   - Meta ads: primary text, headline, and CTA all present.
   - Instagram caption: has hashtags.
   - Blog: has a title and sections.
5. **Relevant** to the user's topic/link and notes.

Hard character limits should also be checked in code, deterministically, alongside the LLM checker.

## 6. Constraints and decided stack

- **Next.js** (App Router, TypeScript) with an API route for `/api/generate`. *(From the brief.)*
- **Vercel AI SDK** for model calls, tools, and structured output (`generateObject` with Zod schemas). *(From the brief.)*
- **OpenRouter** as the API provider, using the user's credits, via the AI SDK OpenRouter provider. *(User's decision; confirmed OK.)*
- **Input mode:** the client may enter either a topic, which is researched by web search, or a link, which is fetched and read. Both are first-class. *(User's decision.)*
- **Models (builder's call, swappable through env vars):**
  - one Gemini Flash-class model for all text agents
  - one Gemini image-capable model via OpenRouter for the image, as a separate call
- **Retries:** max 3 drafter attempts per piece. *(User's decision.)*
- Each stage call is short (one agent step), so the timeout risk is low even on Vercel. Pieces run in parallel from the browser.
- API key in `.env.local` (`OPENROUTER_API_KEY`), never sent to the client.

## 7. Calls made by the designer (not confirmed by the user)

- Researchers are split into **brand** and **topic**, and they run in parallel.
- The Image is its own checkbox. Its brief goes through the checker, and the generated image itself is not re-checked.
- "Select all" shortcut on the content picker.
- Web search for topic-only input uses OpenRouter's web search option. Link input is fetched and converted to text server-side.
- No login, no database, and no history.
- **Demo runs locally** with `next dev` or `next start`, so there is no serverless timeout. A Vercel deploy is optional. If deployed, set `maxDuration` and keep pieces running in parallel.
- A held card's closest draft lives under "Details" so a human can still fix it by hand.
- **Notes steer but are not evidence.** Notes set emphasis, angle, and CTA, e.g. "push the free trial". A factual claim, even one suggested by a note, must still appear in the research facts or the trusted brand facts. If a note asks for a claim that can't be grounded, the checker fails the piece for that reason.
- **Trusted brand facts baseline.** A small hand-written config file holds Vidya's known offers and constraints, taken from the client site:
  - prices, the 7-day free trial with no card, and the 10 Nov coding batch
  - CBSE/ICSE only, English/Hindi only, a supplement to school
  - proof points: 1.8 lakh students, 22,000 paid families, 4.6★ from 12,000 reviews

  These facts are always passed to the drafter and checker as source `vidya-site`, and the brand researcher adds to them. If live research disagrees with the config, the live site wins and the conflict is noted in the report. If the brand researcher fails, the baseline keeps the pack grounded. The §5.3 values are checked against these facts rather than hardcoded in the prompt.
- **Image depends on its brief.** The image brief goes through the checker loop like any other piece. If it passes, the image is generated. If it is held after 3 attempts, no image is generated until the client revises the brief or uses it anyway, and the image card shows why it was held, the same as other held cards. Image generation therefore runs after its brief passes, while other pieces continue in parallel.
- **Both research paths are built and tested:** link fetch, and web search when only a topic is given. This holds whatever form the shared test topic takes.

## 8. Left to the builder

- Exact prompts, Zod schemas, and the response JSON shape.
- How to fetch and clean web pages, e.g. a fetch plus HTML-to-text pass, or a reader service.
- How the Vidya site research is gathered: fetched live on each run, or cached per server start.
- Visual styling of the UI, which should be clean and readable, with Vidya's warm feel welcome.
- How errors are handled: invalid URL, a model error, or one researcher failing. The pack should still return, with the error noted.
- A small eval: e.g. run the shared test topic, log checker pass rates and attempts, and pick one failure to explain at the demo.
