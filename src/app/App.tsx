import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
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
  const [project, setProject] = useState<Project>()

  useEffect(() => {
    void store.get(projectId).then(setProject)
  }, [projectId])

  if (project === undefined) return <p className="p-8">Loading project...</p>

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
