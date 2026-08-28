import { useEffect, useState } from 'react'
import { toolsApi } from '@/services/api'
import type { ToolStatus } from '@/types'
import { CheckCircle2, XCircle, Settings2, ShieldCheck, TerminalSquare } from 'lucide-react'

export default function SettingsPage() {
  const [tools, setTools] = useState<ToolStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    toolsApi.status().then(res => setTools(res.tools)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your environment and tools</p>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border bg-secondary/30 flex items-center space-x-2">
          <TerminalSquare className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Security Tools Overview</h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : (
          <div className="divide-y divide-border">
            {tools.map(tool => (
              <div key={tool.name} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                <div className="flex items-start space-x-4">
                  <div className="mt-0.5">
                    {tool.installed ? 
                      <CheckCircle2 className="h-5 w-5 text-green-500" /> : 
                      <XCircle className="h-5 w-5 text-red-500" />
                    }
                  </div>
                  <div>
                    <h3 className="font-semibold">{tool.name}</h3>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                    <div className="flex items-center space-x-3 mt-2 text-xs">
                      <span className="px-2 py-0.5 bg-secondary rounded-full font-medium text-foreground">{tool.category}</span>
                      {tool.version && <span className="text-muted-foreground">Version: {tool.version}</span>}
                      {tool.path && <span className="text-muted-foreground font-mono bg-background px-1 rounded border border-border">{tool.path}</span>}
                    </div>
                  </div>
                </div>
                <div>
                  <button className="text-sm text-blue-400 hover:underline">Configure Path</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border bg-secondary/30 flex items-center space-x-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Application Settings</h2>
        </div>
        <div className="p-6 space-y-6">
           <div>
             <h3 className="text-sm font-semibold mb-2">Local AI Integration (Ollama)</h3>
             <div className="space-y-4 max-w-md">
               <div>
                 <label className="text-xs text-muted-foreground">Ollama Base URL</label>
                 <input type="text" defaultValue="http://localhost:11434" className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm" />
               </div>
               <div>
                 <label className="text-xs text-muted-foreground">Default Model</label>
                 <input type="text" defaultValue="llama3" className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm" />
               </div>
               <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Save AI Settings</button>
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}
