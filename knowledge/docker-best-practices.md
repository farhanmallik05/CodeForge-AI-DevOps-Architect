# Docker Best Practices — CodeForge Knowledge Base

## Multi-Stage Build Patterns

### The Builder Pattern
Separate compilation/dependency installation from the production runtime:

```dockerfile
# Builder: has build tools, devDependencies, source code
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production: only runtime + compiled output
FROM node:20-alpine
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
```

**Why:** Build tools (gcc, make, python) and dev dependencies (typescript, webpack) don't belong in production images. They increase attack surface, image size, and CVE count.

### Size Comparison by Base Image

| Base Image | Approximate Size | Use Case |
|---|---|---|
| `ubuntu:22.04` | ~77MB | Legacy apps needing glibc, system packages |
| `node:20` (Debian) | ~350MB | Development only — never production |
| `node:20-alpine` | ~50MB | Most Node.js production workloads |
| `python:3.12-slim` | ~45MB | Python apps without compiled C extensions |
| `gcr.io/distroless/nodejs20` | ~30MB | Minimal Node.js (no shell, no package manager) |
| `gcr.io/distroless/static` | ~2MB | Static Go/Rust binaries |
| `scratch` | 0MB | Fully static binaries only |

### Distroless vs Alpine

- **Alpine:** Includes a shell (`/bin/sh`), package manager (`apk`), and BusyBox utilities. Good balance of debuggability and minimalism.
- **Distroless:** No shell, no package manager, no utilities. Smallest attack surface, but harder to debug (use `debug` variant for troubleshooting).
- **Recommendation:** Use Alpine for most workloads. Use Distroless for security-critical services. Use Scratch for statically-compiled Go/Rust.

## Layer Caching Optimization

### The Golden Rule
Docker caches layers from top to bottom. When any layer changes, all subsequent layers are invalidated. Structure your Dockerfile so that **frequently changing parts come last**.

### Optimal Layer Order
```
1. Base image selection        (rarely changes)
2. System dependencies         (rarely changes)
3. Copy dependency manifests   (changes when deps update)
4. Install dependencies        (cached if manifests unchanged)
5. Copy source code            (changes every commit)
6. Build/compile               (re-runs when source changes)
7. User/permissions setup      (rarely changes after initial setup)
```

### Anti-Pattern: The Cache Buster
```dockerfile
# ❌ BAD: Copying everything first busts cache on every code change
COPY . .
RUN npm ci
RUN npm run build
```

```dockerfile
# ✅ GOOD: Dependencies cached separately from source
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

## Security Hardening Checklist

1. **Non-root user:** Create and switch to a user with UID ≥ 1000
2. **No secrets in images:** Never use `ARG` for secrets; use Docker BuildKit secrets mount if needed
3. **HEALTHCHECK:** Include native health check instruction
4. **Read-only filesystem:** Design for `readOnlyRootFilesystem: true` in K8s
5. **Minimal packages:** Don't install debug tools in production images
6. **Pinned versions:** Use exact image digests or version tags, never `latest`
7. **OCI labels:** Include provenance metadata labels

## BuildKit Features (Docker ≥ 18.09)

- **`--mount=type=cache`:** Persistent cache for package managers across builds
- **`--mount=type=secret`:** Securely pass secrets without baking them into layers
- **`--mount=type=ssh`:** Forward SSH agent for private repo access during build
- **Multi-platform builds:** `docker buildx build --platform linux/amd64,linux/arm64`
