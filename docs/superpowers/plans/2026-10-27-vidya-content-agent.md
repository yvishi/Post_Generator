# Vidya AI Content Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next.js app where a Vidya AI marketer enters a topic or link, optional notes and a set of content types. A chain of separate agent calls (research → draft → check → image → report) then produces a reviewed content pack.

**Architecture:**
- **Five thin API routes**, one per stage: `/api/research`, `/api/draft`, `/api/check`, `/api/image`, `/api/report`. Each wraps a server-side stage function.
- **Research fans out into four AI calls:** brand ‖ topic, then audience, then merger.
- **A shared orchestrator, `runPack`, runs the chain.** In the browser it uses `httpApi`, feeding each response into the next call. It runs a per-piece draft↔check loop (max 3 attempts, pieces in parallel) and emits progress events for the UI.
- **Prompt nesting:** every prompt embeds prior stage outputs in tagged sections built by one `nest()` helper.
- **The eval script** runs the same orchestrator in-process with `directApi`.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Vercel AI SDK v5 (`ai`, `generateObject`), `@openrouter/ai-sdk-provider`, Zod, `html-to-text`, Vitest + @testing-library/react.

**Spec:** [docs/superpowers/specs/2026-10-27-vidya-content-agent-design.md](../specs/2026-10-27-vidya-content-agent-design.md)

## Global Constraints

- Each stage is its own HTTP call and returns complete JSON. There is no token streaming, no auto-publish, no database, and no login.
- Prompt nesting: prior outputs enter a prompt only through `nest(tag, value)`, which produces `<tag>…</tag>`. Tags used:
  - `<brand_facts>`, `<topic_facts>`, `<audience_research>`
  - `<research_facts>`, `<angles>`
  - `<user_notes>`, `<previous_draft>`, `<checker_feedback>`, `<draft>`
  - `<source_page>`, `<pieces>`
- `OPENROUTER_API_KEY` is server-only, and files using it start with `import 'server-only'`.
- Model ids come from env vars, with these defaults:
  - `TEXT_MODEL=google/gemini-2.5-flash`
  - `SEARCH_MODEL=google/gemini-2.5-flash:online`
  - `IMAGE_MODEL=google/gemini-2.5-flash-image`
- `MAX_ATTEMPTS = 3` drafter attempts per piece. After the 3rd failed check the piece is `failed` with the last checker reasons.
- Content types and fixed counts: blog 1, linkedin 1, x_thread 1, instagram 1, meta_ads 3 variations, google_ads 3 variations, image 1 (brief + generated image).
- Channel limits:
  - X post ≤ 280 chars
  - Google headline ≤ 30 chars, Google description ≤ 90 chars
  - Meta variation has `primaryText`, `headline` and `cta`
  - Instagram has ≥ 1 hashtag
  - blog has a title and ≥ 2 sections
- Client site: `https://fde-client-company-demos.aaryanptl.chatgpt.site/vidya-ai`
- Notes steer the angle but are not evidence. Every factual claim must trace to a fact id. If the live site conflicts with the brand facts, the live site wins and the conflict is reported.
- Copy rules:
  - never imply the AI gives answers or does homework
  - CBSE/ICSE only, English/Hindi only
  - a supplement to school
  - addressed to parents, warm, not fear-based

## Review Focus

1. **Bad or unreachable link.** Research still returns, using brand facts (plus audience/merger output), and records the error. → Task 5 test `topic failure still returns research`.
2. **One stage call fails for one piece** (a network error, a 500, or malformed model output). Only that piece is `failed`, with `"Generation error: …"`, and the others continue. → Task 8 test `stage error fails only that piece`.
3. **The merger call fails or returns junk.** Research falls back to the concatenated brand+topic facts with no angles, rather than failing the run. → Task 5 test `merger failure falls back to raw facts`.
4. **Empty or invalid input to any route.** It returns 400 with a readable message, and the UI disables Generate until the input is valid. → Task 7 test `routes return 400 on invalid body`, Task 9 test `generate disabled until valid`.
5. **Very long pages.** Text is truncated to 20,000 chars before nesting. → Task 4 test `truncates long pages`.

