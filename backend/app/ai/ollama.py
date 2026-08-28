import json
import logging
from typing import Optional
import httpx as httpx_client

logger = logging.getLogger(__name__)


class OllamaClient:
    """HTTP client for Ollama local LLM API."""

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.1"):
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def is_available(self) -> bool:
        try:
            async with httpx_client.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False

    async def chat(self, messages: list[dict], temperature: float = 0.3) -> dict:
        async with httpx_client.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": temperature},
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def generate(self, prompt: str, temperature: float = 0.3) -> str:
        async with httpx_client.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": temperature},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "")

    async def list_models(self) -> list[dict]:
        try:
            async with httpx_client.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                return data.get("models", [])
        except Exception:
            return []


SYSTEM_PROMPT = """You are a senior security researcher and bug bounty hunter assistant.
You analyze reconnaissance data from authorized bug bounty testing.

RULES:
- Only analyze data from authorized targets within defined scope
- Never claim a vulnerability is confirmed without concrete evidence
- Use cautious language: "Potential", "Suspected", "Needs validation", "Possible"
- Prioritize findings by exploitability and impact
- Recommend safe, non-destructive validation steps
- Group related endpoints by functionality
- Identify interesting attack surfaces and patterns
- Consider false positive possibilities
- Focus on actionable insights

When analyzing endpoints, look for:
- API patterns that suggest authorization weaknesses
- Authentication and session management endpoints
- File upload/download functionality
- Admin panels and debug endpoints
- OAuth/SSO callback handlers
- GraphQL endpoints
- Parameter injection opportunities
- IDOR patterns in resource identifiers
- Open redirect possibilities
- Information disclosure"""

ENDPOINT_ANALYSIS_PROMPT = """Analyze these discovered endpoints from an authorized bug bounty target.
For each interesting endpoint, provide:
1. Classification (API, Auth, Admin, Upload, etc.)
2. Security interest level (High/Medium/Low)
3. Potential vulnerability hypotheses
4. Recommended safe validation steps

Respond in JSON format:
{{"findings": [{{"endpoint": "...", "classification": "...", "interest_level": "...", "hypotheses": [...], "validation_steps": [...]}}]}}

Endpoints:
{endpoints}"""

FINDING_ANALYSIS_PROMPT = """Analyze this vulnerability finding from an authorized bug bounty scan:

Title: {title}
Severity: {severity}
Target: {target_url}
Detection Source: {detection_source}
Description: {description}
Evidence: {evidence}

Provide:
1. Confidence assessment (how likely is this a true positive?)
2. Potential impact analysis
3. False positive considerations
4. Recommended validation steps
5. Remediation suggestions
6. Related attack vectors to investigate

Respond in JSON format:
{{"confidence": 0.0-1.0, "impact_analysis": "...", "false_positive_risk": "...", "validation_steps": [...], "remediation": "...", "related_vectors": [...]}}"""

SURFACE_ANALYSIS_PROMPT = """Analyze this attack surface summary from an authorized bug bounty target:

Subdomains: {subdomains}
Live Hosts: {live_hosts}
Technologies: {technologies}
URLs: {url_count}
Parameters: {param_count}
Key Endpoints: {key_endpoints}

Provide a comprehensive attack surface analysis:
1. Most interesting targets for manual testing
2. Technology-specific vulnerabilities to look for
3. Attack surface areas to prioritize
4. Patterns suggesting security weaknesses

Respond in JSON format:
{{"priority_targets": [...], "tech_vulnerabilities": [...], "priority_areas": [...], "patterns": [...], "recommendations": [...]}}"""

CHAT_CONTEXT_PROMPT = """You are analyzing data for bug bounty project: {project_name}
Target: {target}
Scope: {scope}

Project statistics:
- Subdomains: {subdomains}
- Live Hosts: {live_hosts}
- URLs: {urls}
- Parameters: {parameters}
- Findings: {findings}

Answer the user's question based on the project data available."""


