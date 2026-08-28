import { Code2, Play, Plus } from 'lucide-react'

export default function ScriptsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Scripts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and execute custom Python/Bash recon scripts</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4" /><span>New Script</span>
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-4">
        <Code2 className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">Custom Script Engine</h2>
        <p className="text-muted-foreground max-w-md">
          Upload or write custom reconnaissance scripts that can be injected into the automated pipeline. Scripts have access to the current project's scope and targets.
        </p>
      </div>
    </div>
  )
}
