import type { Fact } from './types';

export const CLIENT_SITE_URL = 'https://fde-client-company-demos.aaryanptl.chatgpt.site/vidya-ai';

const facts = [
  'Vidya AI costs ₹499/month.',
  'The yearly plan costs ₹3,999/year and adds board exam practice sets and priority help.',
  'AI and Coding for Kids is a ₹3,499 one-time, 8-week live course for Class 6–10; the next batch starts 10 Nov.',
  'Every plan starts with a 7-day free trial, no card required.',
  'Every plan includes a weekly parent report, sent on WhatsApp.',
  'Vidya AI covers the CBSE and ICSE boards only.',
  'Vidya AI teaches in English and Hindi only.',
  'Vidya AI is a supplement to teachers and tuition, not a replacement.',
  'Vidya AI explains each step and never just gives the answer.',
  'Parents set screen-time limits in the parent app.',
  '1.8 lakh students are learning with Vidya AI.',
  '22,000 families are on paid plans.',
  'Vidya AI is rated 4.6★ from 12,000 Play Store reviews.',
  '8 in 10 parents read the weekly report.',
  'Students use Vidya AI for about 25 minutes a day on average.',
];

export const BRAND_FACTS: Fact[] = facts.map((fact, i) => ({ id: `brand-${i + 1}`, fact, sourceUrl: CLIENT_SITE_URL }));
