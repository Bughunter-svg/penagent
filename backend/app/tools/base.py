from abc import ABC, abstractmethod
from typing import Callable, Awaitable
import asyncio
import shutil
import json
import re
import os
import logging

logger = logging.getLogger(__name__)


class ReconTool(ABC):
    """Base class for all recon tool integrations."""

    name: str = ""
    description: str = ""
    category: str = ""
    binary_name: str = ""

    def __init__(self, custom_path: str | None = None):
        self.custom_path = custom_path
        self._path: str | None = None
        self._version: str | None = None
        self._installed: bool | None = None

    @property
    def path(self) -> str | None:
        if self._path is None:
            self._path = self.custom_path or shutil.which(self.binary_name)
        return self._path

    @property
    def installed(self) -> bool:
        if self._installed is None:
            self._installed = self.path is not None
        return self._installed

    async def get_version(self) -> str | None:
        if not self.installed:
            return None
        if self._version:
            return self._version
        for flag in ["-version", "--version", "version"]:
            try:
                proc = await asyncio.create_subprocess_exec(
                    self.path, flag,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10)
                output = (stdout or stderr or b"").decode(errors="replace").strip()
                if output:
                    match = re.search(r"v?(\d+\.\d+(?:\.\d+)?)", output)
                    self._version = match.group(0) if match else output[:60]
                    return self._version
            except Exception:
                continue
        return None

    @abstractmethod
    async def run(
        self, targets: list[str], config: dict, output_dir: str,
        on_log: Callable[[str, str], Awaitable[None]] | None = None,
    ) -> list[dict]:
        ...

    @abstractmethod
    def parse_output(self, raw_output: str) -> list[dict]:
        ...

    async def _execute(
        self, cmd: list[str], timeout: int = 300,
        on_log: Callable[[str, str], Awaitable[None]] | None = None,
        stdin_data: str | None = None,
    ) -> tuple[str, str, int]:
        cmd_str = " ".join(cmd)
        if on_log:
            await on_log(f"Executing: {cmd_str}", "info")
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.PIPE if stdin_data else None,
            )
            stdout_data, stderr_data = await asyncio.wait_for(
                proc.communicate(input=stdin_data.encode() if stdin_data else None),
                timeout=timeout,
            )
            stdout = stdout_data.decode(errors="replace") if stdout_data else ""
            stderr = stderr_data.decode(errors="replace") if stderr_data else ""
            returncode = proc.returncode or 0
            if on_log:
                if stderr.strip() and returncode != 0:
                    await on_log(f"stderr: {stderr[:500]}", "warning")
                await on_log(f"Process exited with code {returncode}", "info")
            return stdout, stderr, returncode
        except asyncio.TimeoutError:
            if on_log:
                await on_log(f"Command timed out after {timeout}s", "error")
            try:
                proc.kill()
                await proc.wait()
            except Exception:
                pass
            return "", f"Timeout after {timeout}s", -1
        except FileNotFoundError:
            if on_log:
                await on_log(f"Tool not found: {cmd[0]}", "error")
            return "", f"Tool not found: {cmd[0]}", -1
        except Exception as e:
            if on_log:
                await on_log(f"Execution error: {e}", "error")
            return "", str(e), -1

    def _parse_jsonl(self, raw: str) -> list[dict]:
        results = []
        for line in raw.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                results.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return results

    def _write_targets_file(self, targets: list[str], output_dir: str) -> str:
        path = os.path.join(output_dir, f"{self.name}_targets.txt")
        with open(path, "w") as f:
            f.write("\n".join(targets))
        return path