---

### Task 1: Scaffold, shared types, brand facts

**Files:**
- Create: the project via `npx create-next-app@15 . --ts --app --eslint --tailwind --src-dir --use-npm --no-import-alias` (in `F:\College\BFWAI Fellowship\Task 2`).
  - The existing `docs/` folder is allowed and must be kept.
  - Run `git init` only if create-next-app did not already create a repo.
  - The first commit includes `docs/`.
- Create: `src/lib/types.ts`, `src/lib/brand-facts.ts`, `.env.example`, `vitest.config.ts`
- Test: `src/lib/types.test.ts`

**Interfaces** (all in `types.ts`, as Zod schemas plus inferred types):
- `CONTENT_TYPES = ['blog','linkedin','x_thread','instagram','meta_ads','google_ads','image'] as const`, `ContentType`
- `Fact = { id: string; fact: string; sourceUrl: string }`
- `Angle = { angle: string; factIds: string[] }`
- `ResearchResult = { facts: Fact[]; angles: Angle[]; errors: string[]; conflicts: string[] }`
- `draftSchemas: Record<ContentType, ZodSchema>`:
  - blog `{title, sections:[{heading, body}]}`
  - linkedin `{text}`
  - x_thread `{posts: string[]}`
  - instagram `{caption, hashtags: string[]}`
  - meta_ads `{variations: [{primaryText, headline, cta}] length 3}`
  - google_ads `{variations: [{headlines: string[3], descriptions: string[2]}] length 3}`
  - image `{concept, style, composition, altText}`
- `Draft = { type: ContentType; content: unknown }`
- `Check = { pass: boolean; reasons: string[]; factIdsUsed: string[] }`
- `Attempt = { draft: Draft; check: Check }`
- `PieceResult = { type; status: 'passed'|'failed'; draft: Draft|null; attempts: Attempt[]; failureReasons: string[]; imageDataUrl?: string }`
- Stage request schemas:
  - `researchRequestSchema = { topic?, link?, notes? }`, refined so topic or link is required and the link is http(s)
  - `draftRequestSchema = { type, research: ResearchResult, topic?, notes?, previous?: Draft, feedback?: string[] }`
  - `checkRequestSchema = { draft, research, topic?, notes? }`
  - `imageRequestSchema = { brief: Draft }`
  - `reportRequestSchema = { research, pieces: PieceResult[] }`
- Inferred types are exported with these exact names: `ResearchRequest`, `DraftRequest`, `CheckRequest`, `ImageRequest`, `ReportRequest`. Later tasks import these names.
- `packFormSchema`: the research request plus `types: ContentType[]` (min 1). `PackForm` is the inferred type.
  - Define a base object schema first and apply the "topic or link" `.refine` separately to each of `researchRequestSchema` and `packFormSchema`, because Zod cannot `.extend` a refined schema.
  - Empty strings count as missing. Trim them, then drop them before validating.
- `PackResult = { research: ResearchResult; pieces: PieceResult[]; report: { summary: string } }`
- `brand-facts.ts`:
  - `CLIENT_SITE_URL`
  - `BRAND_FACTS: Fact[]`, with ids `brand-1…brand-15` and `sourceUrl = CLIENT_SITE_URL`. The 15 facts are:
    - ₹499/month
    - ₹3,999/year, with board exam practice sets and priority help
    - AI and Coding for Kids: ₹3,499 one-time, 8-week live, Class 6–10, next batch 10 Nov
    - 7-day free trial, no card required
    - weekly parent report in every plan, via WhatsApp
    - CBSE and ICSE only
    - English and Hindi only
    - a supplement to teachers/tuition
    - explains each step, never just gives the answer
    - parents set screen-time limits in the parent app
    - 1.8 lakh students learning
    - 22,000 families on paid plans
    - 4.6★ from 12,000 Play Store reviews
    - 8 in 10 parents read the weekly report
    - ~25 minutes average daily use

