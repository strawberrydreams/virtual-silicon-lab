import { Link, useNavigate } from 'react-router-dom'
import type { Project } from '../../domain/project'
import type { PresetId, PresetMetadata } from '../../presets/presetCatalog'

type Props = {
  projectsCount: number
  presets: readonly PresetMetadata[]
  createProject: (name: string) => Promise<Project>
  remixPreset: (id: PresetId) => Promise<Project>
}

const SHAPE_CLASSES: Record<PresetMetadata['dieShape'], string> = {
  rect: 'aspect-[3/2]',
  square: 'aspect-square',
  circle: 'aspect-square rounded-full',
  hexagon: 'aspect-square [clip-path:polygon(50%_0%,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]',
}

export function LandingPage({ projectsCount, presets, createProject, remixPreset }: Props) {
  const navigate = useNavigate()
  const featuredPresets = presets.filter((preset) => preset.featured).slice(0, 3)

  async function startBlank() {
    const project = await createProject('Untitled Dream Chip')
    navigate(`/editor/${project.id}`)
  }

  async function startPreset(id: PresetId) {
    const project = await remixPreset(id)
    navigate(`/editor/${project.id}`)
  }

  return (
    <main className="v2-page v2-landing">
      <section className="v2-landing__hero">
        <div className="v2-landing__copy">
          <p className="v2-kicker">Concept Fabrication Terminal</p>
          <h1 className="v2-landing__title">Virtual Silicon Lab</h1>
          <p className="v2-landing__body">
            Build surreal semiconductor die shots, remix fictional processors, and export
            keynote-grade chip posters from local projects.
          </p>
          <div className="v2-action-row">
            <button className="v2-button v2-button--primary" onClick={startBlank}>
              Start Blank
            </button>
            <button className="v2-button" onClick={() => startPreset('aurora-m5')}>
              Start Hero Preset
            </button>
            <Link className="v2-button v2-button--muted" to="/dashboard">
              Open Projects ({projectsCount})
            </Link>
          </div>
        </div>

        <section aria-label="Hero chip preview" className="v2-hero-preview">
          <div className="v2-hero-preview__frame">
            <p className="v2-kicker">Press Image Lab</p>
            <div className="v2-hero-chip" aria-hidden="true">
              <div className="v2-hero-chip__package">
                <div className="v2-hero-chip__die">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="v2-featured-presets" aria-label="Featured preset launchers">
        <div className="v2-section-heading">
          <p className="v2-kicker">Curated starts</p>
          <h2>Hero-ready presets</h2>
        </div>
        <div className="v2-featured-presets__grid">
          {featuredPresets.map((preset, index) => (
            <article
              className="v2-featured-card"
              key={preset.id}
              style={{ boxShadow: `0 0 ${index === 0 ? 54 : 28}px ${preset.accent}33` }}
            >
              <div
                className="v2-mini-chip-frame"
                style={{ boxShadow: `inset 0 0 36px ${preset.accent}22` }}
              >
                <div
                  className={`v2-mini-chip ${SHAPE_CLASSES[preset.dieShape]}`}
                  style={{ boxShadow: `0 0 26px ${preset.accent}44` }}
                >
                  {preset.previewBlocks.slice(0, 4).map((block) => (
                    <span className="v2-mini-chip__tile" key={block}>
                      {block}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="v2-meta">
                  {preset.dieShape} / {preset.theme}
                </p>
                <h3 className="v2-featured-card__title">{preset.name}</h3>
                <p className="v2-featured-card__tagline">{preset.tagline}</p>
                <button
                  className="v2-inline-action"
                  onClick={() => startPreset(preset.id)}
                  style={{ borderColor: preset.accent, color: preset.accent }}
                >
                  Start from {preset.name}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
