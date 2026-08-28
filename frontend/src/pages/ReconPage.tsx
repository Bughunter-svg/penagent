import { useEffect, useState } from 'react'
import { projectsApi, reconApi } from '@/services/api'
import type { Project, PipelineStatus } from '@/types'
import { Play, Square, RefreshCw, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const STAGE_LABELS: Record<string, string> = {
  scope_check: 'Scope Check', subdomain_enumeration: 'Subdomain Enumeration',
  dns_resolution: 'DNS Resolution', port_scanning: 'Port Scanning',
  http_probing: 'HTTP Probing', url_discovery: 'URL Discovery',
  web_crawling: 'Web Crawling', directory_fuzzing: 'Directory Fuzzing',
  parameter_discovery: 'Parameter Discovery', endpoint_analysis: 'Endpoint Analysis',
  vulnerability_scanning: 'Vulnerability Scanning', xss_scanning: 'XSS Scanning',
  pattern_matching: 'Pattern Matching', custom_scripts: 'Custom Scripts',
  result_normalization: 'Result Normalization', ai_analysis: 'AI Analysis',
  finding_prioritization: 'Finding Prioritization', report_generation: 'Report Generation',
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-400" />
    case 'running': return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
    case 'failed': return <XCircle className="h-4 w-4 text-red-400" />
    case 'queued': return <Clock className="h-4 w-4 text-muted-foreground" />
    case 'skipped': return <AlertTriangle className="h-4 w-4 text-yellow-400" />
    default: return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

export default function ReconPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    projectsApi.list().then(p => {
      setProjects(p)
      if (p.length > 0) setSelectedProject(p[0].id)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    const poll = () => reconApi.status(selectedProject).then(setPipeline).catch(() => {})
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [selectedProject])

  const handleStart = async () => {
    if (!selectedProject) return
    setStarting(true)
    try {
      const result = await reconApi.start(selectedProject)
      setPipeline(result)
      toast.success('Pipeline started')
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to start') }
    finally { setStarting(false) }
  }

  const handleCancel = async () => {
    if (!pipeline?.pipeline_id) return
    try {
      await reconApi.cancel(pipeline.pipeline_id)
      toast.success('Cancelling pipeline...')
    } catch { toast.error('Failed to cancel') }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  const isRunning = pipeline?.status === 'running' || pipeline?.status === 'queued'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recon Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Orchestrate reconnaissance tools</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Project Selector */}
          <select value={selectedProject ?? ''} onChange={e => setSelectedProject(Number(e.target.value))}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {isRunning ? (
            <button onClick={handleCancel} className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">
              <Square className="h-4 w-4" /><span>Cancel</span>
            </button>
          ) : (
            <button onClick={handleStart} disabled={starting || !selectedProject}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Play className="h-4 w-4" /><span>{starting ? 'Starting...' : 'Start Pipeline'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Status Header */}
      {pipeline && pipeline.pipeline_id && (
        <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={cn('h-3 w-3 rounded-full',
              pipeline.status === 'running' ? 'bg-blue-400 animate-pulse' :
              pipeline.status === 'completed' ? 'bg-green-400' :
              pipeline.status === 'failed' ? 'bg-red-400' : 'bg-gray-400'
            )} />
            <div>
              <div className="text-sm font-medium capitalize">{pipeline.status}</div>
              <div className="text-xs text-muted-foreground">
                {pipeline.current_stage ? `Current: ${STAGE_LABELS[pipeline.current_stage] || pipeline.current_stage}` : 'Idle'}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {pipeline.stages.filter(s => s.status === 'completed').length} / {pipeline.stages.length} stages
          </div>
        </div>
      )}

      {/* Pipeline Stages */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {(pipeline?.stages?.length ? pipeline.stages : Object.keys(STAGE_LABELS).map(name => ({ name, status: 'queued' as string }))).map((stage, i) => (
          <div key={stage.name} className={cn('flex items-center justify-between px-5 py-3',
            stage.status === 'running' ? 'bg-blue-500/5' : ''
          )}>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
              <StatusIcon status={stage.status} />
              <span className="text-sm font-medium">{STAGE_LABELS[stage.name] || stage.name}</span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              {'duration_seconds' in stage && typeof stage.duration_seconds === 'number' && (
                <span>{stage.duration_seconds.toFixed(1)}s</span>
              )}
              {'result_count' in stage && typeof stage.result_count === 'number' && (
                <span>{stage.result_count} results</span>
              )}
              <span className={cn('capitalize px-2 py-0.5 rounded-full text-[10px] font-medium',
                stage.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                stage.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                stage.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                'bg-secondary text-muted-foreground'
              )}>{stage.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* No project message */}
      {projects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Create a project first to run recon pipeline.
        </div>
      )}
    </div>
  )
}
