import { useEffect, useState } from 'react'
import { projectsApi, findingsApi } from '@/services/api'
import type { Project, Finding } from '@/types'
import { ShieldAlert, Search, X, ExternalLink, AlertTriangle, Info, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const SEV_STYLES: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  info: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  investigating: 'bg-purple-500/10 text-purple-400',
  confirmed: 'bg-green-500/10 text-green-400',
  rejected: 'bg-red-500/10 text-red-400',
  reported: 'bg-orange-500/10 text-orange-400',
  duplicate: 'bg-gray-500/10 text-gray-400',
  fixed: 'bg-emerald-500/10 text-emerald-400',
}

export default function FindingsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)

  useEffect(() => {
    projectsApi.list().then(p => {
      setProjects(p)
      if (p.length > 0) setSelectedProject(p[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    setLoading(true)
    findingsApi.list(selectedProject).then(setFindings).finally(() => setLoading(false))
  }, [selectedProject])

  const filteredFindings = findings.filter(f => {
    const matchSearch = f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.target_url?.toLowerCase().includes(search.toLowerCase()) || false
    const matchSev = severityFilter === 'all' || f.severity === severityFilter
    return matchSearch && matchSev
  })

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Findings</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and manage vulnerability findings</p>
        </div>
        <select value={selectedProject ?? ''} onChange={e => setSelectedProject(Number(e.target.value))}
          className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-64">
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-2 shrink-0">
        <div className="flex items-center space-x-3 px-2">
          <span className="text-sm font-medium">Total: {filteredFindings.length}</span>
          <div className="h-4 w-px bg-border" />
          {/* Severity badges summary */}
          <div className="flex space-x-2">
            {(['critical', 'high', 'medium', 'low', 'info'] as const).map(sev => {
              const count = findings.filter(f => f.severity === sev).length
              if (count === 0) return null
              return (
                <button key={sev} onClick={() => setSeverityFilter(severityFilter === sev ? 'all' : sev)}
                  className={cn('px-2 py-0.5 rounded-full text-xs border capitalize transition-colors',
                    SEV_STYLES[sev], severityFilter === sev && 'ring-1 ring-offset-1 ring-offset-background ring-primary')}>
                  {sev}: {count}
                </button>
              )
            })}
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search findings..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground space-y-3">
            <ShieldAlert className="h-12 w-12 opacity-20" />
            <p>No findings discovered yet.</p>
            <p className="text-xs">Run a recon pipeline with Nuclei to scan for vulnerabilities.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 w-24">Severity</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3 w-28">Status</th>
                  <th className="px-6 py-3 w-24">Confidence</th>
                  <th className="px-6 py-3 w-28">Discovered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFindings.map(f => (
                  <tr key={f.id} onClick={() => setSelectedFinding(f)}
                    className="hover:bg-secondary/50 cursor-pointer transition-colors">
                    <td className="px-6 py-4">
                      <span className={cn('px-2 py-1 rounded-md text-xs font-semibold border uppercase', SEV_STYLES[f.severity])}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{f.title}</td>
                    <td className="px-6 py-4 text-muted-foreground truncate max-w-xs" title={f.target_url}>
                      {f.target_url || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs capitalize', STATUS_STYLES[f.status] || 'bg-secondary')}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground capitalize">{f.confidence}</td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">{new Date(f.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedFinding(null)} />
          <div className="relative w-full max-w-lg bg-card border-l border-border h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
              <div className="flex items-center space-x-2">
                <span className={cn('px-2 py-1 rounded-md text-xs font-bold border uppercase', SEV_STYLES[selectedFinding.severity])}>
                  {selectedFinding.severity}
                </span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs capitalize', STATUS_STYLES[selectedFinding.status] || 'bg-secondary')}>
                  {selectedFinding.status}
                </span>
              </div>
              <button onClick={() => setSelectedFinding(null)} className="p-1 hover:bg-secondary rounded"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold">{selectedFinding.title}</h2>
                <div className="text-xs text-muted-foreground mt-1">
                  Confidence: <span className="capitalize font-medium text-foreground">{selectedFinding.confidence}</span>
                  {selectedFinding.detection_source && <> · Source: <span className="font-medium text-foreground">{selectedFinding.detection_source}</span></>}
                </div>
              </div>

              {selectedFinding.target_url && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Target</h4>
                  <div className="bg-secondary/50 border border-border rounded-md p-3 font-mono text-xs break-all">
                    {selectedFinding.http_method && <span className="text-blue-400 font-bold mr-2">{selectedFinding.http_method}</span>}
                    {selectedFinding.target_url}
                  </div>
                  {selectedFinding.parameter && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Parameter: <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground">{selectedFinding.parameter}</code>
                    </div>
                  )}
                </div>
              )}

              {selectedFinding.description && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedFinding.description}</p>
                </div>
              )}

              {selectedFinding.evidence && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Evidence</h4>
                  <pre className="bg-[#0d1117] border border-border rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono text-green-400">
                    {selectedFinding.evidence}
                  </pre>
                </div>
              )}

              {selectedFinding.impact && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Impact</h4>
                  <p className="text-sm">{selectedFinding.impact}</p>
                </div>
              )}

              {selectedFinding.remediation && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Remediation</h4>
                  <p className="text-sm">{selectedFinding.remediation}</p>
                </div>
              )}

              {selectedFinding.ai_analysis && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">AI Analysis</h4>
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-md p-3 text-sm whitespace-pre-wrap">
                    {selectedFinding.ai_analysis}
                  </div>
                </div>
              )}

              {selectedFinding.template_id && (
                <div className="text-xs text-muted-foreground">
                  Template: <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground">{selectedFinding.template_id}</code>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-4 border-t border-border">
                Discovered: {new Date(selectedFinding.created_at).toLocaleString()}
                {selectedFinding.updated_at && <> · Updated: {new Date(selectedFinding.updated_at).toLocaleString()}</>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
