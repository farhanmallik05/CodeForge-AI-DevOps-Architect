# Bad Outputs — Anti-pattern Catalog

These examples show what CodeForge must **never** produce. Each anti-pattern includes the specific rule it violates and the production risk it creates.

## ❌ Terrible Dockerfile

```dockerfile
# ANTI-PATTERN: Everything wrong in one file
FROM node:latest
WORKDIR /app
COPY . .
RUN npm install
ENV DATABASE_URL=postgres://admin:p@ssw0rd@db.internal:5432/prod
EXPOSE 3000
CMD npm start
```

| Issue | Rule Violated | Production Risk |
|---|---|---|
| `FROM node:latest` | Must Never #1: No `latest` tags | Build breaks silently when upstream updates; 350MB+ image with thousands of unnecessary packages |
| No multi-stage build | Must Always #1 | Dev dependencies, source code, build tools all in production image |
| `COPY . .` before install | Quality Standard | Busts Docker layer cache on every code change — rebuilds dependencies every time |
| `npm install` not `npm ci` | Must Never #14 | Non-deterministic installs; may get different versions than tested |
| Hardcoded `DATABASE_URL` | Must Never #2 | Password visible in `docker inspect`, layer history, and registries |
| Runs as `root` | Must Never #4 | Container breakout = full host compromise |
| No `HEALTHCHECK` | Must Always #2 | K8s can't detect if app is alive; routes traffic to dead pods |
| `CMD npm start` | Quality Standard | Uses shell form (PID 1 is `/bin/sh`, not node); signals not forwarded properly |

## ❌ Insecure K8s Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          ports:
            - containerPort: 3000
          securityContext:
            privileged: true
```

| Issue | Rule Violated | Production Risk |
|---|---|---|
| `image: myapp:latest` | Must Never #1 | Unpinned, mutable tag — different image on each pull |
| `replicas: 1` | Quality Standard | Single point of failure; zero availability during updates |
| No `namespace` specified | Quality Standard | Deploys to `default` namespace; no isolation |
| `privileged: true` | Must Never #5 | Complete host access; defeats ALL container isolation |
| No `resources` block | Must Always #3 | Unbounded resource usage; can starve other pods; no QoS class |
| No probes defined | Must Always #6 | No health monitoring; traffic routed to broken pods |
| No labels beyond `app` | Quality Standard | Can't track version, component, or management tool |
| No `serviceAccountName` | Must Always #15 | Uses default SA with potentially broad permissions |
| No `securityContext` at pod level | Security Rule | No `runAsNonRoot`, no `seccompProfile`, no `fsGroup` |

## ❌ Insecure CI/CD Pipeline

```yaml
name: Deploy
on: push
permissions: write-all
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
      - run: echo "${{ secrets.KUBECONFIG }}" > kubeconfig
      - run: npm install && npm test && npm run build
      - run: docker build -t myapp:latest . && docker push myapp:latest
      - run: kubectl --kubeconfig=kubeconfig apply -f k8s/
```

| Issue | Rule Violated | Production Risk |
|---|---|---|
| `permissions: write-all` | Security Rule | Overly broad; compromised workflow can modify repo, packages, issues |
| `actions/checkout@main` | Security Rule | Mutable branch ref; supply chain attack vector |
| `secrets.KUBECONFIG` in env | Security Rule | Kubeconfig written to disk; visible in logs if `set -x` |
| No security scanning | Must Never #3 | Vulnerabilities shipped directly to production |
| `docker push myapp:latest` | Must Never #1 | Mutable production tag; no traceability |
| Single step for everything | Quality Standard | No caching, can't retry failed stages independently |
| No environment protection | Quality Standard | Every push to any branch deploys to production |
| No SBOM or attestation | Security Rule | No supply chain transparency; can't verify image provenance |