- [ ] **Step 1: Scaffold.**
  - Run create-next-app.
  - `npm i ai @openrouter/ai-sdk-provider zod html-to-text server-only`
  - `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/html-to-text`
  - Add the script `"test": "vitest run"`, and configure Vitest with jsdom and the react plugin.
  - Write `.env.example` with the 4 env vars.
  - Make sure `.env.local` is gitignored.
- [ ] **Step 2: Write failing tests:**
  - `researchRequestSchema` rejects `{}` and `{link:'ftp://a'}`, and accepts `{topic:'x'}`
  - `packFormSchema` rejects `{topic:'x', types:[]}`
  - `draftSchemas.meta_ads` rejects 2 variations
  - `BRAND_FACTS.length === 15`, and the facts include one containing `'₹499'` and one containing `'10 Nov'`
- [ ] **Step 3: Run** `npm test`. Expected: FAIL.
- [ ] **Step 4: Implement** `types.ts` and `brand-facts.ts`.
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** with `git add -A && git commit -m "feat: scaffold, shared types, brand facts"`

### Task 2: Deterministic channel rules

**Files:**
- Create: `src/lib/channel-rules.ts`
- Test: `src/lib/channel-rules.test.ts`

**Interfaces:**
- Produces: `checkChannelRules(draft: Draft): string[]`, which returns readable violations, with `[]` meaning OK.

- [ ] **Step 1: Write failing tests:**
  - an X post of 281 chars → a violation mentioning `"X post 1"` and `"280"`
  - a Google headline of 31 chars → a violation mentioning `"30"`
  - a description of 91 chars → a violation mentioning `"90"`
  - Instagram with `hashtags: []` → a violation
  - a blog with 1 section → a violation
  - a valid draft of each type → `[]`
- [ ] **Step 2: Run** `npm test channel-rules`. Expected: FAIL.
- [ ] **Step 3: Implement** with a switch on `draft.type`.
- [ ] **Step 4: Run** `npm test channel-rules`. Expected: PASS.
- [ ] **Step 5: Commit** with message `"feat: channel rule checks"`

### Task 3: Models and prompt nesting

**Files:**
- Create: `src/lib/models.ts`, `src/lib/prompts.ts`
- Test: `src/lib/prompts.test.ts`

**Interfaces:**
- `models.ts` (server-only):
  - `textModel()` and `searchModel()`, built with `createOpenRouter({ apiKey })` using the env model ids
  - `IMAGE_MODEL_ID`
  - `getApiKey()`, which throws `"OPENROUTER_API_KEY is not set"` if missing
- `prompts.ts`:
  - `nest(tag: string, value: unknown): string`. It returns `` `<${tag}>\n${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n</${tag}>` ``, and an `undefined` or empty value gives `<tag>(none)</tag>`.
  - `BRAND_RULES: string`, containing the Global Constraints copy rules, plus "only use facts from <research_facts>, cite by id" and "user notes steer emphasis, they are not facts".
  - Prompt builders, each returning a string built from `BRAND_RULES` and `nest(...)` sections:
    - `brandPrompt(page: string)` nests `source_page`, `brand_facts`
    - `topicPrompt(input: {topic?, notes?}, page?: string)` nests `source_page` (link mode) and `user_notes`
    - `audiencePrompt(brand: Fact[], topic: Fact[], input)` nests `brand_facts`, `topic_facts`, `user_notes`
    - `mergePrompt(brand: Fact[], topic: Fact[], audience: Angle[])` nests `brand_facts`, `topic_facts`, `audience_research`
    - `draftPrompt(req: DraftRequest)` nests `research_facts`, `angles`, `user_notes`, and, when present, `previous_draft` and `checker_feedback`
    - `checkPrompt(req: CheckRequest)` nests `research_facts`, `user_notes`, `draft`
    - `reportPrompt(req: ReportRequest)` nests `research_facts`, `pieces`
  - Each builder also states the channel spec for its type (counts and limits from Global Constraints).

