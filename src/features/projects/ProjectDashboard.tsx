import { useNavigate } from 'react-router-dom'
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
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.45em] text-cyan-300">CONCEPT FABRICATION TERMINAL</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[0.2em] uppercase">Virtual Silicon Lab</h1>
          </div>
          <div className="flex gap-3">
            <button className="border border-cyan-300 px-4 py-2 text-sm uppercase" onClick={startProject}>
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
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Local Projects</p>
          <div className="mt-5 grid grid-cols-3 gap-4">
            {projects.map((project) => (
              <article className="border border-cyan-900 bg-cyan-950/30 p-4" key={project.id}>
                <h2>{project.name}</h2>
                <div className="mt-4 flex gap-3 text-xs uppercase">
                  <button onClick={() => navigate(`/editor/${project.id}`)}>Open</button>
                  <button onClick={() => duplicateProject(project.id)}>Duplicate</button>
                  <button onClick={() => removeProject(project.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
