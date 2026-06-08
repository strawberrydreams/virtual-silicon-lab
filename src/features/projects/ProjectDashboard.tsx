import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import type { Project } from '../../domain/project'
import type { PresetId, PresetMetadata } from '../../presets/presetCatalog'
import { MiniChipPreview } from './MiniChipPreview'
import { chipFinishLabel } from '../../visual/themeFinish'
import { PresetCard } from './PresetCard'

type Props = {
  projects: Project[]
  presets: readonly PresetMetadata[]
  createProject: (name: string) => Promise<Project>
  createRandomProject: () => Promise<Project>
  remixPreset: (id: PresetId) => Promise<Project>
  duplicateProject: (id: string) => Promise<Project>
  removeProject: (id: string) => Promise<void>
}

export function ProjectDashboard({
  projects,
  presets,
  createProject,
  createRandomProject,
  remixPreset,
  duplicateProject,
  removeProject,
}: Props) {
  const navigate = useNavigate()

  async function startProject() {
    const project = await createProject('Untitled Dream Chip')
    navigate(`/editor/${project.id}`)
  }

  async function startRandomProject() {
    const project = await createRandomProject()
    navigate(`/editor/${project.id}`)
  }

  async function startRemix(id: PresetId) {
    const project = await remixPreset(id)
    navigate(`/editor/${project.id}`)
  }

  async function duplicate(project: Project) {
    try {
      await duplicateProject(project.id)
    } catch (error) {
      console.error('[dashboard] failed to duplicate project', error)
    }
  }

  async function confirmRemove(project: Project) {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    try {
      await removeProject(project.id)
    } catch (error) {
      console.error('[dashboard] failed to delete project', error)
    }
  }

  return (
    <main className="v2-page v2-dashboard">
      <div className="v2-dashboard__inner">
        <header className="v2-dashboard__header">
          <div>
            <p className="v2-kicker">CONCEPT FABRICATION TERMINAL</p>
            <h1>Virtual Silicon Lab</h1>
            <p>
              <span>{projects.length}</span>{' '}
              {projects.length === 1 ? 'Local Project' : 'Local Projects'} / {presets.length} Presets
            </p>
          </div>
          <div className="v2-action-row">
            <Link className="v2-button v2-button--muted" to="/">
              Lab Home
            </Link>
            <button className="v2-button v2-button--primary" onClick={startProject}>
              New Project
            </button>
            <button className="v2-button" onClick={startRandomProject}>
              Random Chip
            </button>
          </div>
        </header>
        <section aria-label="Preset remix surface" className="v2-dashboard-section">
          <div className="v2-dashboard-section__header">
            <div>
              <p className="v2-kicker">Curated Starting Points</p>
              <h2>Remix a preset</h2>
            </div>
            <p>
              Every remix becomes an independent local project. Change the theme, layout, and blocks freely.
            </p>
          </div>
          <div className="v2-preset-grid">
            {presets.map((preset) => (
              <PresetCard key={preset.id} preset={preset} onRemix={startRemix} />
            ))}
          </div>
        </section>
        <section aria-label="Local project surface" className="v2-dashboard-section">
          <div className="v2-dashboard-section__header">
            <p className="v2-kicker">Local Projects</p>
            <p>{projects.length === 1 ? '1 Local Project' : `${projects.length} Local Projects`}</p>
          </div>
          {projects.length === 0 ? (
            <div className="v2-empty-state">
              <h2>No local projects yet</h2>
              <p>
                Start from a curated preset above or create a blank chip layout. Projects are saved locally in this browser.
              </p>
              <button className="v2-button" onClick={startProject}>
                Start Blank Project
              </button>
            </div>
          ) : (
            <div className="v2-project-grid">
              {projects.map((project) => (
                <article className="v2-project-card" key={project.id}>
                  <MiniChipPreview
                    shape={project.die.shape}
                    blocks={project.blocks.map((block) => block.type)}
                    label={`${project.name} render preview`}
                  />
                  <p className="v2-meta">{project.die.shape} / {chipFinishLabel(project.theme)}</p>
                  <h2>{project.name}</h2>
                  <p>{project.blocks.length} blocks / {project.decorations.length} decorations</p>
                  <div>
                    <button aria-label={`Open ${project.name}`} onClick={() => navigate(`/editor/${project.id}`)}>Open</button>
                    <button aria-label={`Duplicate ${project.name}`} onClick={() => duplicate(project)}>Duplicate</button>
                    <button aria-label={`Delete ${project.name}`} onClick={() => confirmRemove(project)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