- [ ] **Step 1: Write failing tests:**
  - `nest('a', {x:1})` contains `<a>` and `"x": 1` and `</a>`
  - `nest('a', undefined)` → `<a>(none)</a>`
  - `draftPrompt` with `feedback:['too pushy']` and `previous` contains `<checker_feedback>`, `too pushy`, and `<previous_draft>`
  - `draftPrompt` without feedback does not contain `<checker_feedback>`
  - `mergePrompt` contains all three tags `brand_facts`, `topic_facts`, `audience_research`
- [ ] **Step 2: Run** `npm test prompts`. Expected: FAIL.
- [ ] **Step 3: Implement** `models.ts` and `prompts.ts`.
- [ ] **Step 4: Run** `npm test prompts && npx tsc --noEmit`. Expected: PASS, with no type errors.
- [ ] **Step 5: Commit** with message `"feat: model config and nested prompt builders"`

### Task 4: Page fetcher

**Files:**
- Create: `src/lib/fetch-page.ts`
- Test: `src/lib/fetch-page.test.ts`

**Interfaces:**
- Produces: `fetchPage(url: string, fetchImpl = fetch): Promise<{ url: string; text: string }>`
  - It throws `Error("Could not read link: <reason>")` on a non-http(s) URL, a non-2xx status, a non-HTML/text content-type, or a timeout (`AbortSignal.timeout(10000)`).
  - Text comes from `html-to-text` with links and images stripped, truncated to `MAX_PAGE_CHARS = 20000`.

- [ ] **Step 1: Write failing tests** with a fake `fetchImpl`:
  - `rejects non-http and reports 404`
  - `extracts text`: `<h1>Hi</h1><script>x()</script>` → text has "Hi" and no `x()`
  - `truncates long pages`: a 50k body → length 20000
