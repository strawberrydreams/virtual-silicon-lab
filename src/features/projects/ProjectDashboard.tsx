import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import type { Project } from '../../domain/project'
import type { PresetId, PresetMetadata } from '../../presets/presetCatalog'
import { PresetCard } from './PresetCard'

type Props = {
  projects: Project[]
  presets: readonly PresetMetadata[]
  createProject: (name: string) => Promise<Project>
  remixPreset: (id: PresetId) => Promise<Project>
  duplicateProject: (id: string) => Promise<Project>
  removeProject: (id: string) => Promise<void>
}

export function ProjectDashboard({
  projects,
  presets,
  createProject,
  remixPreset,
  duplicateProject,
  removeProject,
}: Props) {
  const navigate = useNavigate()

  async function startProject() {
    const project = await createProject('Untitled Dream Chip')
    navigate(`/editor/${project.id}`)
  }

  async function startRemix(id: PresetId) {
    const project = await remixPreset(id)
    navigate(`/editor/${project.id}`)
  }

  return (
    <main className="min-h-screen bg-[#071015] p-8 text-[#d8f7ff]">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-cyan-950 pb-6">
          <div>
            <p className="text-xs tracking-[0.45em] text-cyan-300">CONCEPT FABRICATION TERMINAL</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[0.2em] uppercase">Virtual Silicon Lab</h1>
            <p className="mt-3 text-sm text-slate-400">
              <span className="text-cyan-200">{projects.length}</span>{' '}
              {projects.length === 1 ? 'Local Project' : 'Local Projects'} / {presets.length} Presets
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="border border-slate-700 px-4 py-2 text-sm uppercase tracking-[0.16em]" to="/">
              Back to Lab
            </Link>
            <button className="border border-cyan-300 px-4 py-2 text-sm uppercase tracking-[0.16em]" onClick={startProject}>
              New Project
            </button>
          </div>
        </header>
        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Curated Starting Points</p>
              <h2 className="mt-2 text-xl uppercase tracking-[0.18em]">Remix a preset</h2>
            </div>
            <p className="max-w-md text-right text-xs text-slate-400">
              Every remix becomes an independent local project. Change the theme, layout, and blocks freely.
            </p>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4">
            {presets.map((preset) => (
              <PresetCard key={preset.id} preset={preset} onRemix={startRemix} />
            ))}
          </div>
        </section>
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Local Projects</p>
            <p className="text-xs text-slate-500">{projects.length === 1 ? '1 Local Project' : `${projects.length} Local Projects`}</p>
          </div>
          {projects.length === 0 ? (
            <div className="mt-5 border border-dashed border-cyan-900 bg-cyan-950/20 p-8">
              <h2 className="text-lg uppercase tracking-[0.18em]">No local projects yet</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                Start from a curated preset above or create a blank chip layout. Projects are saved locally in this browser.
              </p>
              <button className="mt-5 border border-cyan-300 px-4 py-2 text-xs uppercase tracking-[0.18em]" onClick={startProject}>
                Start Blank Project
              </button>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-3 gap-4">
              {projects.map((project) => (
                <article className="flex min-h-40 flex-col border border-cyan-900 bg-cyan-950/30 p-4" key={project.id}>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">{project.die.shape} / {project.theme}</p>
                  <h2 className="mt-3 min-h-12 text-base font-semibold text-slate-100">{project.name}</h2>
                  <p className="text-xs text-slate-500">{project.blocks.length} blocks / {project.decorations.length} decorations</p>
                  <div className="mt-auto flex gap-3 pt-5 text-xs uppercase">
                    <button aria-label={`Open ${project.name}`} onClick={() => navigate(`/editor/${project.id}`)}>Open</button>
                    <button aria-label={`Duplicate ${project.name}`} onClick={() => duplicateProject(project.id)}>Duplicate</button>
                    <button aria-label={`Delete ${project.name}`} onClick={() => removeProject(project.id)}>Delete</button>
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
