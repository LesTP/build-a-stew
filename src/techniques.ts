import type { CookingStage } from './types';
import { COOKING_STAGES, STAGE_LABELS } from './types';

export type CookingStepTiming = 'short' | 'medium' | 'long' | 'finish';

export interface CookingStep {
  id: CookingStage;
  label: string;
  timing: CookingStepTiming;
  longCook?: true;
}

export interface Technique {
  id: string;
  name: string;
  steps: readonly CookingStep[];
}

const BRAISE_STEP_TIMINGS: Record<CookingStage, CookingStepTiming> = {
  brown: 'short',
  aromatics: 'short',
  deglaze: 'short',
  pressure: 'long',
  simmer_after: 'long',
  stir_in: 'medium',
  finish: 'finish',
  serve_over: 'finish',
};

const BRAISE_STEP_LABELS: Record<CookingStage, string> = {
  ...STAGE_LABELS,
  pressure: 'Oven / pressure cook',
};

const BRAISE_STEPS: readonly CookingStep[] = COOKING_STAGES.map((stage) => ({
  id: stage,
  label: BRAISE_STEP_LABELS[stage],
  timing: BRAISE_STEP_TIMINGS[stage],
  ...(stage === 'pressure' ? { longCook: true as const } : {}),
}));

const BRAISE_TECHNIQUE: Technique = {
  id: 'braise',
  name: 'Braise',
  steps: BRAISE_STEPS,
};

export function getBraiseTechnique(): Technique {
  return BRAISE_TECHNIQUE;
}

export const TECHNIQUES: Record<'braise', Technique> = {
  braise: BRAISE_TECHNIQUE,
};
