# Kubernetes Patterns — CodeForge Knowledge Base

## Deployment Strategies

### Rolling Update (Default)
Gradually replaces old pods with new ones. Zero-downtime if probes are configured correctly.

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0     # Never reduce below desired count
    maxSurge: 1           # Create 1 extra pod at a time
```

**When to use:** Most applications. Safe, well-understood, built into Kubernetes.

### Blue-Green Deployment
Run two complete environments (blue = current, green = new). Switch traffic via Service selector update.

**When to use:** When you need instant rollback capability and can afford double resources during deployment.

### Canary Deployment
Route a small percentage of traffic to new version, observe metrics, then gradually shift all traffic.

**When to use:** High-risk changes, when you want to validate with real traffic before full rollout.

## Resource Management

### Request vs Limit Mental Model

| Field | What It Means | Consequence of Wrong Value |
|---|---|---|
| `requests.cpu` | Guaranteed CPU for scheduling | Too high → wasted cluster capacity, pods won't schedule |
| `requests.memory` | Guaranteed memory for scheduling | Too high → wasted capacity; too low → OOM on busy nodes |
| `limits.cpu` | Maximum CPU (throttled beyond this) | Too low → CPU throttling, latency spikes |
| `limits.memory` | Maximum memory (OOM-killed beyond this) | Too low → OOM kills; too high → noisy neighbor |

### Language-Specific Defaults

| Language | CPU Request | CPU Limit | Memory Request | Memory Limit | Notes |
|---|---|---|---|---|---|
| Node.js | 100m | 500m | 128Mi | 512Mi | Single-threaded; memory scales with connections |
| Python | 100m | 500m | 128Mi | 512Mi | GIL limits CPU; memory for data processing |
| Go | 50m | 250m | 32Mi | 128Mi | Efficient runtime, low memory footprint |
| Java | 250m | 1000m | 512Mi | 1Gi | JVM heap needs headroom; use `-XX:MaxRAMPercentage=75` |
| Rust | 50m | 250m | 32Mi | 128Mi | No GC, predictable memory usage |
| .NET | 200m | 500m | 256Mi | 512Mi | CLR overhead; use `ServerGarbageCollection` |

### Quality of Service (QoS) Classes

- **Guaranteed** (`requests` == `limits`): Best for production workloads. Never evicted except when the node itself is under pressure.
- **Burstable** (`requests` < `limits`): Good for variable workloads. Evicted before Guaranteed pods.
- **BestEffort** (no requests/limits): Only for disposable batch jobs. First to be evicted.

**CodeForge always generates Burstable or Guaranteed QoS.**

## Probe Configuration

### Three Types of Probes

| Probe | Purpose | Failure Action |
|---|---|---|
| `startupProbe` | Wait for slow-starting apps | Block liveness/readiness checks until startup succeeds |
| `livenessProbe` | Detect deadlocked processes | Restart the container |
| `readinessProbe` | Check if pod can serve traffic | Remove from Service endpoints |

### Probe Timing Guidelines

```yaml
# For fast-starting apps (Node.js, Go)
startupProbe:
  failureThreshold: 30
  periodSeconds: 2          # Max 60s startup time

livenessProbe:
  initialDelaySeconds: 0    # Startup probe handles delay
  periodSeconds: 15
  timeoutSeconds: 5
  failureThreshold: 3       # Kill after 45s of failures

readinessProbe:
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3       # Remove from LB after 30s

# For slow-starting apps (Java, .NET)
startupProbe:
  failureThreshold: 60
  periodSeconds: 2          # Max 120s startup time
```

### Probe Implementation Methods

| Method | Use Case |
|---|---|
| `httpGet` | Apps with HTTP health endpoints (most web services) |
| `tcpSocket` | Services without HTTP (databases, gRPC, TCP servers) |
| `exec` | Custom health checks requiring shell commands |

## Pod Disruption Budgets (PDB)

PDBs protect your application during voluntary disruptions (node drains, cluster upgrades, autoscaler scale-down).

```yaml
# Minimum 1 pod always available (for 2-replica Deployments)
apiVersion: policy/v1
kind: PodDisruptionBudget
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: myapp
```

**Rule of thumb:** For N replicas, set `minAvailable: N-1` or `maxUnavailable: 1`.

## Network Policy Patterns

### Default Deny All (Zero Trust)
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

Then **explicitly allow** only required traffic paths:
- Ingress from Ingress controller namespace
- Egress to database namespace
- Egress to DNS (kube-system, port 53)
- Egress to external APIs (specific CIDR ranges)

## Topology Spread Constraints

Distribute pods across failure domains for high availability:

```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app.kubernetes.io/name: myapp
```
