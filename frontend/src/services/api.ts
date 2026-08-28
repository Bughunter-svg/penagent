import axios from 'axios'
import type { Project, Asset, Host, URLRecord, Finding, Job, JobLog, ToolStatus, AIStatus, PipelineStatus, ScopeStatus } from '@/types'

const api = axios.create({ baseURL: '/api' })

export const projectsApi = {
  list: (): Promise<Project[]> => api.get('/projects').then(r => r.data),
  get: (id: number): Promise<Project> => api.get(`/projects/${id}`).then(r => r.data),
  create: (data: { name: string; description?: string; targets: string[]; scope_includes: string[]; scope_excludes: string[] }) =>
    api.post('/projects', data).then(r => r.data),
  delete: (id: number) => api.delete(`/projects/${id}`).then(r => r.data),
}

export const scopeApi = {
  get: (projectId: number): Promise<ScopeStatus> => api.get(`/projects/${projectId}/scope`).then(r => r.data),
  addRule: (projectId: number, data: { rule_type: string; pattern: string }) =>
    api.post(`/projects/${projectId}/scope`, data).then(r => r.data),
  validate: (projectId: number, target: string) =>
    api.post(`/projects/${projectId}/scope/validate`, { target }).then(r => r.data),
}

export const reconApi = {
  start: (projectId: number, config?: any): Promise<PipelineStatus> =>
    api.post(`/projects/${projectId}/recon/start`, { config }).then(r => r.data),
  status: (projectId: number): Promise<PipelineStatus> =>
    api.get(`/projects/${projectId}/recon/status`).then(r => r.data),
  cancel: (pipelineId: string) => api.post(`/recon/${pipelineId}/cancel`).then(r => r.data),
}

export const assetsApi = {
  list: (projectId: number, type?: string): Promise<Asset[]> =>
    api.get(`/projects/${projectId}/assets`, { params: { type } }).then(r => r.data),
  hosts: (projectId: number): Promise<Host[]> => api.get(`/projects/${projectId}/hosts`).then(r => r.data),
  urls: (projectId: number): Promise<URLRecord[]> => api.get(`/projects/${projectId}/urls`).then(r => r.data),
}

export const findingsApi = {
  list: (projectId: number): Promise<Finding[]> => api.get(`/projects/${projectId}/findings`).then(r => r.data),
  create: (projectId: number, data: any): Promise<Finding> =>
    api.post(`/projects/${projectId}/findings`, data).then(r => r.data),
}

export const jobsApi = {
  list: (projectId: number): Promise<Job[]> => api.get(`/projects/${projectId}/jobs`).then(r => r.data),
  logs: (jobId: number): Promise<JobLog[]> => api.get(`/jobs/${jobId}/logs`).then(r => r.data),
}

export const toolsApi = {
  status: (): Promise<{ tools: ToolStatus[] }> => api.get('/tools/status').then(r => r.data),
}

export const aiApi = {
  status: (): Promise<AIStatus> => api.get('/ai/status').then(r => r.data),
  chat: (data: { message: string; project_id: number; conversation_history: any[] }) =>
    api.post('/ai/chat', data).then(r => r.data),
}

export const healthApi = {
  check: () => api.get('/health').then(r => r.data),
}

export default api
