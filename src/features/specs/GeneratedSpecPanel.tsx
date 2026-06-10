import { useMemo } from 'react'
import type { Project } from '../../domain/project'
import { generateStudioSpec, type RealisticSiliconSpec, type StudioHealth } from '../../studio/generatedSpec'

type Props = {
  project: Project
}

const metricLabels = {
  compute: 'Compute',
  bandwidth: 'Bandwidth',
  efficiency: 'Efficiency',
  stability: 'Stability',
  thermals: 'Thermals',
  complexity: 'Complexity',
} as const

const healthLabels: Record<StudioHealth, string> = {
  healthy: 'Healthy',
  warn: 'Watch',
  critical: 'Critical',
}

const siliconRows: { label: string; value: (silicon: RealisticSiliconSpec) => string }[] = [
  { label: 'Profile', value: (silicon) => silicon.classLabel },
  { label: 'Node', value: (silicon) => `${silicon.processNodeNm} nm` },
  { label: 'Transistors', value: (silicon) => formatTransistors(silicon.transistorCountBillion) },
  { label: 'Die', value: (silicon) => `${silicon.dieAreaMm2} mm²` },
  { label: 'CPU', value: (silicon) => `${silicon.cpuCores} core${silicon.cpuCores === 1 ? '' : 's'}` },
  { label: 'GPU', value: (silicon) => (silicon.gpuCores === 0 ? 'none' : `${silicon.gpuCores.toLocaleString()} shader cores`) },
  { label: 'AI', value: (silicon) => (silicon.aiTops === 0 ? 'none' : `${silicon.aiTops.toLocaleString()} TOPS`) },
  { label: 'Memory BW', value: (silicon) => `${silicon.memoryBandwidthGBs.toLocaleString()} GB/s` },
]

function formatTransistors(valueBillion: number) {
  if (valueBillion < 1) return `${Math.round(valueBillion * 1000 * 100) / 100}M`
  return `${valueBillion.toLocaleString(undefined, { maximumFractionDigits: 1 })}B`
}

function Sparkline({ series }: { series: number[] }) {
  const width = 220
  const height = 36
  const step = width / Math.max(1, series.length - 1)
  const points = series
    .map((value, index) => `${(index * step).toFixed(1)},${(height - value * height).toFixed(1)}`)
    .join(' ')
  return (
    <svg
      className="generated-spec-panel__spark"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function GeneratedSpecPanel({ project }: Props) {
  // The panel re-renders on every editor store change (selection clicks, spec
  // keystrokes); only regenerate when the immutable project actually changes.
  const spec = useMemo(() => generateStudioSpec(project), [project])
  return (
    <section className="generated-spec-panel" aria-label="Generated studio spec">
      <div className="generated-spec-panel__header">
        <div>
          <p className="editor-kicker">Studio analysis</p>
          <h2>Generated Spec</h2>
        </div>
        <span className={`generated-spec-panel__health generated-spec-panel__health--${spec.health}`}>
          {healthLabels[spec.health]}
        </span>
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
      <div className="generated-spec-panel__silicon" aria-label="Realistic silicon estimate">
        <div className="generated-spec-panel__silicon-head">
          <span className="editor-kicker">Silicon estimate</span>
          <strong>{spec.silicon.peakClockGHz < 1 ? `${Math.round(spec.silicon.peakClockGHz * 1000)} MHz` : `${spec.silicon.peakClockGHz} GHz`}</strong>
        </div>
        <div className="generated-spec-panel__silicon-grid">
          {siliconRows.map((row) => (
            <div key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value(spec.silicon)}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="generated-spec-panel__power">
        <div className="generated-spec-panel__power-head">
          <span className="editor-kicker">Power estimate</span>
          <strong>{spec.powerWatts} W</strong>
        </div>
        <Sparkline series={spec.powerSeries} />
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
