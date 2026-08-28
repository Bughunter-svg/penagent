import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, FolderKanban, Radar, Server, ShieldAlert, 
  Brain, Network, Activity, FileText, Code2, Settings 
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  const location = useLocation()
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Recon', path: '/recon', icon: Radar },
    { name: 'Assets', path: '/assets', icon: Server },
    { name: 'Findings', path: '/findings', icon: ShieldAlert },
    { name: 'AI Analyst', path: '/ai', icon: Brain },
    { name: 'Attack Graph', path: '/graph', icon: Network },
    { name: 'Jobs', path: '/jobs', icon: Activity },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Scripts', path: '/scripts', icon: Code2 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ]

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-border flex items-center space-x-2">
        <Radar className="h-6 w-6 text-primary" />
        <span className="font-bold text-xl tracking-tight">PenAgent</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
