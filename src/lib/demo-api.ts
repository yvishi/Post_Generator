import { BRAND_FACTS } from './brand-facts';
import type { StageApi } from './stage-api';
import type { Check, ContentType, Draft, Issue, ResearchResult } from './types';

// Canned stage responses with realistic delays. Opened with `/?demo` so the UI can be
// reviewed before the real routes exist. Google ads are held on purpose to show a held card;
// revising them with any note passes.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms * (0.7 + Math.random() * 0.6)));

const research: ResearchResult = {
  facts: [
    ...BRAND_FACTS,
    {
      id: 'topic-1',
      fact: 'CBSE runs a free tele-counselling helpline for students and parents during board exam season.',
      sourceUrl: 'https://www.cbse.gov.in/',
    },
    {
      id: 'topic-2',
      fact: 'Short, regular revision sessions are recommended over long cramming sessions before exams.',
      sourceUrl: 'https://www.cbse.gov.in/',
    },
  ],
  angles: [
    { angle: 'Parents want to help but do not want to become the "exam police" at home.', factIds: ['brand-5', 'brand-14'] },
    { angle: 'Little and often beats late-night cramming, and 25 minutes a day fits that.', factIds: ['topic-2', 'brand-15'] },
    { angle: 'Step-by-step explanations build confidence instead of copying answers.', factIds: ['brand-9'] },
  ],
  errors: [],
  conflicts: [],
};

const drafts: Record<Exclude<ContentType, 'google_ads'>, unknown> = {
  blog: {
    title: 'Board exams without the bedtime battles',
    sections: [
      {
        heading: 'Little and often',
        body: 'Short, regular revision tends to stick better than long cramming sessions. Students on Vidya AI spend about 25 minutes a day, which leaves room for school, rest and play.',
      },
      {
        heading: 'Help that explains, not answers',
        body: 'Vidya AI explains each step and never just gives the answer, so your child builds the understanding they need on exam day. It works alongside their teachers and tuition, not instead of them.',
      },
      {
        heading: 'Know how the week went',
        body: 'Every plan includes a weekly parent report on WhatsApp, so you can see progress without asking "have you studied?" every evening.',
      },
    ],
  },
  linkedin: {
    text: 'Hello parents of Class 10 and 12 students.\n\nBoard exam season does not have to mean late nights and tense dinners. Short, regular revision tends to work better than cramming, and that is how Vidya AI is built: about 25 minutes a day, explaining each step instead of handing over answers.\n\nYou get a weekly report on WhatsApp, and you set the screen-time limits.\n\nTry it free for 7 days. No card required.',
  },
  x_thread: {
    posts: [
      'Board exams coming up? A calmer plan for parents of CBSE and ICSE students, in four short posts.',
      'Little and often beats cramming. Short daily revision tends to stick better than long sessions the night before.',
      'Vidya AI explains each step and never just gives the answer, so your child understands the method, not only the result.',
      'You stay in the loop with a weekly report on WhatsApp. Try it free for 7 days, no card required.',
    ],
  },
  instagram: {
    caption:
      'Exam season, minus the stress at home. 📚\n\nShort daily practice, step-by-step explanations, and a weekly report for you on WhatsApp. Start a 7-day free trial, no card needed.',
    hashtags: ['#BoardExams', '#CBSE', '#ICSE', '#ParentingTips'],
  },
  meta_ads: {
    variations: [
      { primaryText: 'Calmer board exam prep for your child. Vidya AI explains each step, and you get a weekly report on WhatsApp.', headline: 'Try 7 days free', cta: 'Start free trial' },
      { primaryText: 'About 25 minutes a day, step by step. A supplement to school for CBSE and ICSE students.', headline: 'Little and often works', cta: 'Learn more' },
      { primaryText: '1.8 lakh students are learning with Vidya AI. You set the screen-time limits in the parent app.', headline: 'Rated 4.6★ by parents', cta: 'Start free trial' },
    ],
  },
  image: {
    concept: 'A parent and a Class 10 student at a kitchen table in the evening, the child explaining a maths step on a tablet.',
    style: 'Warm natural light, candid documentary photography, soft focus background.',
    composition: 'Child in the foreground left, parent leaning in on the right, tablet screen angled away from camera.',
    altText: 'A parent listens as their child explains a maths problem on a tablet at the kitchen table.',
  },
};

const googleAttempts = [
  [
    { headlines: ['Calm Board Exam Prep for Your Child', 'Step-by-Step Help', '7-Day Free Trial'], descriptions: ['Explains every step, never just the answer. Weekly parent report.', 'CBSE and ICSE. English and Hindi. Try free, no card.'] },
    { headlines: ['Vidya AI Tutor', 'Little and Often', 'No Card Needed'], descriptions: ['25 minutes a day of guided practice for Class 6 to 12.', 'Weekly WhatsApp report for parents. Start free today.'] },
    { headlines: ['Top Scores Guaranteed', 'Parents Trust Vidya', 'Try It Free'], descriptions: ['Join 1.8 lakh students. Explains each step.', 'Rated 4.6★ on Play Store. 7-day free trial.'] },
  ],
];

const guaranteed = (quote: string): Issue => ({
  severity: 'blocking',
  rule: 'unsupported_claim',
  quote,
  problem: 'Promises exam results. No research fact supports a guarantee, and parents read this as a claim about marks.',
  fix: 'Promise the method instead, e.g. "Step-by-Step Exam Prep".',
});

