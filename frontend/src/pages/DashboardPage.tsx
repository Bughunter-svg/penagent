import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectsApi, aiApi, toolsApi } from '@/services/api'
import type { Project, AIStatus, ToolStatus, DashboardAnalytics } from '@/types'
import { Globe, Server, Link2, ShieldAlert, Cpu, Activity, ChevronRight, Plus, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts'

const statCards = [
  { label: 'Subdomains', key: 'subdomains' as const, icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Live Hosts', key: 'live_hosts' as const, icon: Server, color: 'text-green-400', bg: 'bg-green-500/10' },
  { label: 'URLs', key: 'urls' as const, icon: Link2, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { label: 'Parameters', key: 'parameters' as const, icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { label: 'Findings', key: 'findings' as const, icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { label: 'High Confidence', key: 'high_confidence' as const, icon: Activity, color: 'text-red-400', bg: 'bg-red-500/10' },
]

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#6b7280'
}

const JOB_COLORS: Record<string, string> = {
  completed: '#22c55e', running: '#3b82f6', failed: '#ef4444', queued: '#6b7280', cancelled: '#f97316', skipped: '#94a3b8'
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)
  const [tools, setTools] = useState<ToolStatus[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      projectsApi.list().then(setProjects).catch(() => {}),
      aiApi.status().then(setAiStatus).catch(() => {}),
      toolsApi.status().then(r => setTools(r.tools)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!projects.length) return
    const active = projects.find(p => p.status === 'active') || projects[0]
    setSelectedProjectId(active.id)
  }, [projects])

  useEffect(() => {
    if (!selectedProjectId) return
    projectsApi.analytics(selectedProjectId).then(setAnalytics).catch(() => setAnalytics(null))
  }, [selectedProjectId])

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0]
  const stats = analytics?.stats ?? activeProject?.stats

  const severityData = Object.entries(analytics?.findings.by_severity ?? {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: SEV_COLORS[name] ?? '#6b7280',
  }))

  const assetBreakdown = [
    { name: 'Subdomains', count: stats?.subdomains ?? 0 },
    { name: 'Hosts', count: stats?.live_hosts ?? 0 },
    { name: 'URLs', count: stats?.urls ?? 0 },
    { name: 'Params', count: stats?.parameters ?? 0 },
    { name: 'Tech', count: stats?.technologies ?? 0 },
  ]

  const jobStatusData = Object.entries(analytics?.job_status ?? {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count: value,
    fill: JOB_COLORS[name] ?? '#6b7280',
  }))

  const scopeData = analytics?.scope_coverage
    ? [
        { name: 'In Scope', value: analytics.scope_coverage.in_scope ?? 0, fill: '#22c55e' },
        { name: 'Out of Scope', value: analytics.scope_coverage.out_of_scope ?? 0, fill: '#ef4444' },
      ].filter(d => d.value > 0)
    : []

  const httpStatusData = Object.entries(analytics?.http_status_codes ?? {})
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => Number(a.code) - Number(b.code))

  const funnelData = analytics?.recon_funnel ?? []
  const timelineData = analytics?.discovery_timeline ?? []
  const techData = analytics?.top_technologies ?? []

  const toolsCategoryData = Object.entries(analytics?.tools_by_category ?? {}).map(([name, value]) => ({
    name,
    installed: value,
  }))

  const installedTools = tools.filter(t => t.installed).length
  const totalTools = tools.length

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
        <Target className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">No Projects Yet</h2>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          Create your first bug bounty project to start reconnaissance on an authorized target.
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeProject ? `Project: ${activeProject.name}` : 'Overview'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {projects.length > 1 && (
            <select
              value={selectedProjectId ?? ''}
              onChange={e => setSelectedProjectId(Number(e.target.value))}
              className="bg-secondary border border-border rounded-md px-3 py-2 text-sm"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => navigate('/recon')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            <Activity className="h-4 w-4" />
            <span>Start Recon</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(card => (
          <div key={card.key} className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className={cn('p-2 rounded-md', card.bg)}>
                <card.icon className={cn('h-4 w-4', card.color)} />
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums">{(stats?.[card.key] ?? 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Recon Funnel</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="stage" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Asset Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={assetBreakdown} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Finding Severity</h3>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {severityData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No findings yet. Run a recon pipeline to discover vulnerabilities.
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Scope Coverage</h3>
          {scopeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={scopeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {scopeData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No assets discovered yet.
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Job Status</h3>
          {jobStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={jobStatusData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {jobStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No pipeline jobs yet.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Discovery Timeline</h3>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#timelineGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
              Discovery activity will appear here after recon runs.
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">HTTP Status Codes</h3>
          {httpStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={httpStatusData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="code" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
              No live hosts probed yet.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Top Technologies</h3>
          {techData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={techData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
              Technology fingerprints appear after HTTP probing.
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Installed Tools by Category</h3>
          {toolsCategoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={toolsCategoryData} startAngle={180} endAngle={0}>
                <RadialBar background dataKey="installed" fill="#3b82f6" cornerRadius={4} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
              {installedTools}/{totalTools} tools installed overall.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Backend API</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Local AI (Ollama)</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                aiStatus?.available ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              )}>
                {aiStatus?.available ? `${aiStatus.model}` : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Security Tools</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                {installedTools}/{totalTools} installed
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projects</span>
              <span className="text-xs text-muted-foreground">{projects.length} total</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 col-span-1 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'New Project', path: '/projects', desc: 'Create a bug bounty target', icon: Plus },
              { label: 'View Assets', path: '/assets', desc: 'Browse subdomains, hosts, URLs', icon: Globe },
              { label: 'View Findings', path: '/findings', desc: 'Review vulnerability findings', icon: ShieldAlert },
              { label: 'AI Analyst', path: '/ai', desc: 'Chat with AI about project data', icon: Activity },
              { label: 'Attack Graph', path: '/graph', desc: 'Visual attack surface map', icon: Target },
              { label: 'Tool Status', path: '/settings', desc: 'Check installed tools', icon: Cpu },
            ].map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex items-center space-x-3 p-3 rounded-md hover:bg-secondary transition-colors text-left border border-transparent hover:border-border"
              >
                <div className="p-2 bg-secondary rounded-md">
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{action.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">All Projects</h3>
          <button onClick={() => navigate('/projects')} className="text-xs text-blue-400 hover:underline">Manage →</button>
        </div>
        <div className="divide-y divide-border">
          {projects.map(project => (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={cn(
                'flex items-center justify-between py-3 hover:bg-secondary/50 px-3 -mx-3 rounded-md transition-colors cursor-pointer',
                selectedProjectId === project.id && 'bg-secondary/40 border border-border'
              )}
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
              <div className="flex items-center space-x-4">
                {project.stats && (
                  <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                    <span>{project.stats.subdomains} subs</span>
                    <span>{project.stats.findings} findings</span>
                  </div>
                )}
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  project.status === 'active' ? 'bg-green-500/10 text-green-400' :
                  project.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-gray-500/10 text-gray-400'
                )}>
                  {project.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
