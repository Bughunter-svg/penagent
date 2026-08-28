import { useEffect, useState } from 'react'
import { projectsApi, assetsApi } from '@/services/api'
import type { Project, Asset, Host, URLRecord } from '@/types'
import { Globe, Server, Link2, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'subdomains' | 'hosts' | 'urls'

export default function AssetsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('subdomains')
  
  const [assets, setAssets] = useState<Asset[]>([])
  const [hosts, setHosts] = useState<Host[]>([])
  const [urls, setUrls] = useState<URLRecord[]>([])
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
    
    if (activeTab === 'subdomains') {
      assetsApi.list(selectedProject, 'subdomain')
        .then(setAssets).finally(() => setLoading(false))
    } else if (activeTab === 'hosts') {
      assetsApi.hosts(selectedProject)
        .then(setHosts).finally(() => setLoading(false))
    } else if (activeTab === 'urls') {
      assetsApi.urls(selectedProject)
        .then(setUrls).finally(() => setLoading(false))
    }
  }, [selectedProject, activeTab])

  const filteredAssets = assets.filter(a => a.value.includes(search.toLowerCase()))
  const filteredHosts = hosts.filter(h => h.hostname.includes(search.toLowerCase()) || h.ip_address?.includes(search))
  const filteredUrls = urls.filter(u => u.url.includes(search.toLowerCase()))

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Asset Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse discovered infrastructure</p>
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
        <div className="flex space-x-1">
          <button 
            onClick={() => setActiveTab('subdomains')}
            className={cn('flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'subdomains' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground')}
          >
            <Globe className="h-4 w-4" /><span>Subdomains ({assets.length})</span>
          </button>
          <button 
            onClick={() => setActiveTab('hosts')}
            className={cn('flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'hosts' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground')}
          >
            <Server className="h-4 w-4" /><span>Hosts ({hosts.length})</span>
          </button>
          <button 
            onClick={() => setActiveTab('urls')}
            className={cn('flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'urls' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground')}
          >
            <Link2 className="h-4 w-4" /><span>URLs ({urls.length})</span>
          </button>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search assets..." 
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
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                {activeTab === 'subdomains' && (
                  <tr><th className="px-6 py-3">Subdomain</th><th className="px-6 py-3">Source</th><th className="px-6 py-3">In Scope</th><th className="px-6 py-3">First Seen</th></tr>
                )}
                {activeTab === 'hosts' && (
                  <tr><th className="px-6 py-3">Host</th><th className="px-6 py-3">IP Address</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Title</th><th className="px-6 py-3">Tech</th></tr>
                )}
                {activeTab === 'urls' && (
                  <tr><th className="px-6 py-3">URL</th><th className="px-6 py-3">Method</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Class</th></tr>
                )}
              </thead>
              <tbody className="divide-y divide-border">
                {activeTab === 'subdomains' && filteredAssets.map(a => (
                  <tr key={a.id} className="hover:bg-secondary/50">
                    <td className="px-6 py-4 font-medium">{a.value}</td>
                    <td className="px-6 py-4 text-muted-foreground">{a.source || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs', a.in_scope ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}>
                        {a.in_scope ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(a.first_seen).toLocaleDateString()}</td>
                  </tr>
                ))}
                
                {activeTab === 'hosts' && filteredHosts.map(h => (
                  <tr key={h.id} className="hover:bg-secondary/50">
                    <td className="px-6 py-4 font-medium">{h.scheme}://{h.hostname}:{h.port}</td>
                    <td className="px-6 py-4 text-muted-foreground">{h.ip_address || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {h.status_code ? (
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', 
                          h.status_code < 300 ? 'bg-green-500/10 text-green-400' : 
                          h.status_code < 400 ? 'bg-blue-500/10 text-blue-400' : 
                          'bg-yellow-500/10 text-yellow-400'
                        )}>{h.status_code}</span>
                      ) : <span className="text-muted-foreground">N/A</span>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground truncate max-w-xs">{h.title || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {h.technologies?.slice(0, 3).map(t => (
                          <span key={t.name} className="px-2 py-0.5 bg-secondary text-[10px] rounded-md">{t.name}</span>
                        ))}
                        {(h.technologies?.length || 0) > 3 && <span className="px-2 py-0.5 bg-secondary text-[10px] rounded-md">+{h.technologies.length - 3}</span>}
                      </div>
                    </td>
                  </tr>
                ))}

                {activeTab === 'urls' && filteredUrls.map(u => (
                  <tr key={u.id} className="hover:bg-secondary/50">
                    <td className="px-6 py-4 font-medium truncate max-w-md" title={u.url}>{u.url}</td>
                    <td className="px-6 py-4"><span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{u.method}</span></td>
                    <td className="px-6 py-4">{u.status_code || '-'}</td>
                    <td className="px-6 py-4">
                      {u.classification ? (
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full">{u.classification}</span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
                
                {((activeTab === 'subdomains' && filteredAssets.length === 0) || 
                  (activeTab === 'hosts' && filteredHosts.length === 0) || 
                  (activeTab === 'urls' && filteredUrls.length === 0)) && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No assets found. Try adjusting your search or running a recon pipeline.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
