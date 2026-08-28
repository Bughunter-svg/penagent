from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
import json

from app.database import get_db
from app.models import (
    Project, Target, ScopeRule, Asset, Host, URLModel, Parameter, Technology,
    Job, JobLog, Finding, FindingEvidence, ToolConfig, CustomScript
)
from app.schemas import (
    ProjectCreate, ProjectResponse, ProjectUpdate, ProjectStats,
    TargetCreate, TargetResponse, ScopeRuleCreate, ScopeRuleResponse, ScopeStatus, ScopeValidateRequest, ScopeValidateResponse,
    AssetResponse, AssetFilter, AssetStats,
    HostResponse, HostFilter,
    URLResponse, URLFilter,
    FindingResponse, FindingCreate, FindingUpdate, FindingFilter,
    JobResponse, JobLogResponse, JobFilter,
    PipelineStartRequest, PipelineStatus, PipelineConfig,
    ToolStatusList, ToolConfigUpdate,
    SettingsResponse, SettingsUpdate,
    ChatRequest, ChatResponse, AnalyzeRequest, AnalyzeResponse, AIStatus
)
from app.scope.engine import ScopeEngine
from app.pipeline.orchestrator import start_pipeline, get_pipeline, get_pipeline_by_project
from app.tools.detector import ToolDetector
from app.ai.ollama import OllamaClient, AIChatService, AIAnalyzer
from app.config import get_settings

router = APIRouter()

# --- Projects ---
@router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, db: AsyncSession = Depends(get_db)):
    db_project = Project(name=project.name, description=project.description)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    
    for t in project.targets:
        db.add(Target(project_id=db_project.id, target=t))
    for inc in project.scope_includes:
        db.add(ScopeRule(project_id=db_project.id, rule_type="include", pattern=inc))
    for exc in project.scope_excludes:
        db.add(ScopeRule(project_id=db_project.id, rule_type="exclude", pattern=exc))
    
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project))
    return result.scalars().all()

@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Get stats
    stats = ProjectStats(
        subdomains=(await db.execute(select(func.count(Asset.id)).where(Asset.project_id == project_id))).scalar() or 0,
        live_hosts=(await db.execute(select(func.count(Host.id)).where(Host.project_id == project_id))).scalar() or 0,
        urls=(await db.execute(select(func.count(URLModel.id)).where(URLModel.project_id == project_id))).scalar() or 0,
        parameters=(await db.execute(select(func.count(Parameter.id)).where(Parameter.project_id == project_id))).scalar() or 0,
        technologies=(await db.execute(select(func.count(Technology.id)).where(Technology.project_id == project_id))).scalar() or 0,
        findings=(await db.execute(select(func.count(Finding.id)).where(Finding.project_id == project_id))).scalar() or 0,
        high_confidence=(await db.execute(select(func.count(Finding.id)).where(Finding.project_id == project_id, Finding.confidence == "high"))).scalar() or 0,
    )
    
    project_dict = {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "targets": [{"id": t.id, "project_id": t.project_id, "target": t.target, "target_type": t.target_type, "is_primary": t.is_primary, "created_at": t.created_at} for t in project.targets],
        "scope_rules": [{"id": r.id, "project_id": r.project_id, "rule_type": r.rule_type, "pattern": r.pattern, "created_at": r.created_at} for r in project.scope_rules],
        "stats": stats
    }
    return project_dict