- [ ] **Step 2: Run** `npm test fetch-page`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test fetch-page`. Expected: PASS.
- [ ] **Step 5: Commit** with message `"feat: page fetcher"`

### Task 5: Research stage (4 calls)

**Files:**
- Create: `src/lib/agents/research-agents.ts`, `src/lib/stages/research.ts`
- Test: `src/lib/stages/research.test.ts`

**Interfaces:**
- Consumes: `fetchPage` (Task 4), models and prompt builders (Task 3), types and `BRAND_FACTS` (Task 1)
- Produces in `research-agents.ts`. Each function is one `generateObject` call with a model parameter that defaults to `textModel()`:
  - `researchBrand(model?, fetcher?): Promise<{ facts: Fact[]; conflicts: string[] }>`
    - fetches `CLIENT_SITE_URL` and uses `brandPrompt`
    - returns `BRAND_FACTS` + new facts `site-1…`
  - `researchTopic(input, deps?: {model?, searchModel?, fetcher?}): Promise<Fact[]>`
    - link mode: fetch the link, then `topicPrompt(input, page)`, with `sourceUrl = link`
    - topic-only mode: `searchModel()` + `topicPrompt(input)`, with the source URL taken from the search results
    - ids `topic-1…`
  - `researchAudience(brand: Fact[], topic: Fact[], input, model?): Promise<Angle[]>`
  - `mergeResearch(brand: Fact[], topic: Fact[], audience: Angle[], model?): Promise<{ facts: Fact[]; angles: Angle[] }>`, which keeps the original fact ids
- Produces in `stages/research.ts`:
  - `type ResearchAgents = { researchBrand; researchTopic; researchAudience; mergeResearch }`, with `defaultResearchAgents`
  - `runResearch(input: ResearchRequest, agents = defaultResearchAgents): Promise<ResearchResult>`. Order:
    1. `Promise.allSettled([brand, topic])`. A rejection is pushed to `errors` as `"Brand research failed: …"` or `"Topic research failed: …"`, and a failed brand step falls back to `BRAND_FACTS`.
    2. `researchAudience` runs with the facts it has. A failure is pushed to errors, and angles become `[]`.
    3. `mergeResearch` runs. If it fails, facts = brand + topic concatenated, angles = the audience angles, and `"Merge failed: …"` is pushed. Audience failure pushes `"Audience research failed: …"`.

- [ ] **Step 1: Write failing tests** with fake agents. Add one test for `researchTopic` using `MockLanguageModelV2` from `ai/test` and a spy fetcher.
  - `runs brand and topic before audience, then merge`: record the call order → `['brand','topic','audience','merge']`, where the first two can be in either order. Audience receives the brand and topic facts.
  - `topic failure still returns research`: errors has 1 entry starting `"Topic research failed"`, and the facts include `brand-1`
  - `merger failure falls back to raw facts`: facts = brand + topic, and errors contains `"Merge failed"`
  - `topic-only mode searches, link mode fetches`: the fetcher spy is called only in link mode
- [ ] **Step 2: Run** `npm test research`. Expected: FAIL.
- [ ] **Step 3: Implement** the agents and `runResearch`.
- [ ] **Step 4: Run** `npm test research`. Expected: PASS.
- [ ] **Step 5: Commit** with message `"feat: distributed research stage with merger"`

### Task 6: Draft, check, image, report stages

**Files:**
- Create: `src/lib/stages/draft.ts`, `src/lib/stages/check.ts`, `src/lib/stages/image.ts`, `src/lib/stages/report.ts`
- Test: `src/lib/stages/stages.test.ts`

**Interfaces:**
- Consumes: prompt builders (Task 3), `checkChannelRules` (Task 2), types (Task 1)
- Produces:
  - `draftPiece(req: DraftRequest, model = textModel()): Promise<Draft>`, which calls `generateObject` with `draftSchemas[req.type]` and `draftPrompt(req)`
  - `checkPiece(req: CheckRequest, model = textModel()): Promise<Check>`
    - the LLM call uses `checkPrompt` and returns `{pass, reasons, factIdsUsed}`
    - it merges in `checkChannelRules(req.draft)`: `pass = llm.pass && violations.length === 0`, and `reasons = [...llm.reasons, ...violations]`
  - `generateImage(req: ImageRequest, fetchImpl = fetch): Promise<{ imageDataUrl: string }>`
    - POSTs `https://openrouter.ai/api/v1/chat/completions` with `{ model: IMAGE_MODEL_ID, modalities: ['image','text'], messages: [{ role: 'user', content: <the brief fields rendered as a prompt> }] }`
    - reads `choices[0].message.images[0].image_url.url`
    - throws `"No image returned"` if it is absent
  - `writeReport(req: ReportRequest, model = textModel()): Promise<{ summary: string }>`, 3–6 sentences produced through `reportPrompt`

- [ ] **Step 1: Write failing tests** using `MockLanguageModelV2`:
  - `checkPiece` with an LLM that says pass and an X draft with a 300-char post → `pass === false`, and the reasons include the 280 violation
  - `draftPiece` with feedback → the prompt the mock received contains `<checker_feedback>` and the feedback text
  - `generateImage` with a fake fetch returning the image payload → returns its data URL
  - a fake fetch with no images → rejects `"No image returned"`
- [ ] **Step 2: Run** `npm test stages`. Expected: FAIL.
- [ ] **Step 3: Implement** the four stages.
- [ ] **Step 4: Run** `npm test stages`. Expected: PASS.
- [ ] **Step 5: Commit** with message `"feat: draft, check, image, report stages"`

