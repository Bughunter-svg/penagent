import { FileText, Download } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate and export bug bounty reports</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-4">
        <FileText className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">Report Generation Engine</h2>
        <p className="text-muted-foreground max-w-md">
          The reporting engine compiles your discovered assets, confirmed findings, and AI analysis into a professional bug bounty submission document.
        </p>
        <div className="flex space-x-4 mt-4">
          <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
            <FileText className="h-4 w-4" /><span>Generate Markdown</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded-md text-sm font-medium hover:bg-secondary/80">
            <Download className="h-4 w-4" /><span>Export JSON</span>
          </button>
        </div>
      </div>
    </div>
  )
}
