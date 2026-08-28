import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectsApi } from '@/services/api'
import type { Project } from '@/types'
import { Globe, Server, Link2, ShieldAlert, Cpu, Activity, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const statCards = [
  { label: 'Subdomains', key: 'subdomains' as const, icon: Globe, color: 'text-blue-400' },
  { label: 'Live Hosts', key: 'live_hosts' as const, icon: Server, color: 'text-green-400' },
  { label: 'URLs', key: 'urls' as const, icon: Link2, color: 'text-cyan-400' },
  { label: 'Parameters', key: 'parameters' as const, icon: Cpu, color: 'text-purple-400' },
  { label: 'Findings', key: 'findings' as const, icon: ShieldAlert, color: 'text-orange-400' },
  { label: 'High Confidence', key: 'high_confidence' as const, icon: Activity, color: 'text-red-400' },
]

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    projectsApi.list()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const activeProject = projects.find(p => p.status === 'active') || projects[0]
  const stats = activeProject?.stats

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Globe className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">No Projects Yet</h2>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          Create your first bug bounty project to start reconnaissance.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeProject ? `Project: ${activeProject.name}` : 'Overview'}
          </p>
        </div>
        <button
          onClick={() => navigate('/recon')}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Activity className="h-4 w-4" />
          <span>Start Recon</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(card => (
          <div key={card.key} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <card.icon className={cn('h-4 w-4', card.color)} />
            </div>
            <div className="text-2xl font-bold">{stats?.[card.key] ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Severity Distribution + Recent Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Breakdown */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Finding Severity Distribution</h3>
          <div className="space-y-3">
            {(['critical', 'high', 'medium', 'low', 'info'] as const).map(sev => {
              const colors: Record<string, string> = {
                critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500',
                low: 'bg-blue-500', info: 'bg-gray-500',
              }
              const count = sev === 'critical' ? (stats?.high_confidence ?? 0) : 0
              return (
                <div key={sev} className="flex items-center space-x-3">
                  <span className="text-xs text-muted-foreground w-16 capitalize">{sev}</span>
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div className={cn('h-2 rounded-full', colors[sev])} style={{ width: `${Math.min(count * 10, 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'View Assets', path: '/assets', desc: 'Browse discovered subdomains, hosts, and URLs' },
              { label: 'View Findings', path: '/findings', desc: 'Review vulnerability findings' },
              { label: 'AI Analyst', path: '/ai', desc: 'Chat with AI about your project data' },
              { label: 'Tool Status', path: '/settings', desc: 'Check installed security tools' },
            ].map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center justify-between p-3 rounded-md hover:bg-secondary transition-colors text-left"
              >
                <div>
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">All Projects</h3>
          <button onClick={() => navigate('/projects')} className="text-xs text-blue-400 hover:underline">View All</button>
        </div>
        <div className="space-y-2">
          {projects.map(project => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects`)}
              className="flex items-center justify-between p-3 rounded-md hover:bg-secondary transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{project.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {project.targets?.map(t => t.target).join(', ') || 'No targets'}
                  </div>
                </div>
              </div>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                project.status === 'active' ? 'bg-green-500/10 text-green-400' :
                project.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                'bg-gray-500/10 text-gray-400'
              )}>
                {project.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
