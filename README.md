# CodeForge 🔨

> **AI DevOps Architect** — Analyzes your codebase and generates production-grade deployment infrastructure.

[![gitagent](https://img.shields.io/badge/gitagent-v0.1.0-blue)](https://github.com/open-gitagent/gitagent)
[![Skills](https://img.shields.io/badge/skills-5-green)]()
[![License](https://img.shields.io/badge/license-MIT-brightgreen)]()

CodeForge is an AI agent that lives in your git repository and acts as your dedicated DevOps team. Point it at any codebase, and it will analyze the tech stack and generate everything needed to go from "it works on my machine" to "deployed, monitored, and hardened in production."

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │          CodeForge Agent             │
                    │                                     │
┌──────────┐       │  ┌─────────────┐  ┌──────────────┐  │
│ Your     │──────▶│  │ SOUL.md     │  │ RULES.md     │  │
│ Codebase │       │  │ 3AM on-call │  │ 50+ security │  │
│          │       │  │ DevOps pro  │  │ constraints  │  │
└──────────┘       │  └─────────────┘  └──────────────┘  │
                    │                                     │
                    │  ┌─── Skill Pipeline ────────────┐  │
                    │  │                               │  │
                    │  │  1. stack-analyzer             │  │       ┌──────────────┐
                    │  │  2. dockerfile-generator       │  │──────▶│  Generated   │
                    │  │  3. cicd-pipeline-builder      │  │       │  Infra:      │
                    │  │  4. k8s-manifest-generator     │  │       │  • Dockerfile│
                    │  │  5. monitoring-setup           │  │       │  • CI/CD     │
                    │  │                               │  │       │  • K8s YAML  │
                    │  │  ▼ security-auditor (review)   │  │       │  • Monitoring│
                    │  └───────────────────────────────┘  │       └──────────────┘
                    │                                     │
                    │  ┌──────────┐  ┌──────────────────┐ │
                    │  │Knowledge │  │  Workflows        │ │
                    │  │Base (3)  │  │  full-deploy-pipe │ │
                    │  └──────────┘  └──────────────────┘ │
                    └─────────────────────────────────────┘
```

## What It Generates

| Skill | Output | Key Features |
|---|---|---|
| **Stack Analyzer** | JSON Stack Profile | Detects 10+ languages, 15+ frameworks, 8+ databases |
| **Dockerfile Generator** | `Dockerfile` + `.dockerignore` | Multi-stage, non-root, Alpine/Distroless, health checks, OCI labels |
| **CI/CD Pipeline Builder** | `.github/workflows/ci-cd.yml` | Lint → Test → Security Scan → Build → Deploy, with caching & SBOM |
| **K8s Manifest Generator** | Complete Kustomize package | Deployment, Service, Ingress, HPA, PDB, NetworkPolicy, ServiceAccount |
| **Monitoring Setup** | Prometheus + Grafana configs | ServiceMonitor, alerting rules (RED method), dashboard panels |
| **Security Auditor** | Security Audit Report | Reviews ALL outputs for CRITICAL/HIGH/MEDIUM/LOW findings |

## Quick Start

### Prerequisites
- Node.js ≥ 18
- An LLM API key (Anthropic, OpenAI, or Google)

### Run with gitclaw

```bash
# Install dependencies
npm install

# Set ONE API key — the script auto-detects which provider to use:

export ANTHROPIC_API_KEY=sk-ant-...   # Claude (recommended)
# or
export OPENAI_API_KEY=sk-...          # GPT-4o
# or
export GEMINI_API_KEY=AIza...         # Gemini 2.5 Pro

# Run the demo
node demo/run-demo.js
```

### Validate the agent structure

```bash
npx gitagent validate    # Check agent spec compliance
npx gitagent info        # Display agent summary
```

## Project Structure

```
├── agent.yaml                    # Agent manifest
├── SOUL.md                       # Identity & persona
├── RULES.md                      # 50+ security constraints
├── AGENTS.md                     # Framework-agnostic fallback
├── skills/                       # 5 composable skills
│   ├── stack-analyzer/          
│   ├── dockerfile-generator/    
│   ├── cicd-pipeline-builder/   
│   ├── k8s-manifest-generator/  
│   └── monitoring-setup/        
├── tools/                        # MCP tool definitions
├── agents/                       # security-auditor sub-agent
├── knowledge/                    # Docker, K8s, CI/CD reference docs
├── workflows/                    # Multi-step pipeline orchestration
├── hooks/                        # Lifecycle validation hooks
├── examples/                     # Good/bad output calibration
├── memory/                       # Cross-session state
└── demo/                         # Demo script + sample project
```

## Spec Feature Coverage

This agent utilizes **12 out of 12** gitagent specification features:

| Feature | Status |
|---|---|
| `agent.yaml` manifest | ✅ |
| `SOUL.md` identity | ✅ |
| `RULES.md` constraints | ✅ |
| `AGENTS.md` fallback | ✅ |
| Skills with SKILL.md | ✅ (5 skills) |
| Tool definitions | ✅ (2 tools) |
| Sub-agents | ✅ (security-auditor) |
| Knowledge base | ✅ (3 docs + index) |
| Workflows | ✅ (deployment pipeline) |
| Hooks | ✅ (YAML validation) |
| Calibration examples | ✅ (good + bad) |
| Memory | ✅ (persistent state) |

## License

MIT