@router.delete("/projects/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404)
    await db.delete(project)
    await db.commit()
    return {"status": "deleted"}

# --- Scope ---
@router.get("/projects/{project_id}/scope", response_model=ScopeStatus)
async def get_scope(project_id: int, db: AsyncSession = Depends(get_db)):
    engine = await ScopeEngine.from_project(db, project_id)
    assets = (await db.execute(select(func.count(Asset.id)).where(Asset.project_id == project_id))).scalar() or 0
    in_scope = (await db.execute(select(func.count(Asset.id)).where(Asset.project_id == project_id, Asset.in_scope == True))).scalar() or 0
    return ScopeStatus(
        is_active=engine.is_active,
        include_count=len(engine.include_patterns),
        exclude_count=len(engine.exclude_patterns),
        total_assets=assets,
        in_scope_assets=in_scope,
        out_of_scope_assets=assets - in_scope
    )

@router.post("/projects/{project_id}/scope", response_model=ScopeRuleResponse)
async def add_scope_rule(project_id: int, rule: ScopeRuleCreate, db: AsyncSession = Depends(get_db)):
    db_rule = ScopeRule(project_id=project_id, rule_type=rule.rule_type, pattern=rule.pattern)
    db.add(db_rule)
    await db.commit()
    await db.refresh(db_rule)
    return db_rule

@router.post("/projects/{project_id}/scope/validate", response_model=ScopeValidateResponse)
async def validate_scope(project_id: int, req: ScopeValidateRequest, db: AsyncSession = Depends(get_db)):
    engine = await ScopeEngine.from_project(db, project_id)
    in_scope = engine.is_in_scope(req.target)
    return ScopeValidateResponse(target=req.target, in_scope=in_scope)

# --- Recon Pipeline ---
@router.post("/projects/{project_id}/recon/start", response_model=PipelineStatus)
async def start_recon(project_id: int, req: PipelineStartRequest, db: AsyncSession = Depends(get_db)):
    config = req.config if req and req.config else PipelineConfig()
    pid = await start_pipeline(project_id, config, db)
    return get_pipeline(pid).get_status()

@router.get("/projects/{project_id}/recon/status", response_model=PipelineStatus)
async def get_recon_status(project_id: int):
    orch = get_pipeline_by_project(project_id)
    if orch:
        return orch.get_status()
    return PipelineStatus(pipeline_id="", project_id=project_id, status="idle")

@router.post("/recon/{pipeline_id}/cancel")
async def cancel_recon(pipeline_id: str):
    orch = get_pipeline(pipeline_id)
    if orch:
        await orch.cancel()
        return {"status": "cancelling"}
    raise HTTPException(status_code=404)

# --- Jobs ---
@router.get("/projects/{project_id}/jobs", response_model=List[JobResponse])
async def list_jobs(project_id: int, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.project_id == project_id).order_by(Job.id.desc()).limit(limit))
    return result.scalars().all()

@router.get("/jobs/{job_id}/logs", response_model=List[JobLogResponse])
async def get_job_logs(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobLog).where(JobLog.job_id == job_id).order_by(JobLog.id.asc()))
    return result.scalars().all()

# --- Assets ---
@router.get("/projects/{project_id}/assets", response_model=List[AssetResponse])
async def list_assets(project_id: int, type: Optional[str] = None, limit: int = 100, db: AsyncSession = Depends(get_db)):
    q = select(Asset).where(Asset.project_id == project_id)
    if type: q = q.where(Asset.asset_type == type)
    result = await db.execute(q.limit(limit))
    return result.scalars().all()

@router.get("/projects/{project_id}/hosts", response_model=List[HostResponse])
async def list_hosts(project_id: int, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Host).where(Host.project_id == project_id).limit(limit))
    return result.scalars().all()

@router.get("/projects/{project_id}/urls", response_model=List[URLResponse])
async def list_urls(project_id: int, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(URLModel).where(URLModel.project_id == project_id).limit(limit))
    return result.scalars().all()

# --- Findings ---
@router.get("/projects/{project_id}/findings", response_model=List[FindingResponse])
async def list_findings(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Finding).where(Finding.project_id == project_id))
    return result.scalars().all()

@router.post("/projects/{project_id}/findings", response_model=FindingResponse)
async def create_finding(project_id: int, finding: FindingCreate, db: AsyncSession = Depends(get_db)):
    db_finding = Finding(project_id=project_id, **finding.model_dump())
    db.add(db_finding)
    await db.commit()
    await db.refresh(db_finding)
    return db_finding

# --- Tools ---
@router.get("/tools/status", response_model=ToolStatusList)
async def get_tool_status(db: AsyncSession = Depends(get_db)):
    # Load custom paths from DB
    result = await db.execute(select(ToolConfig))
    configs = {c.tool_name: c.custom_path for c in result.scalars().all() if c.custom_path}
    
    status = await ToolDetector.detect_all(configs)
    return ToolStatusList(tools=status)

# --- AI ---
@router.get("/ai/status", response_model=AIStatus)
async def get_ai_status():
    settings = get_settings()
    client = OllamaClient(settings.OLLAMA_BASE_URL, settings.OLLAMA_MODEL)
    avail = await client.is_available()
    return AIStatus(available=avail, model=settings.OLLAMA_MODEL, base_url=settings.OLLAMA_BASE_URL)

@router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    client = OllamaClient(settings.OLLAMA_BASE_URL, settings.OLLAMA_MODEL)
    service = AIChatService(client)
    res = await service.chat(req.message, req.project_id, db, req.conversation_history)
    return ChatResponse(**res)
