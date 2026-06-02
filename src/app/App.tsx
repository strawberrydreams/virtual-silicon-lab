import { Route, Routes } from 'react-router-dom'
import { ProjectDashboard } from '../features/projects/ProjectDashboard'

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProjectDashboard
            projects={[]}
            createProject={async () => {
              throw new Error('Project store adapter is wired in Task 8')
            }}
            duplicateProject={async () => {
              throw new Error('Project store adapter is wired in Task 8')
            }}
            removeProject={async () => {
              throw new Error('Project store adapter is wired in Task 8')
            }}
          />
        }
      />
    </Routes>
  )
}
