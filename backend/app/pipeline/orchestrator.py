import asyncio
import uuid
from datetime import datetime, timezone
from typing import Callable, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.models import Project, Job, JobLog, Asset, Host, URLModel, Target
from app.scope.engine import ScopeEngine
from app.tools.detector import ToolDetector
from app.config import get_settings
from app.schemas import PipelineConfig, PipelineStatus, StageStatus

logger = logging.getLogger(__name__)

class PipelineOrchestrator:
    """Manages the execution of the recon pipeline."""
    
    STAGE_ORDER = [
        'scope_check',
        'subdomain_enumeration',
        'dns_resolution',
        'port_scanning',
        'http_probing',
        'url_discovery',
        'web_crawling',
        'directory_fuzzing',
        'parameter_discovery',
        'endpoint_analysis',
        'vulnerability_scanning',
        'xss_scanning',
        'pattern_matching',
        'custom_scripts',
        'result_normalization',
        'ai_analysis',
        'finding_prioritization',
        'report_generation',
    ]

    def __init__(self, project_id: int, config: PipelineConfig):
        self.pipeline_id = str(uuid.uuid4())
        self.project_id = project_id
        self.config = config
        self.status = "queued"
        self.current_stage = None
        self.stages = {s: StageStatus(name=s) for s in self.STAGE_ORDER}
        self._cancel_event = asyncio.Event()
        self._pause_event = asyncio.Event()
        self._pause_event.set()

    async def _log(self, db: AsyncSession, job_id: int, message: str, level: str = 'info'):
        log_entry = JobLog(job_id=job_id, message=message, level=level)
        db.add(log_entry)
        await db.commit()

    async def _create_job(self, db: AsyncSession, stage: str) -> Job:
        job = Job(
            project_id=self.project_id,
            job_type=stage,
            status="running",
            started_at=datetime.now(timezone.utc)
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    async def _update_job(self, db: AsyncSession, job: Job, status: str, error: str = None, results: int = 0):
        job.status = status
        job.completed_at = datetime.now(timezone.utc)
        if job.started_at:
             job.duration_seconds = (job.completed_at - job.started_at).total_seconds()
        job.error_message = error
        job.result_count = results
        await db.commit()

    async def cancel(self):
        self._cancel_event.set()
        self.status = "cancelled"

    async def pause(self):
        self._pause_event.clear()
        self.status = "paused"

    async def resume(self):
        self._pause_event.set()
        self.status = "running"
        
    def get_status(self) -> PipelineStatus:
        return PipelineStatus(
            pipeline_id=self.pipeline_id,
            project_id=self.project_id,
            status=self.status,
            current_stage=self.current_stage,
            stages=list(self.stages.values())
        )

    async def start(self, db: AsyncSession):
        self.status = "running"
        
        # Load scope
        scope_engine = await ScopeEngine.from_project(db, self.project_id)
        
        # Get targets
        result = await db.execute(select(Target).where(Target.project_id == self.project_id))
        targets = [t.target for t in result.scalars().all()]
        
        if not targets:
            self.status = "failed"
            return
            
        current_data = {"targets": targets}
        
        for idx, stage_name in enumerate(self.STAGE_ORDER):
            if self._cancel_event.is_set():
                break
                
            await self._pause_event.wait()
            
            self.current_stage = stage_name
            stage_status = self.stages[stage_name]
            stage_status.status = "running"
            stage_status.started_at = datetime.now(timezone.utc)
            
            job = await self._create_job(db, stage_name)
            
            try:
                # Stage execution mapping (simplified for now, actual implementation would call specific functions)
                await self._log(db, job.id, f"Starting stage: {stage_name}")
                
                # Mock execution delay
                await asyncio.sleep(1)
                
                # This is where we would call the actual stage functions
                # result = await run_stage(stage_name, scope_engine, self.config, current_data, db, job.id, self._log)
                result_count = 0 
                
                stage_status.status = "completed"
                await self._update_job(db, job, "completed", results=result_count)
                
            except Exception as e:
                logger.exception(f"Stage {stage_name} failed")
                stage_status.status = "failed"
                stage_status.error = str(e)
                await self._update_job(db, job, "failed", error=str(e))
                # Depending on stage, might break or continue
                
            finally:
                stage_status.completed_at = datetime.now(timezone.utc)
                if stage_status.started_at:
                    stage_status.duration_seconds = (stage_status.completed_at - stage_status.started_at).total_seconds()
                    
        if not self._cancel_event.is_set():
            self.status = "completed"


_running_pipelines: dict[str, PipelineOrchestrator] = {}

async def start_pipeline(project_id: int, config: PipelineConfig, db: AsyncSession) -> str:
    orch = PipelineOrchestrator(project_id, config)
    _running_pipelines[orch.pipeline_id] = orch
    # In a real app, this would be submitted to a background worker queue
    # Using asyncio.create_task for simplicity in this implementation
    asyncio.create_task(orch.start(db))
    return orch.pipeline_id

def get_pipeline(pipeline_id: str) -> PipelineOrchestrator | None:
    return _running_pipelines.get(pipeline_id)

def get_pipeline_by_project(project_id: int) -> PipelineOrchestrator | None:
    # Get most recent active pipeline for project
    for orch in _running_pipelines.values():
        if orch.project_id == project_id and orch.status in ['running', 'queued', 'paused']:
            return orch
    return None
