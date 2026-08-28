from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, UniqueConstraint, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    targets = relationship("Target", back_populates="project", cascade="all, delete-orphan")
    scope_rules = relationship("ScopeRule", back_populates="project", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="project", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")


class Target(Base):
    __tablename__ = "targets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    target = Column(String(512), nullable=False)
    target_type = Column(String(50), default="domain")
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    project = relationship("Project", back_populates="targets")


class ScopeRule(Base):
    __tablename__ = "scope_rules"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    rule_type = Column(String(50), nullable=False)
    pattern = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    project = relationship("Project", back_populates="scope_rules")


class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    asset_type = Column(String(50), default="subdomain")
    value = Column(String(512), nullable=False)
    source = Column(String(100), nullable=True)
    in_scope = Column(Boolean, default=True)
    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint("project_id", "asset_type", "value", name="uq_asset"),)


class Host(Base):
    __tablename__ = "hosts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    hostname = Column(String(512), nullable=False)
    ip_address = Column(String(45), nullable=True)
    port = Column(Integer, default=443)
    scheme = Column(String(10), default="https")
    status_code = Column(Integer, nullable=True)
    title = Column(String(1024), nullable=True)
    content_length = Column(Integer, nullable=True)
    web_server = Column(String(255), nullable=True)
    response_time = Column(Float, nullable=True)
    redirect_url = Column(String(2048), nullable=True)
    is_alive = Column(Boolean, default=False)
    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    urls = relationship("URLModel", back_populates="host", cascade="all, delete-orphan")
    technologies = relationship("Technology", back_populates="host", cascade="all, delete-orphan")


class URLModel(Base):
    __tablename__ = "urls"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    host_id = Column(Integer, ForeignKey("hosts.id"), nullable=True)
    url = Column(String(4096), nullable=False)
    path = Column(String(2048), nullable=True)
    method = Column(String(10), default="GET")
    status_code = Column(Integer, nullable=True)
    content_type = Column(String(255), nullable=True)
    source = Column(String(100), nullable=True)
    classification = Column(String(100), nullable=True)
    has_parameters = Column(Boolean, default=False)
    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    host = relationship("Host", back_populates="urls")
    parameters = relationship("Parameter", back_populates="url_record", cascade="all, delete-orphan")


class Parameter(Base):
    __tablename__ = "parameters"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    url_id = Column(Integer, ForeignKey("urls.id"), nullable=True)
    name = Column(String(512), nullable=False)
    param_type = Column(String(50), default="query")
    sample_value = Column(String(2048), nullable=True)
    source = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    url_record = relationship("URLModel", back_populates="parameters")


class Technology(Base):
    __tablename__ = "technologies"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    host_id = Column(Integer, ForeignKey("hosts.id"), nullable=True)
    name = Column(String(255), nullable=False)
    version = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    host = relationship("Host", back_populates="technologies")


class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    job_type = Column(String(100), nullable=False)
    status = Column(String(50), default="queued")
    stage_order = Column(Integer, nullable=True)
    command = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    result_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    configuration = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    project = relationship("Project", back_populates="jobs")
    logs = relationship("JobLog", back_populates="job", cascade="all, delete-orphan")


class JobLog(Base):
    __tablename__ = "job_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    level = Column(String(20), default="info")
    message = Column(Text, nullable=False)
    source = Column(String(100), nullable=True)
    job = relationship("Job", back_populates="logs")


class Finding(Base):
    __tablename__ = "findings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(1024), nullable=False)
    severity = Column(String(20), default="info")
    confidence = Column(String(20), default="low")
    status = Column(String(50), default="new")
    target_url = Column(String(4096), nullable=True)
    http_method = Column(String(10), nullable=True)
    parameter = Column(String(512), nullable=True)
    detection_source = Column(String(100), nullable=True)
    template_id = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    impact = Column(Text, nullable=True)
    remediation = Column(Text, nullable=True)
    ai_analysis = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    project = relationship("Project", back_populates="findings")
    evidences = relationship("FindingEvidence", back_populates="finding", cascade="all, delete-orphan")


class FindingEvidence(Base):
    __tablename__ = "finding_evidence"
    id = Column(Integer, primary_key=True, autoincrement=True)
    finding_id = Column(Integer, ForeignKey("findings.id"), nullable=False)
    evidence_type = Column(String(50), default="output")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    finding = relationship("Finding", back_populates="evidences")


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    analysis_type = Column(String(50), nullable=False)
    input_data = Column(Text, nullable=True)
    output_data = Column(Text, nullable=True)
    model_used = Column(String(255), nullable=True)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(512), nullable=False)
    report_type = Column(String(50), default="full")
    format = Column(String(20), default="markdown")
    content = Column(Text, nullable=True)
    file_path = Column(String(1024), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    project = relationship("Project", back_populates="reports")


class CustomScript(Base):
    __tablename__ = "custom_scripts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    filename = Column(String(512), nullable=False)
    file_path = Column(String(1024), nullable=False)
    script_type = Column(String(20), default="python")
    input_type = Column(String(50), default="domains")
    output_format = Column(String(50), default="text")
    is_active = Column(Boolean, default=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_run = Column(DateTime, nullable=True)


class ToolConfig(Base):
    __tablename__ = "tool_configs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tool_name = Column(String(100), unique=True, nullable=False)
    custom_path = Column(String(1024), nullable=True)
    is_enabled = Column(Boolean, default=True)
    default_args = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
