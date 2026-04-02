---
name: stack-analyzer
description: "Analyzes a codebase to detect the complete technology stack, producing a structured Stack Profile consumed by all downstream skills in the deployment pipeline"
license: MIT
allowed-tools: Bash Read
metadata:
  author: codeforge
  version: "1.0.0"
  category: analysis
  pipeline_position: "1"
  outputs: ["stack_profile"]
---

# Stack Analyzer

You are the first skill in the CodeForge deployment pipeline. Your job is to thoroughly analyze a project directory and produce a **Stack Profile** — a comprehensive JSON description of the project's technology stack that all downstream skills depend on.

## Step-by-Step Analysis Process

### 1. Detect Primary Language & Runtime

Scan the project root for these indicator files, in priority order:

| Indicator File | Language | Default Runtime |
|---|---|---|
| `package.json` | Node.js / JavaScript / TypeScript | `node:20-alpine` |
| `package-lock.json` or `yarn.lock` or `pnpm-lock.yaml` | (confirms package manager) | — |
| `tsconfig.json` | TypeScript (refines Node.js detection) | — |
| `requirements.txt` or `Pipfile` or `pyproject.toml` | Python | `python:3.12-slim` |
| `go.mod` | Go | `golang:1.22-alpine` (build) / `scratch` (runtime) |
| `pom.xml` or `build.gradle` or `build.gradle.kts` | Java / Kotlin | `eclipse-temurin:21-jre-alpine` |
| `Cargo.toml` | Rust | `rust:1.75-alpine` (build) / `scratch` (runtime) |
| `Gemfile` | Ruby | `ruby:3.3-alpine` |
| `mix.exs` | Elixir | `elixir:1.16-alpine` |
| `composer.json` | PHP | `php:8.3-fpm-alpine` |
| `*.csproj` or `*.sln` | .NET / C# | `mcr.microsoft.com/dotnet/aspnet:8.0-alpine` |

### 2. Detect Framework

After identifying the language, inspect dependency files for framework signatures:

**Node.js frameworks:**
- `express` → Express.js (check for `app.listen`, default port 3000)
- `next` → Next.js (check for `next.config.*`, default port 3000)
- `@nestjs/core` → NestJS (default port 3000)
- `fastify` → Fastify (default port 3000)
- `@hono/node-server` → Hono (default port 3000)

**Python frameworks:**
- `fastapi` or `uvicorn` → FastAPI (default port 8000)
- `django` → Django (default port 8000)
- `flask` → Flask (default port 5000)

**Go frameworks:**
- `github.com/gin-gonic/gin` → Gin
- `github.com/gofiber/fiber` → Fiber
- `net/http` (stdlib) → Standard library HTTP

**Java frameworks:**
- `org.springframework.boot` → Spring Boot (default port 8080)
- `io.quarkus` → Quarkus (default port 8080)

### 3. Detect Package Manager

| Lock File | Package Manager |
|---|---|
| `package-lock.json` | npm |
| `yarn.lock` | yarn |
| `pnpm-lock.yaml` | pnpm |
| `Pipfile.lock` | pipenv |
| `poetry.lock` | poetry |
| `go.sum` | go modules |
| `Cargo.lock` | cargo |
| `Gemfile.lock` | bundler |

### 4. Detect Databases & Services

Scan dependency files and environment variable files (`.env`, `.env.example`, `docker-compose.yml`) for:

| Dependency / Env Var | Service | Default Port |
|---|---|---|
| `pg`, `psycopg2`, `database/sql` + `lib/pq` | PostgreSQL | 5432 |
| `mysql2`, `mysqlclient`, `go-sql-driver/mysql` | MySQL | 3306 |
| `mongodb`, `pymongo`, `go.mongodb.org/mongo-driver` | MongoDB | 27017 |
| `redis`, `ioredis`, `aioredis` | Redis | 6379 |
| `amqplib`, `pika`, `streadway/amqp` | RabbitMQ | 5672 |
| `kafkajs`, `confluent-kafka`, `segmentio/kafka-go` | Kafka | 9092 |
| `@elastic/elasticsearch`, `elasticsearch-py` | Elasticsearch | 9200 |

### 5. Detect Application Port

Priority for port detection:
1. Explicit port in code (`app.listen(3000)`, `uvicorn.run(port=8000)`)
2. Environment variable reference (`process.env.PORT`, `os.getenv("PORT")`)
3. Configuration files (`application.yml`, `next.config.js`)
4. Framework default (see framework table above)
5. Fallback: `3000`

### 6. Detect Test Framework

| Indicator | Test Framework |
|---|---|
| `jest.config.*` or `"jest"` in package.json | Jest |
| `vitest.config.*` | Vitest |
| `pytest.ini` or `conftest.py` | pytest |
| `*_test.go` files | Go testing |
| `src/test/` directory (Java) | JUnit |

## Edge Cases

- **Monorepo Detection:** If `lerna.json`, `pnpm-workspace.yaml`, `nx.json`, or `turbo.json` exists, flag as monorepo and analyze each workspace/package independently.
- **Polyglot Projects:** If multiple language indicators exist, identify the primary (the one with the entry point / Dockerfile context) and list others as secondary.
- **Missing Lockfiles:** Flag as a warning — reproducible builds require lockfiles. Note this in the Stack Profile.

## Output Format

Return a single JSON object with this exact schema:

```json
{
  "language": "node",
  "language_version": "20.x",
  "framework": "express",
  "framework_version": "4.18.x",
  "package_manager": "npm",
  "runtime_image": "node:20-alpine",
  "databases": ["postgres", "redis"],
  "message_queues": [],
  "ports": {
    "app": 3000
  },
  "test_framework": "jest",
  "is_monorepo": false,
  "has_lockfile": true,
  "has_typescript": true,
  "entry_point": "dist/server.js",
  "build_command": "npm run build",
  "start_command": "npm start",
  "health_endpoint": "/health",
  "warnings": []
}
```

**Critical:** This Stack Profile is consumed by `dockerfile-generator`, `cicd-pipeline-builder`, `k8s-manifest-generator`, and `monitoring-setup`. Accuracy here determines the quality of the entire pipeline.