const googleChecks: Check[] = [
  {
    pass: false,
    reasoning:
      'Two blocking problems. One headline is over the 30-character Google limit, and variation 3 promises top scores, which the facts cannot back up.',
    issues: [
      {
        severity: 'blocking',
        rule: 'format',
        quote: 'Calm Board Exam Prep for Your Child',
        problem: 'This headline is 35 characters. Google Ads headlines allow 30.',
        fix: 'Shorten it, e.g. "Calm Board Exam Prep".',
      },
      guaranteed('Top Scores Guaranteed'),
    ],
    factIdsUsed: ['brand-4', 'brand-9'],
  },
  {
    pass: false,
    reasoning: 'The length problem is fixed, but variation 3 still promises top scores.',
    issues: [guaranteed('Top Scores Guaranteed')],
    factIdsUsed: ['brand-4', 'brand-9'],
  },
  {
    pass: false,
    reasoning:
      'The drafter reworded the guarantee instead of removing it. "Exam Results You Can Count On" makes the same promise in softer words.',
    issues: [
      guaranteed('Exam Results You Can Count On'),
      {
        severity: 'minor',
        rule: 'tone',
        quote: 'Vidya AI Tutor',
        problem: 'Reads like a label rather than a reason to click.',
        fix: 'Lead with the benefit, e.g. "Homework Help That Explains".',
      },
    ],
    factIdsUsed: ['brand-4', 'brand-9'],
  },
];

const pass = (factIdsUsed: string[], issues: Issue[] = []): Check => ({
  pass: true,
  reasoning: 'No blocking issues. Every claim maps to a research fact.',
  issues,
  factIdsUsed,
});

const demoImage =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#f3e3c2"/><rect y="330" width="800" height="170" fill="#c89b6d"/><circle cx="560" cy="200" r="60" fill="#8a5a3b"/><rect x="500" y="260" width="120" height="110" rx="30" fill="#2e7d5b"/><circle cx="290" cy="230" r="48" fill="#6b4329"/><rect x="240" y="280" width="100" height="90" rx="26" fill="#1c2b4b"/><rect x="340" y="300" width="130" height="85" rx="8" fill="#1c2b4b"/><rect x="348" y="308" width="114" height="69" rx="4" fill="#fdfeff"/><text x="400" y="470" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#1c2b4b">Demo image. A real run shows the model's image here.</text></svg>`,
  );

export function createDemoApi(): StageApi {
  const tries: Partial<Record<ContentType, number>> = {};
  return {
    async research() {
      await wait(2200);
      return research;
    },
    async draft(r) {
      await wait(1400);
      const n = (tries[r.type] = (tries[r.type] ?? 0) + 1);
      if (r.type === 'google_ads') {
        const variations = structuredClone(googleAttempts[0]);
        if (n >= 2) variations[0].headlines[0] = 'Calm Board Exam Prep';
        if (n === 3) variations[2].headlines[0] = 'Exam Results You Can Count On';
        if (n >= 4) variations[2].headlines[0] = 'Step-by-Step Exam Prep';
        return { type: r.type, content: { variations } };
      }
      return { type: r.type, content: drafts[r.type] } as Draft;
    },
    async check(r) {
      await wait(1100);
      const n = tries[r.draft.type] ?? 1;
      if (r.draft.type === 'google_ads') return n <= 3 ? googleChecks[n - 1] : pass(['brand-4', 'brand-9']);
      if (r.draft.type === 'linkedin' && n === 1)
        return {
          pass: false,
          reasoning: 'The opening leans on exam anxiety. Vidya speaks to parents with reassurance, not fear.',
          issues: [
            {
              severity: 'blocking',
              rule: 'tone',
              quote: 'Board exam season does not have to mean late nights and tense dinners.',
              problem: 'Leads with the fear before the help.',
              fix: 'Open with what the parent gets, then mention the stress.',
            },
          ],
          factIdsUsed: ['brand-4'],
        };
      const used: Record<string, string[]> = {
        blog: ['topic-2', 'brand-15', 'brand-9', 'brand-8', 'brand-5'],
        linkedin: ['topic-2', 'brand-15', 'brand-9', 'brand-5', 'brand-10', 'brand-4'],
        x_thread: ['brand-6', 'topic-2', 'brand-9', 'brand-5', 'brand-4'],
        instagram: ['brand-9', 'brand-5', 'brand-4'],
        meta_ads: ['brand-9', 'brand-5', 'brand-4', 'brand-15', 'brand-8', 'brand-6', 'brand-11', 'brand-10', 'brand-13'],
        image: ['brand-9'],
      };
      return pass(used[r.draft.type] ?? []);
    },
    async image() {
      await wait(2600);
      return { imageDataUrl: demoImage };
    },
    async report({ pieces }) {
      await wait(1200);
      const failed = pieces.filter((p) => p.status !== 'passed').length;
      return {
        summary: `The pack leans on a "little and often" angle grounded in the 25-minute daily average and step-by-step explanations. ${
          failed ? `${failed} piece${failed > 1 ? 's' : ''} need${failed > 1 ? '' : 's'} your review: the Google ads kept implying guaranteed results, which no fact supports.` : ''
        } The LinkedIn post needed one revision to soften a fear-based opening.`,
      };
    },
  };
}
