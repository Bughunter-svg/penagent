from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


# ── Project ──────────────────────────────────────────────────────────────────
class ProjectStats(BaseModel):
    subdomains: int = 0
    live_hosts: int = 0
    urls: int = 0
    parameters: int = 0
    technologies: int = 0
    findings: int = 0
    high_confidence: int = 0


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    targets: list[str] = Field(default_factory=list)
    scope_includes: list[str] = Field(default_factory=list)
    scope_excludes: list[str] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class TargetResponse(BaseModel):
    id: int
    project_id: int
    target: str
    target_type: str
    is_primary: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class ScopeRuleResponse(BaseModel):
    id: int
    project_id: int
    rule_type: str
    pattern: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    targets: list[TargetResponse] = []
    scope_rules: list[ScopeRuleResponse] = []
    stats: Optional[ProjectStats] = None
    model_config = {"from_attributes": True}


# ── Target ───────────────────────────────────────────────────────────────────
class TargetCreate(BaseModel):
    target: str
    target_type: str = "domain"


# ── Scope ────────────────────────────────────────────────────────────────────
class ScopeRuleCreate(BaseModel):
    rule_type: str
    pattern: str


class ScopeStatus(BaseModel):
    is_active: bool
    include_count: int
    exclude_count: int
    total_assets: int = 0
    in_scope_assets: int = 0
    out_of_scope_assets: int = 0


class ScopeValidateRequest(BaseModel):
    target: str


class ScopeValidateResponse(BaseModel):
    target: str
    in_scope: bool
    matched_rule: Optional[str] = None


# ── Asset ────────────────────────────────────────────────────────────────────
class AssetResponse(BaseModel):
    id: int
    project_id: int
    asset_type: str
    value: str
    source: Optional[str] = None
    in_scope: bool
    first_seen: datetime
    last_seen: datetime
    created_at: datetime
    model_config = {"from_attributes": True}


class AssetFilter(BaseModel):
    project_id: Optional[int] = None
    asset_type: Optional[str] = None
    source: Optional[str] = None
    in_scope: Optional[bool] = None
    search: Optional[str] = None


class AssetStats(BaseModel):
    total: int = 0
    by_type: dict[str, int] = {}
    by_source: dict[str, int] = {}
    in_scope: int = 0
    out_of_scope: int = 0


# ── Host ─────────────────────────────────────────────────────────────────────
class TechnologyBrief(BaseModel):
    name: str
    version: Optional[str] = None
    category: Optional[str] = None
    model_config = {"from_attributes": True}


class HostResponse(BaseModel):
    id: int
    project_id: int
    hostname: str
    ip_address: Optional[str] = None
    port: int = 443
    scheme: str = "https"
    status_code: Optional[int] = None
    title: Optional[str] = None
    content_length: Optional[int] = None
    web_server: Optional[str] = None
    response_time: Optional[float] = None
    redirect_url: Optional[str] = None
    is_alive: bool = False
    technologies: list[TechnologyBrief] = []
    first_seen: datetime
    last_seen: datetime
    model_config = {"from_attributes": True}


class HostFilter(BaseModel):
    project_id: Optional[int] = None
    status_code: Optional[int] = None
    is_alive: Optional[bool] = None
    web_server: Optional[str] = None
    search: Optional[str] = None


# ── URL ──────────────────────────────────────────────────────────────────────
class URLResponse(BaseModel):
    id: int
    project_id: int
    host_id: Optional[int] = None
    url: str
    path: Optional[str] = None
    method: str = "GET"
    status_code: Optional[int] = None
    content_type: Optional[str] = None
    source: Optional[str] = None
    classification: Optional[str] = None
    has_parameters: bool = False
    first_seen: datetime
    last_seen: datetime
    model_config = {"from_attributes": True}


class URLFilter(BaseModel):
    project_id: Optional[int] = None
    classification: Optional[str] = None
    source: Optional[str] = None
    status_code: Optional[int] = None
    method: Optional[str] = None
    has_parameters: Optional[bool] = None
    search: Optional[str] = None


# ── Parameter ────────────────────────────────────────────────────────────────
class ParameterResponse(BaseModel):
    id: int
    project_id: int
    url_id: Optional[int] = None
    name: str
    param_type: str
    sample_value: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Technology ───────────────────────────────────────────────────────────────
class TechnologyResponse(BaseModel):
    id: int
    project_id: int
    host_id: Optional[int] = None
    name: str
    version: Optional[str] = None
    category: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class TechnologySummary(BaseModel):
    name: str
    version: Optional[str] = None
    category: Optional[str] = None
    host_count: int = 0


# ── Finding ──────────────────────────────────────────────────────────────────
class FindingCreate(BaseModel):
    title: str
    severity: str = "info"
    confidence: str = "low"
    target_url: Optional[str] = None
    http_method: Optional[str] = None
    parameter: Optional[str] = None
    detection_source: str = "manual"
    template_id: Optional[str] = None
    description: Optional[str] = None
    evidence: Optional[str] = None
    impact: Optional[str] = None
    remediation: Optional[str] = None


class FindingUpdate(BaseModel):
    severity: Optional[str] = None
    confidence: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    evidence: Optional[str] = None
    impact: Optional[str] = None
    remediation: Optional[str] = None
    ai_analysis: Optional[str] = None


class FindingEvidenceResponse(BaseModel):
    id: int
    finding_id: int
    evidence_type: str
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}


