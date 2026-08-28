import os
from app.tools.base import ReconTool


class SubfinderTool(ReconTool):
    name = "subfinder"
    description = "Fast passive subdomain enumeration"
    category = "enumeration"
    binary_name = "subfinder"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("subfinder not installed, skipping", "warning")
            return []
        all_results = []
        for target in targets:
            cmd = [self.path, "-d", target, "-json", "-silent"]
            if config.get("recursive"):
                cmd.append("-recursive")
            stdout, stderr, code = await self._execute(cmd, config.get("timeout", 300), on_log)
            results = self.parse_output(stdout)
            all_results.extend(results)
            if on_log:
                await on_log(f"subfinder found {len(results)} subdomains for {target}", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        for item in self._parse_jsonl(raw_output):
            host = item.get("host", "").strip()
            if host:
                results.append({
                    "subdomain": host,
                    "source": ",".join(item.get("sources", item.get("source", ["subfinder"]))),
                    "input": item.get("input", ""),
                })
        return results


class HttpxTool(ReconTool):
    name = "httpx"
    description = "HTTP probing and technology detection"
    category = "probing"
    binary_name = "httpx"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("httpx not installed, skipping", "warning")
            return []
        targets_file = self._write_targets_file(targets, output_dir)
        cmd = [self.path, "-l", targets_file, "-json", "-silent"]
        if config.get("follow_redirects", True):
            cmd.append("-follow-redirects")
        if config.get("tech_detect", True):
            cmd.append("-tech-detect")
        if config.get("status_codes", True):
            cmd.append("-status-code")
        if config.get("titles", True):
            cmd.append("-title")
        cmd.extend(["-content-length", "-web-server"])
        stdout, stderr, code = await self._execute(cmd, config.get("timeout", 600), on_log)
        results = self.parse_output(stdout)
        if on_log:
            await on_log(f"httpx probed {len(results)} live hosts", "info")
        return results

    def parse_output(self, raw_output):
        results = []
        for item in self._parse_jsonl(raw_output):
            results.append({
                "url": item.get("url", ""),
                "status_code": item.get("status_code", item.get("status-code")),
                "title": item.get("title", ""),
                "tech": item.get("tech", []),
                "web_server": item.get("webserver", item.get("web_server", "")),
                "content_length": item.get("content_length", item.get("content-length")),
                "host": item.get("host", ""),
                "scheme": item.get("scheme", "https"),
                "port": item.get("port", ""),
                "final_url": item.get("final_url", item.get("final-url", "")),
                "response_time": item.get("response_time", item.get("response-time", "")),
                "ip": item.get("a", item.get("host", "")),
            })
        return results


class KatanaTool(ReconTool):
    name = "katana"
    description = "Next-generation web crawling and spidering"
    category = "crawling"
    binary_name = "katana"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("katana not installed, skipping", "warning")
            return []
        targets_file = self._write_targets_file(targets, output_dir)
        cmd = [self.path, "-list", targets_file, "-jsonl", "-silent"]
        depth = config.get("depth", 3)
        cmd.extend(["-depth", str(depth)])
        if config.get("js_crawl", True):
            cmd.append("-js-crawl")
        max_pages = config.get("max_pages", 1000)
        cmd.extend(["-crawl-duration", "300"])
        stdout, stderr, code = await self._execute(cmd, config.get("timeout", 600), on_log)
        results = self.parse_output(stdout)
        if on_log:
            await on_log(f"katana crawled {len(results)} URLs", "info")
        return results

    def parse_output(self, raw_output):
        results = []
        for item in self._parse_jsonl(raw_output):
            req = item.get("request", {})
            endpoint = req.get("endpoint", item.get("url", ""))
            if endpoint:
                results.append({
                    "url": endpoint,
                    "method": req.get("method", "GET"),
                    "source": "katana",
                    "tag": req.get("tag", ""),
                    "attribute": req.get("attribute", ""),
                })
        # Also handle plain-text output lines
        for line in raw_output.strip().splitlines():
            line = line.strip()
            if line and not line.startswith("{") and line.startswith("http"):
                results.append({"url": line, "method": "GET", "source": "katana"})
        return results


class NucleiTool(ReconTool):
    name = "nuclei"
    description = "Vulnerability scanner with community-powered templates"
    category = "scanning"
    binary_name = "nuclei"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("nuclei not installed, skipping", "warning")
            return []
        targets_file = self._write_targets_file(targets, output_dir)
        sevs = ",".join(config.get("severities", ["critical", "high", "medium"]))
        cmd = [self.path, "-l", targets_file, "-jsonl", "-silent", "-severity", sevs]
        rate = config.get("rate_limit", 50)
        conc = config.get("concurrency", 10)
        cmd.extend(["-rate-limit", str(rate), "-concurrency", str(conc)])
        tags = config.get("tags", [])
        if tags:
            cmd.extend(["-tags", ",".join(tags)])
        stdout, stderr, code = await self._execute(cmd, config.get("timeout", 1200), on_log)
        results = self.parse_output(stdout)
        if on_log:
            await on_log(f"nuclei found {len(results)} vulnerabilities", "info")
        return results

    def parse_output(self, raw_output):
        results = []
        for item in self._parse_jsonl(raw_output):
            info = item.get("info", {})
            results.append({
                "template_id": item.get("template-id", item.get("templateID", "")),
                "name": info.get("name", ""),
                "severity": info.get("severity", "info"),
                "description": info.get("description", ""),
                "tags": info.get("tags", []),
                "reference": info.get("reference", []),
                "host": item.get("host", ""),
                "matched_at": item.get("matched-at", item.get("matched", "")),
                "type": item.get("type", "http"),
                "extracted_results": item.get("extracted-results", []),
                "curl_command": item.get("curl-command", ""),
            })
        return results


class NaabuTool(ReconTool):
    name = "naabu"
    description = "Fast port scanner"
    category = "ports"
    binary_name = "naabu"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("naabu not installed, skipping", "warning")
            return []
        targets_file = self._write_targets_file(targets, output_dir)
        ports = config.get("ports", "top-1000")
        cmd = [self.path, "-list", targets_file, "-json", "-silent"]
        if ports != "top-1000":
            cmd.extend(["-p", ports])
        stdout, stderr, code = await self._execute(cmd, config.get("timeout", 600), on_log)
        results = self.parse_output(stdout)
        if on_log:
            await on_log(f"naabu found {len(results)} open ports", "info")
        return results

    def parse_output(self, raw_output):
        results = []
        for item in self._parse_jsonl(raw_output):
            results.append({
                "host": item.get("host", ""),
                "ip": item.get("ip", ""),
                "port": item.get("port", 0),
                "protocol": item.get("protocol", "tcp"),
            })
        return results


class FfufTool(ReconTool):
    name = "ffuf"
    description = "Fast web fuzzer for directory and parameter discovery"
    category = "fuzzing"
    binary_name = "ffuf"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("ffuf not installed, skipping", "warning")
            return []
        wordlist = config.get("wordlist", "/usr/share/wordlists/dirb/common.txt")
        if not os.path.exists(wordlist):
            if on_log:
                await on_log(f"Wordlist not found: {wordlist}", "warning")
            return []
        all_results = []
        for target in targets[:10]:
            url = target if target.startswith("http") else f"https://{target}"
            out_file = os.path.join(output_dir, f"ffuf_{hash(target)}.json")
            cmd = [self.path, "-u", f"{url}/FUZZ", "-w", wordlist, "-o", out_file, "-of", "json", "-s",
                   "-mc", "200,201,301,302,403", "-t", str(config.get("threads", 10))]
            await self._execute(cmd, config.get("timeout", 300), on_log)
            if os.path.exists(out_file):
                with open(out_file) as f:
                    raw = f.read()
                results = self.parse_output(raw)
                all_results.extend(results)
        if on_log:
            await on_log(f"ffuf found {len(all_results)} results", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        try:
            data = __import__("json").loads(raw_output)
            for item in data.get("results", []):
                results.append({
                    "url": item.get("url", ""),
                    "status": item.get("status", 0),
                    "length": item.get("length", 0),
                    "words": item.get("words", 0),
                    "lines": item.get("lines", 0),
                    "content_type": item.get("content-type", ""),
                    "input": item.get("input", {}).get("FUZZ", ""),
                })
        except Exception:
            pass
        return results


class DnsxTool(ReconTool):
    name = "dnsx"
    description = "DNS resolution and query toolkit"
    category = "dns"
    binary_name = "dnsx"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("dnsx not installed, skipping", "warning")
            return []
        targets_file = self._write_targets_file(targets, output_dir)
        cmd = [self.path, "-l", targets_file, "-json", "-silent", "-a", "-aaaa", "-cname", "-resp"]
        stdout, stderr, code = await self._execute(cmd, config.get("timeout", 300), on_log)
        results = self.parse_output(stdout)
        if on_log:
            await on_log(f"dnsx resolved {len(results)} hosts", "info")
        return results

    def parse_output(self, raw_output):
        results = []
        for item in self._parse_jsonl(raw_output):
            results.append({
                "host": item.get("host", ""),
                "a": item.get("a", []),
                "aaaa": item.get("aaaa", []),
                "cname": item.get("cname", []),
                "status_code": item.get("status_code", ""),
            })
        return results


class AmassTool(ReconTool):
    name = "amass"
    description = "In-depth attack surface mapping and asset discovery"
    category = "enumeration"
    binary_name = "amass"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("amass not installed, skipping", "warning")
            return []
        all_results = []
        for target in targets:
            out_file = os.path.join(output_dir, f"amass_{target}.json")
            cmd = [self.path, "enum", "-d", target, "-json", out_file, "-silent"]
            if config.get("passive_only", True):
                cmd.append("-passive")
            await self._execute(cmd, config.get("timeout", 600), on_log)
            if os.path.exists(out_file):
                with open(out_file) as f:
                    results = self.parse_output(f.read())
                all_results.extend(results)
        if on_log:
            await on_log(f"amass found {len(all_results)} subdomains", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        for item in self._parse_jsonl(raw_output):
            name = item.get("name", "").strip()
            if name:
                results.append({
                    "subdomain": name,
                    "domain": item.get("domain", ""),
                    "addresses": item.get("addresses", []),
                    "source": ",".join(item.get("sources", ["amass"])),
                    "tag": item.get("tag", ""),
                })
        return results


class DalfoxTool(ReconTool):
    name = "dalfox"
    description = "XSS vulnerability scanner and parameter analysis"
    category = "scanning"
    binary_name = "dalfox"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("dalfox not installed, skipping", "warning")
            return []
        targets_file = self._write_targets_file(targets, output_dir)
        out_file = os.path.join(output_dir, "dalfox_results.json")
        cmd = [self.path, "file", targets_file, "-o", out_file, "--format", "json", "--silence"]
        await self._execute(cmd, config.get("timeout", 600), on_log)
        if os.path.exists(out_file):
            with open(out_file) as f:
                raw = f.read()
            results = self.parse_output(raw)
        else:
            results = []
        if on_log:
            await on_log(f"dalfox found {len(results)} XSS findings", "info")
        return results

    def parse_output(self, raw_output):
        results = []
        try:
            data = __import__("json").loads(raw_output)
            items = data if isinstance(data, list) else [data]
            for item in items:
                results.append({
                    "type": item.get("type", ""),
                    "poc": item.get("poc", ""),
                    "param": item.get("param", ""),
                    "method": item.get("method", "GET"),
                    "evidence": item.get("evidence", ""),
                    "severity": item.get("severity", "medium"),
                    "cwe": item.get("cwe", "CWE-79"),
                })
        except Exception:
            for item in self._parse_jsonl(raw_output):
                results.append({
                    "type": item.get("type", ""),
                    "poc": item.get("poc", item.get("url", "")),
                    "param": item.get("param", ""),
                    "method": item.get("method", "GET"),
                    "evidence": item.get("evidence", ""),
                    "severity": item.get("severity", "medium"),
                    "cwe": item.get("cwe", "CWE-79"),
                })
        return results


class GauTool(ReconTool):
    name = "gau"
    description = "Fetch known URLs from AlienVault OTX, Wayback Machine, Common Crawl"
    category = "enumeration"
    binary_name = "gau"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("gau not installed, skipping", "warning")
            return []
        all_results = []
        for target in targets:
            cmd = [self.path, target]
            stdout, stderr, code = await self._execute(cmd, config.get("timeout", 300), on_log)
            results = self.parse_output(stdout)
            all_results.extend(results)
        if on_log:
            await on_log(f"gau found {len(all_results)} URLs", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        for line in raw_output.strip().splitlines():
            url = line.strip()
            if url and url.startswith("http"):
                results.append({"url": url, "source": "gau"})
        return results


class WaybackurlsTool(ReconTool):
    name = "waybackurls"
    description = "Fetch all known URLs from the Wayback Machine"
    category = "enumeration"
    binary_name = "waybackurls"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("waybackurls not installed, skipping", "warning")
            return []
        all_results = []
        for target in targets:
            stdout, stderr, code = await self._execute(
                [self.path], config.get("timeout", 300), on_log, stdin_data=target
            )
            results = self.parse_output(stdout)
            all_results.extend(results)
        if on_log:
            await on_log(f"waybackurls found {len(all_results)} URLs", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        for line in raw_output.strip().splitlines():
            url = line.strip()
            if url and url.startswith("http"):
                results.append({"url": url, "source": "waybackurls"})
        return results


class GospiderTool(ReconTool):
    name = "gospider"
    description = "Fast web spider for link discovery"
    category = "crawling"
    binary_name = "gospider"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("gospider not installed, skipping", "warning")
            return []
        targets_file = self._write_targets_file(targets, output_dir)
        gs_out = os.path.join(output_dir, "gospider_output")
        os.makedirs(gs_out, exist_ok=True)
        cmd = [self.path, "-S", targets_file, "-o", gs_out, "-c", "10", "-d", "3", "--json"]
        stdout, stderr, code = await self._execute(cmd, config.get("timeout", 600), on_log)
        results = self.parse_output(stdout)
        # Also parse output files
        for fname in os.listdir(gs_out) if os.path.isdir(gs_out) else []:
            fpath = os.path.join(gs_out, fname)
            if os.path.isfile(fpath):
                with open(fpath) as f:
                    results.extend(self.parse_output(f.read()))
        if on_log:
            await on_log(f"gospider found {len(results)} URLs", "info")
        return results

    def parse_output(self, raw_output):
        results = []
        seen = set()
        for item in self._parse_jsonl(raw_output):
            url = item.get("output", item.get("url", ""))
            if url and url.startswith("http") and url not in seen:
                seen.add(url)
                results.append({"url": url, "source": "gospider", "type": item.get("type", "")})
        for line in raw_output.strip().splitlines():
            line = line.strip()
            if line and not line.startswith("{") and "http" in line:
                parts = line.split()
                for p in parts:
                    if p.startswith("http") and p not in seen:
                        seen.add(p)
                        results.append({"url": p, "source": "gospider"})
        return results


class HakrawlerTool(ReconTool):
    name = "hakrawler"
    description = "Simple web crawler for gathering URLs and JavaScript file locations"
    category = "crawling"
    binary_name = "hakrawler"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("hakrawler not installed, skipping", "warning")
            return []
        stdin_data = "\n".join(targets)
        cmd = [self.path, "-d", str(config.get("depth", 3))]
        stdout, stderr, code = await self._execute(cmd, config.get("timeout", 300), on_log, stdin_data=stdin_data)
        results = self.parse_output(stdout)
        if on_log:
            await on_log(f"hakrawler found {len(results)} URLs", "info")
        return results

    def parse_output(self, raw_output):
        results = []
        for line in raw_output.strip().splitlines():
            url = line.strip()
            if url and url.startswith("http"):
                results.append({"url": url, "source": "hakrawler"})
        return results


class ParamspiderTool(ReconTool):
    name = "paramspider"
    description = "Mining parameters from dark corners of Web Archives"
    category = "enumeration"
    binary_name = "paramspider"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("paramspider not installed, skipping", "warning")
            return []
        all_results = []
        for target in targets:
            out_file = os.path.join(output_dir, f"paramspider_{target}.txt")
            cmd = [self.path, "-d", target, "--output", out_file]
            await self._execute(cmd, config.get("timeout", 300), on_log)
            if os.path.exists(out_file):
                with open(out_file) as f:
                    results = self.parse_output(f.read())
                all_results.extend(results)
        if on_log:
            await on_log(f"paramspider found {len(all_results)} URLs with parameters", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        for line in raw_output.strip().splitlines():
            url = line.strip()
            if url and ("?" in url or "=" in url):
                results.append({"url": url, "source": "paramspider"})
        return results


class Sublist3rTool(ReconTool):
    name = "sublist3r"
    description = "Python-based subdomain enumeration tool"
    category = "enumeration"
    binary_name = "sublist3r"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("sublist3r not installed, skipping", "warning")
            return []
        all_results = []
        for target in targets:
            out_file = os.path.join(output_dir, f"sublist3r_{target}.txt")
            cmd = [self.path, "-d", target, "-o", out_file]
            await self._execute(cmd, config.get("timeout", 300), on_log)
            if os.path.exists(out_file):
                with open(out_file) as f:
                    results = self.parse_output(f.read())
                all_results.extend(results)
        if on_log:
            await on_log(f"sublist3r found {len(all_results)} subdomains", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        for line in raw_output.strip().splitlines():
            sub = line.strip()
            if sub and "." in sub:
                results.append({"subdomain": sub, "source": "sublist3r"})
        return results


class MasscanTool(ReconTool):
    name = "masscan"
    description = "Internet-scale port scanner"
    category = "ports"
    binary_name = "masscan"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("masscan not installed, skipping", "warning")
            return []
        all_results = []
        for target in targets:
            out_file = os.path.join(output_dir, f"masscan_{hash(target)}.json")
            ports = config.get("ports", "1-1000")
            rate = config.get("rate", 1000)
            cmd = [self.path, target, f"-p{ports}", "--rate", str(rate), "-oJ", out_file]
            await self._execute(cmd, config.get("timeout", 600), on_log)
            if os.path.exists(out_file):
                with open(out_file) as f:
                    raw = f.read()
                results = self.parse_output(raw)
                all_results.extend(results)
        if on_log:
            await on_log(f"masscan found {len(all_results)} open ports", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        try:
            data = __import__("json").loads(raw_output)
            items = data if isinstance(data, list) else []
            for item in items:
                ip = item.get("ip", "")
                for port_info in item.get("ports", []):
                    results.append({
                        "host": ip, "ip": ip,
                        "port": port_info.get("port", 0),
                        "protocol": port_info.get("proto", "tcp"),
                        "status": port_info.get("status", "open"),
                    })
        except Exception:
            pass
        return results


class RustscanTool(ReconTool):
    name = "rustscan"
    description = "Modern port scanner"
    category = "ports"
    binary_name = "rustscan"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("rustscan not installed, skipping", "warning")
            return []
        all_results = []
        for target in targets:
            cmd = [self.path, "-a", target, "--ulimit", "5000", "-g"]
            stdout, stderr, code = await self._execute(cmd, config.get("timeout", 300), on_log)
            results = self.parse_output(stdout)
            all_results.extend(results)
        if on_log:
            await on_log(f"rustscan found {len(all_results)} open ports", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        import re
        for line in raw_output.strip().splitlines():
            match = re.findall(r"(\d+\.\d+\.\d+\.\d+):(\d+)", line)
            for ip, port in match:
                results.append({"host": ip, "ip": ip, "port": int(port), "protocol": "tcp"})
        return results


class DirsearchTool(ReconTool):
    name = "dirsearch"
    description = "Web path brute-forcer"
    category = "fuzzing"
    binary_name = "dirsearch"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("dirsearch not installed, skipping", "warning")
            return []
        all_results = []
        for target in targets[:10]:
            url = target if target.startswith("http") else f"https://{target}"
            out_file = os.path.join(output_dir, f"dirsearch_{hash(target)}.json")
            cmd = [self.path, "-u", url, "-o", out_file, "--format", "json", "-q"]
            exts = config.get("extensions", [])
            if exts:
                cmd.extend(["-e", ",".join(exts)])
            await self._execute(cmd, config.get("timeout", 300), on_log)
            if os.path.exists(out_file):
                with open(out_file) as f:
                    results = self.parse_output(f.read())
                all_results.extend(results)
        if on_log:
            await on_log(f"dirsearch found {len(all_results)} paths", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        try:
            data = __import__("json").loads(raw_output)
            for url_key, entries in data.items() if isinstance(data, dict) else []:
                for item in entries if isinstance(entries, list) else []:
                    results.append({
                        "url": item.get("url", url_key),
                        "status": item.get("status", 0),
                        "content_length": item.get("content-length", 0),
                        "redirect": item.get("redirect", ""),
                    })
        except Exception:
            pass
        return results


class ArjunTool(ReconTool):
    name = "arjun"
    description = "HTTP parameter discovery suite"
    category = "enumeration"
    binary_name = "arjun"

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("arjun not installed, skipping", "warning")
            return []
        all_results = []
        for target in targets[:10]:
            url = target if target.startswith("http") else f"https://{target}"
            out_file = os.path.join(output_dir, f"arjun_{hash(target)}.json")
            cmd = [self.path, "-u", url, "-oJ", out_file]
            await self._execute(cmd, config.get("timeout", 300), on_log)
            if os.path.exists(out_file):
                with open(out_file) as f:
                    raw = f.read()
                results = self.parse_output(raw)
                for r in results:
                    r["url"] = url
                all_results.extend(results)
        if on_log:
            await on_log(f"arjun found {len(all_results)} parameters", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        try:
            data = __import__("json").loads(raw_output)
            if isinstance(data, dict):
                for url, params in data.items():
                    if isinstance(params, list):
                        for p in params:
                            results.append({"url": url, "param": p, "source": "arjun"})
        except Exception:
            pass
        return results


class GfTool(ReconTool):
    name = "gf"
    description = "Pattern-matching grep for URLs (by tomnomnom)"
    category = "scanning"
    binary_name = "gf"

    PATTERNS = ["xss", "sqli", "ssrf", "redirect", "rce", "idor", "lfi", "ssti", "debug-logic", "upload-fields"]

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log("gf not installed, skipping", "warning")
            return []
        targets_file = self._write_targets_file(targets, output_dir)
        all_results = []
        patterns = config.get("patterns", self.PATTERNS)
        for pattern in patterns:
            with open(targets_file) as f:
                stdin_data = f.read()
            cmd = [self.path, pattern]
            stdout, stderr, code = await self._execute(cmd, config.get("timeout", 60), on_log, stdin_data=stdin_data)
            for line in stdout.strip().splitlines():
                url = line.strip()
                if url:
                    all_results.append({"url": url, "pattern": pattern, "source": "gf"})
        if on_log:
            await on_log(f"gf matched {len(all_results)} patterns", "info")
        return all_results

    def parse_output(self, raw_output):
        results = []
        for line in raw_output.strip().splitlines():
            url = line.strip()
            if url:
                results.append({"url": url, "source": "gf"})
        return results


class CustomScriptRunner(ReconTool):
    name = "custom_script"
    description = "User-uploaded custom recon script"
    category = "custom"
    binary_name = ""

    def __init__(self, script_path: str = "", script_type: str = "python", output_format: str = "text"):
        super().__init__()
        self.script_path = script_path
        self.script_type = script_type
        self.output_format = output_format

    @property
    def installed(self) -> bool:
        return os.path.exists(self.script_path) if self.script_path else False

    @property
    def path(self) -> str | None:
        return self.script_path if self.installed else None

    async def run(self, targets, config, output_dir, on_log=None):
        if not self.installed:
            if on_log:
                await on_log(f"Script not found: {self.script_path}", "error")
            return []
        interpreters = {"python": "python3", "bash": "bash", "ruby": "ruby", "go": "go run"}
        interp = interpreters.get(self.script_type, "python3")
        cmd_parts = interp.split() + [self.script_path]
        stdin_data = "\n".join(targets)
        stdout, stderr, code = await self._execute(cmd_parts, config.get("timeout", 300), on_log, stdin_data=stdin_data)
        results = self.parse_output(stdout)
        if on_log:
            await on_log(f"Custom script produced {len(results)} results", "info")
        return results

    def parse_output(self, raw_output):
        if self.output_format == "json":
            try:
                data = __import__("json").loads(raw_output)
                return data if isinstance(data, list) else [data]
            except Exception:
                return []
        elif self.output_format == "jsonl":
            return self._parse_jsonl(raw_output)
        else:
            results = []
            for line in raw_output.strip().splitlines():
                line = line.strip()
                if line:
                    results.append({"output": line, "source": "custom_script"})
            return results
