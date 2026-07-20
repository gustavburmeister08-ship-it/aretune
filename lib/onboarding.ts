import type { OnboardingAnswer, OnboardingResult, Phase, PillarId } from '../types';

const PILLAR_QUESTIONS: Record<PillarId, string[]> = {
  body: ['q2'],
  mind: ['q8'],
  spirit: ['q1', 'q5'],
  relationships: ['q4'],
  vocation: ['q3', 'q6'],
  lore: ['q7'],
};

const answerValue = (answers: OnboardingAnswer[], id: string, fallback = 1.5): number => {
  const value = Number(answers.find((answer) => answer.questionId === id)?.answer);
  return Number.isFinite(value) ? Math.max(0, Math.min(3, value)) : fallback;
};

const toHundred = (value: number): number => Math.round((value / 3) * 100);

export function detectPhase(answers: OnboardingAnswer[]): Phase {
  const clarity = answerValue(answers, 'q1');
  const motivation = answerValue(answers, 'q11');
  const consistency = answerValue(answers, 'q12');
  const readiness = clarity * 0.25 + motivation * 0.35 + consistency * 0.4;
  if (readiness < 1.15) return 'dissonance';
  if (readiness < 2.25) return 'uncertainty';
  return 'discovery';
}

export function calculateOnboardingResult(answers: OnboardingAnswer[]): OnboardingResult {
  const initialScores = {} as Record<PillarId, number>;
  (Object.entries(PILLAR_QUESTIONS) as [PillarId, string[]][]).forEach(([pillar, questionIds]) => {
    const average = questionIds.reduce((sum, id) => sum + answerValue(answers, id), 0) / questionIds.length;
    initialScores[pillar] = toHundred(average);
  });

  const brokenAreaQ9: PillarId[] = ['body', 'mind', 'vocation', 'relationships'];
  const q9 = Math.round(answerValue(answers, 'q9', -1));
  if (brokenAreaQ9[q9]) initialScores[brokenAreaQ9[q9]] = Math.max(0, initialScores[brokenAreaQ9[q9]] - 15);

  const brokenAreaQ10: PillarId[] = ['vocation', 'spirit', 'lore'];
  const q10 = Math.round(answerValue(answers, 'q10', -1));
  if (brokenAreaQ10[q10]) initialScores[brokenAreaQ10[q10]] = Math.max(0, initialScores[brokenAreaQ10[q10]] - 15);

  const topPillars = (Object.entries(initialScores) as [PillarId, number][])
    .sort(([, left], [, right]) => left - right)
    .slice(0, 3)
    .map(([pillar]) => pillar);

  return { phase: detectPhase(answers), topPillars, initialScores };
}
