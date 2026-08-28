import { useEffect, useState } from 'react'
import { projectsApi } from '@/services/api'
import type { Project } from '@/types'
import { Plus, Globe, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', target: '', scopeInclude: '', scopeExclude: '' })
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    projectsApi.list().then(setProjects).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.target.trim()) {
      toast.error('Name and target are required')
      return
    }
    setCreating(true)
    try {
      const targets = form.target.split(',').map(t => t.trim()).filter(Boolean)
      const includes = form.scopeInclude ? form.scopeInclude.split(',').map(s => s.trim()).filter(Boolean) : targets.map(t => `*.${t}`)
      const excludes = form.scopeExclude ? form.scopeExclude.split(',').map(s => s.trim()).filter(Boolean) : []
      await projectsApi.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        targets,
        scope_includes: includes,
        scope_excludes: excludes,
      })
      toast.success('Project created')
      setShowCreate(false)
      setForm({ name: '', description: '', target: '', scopeInclude: '', scopeExclude: '' })
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this project and all its data?')) return
    try {
      await projectsApi.delete(id)
      toast.success('Project deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your bug bounty targets</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4" /><span>New Project</span>
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Project</h2>
              <button onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Project Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Acme Bug Bounty" className="w-full mt-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="HackerOne program" className="w-full mt-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Target Domains * (comma-separated)</label>
                <input value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                  placeholder="example.com, api.example.com" className="w-full mt-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Scope Includes (comma-separated, auto-generated from targets if empty)</label>
                <input value={form.scopeInclude} onChange={e => setForm(f => ({ ...f, scopeInclude: e.target.value }))}
                  placeholder="*.example.com" className="w-full mt-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Scope Excludes (comma-separated)</label>
                <input value={form.scopeExclude} onChange={e => setForm(f => ({ ...f, scopeExclude: e.target.value }))}
                  placeholder="admin.example.com" className="w-full mt-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-md hover:bg-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No projects yet. Create one to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                  <h3 className="font-semibold">{p.name}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    p.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                  )}>{p.status}</span>
                  <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {p.description && <p className="text-xs text-muted-foreground mb-3">{p.description}</p>}
              <div className="text-xs text-muted-foreground mb-3">
                <span className="font-medium text-foreground">Targets: </span>
                {p.targets?.map(t => t.target).join(', ') || 'None'}
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                <span className="font-medium text-foreground">Scope: </span>
                {p.scope_rules?.filter(r => r.rule_type === 'include').map(r => r.pattern).join(', ') || 'Not set'}
              </div>
              {p.stats && (
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                  <div><div className="text-lg font-bold">{p.stats.subdomains}</div><div className="text-[10px] text-muted-foreground">Subdomains</div></div>
                  <div><div className="text-lg font-bold">{p.stats.live_hosts}</div><div className="text-[10px] text-muted-foreground">Hosts</div></div>
                  <div><div className="text-lg font-bold">{p.stats.findings}</div><div className="text-[10px] text-muted-foreground">Findings</div></div>
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-3">Created {new Date(p.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
