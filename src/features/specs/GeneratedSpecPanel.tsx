import type { Project } from '../../domain/project'
import { generateStudioSpec } from '../../studio/generatedSpec'

type Props = {
  project: Project
}

const metricLabels = {
  compute: 'Compute',
  bandwidth: 'Bandwidth',
  fantasy: 'Signal',
  stability: 'Stability',
  style: 'Style',
} as const

export function GeneratedSpecPanel({ project }: Props) {
  const spec = generateStudioSpec(project)
  return (
    <section className="generated-spec-panel" aria-label="Generated studio spec">
      <div>
        <p className="editor-kicker">Studio analysis</p>
        <h2>Generated Spec</h2>
      </div>
      <div className="generated-spec-panel__metrics">
        {Object.entries(metricLabels).map(([key, label]) => {
          const value = spec.metrics[key as keyof typeof metricLabels]
          return (
            <div className="generated-spec-panel__metric" key={key}>
              <span>{label}</span>
              <div className="generated-spec-panel__bar" aria-hidden="true">
                <div style={{ width: `${value}%` }} />
              </div>
              <strong>{value}</strong>
            </div>
          )
        })}
      </div>
      <div className="generated-spec-panel__features">
        {spec.features.map((feature) => (
          <span key={feature}>{feature}</span>
        ))}
      </div>
      <p>{spec.description}</p>
    </section>
  )
}
