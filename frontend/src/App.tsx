import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import MainLayout from './components/layout/MainLayout'

// Pages
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ReconPage from './pages/ReconPage'
import AssetsPage from './pages/AssetsPage'
import FindingsPage from './pages/FindingsPage'
import AIAnalystPage from './pages/AIAnalystPage'
import JobsPage from './pages/JobsPage'
import SettingsPage from './pages/SettingsPage'
import ReportsPage from './pages/ReportsPage'
import ScriptsPage from './pages/ScriptsPage'
import AttackGraphPage from './pages/AttackGraphPage'

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ 
        className: 'bg-card border border-border text-foreground text-sm',
        style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155' }
      }} />
      <MainLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/recon" element={<ReconPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/findings" element={<FindingsPage />} />
          <Route path="/ai" element={<AIAnalystPage />} />
          <Route path="/graph" element={<AttackGraphPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/scripts" element={<ScriptsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MainLayout>
    </>
  )
}
