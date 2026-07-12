import { analyzeBuild } from '../analysis';
import { generateInstructions } from '../instructions';
import type { CookingStage, Ingredient, StewBuild } from '../types';

const STAGE_LABELS: Record<CookingStage, string> = {
  brown: 'Brown',
  aromatics: 'Aromatics',
  deglaze: 'Deglaze',
  pressure: 'Pressure',
  simmer_after: 'Simmer after',
  stir_in: 'Stir in',
  finish: 'Finish',
  serve_over: 'Serve over',
};

interface InstructionsPanelProps {
  build: StewBuild;
  catalog: readonly Ingredient[];
}

export function InstructionsPanel({ build, catalog }: InstructionsPanelProps) {
  const analysis = analyzeBuild(build, catalog);
  const recipe = generateInstructions(build, catalog, analysis);

  return (
    <section className="composer-panel composer-panel--instructions" aria-labelledby="instructions-panel-title">
      <div className="panel-heading">
        <p className="eyebrow">Generated output</p>
        <h2 id="instructions-panel-title">Instructions</h2>
      </div>

      <div className="summary-metadata__header">
        <p className="summary-metadata__hint">
          {recipe.steps.length === 0
            ? 'Add ingredients to generate deterministic cooking steps.'
            : `${recipe.steps.length} stage${recipe.steps.length === 1 ? '' : 's'} in canonical order.`}
        </p>
      </div>

      {recipe.steps.length === 0 ? (
        <div className="instructions-empty">
          <p>No instructions yet.</p>
          <p>Once the build has ingredients, each stage becomes a generated step list here.</p>
        </div>
      ) : (
        <div className="instructions-list" role="list" aria-label="Generated cooking instructions">
          {recipe.steps.map(step => (
            <article key={step.stage} className="instruction-step" role="listitem">
              <div className="instruction-step__header">
                <h3>{STAGE_LABELS[step.stage]}</h3>
                <span className="instruction-step__meta">
                  {step.instructions.length} line{step.instructions.length === 1 ? '' : 's'}
                </span>
              </div>
              <ol className="instruction-lines">
                {step.instructions.map((line, index) => (
                  <li key={`${step.stage}:${index}`}>{line}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