class AIAnalyzer:
    """AI-powered security analysis using Ollama."""

    def __init__(self, client: OllamaClient):
        self.client = client

    async def analyze_endpoints(self, endpoints: list[dict], project_context: dict) -> list[dict]:
        if not await self.client.is_available():
            return []
        endpoints_text = json.dumps(endpoints[:50], indent=2)
        prompt = ENDPOINT_ANALYSIS_PROMPT.format(endpoints=endpoints_text)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        try:
            response = await self.client.chat(messages)
            content = response.get("message", {}).get("content", "")
            try:
                data = json.loads(content)
                return data.get("findings", [])
            except json.JSONDecodeError:
                return [{"raw_analysis": content}]
        except Exception as e:
            logger.error(f"AI endpoint analysis failed: {e}")
            return []

    async def analyze_finding(self, finding: dict, context: dict) -> dict:
        if not await self.client.is_available():
            return {"error": "AI unavailable"}
        prompt = FINDING_ANALYSIS_PROMPT.format(**finding)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        try:
            response = await self.client.chat(messages)
            content = response.get("message", {}).get("content", "")
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"raw_analysis": content}
        except Exception as e:
            logger.error(f"AI finding analysis failed: {e}")
            return {"error": str(e)}

    async def analyze_attack_surface(self, project_data: dict) -> dict:
        if not await self.client.is_available():
            return {"error": "AI unavailable"}
        prompt = SURFACE_ANALYSIS_PROMPT.format(**project_data)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        try:
            response = await self.client.chat(messages)
            content = response.get("message", {}).get("content", "")
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"raw_analysis": content}
        except Exception as e:
            logger.error(f"AI surface analysis failed: {e}")
            return {"error": str(e)}

    async def prioritize_findings(self, findings: list[dict]) -> list[dict]:
        if not findings:
            return findings
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        confidence_order = {"high": 0, "medium": 1, "low": 2}
        return sorted(findings, key=lambda f: (
            severity_order.get(f.get("severity", "info"), 5),
            confidence_order.get(f.get("confidence", "low"), 3),
        ))


class AIChatService:
    """Chat service for AI assistant."""

    def __init__(self, client: OllamaClient):
        self.client = client

    async def chat(self, message: str, project_id: int, db, history: list[dict] | None = None) -> dict:
        from sqlalchemy import select, func
        from app.models import Project, Target, Asset, Host, URLModel, Parameter, Finding

        # Load project context
        project = await db.get(Project, project_id)
        if not project:
            return {"response": "Project not found", "model_used": self.client.model}

        targets_result = await db.execute(select(Target).where(Target.project_id == project_id))
        targets = [t.target for t in targets_result.scalars().all()]

        sub_count = (await db.execute(
            select(func.count(Asset.id)).where(Asset.project_id == project_id)
        )).scalar() or 0
        host_count = (await db.execute(
            select(func.count(Host.id)).where(Host.project_id == project_id)
        )).scalar() or 0
        url_count = (await db.execute(
            select(func.count(URLModel.id)).where(URLModel.project_id == project_id)
        )).scalar() or 0
        param_count = (await db.execute(
            select(func.count(Parameter.id)).where(Parameter.project_id == project_id)
        )).scalar() or 0
        finding_count = (await db.execute(
            select(func.count(Finding.id)).where(Finding.project_id == project_id)
        )).scalar() or 0

        context = CHAT_CONTEXT_PROMPT.format(
            project_name=project.name,
            target=", ".join(targets),
            scope="Active",
            subdomains=sub_count,
            live_hosts=host_count,
            urls=url_count,
            parameters=param_count,
            findings=finding_count,
        )

        messages = [{"role": "system", "content": SYSTEM_PROMPT + "\n\n" + context}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": message})

        if not await self.client.is_available():
            return {
                "response": "AI is currently unavailable. Please check that Ollama is running.",
                "model_used": self.client.model,
                "tokens_used": 0,
            }

        try:
            response = await self.client.chat(messages)
            content = response.get("message", {}).get("content", "No response generated.")
            tokens = response.get("eval_count", 0)
            return {
                "response": content,
                "model_used": self.client.model,
                "tokens_used": tokens,
            }
        except Exception as e:
            logger.error(f"AI chat failed: {e}")
            return {"response": f"AI error: {str(e)}", "model_used": self.client.model, "tokens_used": 0}