### Task 7: Stage API routes and HTTP client

**Files:**
- Create:
  - `src/lib/route-helper.ts`
  - `src/app/api/research/route.ts`, `src/app/api/draft/route.ts`, `src/app/api/check/route.ts`, `src/app/api/image/route.ts`, `src/app/api/report/route.ts`
  - `src/lib/stage-api.ts`, `src/lib/direct-api.ts`
- Test: `src/app/api/routes.test.ts`

**Interfaces:**
- `route-helper.ts`: `stageRoute<Req, Res>(schema: ZodSchema<Req>, run: (req: Req) => Promise<Res>): (r: Request) => Promise<Response>`
  - invalid JSON or schema → 400 `{ error: <first issue message> }`
  - a throw → 500 `{ error: <message> }`
  - success → 200 JSON
- Each route is `export const POST = stageRoute(schema, stageFn)`, plus `export const runtime = 'nodejs'` and `export const maxDuration = 60`.
- `stage-api.ts`, which is client-safe and imports no server modules:
  - `type StageApi = { research(r: ResearchRequest): Promise<ResearchResult>; draft(r: DraftRequest): Promise<Draft>; check(r: CheckRequest): Promise<Check>; image(r: ImageRequest): Promise<{imageDataUrl: string}>; report(r: ReportRequest): Promise<{summary: string}> }`
  - `httpApi: StageApi`, where each method POSTs JSON to `/api/<stage>` and throws `Error(body.error)` on non-2xx
- `direct-api.ts` (server-only): `directApi: StageApi`, which calls `runResearch`, `draftPiece`, `checkPiece`, `generateImage`, and `writeReport` directly

- [ ] **Step 1: Write failing tests** (stage functions mocked with `vi.mock`):
  - `routes return 400 on invalid body`: research with `{}` → 400 with an `error` string, and draft with `{type:'nope'}` → 400
  - `research route returns stage output`: the mocked `runResearch` fixture is returned with 200
  - `stage throw returns 500 with message`
- [ ] **Step 2: Run** `npm test routes`. Expected: FAIL.
- [ ] **Step 3: Implement** the helper, the routes, `httpApi`, and `directApi`.
- [ ] **Step 4: Run** `npm test routes`. Expected: PASS.
- [ ] **Step 5: Commit** with message `"feat: stage API routes and clients"`

### Task 8: Orchestrator (the call chain)

**Files:**
- Create: `src/lib/orchestrator.ts` (isomorphic, imports only types and `StageApi`)
- Test: `src/lib/orchestrator.test.ts`

**Interfaces:**
- Consumes: `StageApi` (Task 7), types (Task 1)
- Produces:
  - `MAX_ATTEMPTS = 3`
  - `type ProgressEvent = { stage: 'research'|'draft'|'check'|'image'|'report'|'done'; type?: ContentType; attempt?: number; status: 'started'|'passed'|'failed'|'done' }`
  - `runPack(form: PackForm, api: StageApi, onProgress?: (e: ProgressEvent) => void): Promise<PackResult>`
- Behaviour:
  1. `research = await api.research(form)`. If this throws, the error propagates and the UI shows it, because the run cannot proceed.
  2. Each type in `form.types` goes through `runPiece`, all in parallel via `Promise.all`:
     - loop until `MAX_ATTEMPTS`: draft with `{type, research, topic, notes, previous, feedback}` (no previous/feedback on attempt 1), then check, then push the attempt, and break on pass
     - pass → `passed`, otherwise `failed` with `failureReasons` from the last check
     - for `image` passed: call `api.image({brief})`, and a throw becomes `failed` with `"Image generation error: …"`
     - any draft/check throw → `failed`, with `["Generation error: <message>"]`
  3. `report = await api.report({research, pieces})`. A throw gives the summary `"Report unavailable: <message>"`.
  4. Emit a `ProgressEvent` at each start, pass or fail, and finally `{stage:'done', status:'done'}`. Pieces are kept in `form.types` order.

