import { useEffect, useState, useRef } from 'react'
import { projectsApi, aiApi } from '@/services/api'
import type { Project } from '@/types'
import { BrainCircuit, Send, User, Bot, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AIAnalystPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const [status, setStatus] = useState({ available: false, model: 'unknown' })
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    projectsApi.list().then(p => {
      setProjects(p)
      if (p.length > 0) setSelectedProject(p[0].id)
    })
    aiApi.status().then(setStatus).catch(() => setStatus({ available: false, model: 'error' }))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !selectedProject || !status.available) return
    
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    
    try {
      const res = await aiApi.chat({
        message: userMsg,
        project_id: selectedProject,
        conversation_history: messages
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error communicating with local AI model. Ensure Ollama is running." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <BrainCircuit className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Analyst</h1>
            <p className="text-sm text-muted-foreground mt-1">Chat with local LLM about project data</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className={cn('h-2 w-2 rounded-full', status.available ? 'bg-green-500' : 'bg-red-500')} />
            <span className="text-muted-foreground">Model: {status.model}</span>
          </div>
          <select 
            value={selectedProject ?? ''} 
            onChange={e => setSelectedProject(Number(e.target.value))}
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-64"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg flex-1 flex flex-col overflow-hidden">
        {!status.available && (
          <div className="bg-red-500/10 border-b border-red-500/20 p-3 flex items-start space-x-3 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>Ollama is not responding. Ensure Ollama is running locally and the configured model is pulled (e.g., <code>ollama run llama3</code>).</p>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <BrainCircuit className="h-12 w-12 opacity-20" />
              <p className="max-w-md text-center">
                Ask the AI to summarize findings, group endpoints, or generate vulnerability hypotheses based on the current project's recon data.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg mt-4">
                {[
                  "Summarize the high-confidence findings.",
                  "What interesting APIs did we discover?",
                  "Which subdomains look like staging environments?",
                  "Group the endpoints by functionality."
                ].map(q => (
                  <button 
                    key={q}
                    onClick={() => setInput(q)}
                    className="p-3 text-xs text-left bg-secondary hover:bg-secondary/80 rounded-md border border-border transition-colors"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={cn('flex space-x-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-blue-500" />
                  </div>
                )}
                <div className={cn(
                  'px-4 py-3 rounded-lg max-w-[80%] text-sm whitespace-pre-wrap',
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary border border-border'
                )}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex space-x-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-blue-500" />
              </div>
              <div className="px-4 py-3 rounded-lg bg-secondary border border-border flex items-center space-x-1">
                <div className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce" />
                <div className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-border bg-card">
          <form 
            onSubmit={e => { e.preventDefault(); handleSend() }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about project data..."
              className="flex-1 bg-background border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={!status.available || loading || !selectedProject}
            />
            <button
              type="submit"
              disabled={!status.available || loading || !input.trim() || !selectedProject}
              className="p-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
