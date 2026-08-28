import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { projectsApi, aiApi, reconApi } from '@/services/api'
import type { Project, AIStatus } from '@/types'
import { ShieldCheck, BrainCircuit, Activity, AlertTriangle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TopBar() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const location = useLocation()

  useEffect(() => {
    projectsApi.list().then(p => {
      setProjects(p)
      if (p.length > 0) setSelectedProject(p.find(x => x.status === 'active') || p[0])
    }).catch(() => {})
    aiApi.status().then(setAiStatus).catch(() => setAiStatus({ available: false, model: 'N/A', base_url: '' }))
  }, [location.pathname])

  useEffect(() => {
    if (!selectedProject) return
    reconApi.status(selectedProject.id).then(s => {
      setPipelineRunning(s.status === 'running')
    }).catch(() => {})
  }, [selectedProject])

  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center space-x-4">
        {projects.length > 1 ? (
          <select
            value={selectedProject?.id ?? ''}
            onChange={e => {
              const p = projects.find(x => x.id === Number(e.target.value))
              if (p) setSelectedProject(p)
            }}
            className="bg-secondary border border-border rounded-md px-3 py-1.5 text-sm font-medium cursor-pointer"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        ) : (
          <div className="text-sm font-medium">
            {selectedProject ? selectedProject.name : 'No Project'}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Pipeline Status */}
        {pipelineRunning && (
          <div className="flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20 animate-pulse">
            <Activity className="w-3.5 h-3.5" />
            <span>Pipeline Running</span>
          </div>
        )}

        {/* Scope Indicator */}
        <div className="flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 bg-green-500/10 text-green-500 rounded-md border border-green-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Scope Active</span>
        </div>

        {/* AI Status */}
        <div className={cn(
          "flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-md border",
          aiStatus?.available
            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
            : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
        )}>
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>{aiStatus?.available ? `AI: ${aiStatus.model}` : 'AI Offline'}</span>
        </div>
      </div>
    </div>
  )
}
