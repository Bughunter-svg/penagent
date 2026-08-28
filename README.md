# PenAgent

A local-first, AI-assisted reconnaissance and security analysis platform designed for authorized penetration testing and bug bounty engagements.

PenAgent provides a centralized interface for orchestrating reconnaissance tools, tracking discovered assets, visualizing attack surfaces, triaging vulnerability findings with local Large Language Models (LLMs), and exporting structured assessment reports.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Features](#core-features)
- [Supported Reconnaissance Tools](#supported-reconnaissance-tools)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Reconnaissance Workflow](#reconnaissance-workflow)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Security and Scope Compliance](#security-and-scope-compliance)
- [License](#license)

---

## Overview

Modern security reconnaissance requires orchestrating dozens of command-line tools, normalizing unstructured outputs, correlating assets across multiple discovery phases, and triaging findings.

PenAgent streamlines this process by providing:
- Automated multi-stage reconnaissance pipelines with strict scope boundary controls.
- Automatic tool discovery and status verification for standard security CLI utilities.
- An interactive attack surface graph correlating targets, subdomains, live hosts, URLs, and vulnerabilities.
- Local LLM integration via Ollama for offline finding analysis, false-positive reduction, and remediation guidance without exposing target data to third-party cloud APIs.
- Real-time job logs and pipeline execution telemetry.
- Standardized report generation in Markdown and JSON formats.

---

## System Architecture

```
+-----------------------------------------------------------------------+
|                             Frontend (UI)                             |
|       React 18 + TypeScript + Vite + Tailwind CSS + React Flow        |
+-----------------------------------------------------------------------+
                                   |
                             HTTP / REST
                                   |
+-----------------------------------------------------------------------+
|                            Backend (Core)                             |
|                       FastAPI + Python 3.10+                          |
|                                                                       |
|  +-------------------+  +-------------------+  +-------------------+  |
|  | Pipeline Manager  |  |   Scope Checker   |  |   Tool Detector   |  |
|  +-------------------+  +-------------------+  +-------------------+  |
|  | AI Analyst Client |  |  URL Intelligence |  | Script Executor   |  |
|  +-------------------+  +-------------------+  +-------------------+  |
+-----------------------------------------------------------------------+
          |                        |                        |
+-------------------+    +-------------------+    +-------------------+
|  Database Layer   |    |    Security CLI   |    |   Local AI Node   |
|   Async SQLite    |    |  Tool Subprocesses|    |   Ollama Server   |
|  (SQLAlchemy ORM) |    | (Subfinder, etc.) |    |  (qwen2.5, etc.)  |
+-------------------+    +-------------------+    +-------------------+
```

---

## Core Features

### 1. Scope Enforcement Engine
- Enforces strict in-scope target validation before executing active probes or scans.
- Supports inclusion patterns (domain wildcards, CIDR blocks, exact hostnames) and explicit exclusion lists (out-of-scope subdomains, third-party CDNs).
- Filters output between pipeline stages to guarantee zero out-of-scope interactions.

### 2. Multi-Stage Pipeline Orchestration
- Configurable pipeline execution covering:
  - Subdomain Discovery
  - DNS Resolution and Validation
  - HTTP Service Probing and Technology Identification
  - Endpoint Crawling and Parameter Discovery
  - Automated Vulnerability Scanning
- Background task execution with real-time log capture and status tracking.

### 3. Attack Surface Graph
- Interactive visual graph built with React Flow and Dagre layout algorithm.
- Hierarchical mapping: Target -> Subdomains -> Live Web Hosts -> Endpoints -> Vulnerability Findings.
- Filter nodes by asset type and inspect linked metadata directly in the visualizer.

### 4. Local AI Analyst (Ollama)
- Direct integration with local Ollama instances (`llama3`, `mistral`, `qwen2.5`, `deepseek-r1`, etc.).
- Automated vulnerability triage: confidence evaluation, false-positive probability, attack vector analysis, and remediation suggestions.
- Interactive conversational AI assistant capable of contextual queries over project asset inventories and findings.
- Completely air-gapped and local: no sensitive target data is transmitted externally.

### 5. Structured Reporting
- Generates comprehensive security assessment reports in standard Markdown and structured JSON.
- Includes executive summary, scope verification, asset inventory statistics, and detailed finding records with reproduction evidence and remediation instructions.

---

## Supported Reconnaissance Tools

PenAgent automatically detects binaries in system `PATH` and tool manager directories (`~/go/bin`, `~/.pdtm/go/bin`).

| Category | Tool | Description |
| :--- | :--- | :--- |
| **Subdomain Enumeration** | `subfinder` | Fast passive subdomain enumeration |
| | `amass` | In-depth DNS enumeration and network mapping |
| | `sublist3r` | Multi-engine passive subdomain scraper |
| | `dnsx` | Fast and multi-purpose DNS toolkit |
| **Port & Host Probing** | `httpx` | Fast HTTP probing and technology fingerprinting |
| | `naabu` | Fast port scanner focused on reliability |
| | `masscan` | High-speed TCP port scanner |
| | `rustscan` | Fast port scanner with automated Nmap integration |
| **Crawling & Endpoint Discovery** | `katana` | Next-generation web crawler and spider |
| | `gau` | Fetch known URLs from AlienVault, Wayback, Common Crawl |
| | `waybackurls` | Fetch URLs from the Wayback Machine |
| | `gospider` | Fast web spider written in Go |
| | `hakrawler` | Fast web crawler for endpoint discovery |
| **Parameter & Content Discovery** | `ffuf` | Fast web fuzzer for directory and parameter discovery |
| | `dirsearch` | Web path and directory brute-forcer |
| | `paramspider` | Mining parameters from web archives |
| | `arjun` | HTTP parameter discovery suite |
| | `gf` | Pattern matching wrapper for structured recon data |
| **Vulnerability Scanning** | `nuclei` | Fast, template-based vulnerability scanner |
| | `dalfox` | Parameter analysis and XSS scanner |
| **Extensibility** | `Custom Scripts` | User-defined Python and Shell reconnaissance scripts |

---

## Prerequisites

Before installing PenAgent, ensure the following dependencies are available on your system:

- **Operating System:** Linux (Ubuntu/Debian, Fedora, Arch) or macOS.
- **Python:** Version 3.10 or higher.
- **Node.js:** Version 18.x or 20.x (Node 20 LTS recommended via `nvm`).
- **Go:** Version 1.21 or higher (required for compiling Go-based security tools).
- **Git:** Required for cloning and dependency management.
- **Ollama (Optional):** Required for AI analysis features.

---

## Installation and Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/penagent.git
cd penagent
```

### 2. Automated Setup

The repository includes an automated installation script that sets up Python virtual environments, Node.js packages, and core ProjectDiscovery tools:

```bash
chmod +x setup.sh start.sh
./setup.sh
```

### 3. Manual Setup (Alternative)

If you prefer to configure components individually:

#### Backend Setup:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

#### Frontend Setup:
```bash
cd frontend
export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
npm install
cd ..
```

#### Core Security Tools:
```bash
go install -v github.com/projectdiscovery/pdtm/cmd/pdtm@latest
export PATH=$PATH:$HOME/go/bin
pdtm -install subfinder,httpx,nuclei,katana,naabu,dnsx
```

---

## Configuration

Configuration settings are managed via the `.env` file in the project root.

```ini
# Application Configuration
APP_NAME=PenAgent
DEBUG=True
ENVIRONMENT=development

# Database Settings
DATABASE_URL=sqlite+aiosqlite:///data/penagent.db

# Security & CORS
SECRET_KEY=generate-a-secure-random-secret-key-here
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Local AI Configuration (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:latest
AI_MAX_TOKENS=2048
AI_TEMPERATURE=0.2

# Tool Execution Settings
MAX_CONCURRENT_JOBS=4
DEFAULT_TOOL_TIMEOUT=600
DATA_DIR=./data
REPORTS_DIR=./data/reports
```

---

## Running the Application

### Option A: Using the Startup Script

The `start.sh` script boots both the FastAPI backend and the Vite development server concurrently:

```bash
./start.sh
```

### Option B: Running Services Individually

#### Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate
export PATH=$PATH:$HOME/go/bin:$HOME/.pdtm/go/bin
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Terminal 2 - Frontend:
```bash
cd frontend
export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
npm run dev -- --port 5173 --host 0.0.0.0
```

#### Terminal 3 - Local AI Service (Optional):
```bash
ollama serve
ollama pull qwen2.5:latest
```

### Service Access URLs

- **Web Dashboard:** `http://localhost:5173`
- **Backend REST API:** `http://localhost:8000/api`
- **Interactive Swagger Documentation:** `http://localhost:8000/docs`
- **ReDoc API Documentation:** `http://localhost:8000/redoc`

---

## Reconnaissance Workflow

```
+-----------------------------------------------------------------+
| 1. Project Initialization                                       |
|    - Define project name and authorized target domain(s)        |
|    - Configure explicit in-scope and out-of-scope rules         |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
| 2. Subdomain Enumeration                                        |
|    - Passive discovery: Subfinder, Amass, Sublist3r             |
|    - DNS Resolution & Filtering: Dnsx                           |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
| 3. HTTP Probing & Service Fingerprinting                        |
|    - Active web probe: Httpx                                    |
|    - Port scanning: Naabu, Rustscan                             |
|    - Response extraction: Status, Title, Server, Tech Stack     |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
| 4. Crawling & URL Intelligence                                  |
|    - Active crawling: Katana, Gospider                          |
|    - Historical URL archives: GAU, Waybackurls                  |
|    - Parameter mining & pattern clustering                      |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
| 5. Vulnerability Scanning                                       |
|    - Template execution: Nuclei (CVEs, misconfigs, exposures)   |
|    - Specialized checks: Dalfox (XSS)                           |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
| 6. AI Triage & Prioritization                                   |
|    - Offline evaluation with local Ollama LLM                   |
|    - Signal-to-noise scoring and false positive suppression     |
|    - Remediation and proof-of-concept synthesis                 |
+-----------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
| 7. Attack Graph Visualization & Reporting                       |
|    - Interactive node exploration in UI                         |
|    - Export Markdown / JSON assessment deliverables             |
+-----------------------------------------------------------------+
```

---

## API Reference

### Health & System
- `GET /api/health` - Check backend service availability.
- `GET /api/tools/status` - Detect installed tools, paths, and binary versions.
- `POST /api/tools/install` - Trigger tool installation via tool manager.

### Projects & Targets
- `GET /api/projects` - List all projects with asset summary statistics.
- `POST /api/projects` - Create a new bug bounty project.
- `GET /api/projects/{id}` - Get project details, targets, and scope configuration.
- `DELETE /api/projects/{id}` - Delete a project and associated records.
- `POST /api/projects/{id}/targets` - Add targets to an existing project.
- `POST /api/projects/{id}/scope` - Add inclusion/exclusion scope rules.

### Reconnaissance Pipeline
- `POST /api/recon/run` - Start a reconnaissance pipeline run.
- `GET /api/recon/status/{project_id}` - Get live pipeline progress and current stage.
- `POST /api/recon/stop/{project_id}` - Abort active pipeline run.

### Asset Management
- `GET /api/assets/{project_id}` - List discovered subdomains and host records.
- `GET /api/assets/{project_id}/hosts` - List live HTTP/HTTPS host services.
- `GET /api/assets/{project_id}/urls` - List discovered endpoints and parameters.

### Findings & Vulnerabilities
- `GET /api/findings/{project_id}` - List findings with severity and confidence filters.
- `GET /api/findings/{project_id}/{finding_id}` - Get full finding record and evidence.
- `PATCH /api/findings/{project_id}/{finding_id}` - Update finding triage status.

### Local AI Integration
- `GET /api/ai/status` - Verify Ollama availability and loaded model.
- `POST /api/ai/analyze-finding` - Request AI analysis for a specific finding.
- `POST /api/ai/chat` - Query AI analyst about project assets and attack surface.

### Jobs & Execution Logs
- `GET /api/jobs` - List tool execution jobs and completion states.
- `GET /api/jobs/{id}/logs` - Retrieve stdout and stderr logs for a job.

### Custom Scripts
- `GET /api/scripts` - List custom user-defined scripts.
- `POST /api/scripts` - Register a custom reconnaissance script.
- `POST /api/scripts/run` - Execute a custom script against project targets.

---

## Project Structure

```
penagent/
├── backend/
│   ├── app/
│   │   ├── ai/               # Ollama LLM integration and prompt logic
│   │   ├── api/              # FastAPI route handlers and controllers
│   │   ├── models/           # SQLAlchemy ORM database models
│   │   ├── pipeline/         # Recon pipeline orchestrator and state engine
│   │   ├── reports/          # Report generation formatting logic
│   │   ├── schemas/          # Pydantic request and response schemas
│   │   ├── scope/            # Scope validation and CIDR/wildcard matchers
│   │   ├── scripts/          # Custom script runner utilities
│   │   ├── services/         # Business logic and URL intelligence
│   │   ├── tools/            # ReconTool abstractions and tool registry
│   │   ├── config.py         # Application configuration loader
│   │   ├── database.py       # Async database engine and session factory
│   │   └── main.py           # FastAPI entrypoint and middleware setup
│   ├── data/                 # SQLite database storage and scan artifacts
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable layout and navigation components
│   │   ├── lib/              # Utility helpers
│   │   ├── pages/            # View pages (Dashboard, Recon, Assets, Findings, etc.)
│   │   ├── services/         # Axios API client bindings
│   │   ├── types/            # TypeScript type definitions matching backend schemas
│   │   ├── App.tsx           # Router and top-level layout
│   │   └── main.tsx          # React application entrypoint
│   ├── package.json          # Frontend dependencies and scripts
│   ├── tailwind.config.ts    # Tailwind CSS styling configuration
│   └── vite.config.ts        # Vite build tool configuration
├── scripts/                  # Helper automation scripts
├── .env.example              # Template environment configuration
├── .gitignore                # Git exclusions for dependencies, builds, and artifacts
├── setup.sh                  # Automated system setup script
├── start.sh                  # Application service launcher script
└── README.md                 # Project documentation
```

---

## Security and Scope Compliance

PenAgent is intended strictly for **authorized security testing and bug bounty research**.

- Always obtain explicit written authorization before scanning any target infrastructure.
- Configure in-scope domains and wildcard boundaries accurately before launching active reconnaissance pipelines.
- Add third-party CDNs, hosted services, out-of-scope subdomains, and cloud assets to the project exclusion list.
- All scan artifacts, tool logs, and AI queries remain on your local system and are not dispatched to any external cloud service.

---

## License

This project is distributed under the MIT License. See the `LICENSE` file for full terms.
