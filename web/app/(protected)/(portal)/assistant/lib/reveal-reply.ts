import type { ScriptedReply } from '../types/assistant';

type RevealedReply = {
  intro: string;
  steps: string[];
};

const takeWords = (text: string, budget: number) => {
  const words = text.split(/\s+/);
  return { text: words.slice(0, budget).join(' '), used: Math.min(words.length, budget) };
};

export const revealReply = ({ intro, steps }: ScriptedReply, shownWords: number): RevealedReply => {
  const shownIntro = takeWords(intro, shownWords);
  let remaining = shownWords - shownIntro.used;

  const shownSteps = steps.flatMap((step) => {
    if (remaining <= 0) return [];
    const { text, used } = takeWords(step, remaining);
    remaining -= used;
    return [text];
  });

  return { intro: shownIntro.text, steps: shownSteps };
};
