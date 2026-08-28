import { useEffect, useState } from 'react'
import { projectsApi, findingsApi } from '@/services/api'
import type { Project, Finding } from '@/types'
import { ShieldAlert, Search, Filter, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function FindingsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    projectsApi.list().then(p => {
      setProjects(p)
      if (p.length > 0) setSelectedProject(p[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    setLoading(true)
    findingsApi.list(selectedProject)
      .then(setFindings)
      .finally(() => setLoading(false))
  }, [selectedProject])

  const filteredFindings = findings.filter(f => 
    f.title.toLowerCase().includes(search.toLowerCase()) || 
    f.target_url?.toLowerCase().includes(search.toLowerCase())
  )

  const sevColors = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    info: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Findings</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and manage vulnerabilities</p>
        </div>
        <select 
          value={selectedProject ?? ''} 
          onChange={e => setSelectedProject(Number(e.target.value))}
          className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-64"
        >
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-2 shrink-0">
        <div className="flex items-center space-x-4 px-2">
          <span className="text-sm font-medium">Total: {findings.length}</span>
          <div className="h-4 w-px bg-border" />
          <div className="flex space-x-2">
            {(['critical', 'high', 'medium', 'low', 'info'] as const).map(sev => {
              const count = findings.filter(f => f.severity === sev).length
              if (count === 0) return null
              return (
                <span key={sev} className={cn('px-2 py-0.5 rounded-full text-xs border capitalize', sevColors[sev])}>
                  {sev}: {count}
                </span>
              )
            })}
          </div>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search findings..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground space-y-3">
            <ShieldAlert className="h-12 w-12 opacity-20" />
            <p>No findings discovered yet.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                <tr>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Confidence</th>
                  <th className="px-6 py-3">Discovered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFindings.map(f => (
                  <tr key={f.id} className="hover:bg-secondary/50 cursor-pointer">
                    <td className="px-6 py-4">
                      <span className={cn('px-2 py-1 rounded-md text-xs font-semibold border uppercase', sevColors[f.severity])}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{f.title}</td>
                    <td className="px-6 py-4 text-muted-foreground truncate max-w-xs" title={f.target_url}>
                      {f.target_url || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-xs capitalize">{f.status}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground capitalize">{f.confidence}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
