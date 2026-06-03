import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import type { Project } from '../domain/project'
import { EditorPage } from '../features/editor/EditorPage'
import { LandingPage } from '../features/landing/LandingPage'
import { ProjectDashboard } from '../features/projects/ProjectDashboard'
import { PRESET_CATALOG } from '../presets/presetCatalog'
import { ProjectStoreProvider, useProjectStore } from '../stores/projectStoreContext'

function LandingRoute() {
  const store = useProjectStore()
  return (
    <LandingPage
      projectsCount={store.projects.length}
      presets={PRESET_CATALOG}
      createProject={store.create}
      remixPreset={store.remixPreset}
    />
  )
}

function DashboardRoute() {
  const store = useProjectStore()
  return (
    <ProjectDashboard
      projects={store.projects}
      presets={PRESET_CATALOG}
      createProject={store.create}
      remixPreset={store.remixPreset}
      duplicateProject={store.duplicate}
      removeProject={store.remove}
    />
  )
}

function EditorRoute() {
  const { projectId = '' } = useParams()
  const store = useProjectStore()
  const [project, setProject] = useState<Project | 'loading' | 'missing'>('loading')

  useEffect(() => {
    let active = true
    setProject('loading')
    store
      .get(projectId)
      .then((found) => active && setProject(found ?? 'missing'))
      .catch(() => active && setProject('missing'))
    return () => {
      active = false
    }
  }, [projectId])

  if (project === 'loading') return <p className="p-8">Loading project...</p>

  if (project === 'missing') {
    return (
      <main className="min-h-screen bg-[#071015] p-8 text-[#d8f7ff]">
        <p className="text-xs uppercase tracking-[0.45em] text-cyan-300">Concept Fabrication Terminal</p>
        <h1 className="mt-4 text-2xl uppercase tracking-[0.18em]">Project not found</h1>
        <p className="mt-3 max-w-xl text-sm text-slate-400">
          This project may have been deleted, or the link is no longer valid.
        </p>
        <Link
          className="mt-6 inline-block border border-cyan-300 px-4 py-2 text-xs uppercase tracking-[0.18em]"
          to="/dashboard"
        >
          Back to Dashboard
        </Link>
      </main>
    )
  }

  return (
    <EditorPage
      key={project.id}
      project={project}
      persist={(nextProject) => void store.save(nextProject)}
    />
  )
}

export function App() {
  return (
    <ProjectStoreProvider>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="/editor/:projectId" element={<EditorRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProjectStoreProvider>
  )
}
