import logging
from typing import Optional
from app.tools.base import ReconTool
from app.tools.all_tools import (
    SubfinderTool, HttpxTool, KatanaTool, NucleiTool, NaabuTool,
    FfufTool, DnsxTool, AmassTool, DalfoxTool, GauTool,
    WaybackurlsTool, GospiderTool, HakrawlerTool, ParamspiderTool,
    Sublist3rTool, MasscanTool, RustscanTool, DirsearchTool,
    ArjunTool, GfTool, CustomScriptRunner,
)

logger = logging.getLogger(__name__)

TOOL_REGISTRY: dict[str, type[ReconTool]] = {
    "subfinder": SubfinderTool,
    "httpx": HttpxTool,
    "katana": KatanaTool,
    "nuclei": NucleiTool,
    "naabu": NaabuTool,
    "ffuf": FfufTool,
    "dnsx": DnsxTool,
    "amass": AmassTool,
    "dalfox": DalfoxTool,
    "gau": GauTool,
    "waybackurls": WaybackurlsTool,
    "gospider": GospiderTool,
    "hakrawler": HakrawlerTool,
    "paramspider": ParamspiderTool,
    "sublist3r": Sublist3rTool,
    "masscan": MasscanTool,
    "rustscan": RustscanTool,
    "dirsearch": DirsearchTool,
    "arjun": ArjunTool,
    "gf": GfTool,
}


class ToolDetector:
    """Detects installed security tools and manages tool instances."""

    @classmethod
    async def detect_all(cls, custom_paths: Optional[dict[str, str]] = None) -> list[dict]:
        custom_paths = custom_paths or {}
        results = []
        for name, tool_cls in TOOL_REGISTRY.items():
            tool = tool_cls(custom_path=custom_paths.get(name))
            version = await tool.get_version()
            results.append({
                "name": name,
                "description": tool.description,
                "category": tool.category,
                "installed": tool.installed,
                "version": version,
                "path": tool.path,
                "is_enabled": True,
            })
        return results

    @classmethod
    def get_tool(cls, name: str, custom_path: Optional[str] = None) -> Optional[ReconTool]:
        tool_cls = TOOL_REGISTRY.get(name)
        if tool_cls is None:
            return None
        return tool_cls(custom_path=custom_path)

    @classmethod
    def get_available_tools(cls, custom_paths: Optional[dict[str, str]] = None) -> list[ReconTool]:
        custom_paths = custom_paths or {}
        available = []
        for name, tool_cls in TOOL_REGISTRY.items():
            tool = tool_cls(custom_path=custom_paths.get(name))
            if tool.installed:
                available.append(tool)
        return available

    @classmethod
    def get_all_tool_names(cls) -> list[str]:
        return list(TOOL_REGISTRY.keys())
