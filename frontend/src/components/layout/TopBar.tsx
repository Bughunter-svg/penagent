import { useEffect, useState } from 'react'
import { projectsApi } from '@/services/api'
import type { Project } from '@/types'
import { ShieldCheck, BrainCircuit } from 'lucide-react'

export default function TopBar() {
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  useEffect(() => {
    projectsApi.list().then(p => {
      if (p.length > 0) {
        setActiveProject(p.find(x => x.status === 'active') || p[0])
      }
    })
  }, [])

  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center space-x-4">
        <div className="text-sm font-medium">
          {activeProject ? `Project: ${activeProject.name}` : 'No Project Selected'}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 text-xs font-medium px-2 py-1 bg-green-500/10 text-green-500 rounded-md border border-green-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Scope Active</span>
        </div>
        
        <div className="flex items-center space-x-1.5 text-xs font-medium px-2 py-1 bg-blue-500/10 text-blue-500 rounded-md border border-blue-500/20">
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>AI Ready</span>
        </div>
      </div>
    </div>
  )
}