class FindingResponse(BaseModel):
    id: int
    project_id: int
    title: str
    severity: str
    confidence: str
    status: str
    target_url: Optional[str] = None
    http_method: Optional[str] = None
    parameter: Optional[str] = None
    detection_source: Optional[str] = None
    template_id: Optional[str] = None
    description: Optional[str] = None
    evidence: Optional[str] = None
    impact: Optional[str] = None
    remediation: Optional[str] = None
    ai_analysis: Optional[str] = None
    evidences: list[FindingEvidenceResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class FindingFilter(BaseModel):
    project_id: Optional[int] = None
    severity: Optional[str] = None
    confidence: Optional[str] = None
    status: Optional[str] = None
    detection_source: Optional[str] = None
    search: Optional[str] = None


class FindingStats(BaseModel):
    total: int = 0
    by_severity: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_confidence: dict[str, int] = {}
    by_source: dict[str, int] = {}


# ── Job ──────────────────────────────────────────────────────────────────────
class JobResponse(BaseModel):
    id: int
    project_id: int
    job_type: str
    status: str
    stage_order: Optional[int] = None
    command: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    result_count: int = 0
    error_message: Optional[str] = None
    configuration: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class JobLogResponse(BaseModel):
    id: int
    job_id: int
    timestamp: datetime
    level: str
    message: str
    source: Optional[str] = None
    model_config = {"from_attributes": True}


class JobFilter(BaseModel):
    project_id: Optional[int] = None
    status: Optional[str] = None
    job_type: Optional[str] = None


# ── Report ───────────────────────────────────────────────────────────────────
class ReportCreate(BaseModel):
    title: str
    report_type: str = "full"
    format: str = "markdown"


class ReportResponse(BaseModel):
    id: int
    project_id: int
    title: str
    report_type: str
    format: str
    content: Optional[str] = None
    file_path: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── AI ───────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    project_id: int
    conversation_history: list[dict] = []


class ChatResponse(BaseModel):
    response: str
    model_used: str
    tokens_used: Optional[int] = None


class AnalyzeRequest(BaseModel):
    project_id: int
    analysis_type: str = "endpoint_analysis"
    target_data: Optional[dict] = None


class AnalyzeResponse(BaseModel):
    id: int
    analysis_type: str
    results: dict
    model_used: str
    created_at: datetime


class AIStatus(BaseModel):
    available: bool
    model: str
    base_url: str


class AIHypothesis(BaseModel):
    hypothesis: str
    target: str
    confidence: float
    reasoning: str
    recommended_validation: str
    evidence_required: list[str] = []


# ── Tool ─────────────────────────────────────────────────────────────────────
class ToolStatusSchema(BaseModel):
    name: str
    description: str
    category: str
    installed: bool
    version: Optional[str] = None
    path: Optional[str] = None
    is_enabled: bool = True


class ToolStatusList(BaseModel):
    tools: list[ToolStatusSchema]


class ToolConfigUpdate(BaseModel):
    tool_name: str
    custom_path: Optional[str] = None
    is_enabled: Optional[bool] = None
    default_args: Optional[dict] = None


# ── Script ───────────────────────────────────────────────────────────────────
class ScriptResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    filename: str
    script_type: str
    input_type: str
    output_format: str
    is_active: bool
    uploaded_at: datetime
    last_run: Optional[datetime] = None
    model_config = {"from_attributes": True}


class ScriptRunRequest(BaseModel):
    project_id: int
    input_data: Optional[list[str]] = None


class ScriptRunResponse(BaseModel):
    job_id: int
    status: str


# ── Settings ─────────────────────────────────────────────────────────────────
class SettingsResponse(BaseModel):
    ollama_base_url: str
    ollama_model: str
    max_concurrent_jobs: int
    default_rate_limit: int
    default_timeout: int
    upload_dir: str


class SettingsUpdate(BaseModel):
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None
    max_concurrent_jobs: Optional[int] = None
    default_rate_limit: Optional[int] = None
    default_timeout: Optional[int] = None


# ── Recon Pipeline ───────────────────────────────────────────────────────────
class SubdomainConfig(BaseModel):
    recursive: bool = False
    passive_only: bool = True
    sources: list[str] = []


class HttpProbeConfig(BaseModel):
    follow_redirects: bool = True
    tech_detect: bool = True
    status_codes: bool = True
    titles: bool = True


class CrawlConfig(BaseModel):
    depth: int = 3
    js_crawl: bool = True
    robots_txt: bool = True
    sitemap: bool = True
    max_pages: int = 1000


class NucleiConfig(BaseModel):
    severities: list[str] = ["critical", "high", "medium"]
    tags: list[str] = []
    rate_limit: int = 50
    concurrency: int = 10


class FuzzConfig(BaseModel):
    wordlist: Optional[str] = None
    extensions: list[str] = []
    threads: int = 10


class PortScanConfig(BaseModel):
    ports: str = "top-1000"
    rate: int = 1000


class PipelineConfig(BaseModel):
    subdomain: SubdomainConfig = SubdomainConfig()
    http_probe: HttpProbeConfig = HttpProbeConfig()
    crawl: CrawlConfig = CrawlConfig()
    nuclei: NucleiConfig = NucleiConfig()
    fuzz: Optional[FuzzConfig] = None
    port_scan: Optional[PortScanConfig] = None
    enable_ai: bool = True
    selected_tools: list[str] = []


class StageStatus(BaseModel):
    name: str
    status: str = "queued"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    result_count: Optional[int] = None
    error: Optional[str] = None


class PipelineStatus(BaseModel):
    pipeline_id: str
    project_id: int
    status: str = "queued"
    current_stage: Optional[str] = None
    stages: list[StageStatus] = []


class PipelineStartRequest(BaseModel):
    config: Optional[PipelineConfig] = None
