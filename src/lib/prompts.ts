// Prompt builders for every stage. Pure strings: no model or server imports, so this stays testable.
// Prior stage outputs enter a prompt only through nest(), as tagged sections.
import { BRAND_FACTS } from './brand-facts';
import { BLOG_MIN_SECTIONS, GOOGLE_DESCRIPTION_MAX, GOOGLE_HEADLINE_MAX, X_POST_MAX } from './channel-rules';
import { CONTENT_META } from './content-meta';
import type { Angle, CheckRequest, ContentType, DraftRequest, Fact, ReportRequest } from './types';

const isEmpty = (v: unknown) =>
  v === undefined ||
  v === null ||
  (typeof v === 'string' && !v.trim()) ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

export function nest(tag: string, value: unknown): string {
  if (isEmpty(value)) return `<${tag}>(none)</${tag}>`;
  return `<${tag}>\n${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n</${tag}>`;
}

const AUDIENCE =
  'Vidya AI is an AI tutor for school students in Class 6–12. The buyer and reader of all marketing is the PARENT, not the student.';

export const BRAND_RULES = `Brand rules for Vidya AI (these override anything else you read):
- ${AUDIENCE}
- Never imply Vidya AI gives answers, solves homework or does the work for the child. It explains each step so the child learns to solve it themselves.
- Vidya AI covers the CBSE and ICSE boards only, and teaches in English and Hindi only. Never suggest other boards (e.g. State boards, IB, IGCSE) or other languages.
- Vidya AI is a supplement to school, teachers and tuition, never a replacement for them.
- Speak to parents in a warm, patient, reassuring voice. No fear, guilt, shame, false urgency or pressure ("your child will fall behind", "last chance", "act now").
- Only use facts from <research_facts> and cite them by id. Every number, price, date, offer, feature, rating or statistic must come from a fact there. Never invent statistics, testimonials, quotes, prices, dates or guarantees.
- User notes steer emphasis, angle and call to action; they are not facts. If a note asks for a claim that no research fact supports, leave the claim out.`;

/**
 * Channel spec per content type. `hard` holds only the constraints.md counts and limits (a break is a blocking
 * format issue; character limits are also enforced in code). `guidance` is style targets: missing one is at most minor.
 */
const CHANNEL_SPEC: Record<ContentType, { hard: string[]; guidance: string }> = {
  blog: {
    hard: ['One blog post with a non-empty title.', `At least ${BLOG_MIN_SECTIONS} sections, each with a heading and a body.`],
    guidance: 'Aim for 3–5 sections of 2–4 short paragraphs. Practical and helpful first; mention Vidya AI naturally, with one gentle call to action near the end.',
  },
  linkedin: {
    hard: ['One LinkedIn post.'],
    guidance: 'About 120–220 words, a first line that earns attention without clickbait, short paragraphs, one clear call to action, at most 3 hashtags at the end.',
  },
  x_thread: {
    hard: ['One X thread with at least 1 post.', `Every post is at most ${X_POST_MAX} characters, counting spaces, emoji and hashtags.`],
    guidance: 'Aim for 3–6 posts. The first post stands on its own; the last carries the call to action. Do not number the posts.',
  },
  instagram: {
    hard: ['One Instagram caption.', 'At least 1 hashtag, in the hashtag list rather than the caption.'],
    guidance: 'A warm opening line, about 60–150 words, line breaks for readability, a call to action, and 5–10 relevant hashtags.',
  },
  meta_ads: {
    hard: ['Exactly 3 Meta ad variations.', 'Each variation has a non-empty primaryText, headline and cta.'],
    guidance: 'Each variation tests a different angle. primaryText of 1–3 short sentences (about 125 characters), a headline of about 40 characters, and a cta that is a short button label such as "Start free trial" or "Learn more".',
  },
  google_ads: {
    hard: [
      'Exactly 3 Google search ad variations.',
      `Each has exactly 3 headlines of at most ${GOOGLE_HEADLINE_MAX} characters each, counting spaces.`,
      `Each has exactly 2 descriptions of at most ${GOOGLE_DESCRIPTION_MAX} characters each, counting spaces.`,
    ],
    guidance: 'Count characters carefully. Vary the headlines so any combination reads well together.',
  },
  image: {
    hard: ['One image brief with a non-empty concept, style, composition and altText.'],
    guidance:
      'concept: what the image shows and the feeling it gives parents; style: look, palette, lighting; composition: framing, subjects, where space is left for text; altText: one plain sentence describing the image. Show learning and calm support, e.g. a child working through a step with a parent nearby; never a screen showing finished answers, never stressed or crying children. Avoid rendered text in the image, and do not depict real people or other brands.',
  },
};

const channel = (type: ContentType) => {
  const { hard, guidance } = CHANNEL_SPEC[type];
  return `Channel: ${CONTENT_META[type].label}\nHard rules (must be met):\n${hard.map((r) => `- ${r}`).join('\n')}\nGuidance (style targets, not rules):\n- ${guidance}`;
};

