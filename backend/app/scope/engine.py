import re
import ipaddress
import logging
from urllib.parse import urlparse
from typing import Optional

logger = logging.getLogger(__name__)


class ScopeEngine:
    """Validates targets against project scope rules. Critical safety component."""

    def __init__(self, include_patterns: list[str], exclude_patterns: list[str]):
        self.include_patterns = [p.lower().strip() for p in include_patterns if p.strip()]
        self.exclude_patterns = [p.lower().strip() for p in exclude_patterns if p.strip()]
        self._rejected_log: list[dict] = []

    def normalize_hostname(self, target: str) -> str:
        target = target.strip().lower()
        if "://" in target:
            parsed = urlparse(target)
            hostname = parsed.hostname or ""
        else:
            hostname = target.split(":")[0].split("/")[0]
        hostname = hostname.rstrip(".")
        return hostname

    def _match_pattern(self, hostname: str, pattern: str) -> bool:
        if not hostname or not pattern:
            return False
        if hostname == pattern:
            return True
        if pattern.startswith("*."):
            suffix = pattern[1:]
            return hostname.endswith(suffix) or hostname == pattern[2:]
        return False

    def is_in_scope(self, target: str) -> bool:
        hostname = self.normalize_hostname(target)
        if not hostname:
            self._log_rejection(target, "Invalid hostname")
            return False
        for pattern in self.exclude_patterns:
            if self._match_pattern(hostname, pattern):
                self._log_rejection(target, f"Excluded by pattern: {pattern}")
                return False
        for pattern in self.include_patterns:
            if self._match_pattern(hostname, pattern):
                return True
        self._log_rejection(target, "No matching include pattern")
        return False

    def filter_targets(self, targets: list[str]) -> tuple[list[str], list[str]]:
        in_scope, out_of_scope = [], []
        for t in targets:
            (in_scope if self.is_in_scope(t) else out_of_scope).append(t)
        if out_of_scope:
            logger.warning(f"Scope filtered {len(out_of_scope)} out-of-scope targets")
        return in_scope, out_of_scope

    def _log_rejection(self, target: str, reason: str):
        self._rejected_log.append({"target": target, "reason": reason})
        logger.info(f"Scope rejection: {target} - {reason}")

    @property
    def rejected_targets(self) -> list[dict]:
        return list(self._rejected_log)

    def clear_rejection_log(self):
        self._rejected_log.clear()

    @property
    def is_active(self) -> bool:
        return len(self.include_patterns) > 0

    @classmethod
    async def from_project(cls, db, project_id: int) -> "ScopeEngine":
        from sqlalchemy import select
        from app.models import ScopeRule
        result = await db.execute(select(ScopeRule).where(ScopeRule.project_id == project_id))
        rules = result.scalars().all()
        includes = [r.pattern for r in rules if r.rule_type == "include"]
        excludes = [r.pattern for r in rules if r.rule_type == "exclude"]
        return cls(includes, excludes)


def validate_target(target: str) -> bool:
    target = target.strip()
    if not target:
        return False
    if is_valid_domain(target):
        return True
    if is_valid_ip(target):
        return True
    try:
        parsed = urlparse(target if "://" in target else f"https://{target}")
        return bool(parsed.hostname)
    except Exception:
        return False


def parse_target(target: str) -> dict:
    target = target.strip()
    is_url = "://" in target
    if not is_url:
        target_url = f"https://{target}"
    else:
        target_url = target
    parsed = urlparse(target_url)
    return {
        "hostname": parsed.hostname or "",
        "port": parsed.port,
        "scheme": parsed.scheme,
        "path": parsed.path or "/",
        "is_url": is_url,
        "is_ip": is_valid_ip(parsed.hostname or ""),
    }


def is_valid_domain(domain: str) -> bool:
    domain = domain.strip().lower().rstrip(".")
    if not domain or len(domain) > 253:
        return False
    pattern = r"^(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)*[a-z]{2,}$"
    return bool(re.match(pattern, domain))


def is_valid_ip(ip: str) -> bool:
    try:
        ipaddress.ip_address(ip)
        return True
    except (ValueError, TypeError):
        return False


def normalize_url(url: str) -> str:
    url = url.strip()
    if not url:
        return url
    if "://" not in url:
        url = f"https://{url}"
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower().rstrip(".")
    port = parsed.port
    scheme = parsed.scheme.lower()
    path = parsed.path or "/"
    default_ports = {"http": 80, "https": 443}
    if port and port == default_ports.get(scheme):
        port = None
    netloc = hostname
    if port:
        netloc = f"{hostname}:{port}"
    return f"{scheme}://{netloc}{path}"
