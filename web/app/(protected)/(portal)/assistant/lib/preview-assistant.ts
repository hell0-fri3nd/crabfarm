import { contextReadingSchema, scriptedReplySchema } from '../types/assistant';

import type { ScriptedReply } from '../types/assistant';

// Scripted replies stand in for POST /assistant/chat until the BFF streams the real answers

export const SUGGESTED_QUESTIONS = [
  'Ammonia is high. What should I do tonight?',
  'Why did C4 jam?',
  'When will Batch 3 reach 250 g?',
  'Summarize today',
] as const;


export const PREVIEW_CONTEXT_READINGS = contextReadingSchema.array().parse([
  { id: 'ammonia', label: 'Ammonia', value: '0.62 mg/L', severity: 'high' },
  { id: 'oxygen', label: 'Oxygen', value: '5.4 mg/L', severity: 'low' },
  { id: 'temperature', label: 'Temperature', value: '28.6 °C', severity: null },
  { id: 'ph', label: 'pH', value: '7.9', severity: null },
  { id: 'salinity', label: 'Salinity', value: '18.0 ppt', severity: null },
]);

const AMMONIA_REPLY = scriptedReplySchema.parse({
  intro:
    'Ammonia started climbing about two hours after the 6:00 PM feed, so leftover feed is the likely source. For tonight:',
  steps: [
    'Skip the 6:00 AM feed. Less feed in means less ammonia by morning.',
    'Swap 20–30% of the water with clean water at the same salinity (about 18 ppt) and temperature.',
    'Keep the aerators on all night. Oxygen is down to 5.4 mg/L, and ammonia hits crabs harder when oxygen is low.',
    'Pull any uneaten feed or dead crabs from around the cages.',
    'Check the reading again in an hour. Above 1.0 mg/L, do a bigger water change.',
  ],
  sources: [
    { id: 'ammonia-940', label: 'Ammonia · 9:40 PM' },
    { id: 'feeding-600', label: 'Feeding log · 6:00 PM' },
    { id: 'oxygen-940', label: 'Oxygen · 9:40 PM' },
  ],
  proposal: {
    id: 'skip-morning-feed',
    title: 'Skip the 6:00 AM feed',
    detail: 'All 25 cages. The evening feed stays on, and you can turn the morning one back on in Feeding.',
    confirm_title: 'Skip the 6:00 AM feed for all 25 cages?',
    confirm_body: 'No dispenser drops feed at 6:00 AM tomorrow. The 6:00 PM feed still runs. You can turn it back on in Feeding.',
    confirm_label: 'Skip the feed',
    pending_label: 'Skipping…',
    success_title: '6:00 AM feed skipped',
  },
});

const JAM_REPLY = scriptedReplySchema.parse({
  intro: 'C4 and E2 both reported a jam at 6:00 PM. The pattern points to damp feed, not a motor fault:',
  steps: [
    'Both dispensers sit on the shaded side, where the hoppers stay humid after the afternoon rain.',
    'The motor current spiked and stopped within a second, which is how clumped pellets usually look.',
    'Clear the chute, dry the hopper, and refill with feed from a sealed bag.',
  ],
  sources: [
    { id: 'device-c4', label: 'Dispenser C4 · 6:00 PM' },
    { id: 'device-e2', label: 'Dispenser E2 · 6:00 PM' },
  ],
  proposal: {
    id: 'feed-c4-e2',
    title: 'Feed C4 and E2 now',
    detail: 'One portion each, once the chutes are clear. Every other cage was fed at 6:00 PM.',
    confirm_title: 'Feed C4 and E2 now?',
    confirm_body: 'Dispensers C4 and E2 each drop one portion now. Feeding can’t be undone.',
    confirm_label: 'Feed C4 and E2',
    pending_label: 'Feeding…',
    success_title: 'C4 and E2 fed',
  },
});

const GROWTH_REPLY = scriptedReplySchema.parse({
  intro: 'At the current pace, Batch 3 reaches an average of 250 g in about 4 weeks, around the first week of December.',
  steps: [
    'The latest logged average is 182 g, 3.4% ahead of plan.',
    'The model predicts 192 g next week, then about 15 g a week after that.',
    'Missed feeds slow it down. Two skipped feeds cost about half a day of growth.',
  ],
  sources: [
    { id: 'batch-3-logs', label: 'Batch 3 crab logs' },
    { id: 'growth-model', label: 'Growth forecast · this week' },
  ],
  proposal: null,
});

const SUMMARY_REPLY = scriptedReplySchema.parse({
  intro: 'Here is today so far:',
  steps: [
    'Ammonia is over the safe limit at 0.62 mg/L and still rising. That is the one thing to handle tonight.',
    'Evening feeding reached 23 of 25 cages. C4 and E2 jammed.',
    '14 crabs were logged. Batch 3 is 3.4% ahead of plan.',
    'Temperature, pH and salinity are steady. Oxygen is dipping faster than last week but is still above 5.',
  ],
  sources: [
    { id: 'sensors-24h', label: 'Sensor logs · last 24 h' },
    { id: 'feeding-today', label: 'Feeding log · today' },
  ],
  proposal: null,
});

const FALLBACK_REPLY = scriptedReplySchema.parse({
  intro:
    'This preview only answers the suggested questions. Once the assistant is connected, it will read your sensors, feeding and crab logs to answer this.',
  steps: [],
  sources: [],
  proposal: null,
});

const SCRIPTED_REPLIES: Record<(typeof SUGGESTED_QUESTIONS)[number], ScriptedReply> = {
  'Ammonia is high. What should I do tonight?': AMMONIA_REPLY,
  'Why did C4 jam?': JAM_REPLY,
  'When will Batch 3 reach 250 g?': GROWTH_REPLY,
  'Summarize today': SUMMARY_REPLY,
};

const isSuggestedQuestion = (prompt: string): prompt is (typeof SUGGESTED_QUESTIONS)[number] =>
  SUGGESTED_QUESTIONS.some((question) => question === prompt);

export const getScriptedReply = (prompt: string) =>
  isSuggestedQuestion(prompt) ? SCRIPTED_REPLIES[prompt] : FALLBACK_REPLY;

export const toReplyWords = ({ intro, steps }: ScriptedReply) => [intro, ...steps].join(' ').split(/\s+/);