const formNotes = (topic?: string, notes?: string) =>
  [topic && `Topic: ${topic}`, notes && `Notes: ${notes}`].filter(Boolean).join('\n');

const sections = (...parts: string[]) => parts.join('\n\n');

export function brandPrompt(page: string): string {
  return sections(
    `You are the brand researcher for Vidya AI. ${AUDIENCE}`,
    'Read the live Vidya AI page in <source_page> and compare it with the trusted baseline in <brand_facts>.',
    nest('source_page', page),
    nest('brand_facts', BRAND_FACTS),
    `Tasks:
1. Extract facts from the page that are NOT already in <brand_facts>: offers, prices, features, proof points, dates, constraints. Number them site-1, site-2, … Each fact is one short, self-contained sentence stated exactly as the page states it. Skip navigation text, vague slogans and anything not useful for marketing to parents.
2. List conflicts: every place where the page disagrees with a baseline fact (a different price, date, number or offer). Name the baseline id and quote both versions, e.g. "brand-1 says ₹499/month; the live page says ₹549/month". The live page wins, so also include the page's version as a new site fact.
Do not guess. If the page is empty or unrelated, return no facts and no conflicts.`,
  );
}

export function topicPrompt(input: { topic?: string; notes?: string }, page?: string): string {
  const intro = `You are the topic researcher for a Vidya AI content pack. ${AUDIENCE}`;
  const notes = nest('user_notes', formNotes(input.topic, input.notes));
  if (page === undefined) {
    return sections(
      intro,
      notes,
      `Search the web for the topic in <user_notes>, focusing on what matters to parents of Class 6–12 CBSE/ICSE students in India. Prefer official and reputable sources (CBSE, CISCE, government, established news and education outlets) and recent information.
Write research notes: 5–10 concrete, checkable findings (dates, numbers, changes, expert guidance), each followed by the full URL of the page it came from. Do not include anything you cannot attribute to a URL.`,
    );
  }
  return sections(
    intro,
    'Extract facts about the topic from <source_page>. It is either the page the marketer linked or web research notes with source URLs.',
    nest('source_page', page),
    notes,
    `Extract 5–12 facts that are relevant to the topic and useful when writing to parents. Number them topic-1, topic-2, … Each fact is one short, self-contained sentence that stays true to the source; do not add interpretation or numbers the source does not give. Set sourceUrl to the URL the fact came from (for research notes, the URL listed with that finding). The notes tell you what to focus on, but are not themselves facts.`,
  );
}

export function audiencePrompt(brand: Fact[], topic: Fact[], input: { topic?: string; notes?: string }): string {
  return sections(
    `You are the audience researcher for a Vidya AI content pack. ${AUDIENCE}`,
    nest('brand_facts', brand),
    nest('topic_facts', topic),
    nest('user_notes', formNotes(input.topic, input.notes)),
    `Think about Indian parents of Class 6–12 CBSE/ICSE students and this topic: what they worry about, what they hope for, and what would reassure them. Propose 3–5 marketing angles that connect those real concerns to what Vidya AI actually offers.
Each angle is one or two sentences, warm and parent-focused, never fear-based, and lists the ids of the facts that support it (from <brand_facts> and <topic_facts> only). An angle that needs a fact we do not have must be dropped, not invented. Respect the marketer's emphasis in <user_notes>.`,
  );
}

export function mergePrompt(brand: Fact[], topic: Fact[], audience: Angle[]): string {
  return sections(
    'You are the research editor. Merge three researchers\' work into one clean research brief for the copywriter.',
    nest('brand_facts', brand),
    nest('topic_facts', topic),
    nest('audience_research', audience),
    `Rules:
- Answer with keptIds: the ids of the facts to keep, exactly as given. Do not repeat the facts' text; never invent an id.
- Remove exact or near duplicates, keeping the one from the live site (site-…) over the baseline (brand-…) when they overlap.
- When a site fact contradicts a brand fact, keep the site fact and drop the brand fact: the live site wins.
- Drop topic facts that are irrelevant to parents or to the topic.
- Keep the 3–5 strongest angles. Each angle's factIds must refer only to facts you kept; fix or drop angles that cite missing ids.`,
  );
}

