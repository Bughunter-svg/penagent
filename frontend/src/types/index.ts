export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'
export type Confidence = 'low' | 'medium' | 'high'
export type FindingStatus = 'new' | 'investigating' | 'confirmed' | 'rejected' | 'reported' | 'duplicate' | 'fixed'
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'

export interface ProjectStats {
  subdomains: number
  live_hosts: number
  urls: number
  parameters: number
  technologies: number
  findings: number
  high_confidence: number
}

export interface TargetInfo {
  id: number
  project_id: number
  target: string
  target_type: string
  is_primary: boolean
  created_at: string
}

export interface ScopeRule {
  id: number
  project_id: number
  rule_type: 'include' | 'exclude'
  pattern: string
  created_at: string
}

export interface Project {
  id: number
  name: string
  description?: string
  status: ProjectStatus
  created_at: string
  updated_at?: string
  targets: TargetInfo[]
  scope_rules: ScopeRule[]
  stats?: ProjectStats
}

export interface Asset {
  id: number
  project_id: number
  asset_type: string
  value: string
  source?: string
  in_scope: boolean
  first_seen: string
  last_seen: string
  created_at: string
}

export interface Host {
  id: number
  project_id: number
  hostname: string
  ip_address?: string
  port: number
  scheme: string
  status_code?: number
  title?: string
  content_length?: number
  web_server?: string
  response_time?: number
  redirect_url?: string
  is_alive: boolean
  technologies: TechBrief[]
  first_seen: string
  last_seen: string
}

export interface TechBrief {
  name: string
  version?: string
  category?: string
}

export interface URLRecord {
  id: number
  project_id: number
  host_id?: number
  url: string
  path?: string
  method: string
  status_code?: number
  content_type?: string
  source?: string
  classification?: string
  has_parameters: boolean
  first_seen: string
  last_seen: string
}

export interface Finding {
  id: number
  project_id: number
  title: string
  severity: Severity
  confidence: Confidence
  status: FindingStatus
  target_url?: string
  http_method?: string
  parameter?: string
  detection_source?: string
  template_id?: string
  description?: string
  evidence?: string
  impact?: string
  remediation?: string
  ai_analysis?: string
  created_at: string
  updated_at?: string
}

export interface Job {
  id: number
  project_id: number
  job_type: string
  status: JobStatus
  stage_order?: number
  command?: string
  started_at?: string
  completed_at?: string
  duration_seconds?: number
  result_count: number
  error_message?: string
  configuration?: string
  created_at: string
}

export interface JobLog {
  id: number
  job_id: number
  timestamp: string
  level: string
  message: string
  source?: string
}

export interface ToolStatus {
  name: string
  description: string
  category: string
  installed: boolean
  version?: string
  path?: string
  is_enabled: boolean
}

export interface AIStatus {
  available: boolean
  model: string
  base_url: string
}

export interface StageStatus {
  name: string
  status: string
  started_at?: string
  completed_at?: string
  duration_seconds?: number
  result_count?: number
  error?: string
}

export interface PipelineStatus {
  pipeline_id: string
  project_id: number
  status: string
  current_stage?: string
  stages: StageStatus[]
}

export interface ScopeStatus {
  is_active: boolean
  include_count: number
  exclude_count: number
  total_assets: number
  in_scope_assets: number
  out_of_scope_assets: number
}

export interface FindingStats {
  total: number
  by_severity: Record<string, number>
  by_status: Record<string, number>
  by_confidence: Record<string, number>
  by_source: Record<string, number>
}

export interface DashboardAnalytics {
  project_id: number
  stats: ProjectStats
  findings: FindingStats
  job_status: Record<string, number>
  http_status_codes: Record<string, number>
  top_technologies: Array<{ name: string; count: number }>
  scope_coverage: Record<string, number>
  recon_funnel: Array<{ stage: string; count: number }>
  discovery_timeline: Array<{ date: string; count: number }>
  tools_by_category: Record<string, number>
}
