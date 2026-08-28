import { useEffect, useState, useCallback, useMemo } from 'react'
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import dagre from 'dagre'
import { projectsApi, assetsApi, findingsApi } from '@/services/api'
import type { Project, Asset, Host, URLRecord, Finding } from '@/types'
import { Globe, Server, Link2, ShieldAlert, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

const nodeWidth = 220
const nodeHeight = 60

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    node.targetPosition = direction === 'TB' ? Position.Top : Position.Left
    node.sourcePosition = direction === 'TB' ? Position.Bottom : Position.Right
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    }
    return node
  })

  return { nodes, edges }
}

const CustomNode = ({ data }: any) => {
  const Icon = data.icon
  return (
    <div className={cn("px-4 py-2 shadow-md rounded-md bg-card border-2 flex items-center space-x-3 w-[220px]", data.borderColor)}>
      <Handle type="target" position={Position.Top} className="w-16 bg-muted-foreground/30" />
      <div className={cn("p-2 rounded-md", data.bgIconColor)}>
        <Icon className={cn("h-4 w-4", data.iconColor)} />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="text-xs font-bold truncate text-foreground">{data.label}</div>
        <div className="text-[10px] text-muted-foreground uppercase">{data.subLabel}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-16 bg-muted-foreground/30" />
    </div>
  )
}

const nodeTypes = {
  custom: CustomNode,
}

export default function AttackGraphPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    projectsApi.list().then(p => {
      setProjects(p)
      if (p.length > 0) setSelectedProject(p[0].id)
    })
  }, [])

  const buildGraph = useCallback(async () => {
    if (!selectedProject) return
    setLoading(true)
    
    try {
      const [proj, subdomains, hosts, urls, findings] = await Promise.all([
        projectsApi.get(selectedProject),
        assetsApi.list(selectedProject, 'subdomain'),
        assetsApi.hosts(selectedProject),
        assetsApi.urls(selectedProject),
        findingsApi.list(selectedProject)
      ])

      const newNodes: any[] = []
      const newEdges: any[] = []

      // 1. Target Node
      proj.targets.forEach(t => {
        newNodes.push({
          id: `target-${t.id}`,
          type: 'custom',
          data: { label: t.target, subLabel: 'Target', icon: Target, borderColor: 'border-blue-500/50', bgIconColor: 'bg-blue-500/10', iconColor: 'text-blue-500' },
          position: { x: 0, y: 0 }
        })
      })

      // 2. Subdomains
      subdomains.forEach(s => {
        const id = `sub-${s.id}`
        newNodes.push({
          id, type: 'custom',
          data: { label: s.value, subLabel: 'Subdomain', icon: Globe, borderColor: 'border-slate-500/50', bgIconColor: 'bg-slate-500/10', iconColor: 'text-slate-400' },
          position: { x: 0, y: 0 }
        })
        
        // Link to matching target
        const target = proj.targets.find(t => s.value.endsWith(t.target))
        if (target) {
          newEdges.push({ id: `e-t${target.id}-${id}`, source: `target-${target.id}`, target: id, animated: true })
        }
      })

      // 3. Hosts
      hosts.forEach(h => {
        const id = `host-${h.id}`
        newNodes.push({
          id, type: 'custom',
          data: { label: `${h.hostname}:${h.port}`, subLabel: 'Live Host', icon: Server, borderColor: 'border-green-500/50', bgIconColor: 'bg-green-500/10', iconColor: 'text-green-500' },
          position: { x: 0, y: 0 }
        })
        
        // Link to matching subdomain or target
        const sub = subdomains.find(s => s.value === h.hostname)
        if (sub) {
          newEdges.push({ id: `e-s${sub.id}-${id}`, source: `sub-${sub.id}`, target: id })
        } else {
          const target = proj.targets.find(t => h.hostname.endsWith(t.target))
          if (target) newEdges.push({ id: `e-t${target.id}-${id}`, source: `target-${target.id}`, target: id })
        }
      })

      // 4. URLs (limit to prevent massive graphs, e.g. APIs or parameters only if possible)
      // For now, let's just pick top 50 urls to prevent lag
      urls.slice(0, 50).forEach(u => {
        const id = `url-${u.id}`
        newNodes.push({
          id, type: 'custom',
          data: { label: u.path || u.url, subLabel: 'Endpoint', icon: Link2, borderColor: 'border-cyan-500/50', bgIconColor: 'bg-cyan-500/10', iconColor: 'text-cyan-500' },
          position: { x: 0, y: 0 }
        })
        
        if (u.host_id) {
          newEdges.push({ id: `e-h${u.host_id}-${id}`, source: `host-${u.host_id}`, target: id })
        }
      })

      // 5. Findings
      findings.forEach(f => {
        const id = `find-${f.id}`
        const color = f.severity === 'critical' ? 'red' : f.severity === 'high' ? 'orange' : f.severity === 'medium' ? 'yellow' : 'blue'
        
        newNodes.push({
          id, type: 'custom',
          data: { label: f.title, subLabel: `Finding (${f.severity})`, icon: ShieldAlert, borderColor: `border-${color}-500/50`, bgIconColor: `bg-${color}-500/10`, iconColor: `text-${color}-500` },
          position: { x: 0, y: 0 }
        })
        
        // Link finding to url or host if target_url exists
        if (f.target_url) {
           // naive matching for visualization
           const matchingUrl = urls.find(u => f.target_url?.includes(u.url))
           if (matchingUrl) {
             newEdges.push({ id: `e-u${matchingUrl.id}-${id}`, source: `url-${matchingUrl.id}`, target: id, animated: true, style: { stroke: '#ef4444', strokeWidth: 2 } })
           } else {
             const matchingHost = hosts.find(h => f.target_url?.includes(h.hostname))
             if (matchingHost) {
               newEdges.push({ id: `e-h${matchingHost.id}-${id}`, source: `host-${matchingHost.id}`, target: id, animated: true, style: { stroke: '#ef4444', strokeWidth: 2 } })
             }
           }
        }
      })

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges)
      setNodes(layoutedNodes)
      setEdges(layoutedEdges)

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedProject, setNodes, setEdges])

  useEffect(() => {
    buildGraph()
  }, [buildGraph])

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Attack Graph</h1>
          <p className="text-sm text-muted-foreground mt-1">Visual map of discovered attack surface</p>
        </div>
        <select 
          value={selectedProject ?? ''} 
          onChange={e => setSelectedProject(Number(e.target.value))}
          className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-64 z-10"
        >
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
          minZoom={0.1}
        >
          <Background color="#334155" gap={20} size={1} />
          <Controls className="bg-card border-border fill-foreground" />
          
          <Panel position="top-right" className="bg-card/80 backdrop-blur border border-border p-3 rounded-lg text-xs space-y-2">
             <div className="font-semibold mb-2 text-muted-foreground">Legend</div>
             <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-blue-500/20 border border-blue-500 rounded" /><span>Target</span></div>
             <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-slate-500/20 border border-slate-500 rounded" /><span>Subdomain</span></div>
             <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-green-500/20 border border-green-500 rounded" /><span>Live Host</span></div>
             <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-cyan-500/20 border border-cyan-500 rounded" /><span>Endpoint</span></div>
             <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-red-500/20 border border-red-500 rounded" /><span>Vulnerability</span></div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
}