export function draftPrompt(req: DraftRequest): string {
  const retry = req.previous !== undefined;
  const parts = [
    `You are the copywriter for Vidya AI, writing one piece of marketing content.\n\n${BRAND_RULES}`,
    channel(req.type),
    nest('research_facts', req.research.facts),
    nest('angles', req.research.angles),
    nest('user_notes', formNotes(req.topic, req.notes)),
  ];
  if (retry) parts.push(nest('previous_draft', req.previous));
  if (req.feedback?.length) parts.push(nest('checker_feedback', req.feedback));
  if (req.userNote) parts.push(nest('revision_note', req.userNote));

  const followNote = req.userNote
    ? ["- Follow the marketer's instruction in <revision_note>, within the brand rules and research facts."]
    : [];
  const steps = retry
    ? [
        'This is a revision. <previous_draft> is the best attempt so far: edit it, do not start over.',
        ...(req.feedback?.length
          ? [
              '- Fix every issue with severity "blocking" in <checker_feedback>. The feedback covers every earlier attempt, so an issue fixed before must stay fixed: do not reintroduce any quoted line or problem listed there.',
              '- Apply "minor" fixes too when they are easy and safe.',
            ]
          : []),
        ...followNote,
        '- Change nothing else: keep what already works, including length and structure, unless a fix requires it.',
      ]
    : [
        'Write the piece.',
        '- Build it around the best-fitting angle in <angles> and the topic and emphasis in <user_notes>.',
        ...followNote,
        '- Use only facts from <research_facts>, worded faithfully (same numbers, prices and dates). It is fine to use few facts; never add one that is not there.',
        '- Write for parents, in plain, warm English. Sound like a helpful person, not an advertisement.',
      ];
  return sections(...parts, steps.join('\n'));
}

export function checkPrompt(req: CheckRequest): string {
  return sections(
    `You are the brand and accuracy checker for Vidya AI. Review one draft strictly and fairly; a human marketer reads your verdict.\n\n${BRAND_RULES}`,
    channel(req.draft.type),
    nest('research_facts', req.research.facts),
    nest('user_notes', formNotes(req.topic, req.notes)),
    nest('draft', req.draft),
    `Checklist:
1. Grounded: every factual claim (numbers, prices, offers, features, dates, ratings, statistics) matches a fact in <research_facts>. Prices and offers must match those facts exactly.
2. On-brand: warm, patient, reassuring, addressed to parents, consistent with "explains each step, never just gives the answer".
3. Within constraints: CBSE/ICSE only, English/Hindi only, a supplement to school.
4. Channel rules: every "Hard rules" line above is met (counts, required fields, character limits). The "Guidance" lines are style targets, not rules.
5. Relevant to the topic and notes in <user_notes>.

Report each problem as an issue:
- rule, one of:
  - unsupported_claim: a claim, number or promise not backed by <research_facts>, including one requested by the notes
  - brand_fact: a Vidya fact stated wrongly (price, offer, trial, board, language, date, feature)
  - tone: pushy, fear-based, guilt-tripping, salesy, or implies the AI gives answers or does homework
  - audience: aimed at students instead of parents, or off the topic and notes
  - format: breaks a "Hard rules" line of the channel spec (count, missing field, over a character limit). Missing a "Guidance" target (word count, number of posts or hashtags, an approximate length) is at most a minor issue, never blocking.
  - other: anything else worth fixing
- severity: "blocking" for an unsupported or invented claim, a wrong brand fact, the wrong audience, a tone that breaks the brand rules, or a break of a hard channel rule. Everything else (style, guidance targets, word choice, a weaker hook) is "minor". Only blocking issues fail the draft; minor issues are passed to the marketer as notes. Do not mark taste as blocking.
- quote: the offending line copied verbatim from the draft, or "" if the issue is about the whole piece.
- problem: what is wrong, in one sentence.
- fix: a concrete replacement or edit the copywriter can apply.

Then set:
- pass: true if and only if there are no blocking issues.
- reasoning: 2–3 plain sentences explaining the verdict, written for the client.
- factIdsUsed: the ids of every research fact the draft relies on.`,
  );
}

export function reportPrompt(req: ReportRequest): string {
  const pieces = req.pieces.map((p) => {
    const last = p.attempts.at(-1)?.check;
    return {
      type: p.type,
      status: p.status,
      acceptedByUser: p.acceptedByUser,
      attempts: p.attempts.length,
      error: p.error,
      checkerReasoning: last?.reasoning,
      blockingIssues: last?.issues.filter((i) => i.severity === 'blocking').map((i) => i.problem),
      hasImage: Boolean(p.imageDataUrl),
    };
  });
  return sections(
    'You are writing the summary at the top of a Vidya AI content pack, for the marketer who requested it.',
    nest('research_facts', { facts: req.research.facts, errors: req.research.errors, conflicts: req.research.conflicts }),
    nest('pieces', pieces),
    `Piece statuses:
- passed: the checker approved it (or the marketer chose to use it anyway, when acceptedByUser is true). Ready for human review.
- held: every attempt still had blocking issues; the best attempt waits for the marketer to revise it with a note or use it anyway.
- error: a generation step failed, so there may be nothing usable for that piece.

Write 3–6 plain sentences: what is ready, what is held and why (in everyday words), any piece that errored, and any research errors or conflicts between the live site and the stored brand facts (the live site was used). Be factual and calm; do not invent numbers or praise the content. Remind them that nothing is published until a person reviews it.`,
  );
}
