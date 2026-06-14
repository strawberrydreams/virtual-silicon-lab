import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import type { Project } from '../domain/project'
import { AccountPage } from '../features/account/AccountPage'
import { EditorPage } from '../features/editor/EditorPage'
import { GalleryDetailPage } from '../features/gallery/GalleryDetailPage'
import { GalleryPage } from '../features/gallery/GalleryPage'
import { LandingPage } from '../features/landing/LandingPage'
import { ProjectDashboard } from '../features/projects/ProjectDashboard'
import { PRESET_CATALOG } from '../presets/presetCatalog'
import { AuthStoreProvider, useAuthStore } from '../stores/authStoreContext'
import { ProjectStoreProvider, useProjectStore } from '../stores/projectStoreContext'
import { resolveHeroSetForProject } from '../visual/heroSetCatalog'
import { PAGE_THEME_NAMES, pageThemes, resolvePageTheme, type PageThemeName } from '../visual/pageThemes'
import { usePageTheme } from '../visual/pageThemeStore'

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
      createRandomProject={store.createRandom}
      remixPreset={store.remixPreset}
      duplicateProject={store.duplicate}
      removeProject={store.remove}
    />
  )
}

function EditorRoute() {
  const { projectId = '' } = useParams()
  const store = useProjectStore()
  const [, setPageTheme] = usePageTheme()
  const [project, setProject] = useState<Project | 'loading' | 'missing'>('loading')
  const autoThemedProjectId = useRef<string | null>(null)

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

  useEffect(() => {
    if (project === 'loading' || project === 'missing') return
    // Opening a hero set switches the page theme once to its intended "fit".
    // We apply it at most once per project id so a manual switch afterward sticks
    // instead of snapping back on the next re-render.
    if (autoThemedProjectId.current === project.id) return
    autoThemedProjectId.current = project.id
    const heroSet = resolveHeroSetForProject(project)
    if (heroSet) setPageTheme(heroSet.pageTheme)
  }, [project, setPageTheme])

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

function GalleryDetailRoute() {
  const store = useProjectStore()
  const navigate = useNavigate()
  const [, setPageTheme] = usePageTheme()
  const onProjectLoaded = useCallback(
    (project: Project) => {
      const heroSet = resolveHeroSetForProject(project)
      if (heroSet) setPageTheme(heroSet.pageTheme)
    },
    [setPageTheme],
  )
  const onRemix = useCallback(
    async (project: Project) => {
      const remix = await store.remixImport(project)
      navigate(`/editor/${remix.id}`)
    },
    [store, navigate],
  )
  return <GalleryDetailPage onProjectLoaded={onProjectLoaded} onRemix={onRemix} />
}

export function App() {
  const [themeName, setTheme] = usePageTheme()
  const pageTheme = resolvePageTheme(themeName)

  return (
    <div
      className="app-shell"
      data-page-theme={pageTheme.name}
      data-testid="app-shell"
      style={pageTheme.cssVariables}
    >
      <ProjectStoreProvider>
        <AuthStoreProvider>
          <SiteHeader themeName={themeName} onThemeChange={setTheme} />
          <div className="app-shell__route">
            <Routes>
              <Route path="/" element={<LandingRoute />} />
              <Route path="/dashboard" element={<DashboardRoute />} />
              <Route path="/editor/:projectId" element={<EditorRoute />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/gallery/:slug" element={<GalleryDetailRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <SiteFooter />
        </AuthStoreProvider>
      </ProjectStoreProvider>
    </div>
  )
}

function SiteHeader({
  themeName,
  onThemeChange,
}: {
  themeName: PageThemeName
  onThemeChange: (theme: PageThemeName) => void
}) {
  return (
    <header className="site-header">
      <Link className="site-header__brand" to="/">
        Virtual Silicon Lab
      </Link>
      <div className="site-header__right">
        <nav aria-label="Primary navigation" className="site-header__nav">
          <Link to="/">Lab</Link>
          <Link to="/dashboard">Projects</Link>
          <Link to="/gallery">Gallery</Link>
          <AccountNavLink />
        </nav>
        <ThemeSwitcher current={themeName} onChange={onThemeChange} />
      </div>
    </header>
  )
}

function AccountNavLink() {
  const auth = useAuthStore()
  const label =
    auth.status === 'authenticated' && auth.user !== null ? auth.user.displayName : 'Account'
  return <Link to="/account">{label}</Link>
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>Local-first chip studio</span>
      <span>Editor, projects, and exports stay in this browser.</span>
    </footer>
  )
}

function ThemeSwitcher({
  current,
  onChange,
}: {
  current: PageThemeName
  onChange: (theme: PageThemeName) => void
}) {
  return (
    <div aria-label="Page theme controls" className="page-theme-switcher" role="group">
      {PAGE_THEME_NAMES.map((themeName) => (
        <button
          aria-label={`${pageThemes[themeName].label} theme`}
          aria-pressed={themeName === current}
          className="page-theme-switcher__button"
          key={themeName}
          onClick={() => onChange(themeName)}
          title={`${pageThemes[themeName].label} theme`}
          type="button"
        >
          {pageThemes[themeName].label.slice(0, 1)}
        </button>
      ))}
    </div>
  )
}