- [ ] **Step 1: Write failing tests** with a fake `StageApi`:
  - `chains research output into draft`: the `draft` call receives the exact `research` object returned by `research`
  - `passes first try`: 1 attempt, status `passed`
  - `revises then passes`: the check fails once with `['too pushy']` → 2 attempts, and the 2nd draft call has `feedback: ['too pushy']` and `previous` = the 1st draft
  - `fails after 3 attempts with last reasons`: reasons `"r<n>"` on call n → `failed`, 3 attempts, `failureReasons ['r3']`
  - `stage error fails only that piece`: draft throws for `google_ads` only → that piece is failed with `"Generation error…"` and blog passed
  - `image only after brief passes`: when the brief fails, `api.image` is not called
  - `emits progress`: the events include `{stage:'check', type:'blog', attempt:2, status:'started'}` in the revise case, and the last event is `done`
- [ ] **Step 2: Run** `npm test orchestrator`. Expected: FAIL.
- [ ] **Step 3: Implement** `runPack`.
- [ ] **Step 4: Run** `npm test orchestrator`. Expected: PASS.
- [ ] **Step 5: Commit** with message `"feat: orchestrator chaining stage calls with revision loop"`

### Task 9: Input form, progress, page wiring

**Files:**
- Create: `src/components/InputForm.tsx`, `src/components/ProgressView.tsx`
- Test: `src/components/InputForm.test.tsx`, `src/components/ProgressView.test.tsx`
- Modify: `src/app/page.tsx` (a client component with `form`, `events`, `result`, `error` state)

**Interfaces:**
- Consumes: `packFormSchema`, `CONTENT_TYPES` (Task 1), `runPack`, `ProgressEvent` (Task 8), `httpApi` (Task 7)
- Produces:
  - `<InputForm onSubmit={(f: PackForm) => void} disabled={boolean} />`
    - fields: Topic, Link, and "Notes (optional)"
    - checkboxes: "Blog post", "LinkedIn post", "X thread", "Instagram caption", "Meta ads (3)", "Google ads (3)", "Image", plus "Select all"
    - Generate stays disabled until `packFormSchema` passes
  - `<ProgressView events={ProgressEvent[]} types={ContentType[]} />`
    - a "Research" row: Researching… or done
    - one row per type showing its latest state, e.g. "Drafting", "Checking (attempt 2 of 3)", "Passed", "Failed", "Generating image"
    - a "Report" row
- `page.tsx` submit calls `runPack(form, httpApi, e => setEvents(prev => [...prev, e]))`, then renders `<Results>` (Task 10), or the error.

- [ ] **Step 1: Write failing tests:**
  - `generate disabled until valid`: disabled at first, disabled with only a topic, enabled after ticking "Blog post"
  - `select all ticks all seven`
  - `submits form`: topic "Board exam stress" + LinkedIn + Image → `onSubmit({topic:'Board exam stress', types:['linkedin','image']})`
  - `ProgressView shows latest state`: given events for blog check attempt 2 started → the text "Checking (attempt 2 of 3)"
- [ ] **Step 2: Run** `npm test InputForm ProgressView`. Expected: FAIL.
- [ ] **Step 3: Implement** both components and wire up the page.
- [ ] **Step 4: Run** `npm test InputForm ProgressView`. Expected: PASS.
- [ ] **Step 5: Commit** with message `"feat: input form with live progress"`

### Task 10: Results view

**Files:**
- Create: `src/components/Results.tsx`, `src/components/PieceCard.tsx`, `src/components/PieceContent.tsx`, `src/components/ResearchPanel.tsx`
- Test: `src/components/PieceCard.test.tsx`

