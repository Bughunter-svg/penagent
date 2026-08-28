import { useEffect, useState } from 'react'
import { projectsApi, jobsApi } from '@/services/api'
import type { Project, Job, JobLog } from '@/types'
import { Activity, Clock, CheckCircle2, XCircle, Terminal, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function JobsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<number | null>(null)
  const [logs, setLogs] = useState<JobLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    projectsApi.list().then(p => {
      setProjects(p)
      if (p.length > 0) setSelectedProject(p[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    setLoading(true)
    jobsApi.list(selectedProject)
      .then(res => {
        setJobs(res)
        if (res.length > 0 && !selectedJob) setSelectedJob(res[0].id)
      })
      .finally(() => setLoading(false))
  }, [selectedProject])

  useEffect(() => {
    if (!selectedJob) {
      setLogs([])
      return
    }
    const loadLogs = () => jobsApi.logs(selectedJob).then(setLogs).catch(() => {})
    loadLogs()
    
    // Auto refresh logs if the job might still be running
    const job = jobs.find(j => j.id === selectedJob)
    if (job?.status === 'running' || job?.status === 'queued') {
      const int = setInterval(loadLogs, 2000)
      return () => clearInterval(int)
    }
  }, [selectedJob, jobs])

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-400" />
      case 'running': return <Activity className="h-4 w-4 text-blue-400" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-400" />
      case 'skipped': return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      default: return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Jobs Console</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor tool execution and logs</p>
        </div>
        <select 
          value={selectedProject ?? ''} 
          onChange={e => setSelectedProject(Number(e.target.value))}
          className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-64"
        >
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
        {/* Jobs List */}
        <div className="col-span-1 bg-card border border-border rounded-lg overflow-y-auto">
          {loading ? (
             <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No jobs executed yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job.id)}
                  className={cn('w-full flex items-start justify-between p-4 text-left transition-colors',
                    selectedJob === job.id ? 'bg-secondary' : 'hover:bg-secondary/50'
                  )}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <StatusIcon status={job.status} />
                      <span className="font-semibold text-sm capitalize">{job.job_type.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 ml-6">
                      {new Date(job.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
                    job.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                    job.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                    job.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-gray-500/10 text-gray-400'
                  )}>{job.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Logs */}
        <div className="col-span-2 bg-[#0d1117] border border-border rounded-lg flex flex-col overflow-hidden font-mono text-xs">
          <div className="bg-[#161b22] border-b border-border p-3 flex items-center justify-between text-muted-foreground shrink-0">
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4" />
              <span>Live Console {selectedJob ? `(Job #${selectedJob})` : ''}</span>
            </div>
            {jobs.find(j => j.id === selectedJob)?.status === 'running' && (
               <div className="flex items-center space-x-2 text-blue-400">
                 <Activity className="h-3 w-3 animate-pulse" /><span>Running</span>
               </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {logs.length === 0 ? (
              <div className="text-muted-foreground/50 italic">No logs available...</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex space-x-3 hover:bg-white/5 px-2 py-0.5 rounded">
                  <span className="text-gray-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={cn('shrink-0 w-12',
                    log.level === 'ERROR' ? 'text-red-400' :
                    log.level === 'WARN' ? 'text-yellow-400' :
                    log.level === 'INFO' ? 'text-blue-400' : 'text-gray-400'
                  )}>{log.level}</span>
                  <span className={cn('break-all whitespace-pre-wrap',
                     log.level === 'ERROR' ? 'text-red-300' : 'text-gray-300'
                  )}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
