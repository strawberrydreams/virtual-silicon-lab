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
    <main className="min-h-screen overflow-hidden bg-[#03080b] text-[#d8f7ff]">
      <section className="mx-auto grid min-h-[88vh] max-w-7xl grid-cols-[0.88fr_1.12fr] items-center gap-10 px-8 py-10">
        <div>
          <p className="text-xs uppercase tracking-[0.42em] text-cyan-300">Concept Fabrication Terminal</p>
          <h1 className="mt-4 max-w-2xl text-5xl font-semibold uppercase leading-tight tracking-[0.08em]">
            Virtual Silicon Lab
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            Build surreal semiconductor die shots, remix fictional processors, and export keynote-grade chip
            posters from local projects.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="border border-cyan-300 bg-cyan-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-950"
              onClick={startBlank}
            >
              Start Blank
            </button>
            <button
              className="border border-violet-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-violet-200"
              onClick={() => startPreset('aurora-c1')}
            >
              Start Hero Preset
            </button>
            <Link
              className="border border-slate-700 px-5 py-3 text-sm uppercase tracking-[0.22em] text-slate-300"
              to="/dashboard"
            >
              Open Projects ({projectsCount})
            </Link>
          </div>
        </div>

        <div className="grid gap-5">
          {featuredPresets.map((preset, index) => (
            <article
              className="grid grid-cols-[11rem_1fr] items-center gap-5 border border-slate-800 bg-slate-950/70 p-5"
              key={preset.id}
              style={{ boxShadow: `0 0 ${index === 0 ? 54 : 28}px ${preset.accent}33` }}
            >
              <div className="bg-slate-950 p-4" style={{ boxShadow: `inset 0 0 36px ${preset.accent}22` }}>
                <div
                  className={`grid grid-cols-2 gap-1 border border-slate-600 bg-[#050b10] p-3 ${SHAPE_CLASSES[preset.dieShape]}`}
                  style={{ boxShadow: `0 0 26px ${preset.accent}44` }}
                >
                  {preset.previewBlocks.slice(0, 4).map((block) => (
                    <span
                      className="min-h-9 truncate border border-slate-700 bg-slate-900/80 px-1 py-2 text-[8px] text-slate-300"
                      key={block}
                    >
                      {block}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.34em] text-slate-500">
                  {preset.dieShape} / {preset.theme}
                </p>
                <h2 className="mt-2 text-lg font-semibold uppercase tracking-[0.18em] text-slate-100">
                  {preset.name}
                </h2>
                <p className="mt-2 text-sm text-slate-400">{preset.tagline}</p>
                <button
                  className="mt-5 border px-4 py-2 text-xs uppercase tracking-[0.2em]"
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