**Interfaces:**
- Consumes: `PackResult`, `PieceResult`, `Fact`, `Draft` (Task 1)
- Produces:
  - `<Results data={PackResult} />` renders the report summary, then a `PieceCard` per piece, then `ResearchPanel`
  - `<PieceCard piece facts />`
  - `<PieceContent draft />` renders blog headings, thread posts numbered `1/n`, ads as "Variation 1–3", and the image brief fields
  - `<ResearchPanel research />` is a collapsed `<details>` listing facts with linked sources, the angles, and any errors and conflicts
- Card rules (from the spec):
  - **passed:** the main content is `PieceContent` (or the image), with a "Copy" button. `<details><summary>Show details</summary>` holds "Passed on attempt N of 3", every attempt's checker reasons, and the facts used (by `factIdsUsed`). For image, it also holds the brief.
  - **failed:** a "Failed" badge, with the `failureReasons` as the main content. Show details holds the last draft and all attempts.

- [ ] **Step 1: Write failing tests:**
  - `passed card shows content, hides reasons`: "Hello parents" is visible, and the reasons are inside a closed `details`
  - `failed card shows reasons as main content`: "Failed" and "Invented statistic" are outside `details`, and the draft text is inside it
  - `passed on attempt label`: 2 attempts → "Passed on attempt 2 of 3"
- [ ] **Step 2: Run** `npm test PieceCard`. Expected: FAIL.
- [ ] **Step 3: Implement** the components with Tailwind, using a warm, clean palette.
- [ ] **Step 4: Run** `npm test`. Expected: all suites PASS.
- [ ] **Step 5: Commit** with message `"feat: results view"`

### Task 11: Live runs, eval script, README

**Files:**
- Create: `scripts/eval.ts`, `README.md`

**Interfaces:**
- Consumes: `runPack` (Task 8), `directApi` (Task 7)
- Produces: `npx tsx scripts/eval.ts "<topic or link>"` runs `runPack({...input, types: all 7}, directApi, logEvent)` and prints:
  - each progress event
  - a table of `type | status | attempts`
  - the pass rate, the fact count, and the angle count
  - research errors and conflicts
  - the first failure's reasons

  It writes the JSON to `eval-output/<timestamp>.json`, and that folder is gitignored. The script treats a `topic`/`link` argument starting with `http` as a link.

**Prerequisite (human):** the user creates `.env.local` with a real `OPENROUTER_API_KEY` before Steps 2–4. If it is missing, stop and ask; do not invent one.

**Known risk to check in Step 2:** `SEARCH_MODEL` (`:online`) may not support structured output via `generateObject`. If it fails, change `researchTopic`'s topic-only mode to run in two steps: call `generateText` with the search model to get notes with source URLs, then call `generateObject` with `textModel()` and those notes nested as `<source_page>`. Keep the same return type.

- [ ] **Step 1: Implement** the script with `npm i -D tsx dotenv`, loading `.env.local`.
- [ ] **Step 2: Live run, topic mode.** Run `npx tsx scripts/eval.ts "Helping your child prepare for board exams without stress"`. Expected: 7 rows, facts > 15, and angles ≥ 1. Fix any prompt or schema issues.
- [ ] **Step 3: Live run, link mode.** Run `npx tsx scripts/eval.ts "<a real education news article URL>"`. Expected: a `topic-*` fact whose `sourceUrl` equals the link.
- [ ] **Step 4: Live UI run.** Run `npm run dev` and submit one topic with all types at http://localhost:3000. Expected:
  - the progress rows update through research, drafting and checking
  - the cards render and "Show details" expands
  - the image is shown, or the image card shows failure reasons
- [ ] **Step 5: Write README.** Cover the setup, `npm run dev`, `npm test`, and the eval script. Include a diagram of the call chain (research ×4 calls → draft ⇄ check ×≤3 → image → report) and a "Demo notes" section for one eval result, one failure, and one limitation.
- [ ] **Step 6: Commit** with message `"chore: eval script and README"`
