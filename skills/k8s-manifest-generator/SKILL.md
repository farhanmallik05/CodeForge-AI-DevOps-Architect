---
name: k8s-manifest-generator
description: "Generates complete Kubernetes deployment packages with Kustomize structure, security contexts, resource management, probes, network policies, and production hardening"
license: MIT
allowed-tools: Bash Read Write
metadata:
  author: codeforge
  version: "1.0.0"
  category: orchestration
  pipeline_position: "4"
  depends_on: ["stack-analyzer", "dockerfile-generator"]
---

# Kubernetes Manifest Generator

You are the fourth skill in the CodeForge pipeline. You generate a complete, production-hardened Kubernetes deployment package organized using Kustomize.

## Output Directory Structure

```
k8s/
├── base/
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   ├── serviceaccount.yaml
│   ├── networkpolicy.yaml
│   └── configmap.yaml
└── overlays/
    ├── staging/
    │   ├── kustomization.yaml
    │   └── patch-replicas.yaml
    └── production/
        ├── kustomization.yaml
        ├── patch-replicas.yaml
        └── patch-resources.yaml
```

## Resource Templates

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: APP_NAME
  labels:
    app.kubernetes.io/name: APP_NAME
    app.kubernetes.io/managed-by: codeforge
```

### Deployment (Hardened)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: APP_NAME
  namespace: APP_NAME
  labels:
    app.kubernetes.io/name: APP_NAME
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: server
    app.kubernetes.io/managed-by: codeforge
spec:
  replicas: 2
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: APP_NAME
  template:
    metadata:
      labels:
        app.kubernetes.io/name: APP_NAME
        app.kubernetes.io/version: "1.0.0"
    spec:
      serviceAccountName: APP_NAME
      automountServiceAccountToken: false
      terminationGracePeriodSeconds: 30

      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
        seccompProfile:
          type: RuntimeDefault

      containers:
        - name: APP_NAME
          image: REGISTRY/IMAGE:TAG
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: APP_PORT
              protocol: TCP
              name: http

          # Security hardening
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]

          # Resource management
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"

          # Probes
          startupProbe:
            httpGet:
              path: /health
              port: http
            failureThreshold: 30
            periodSeconds: 2

          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 0
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3

          # Environment (from ConfigMap + Secrets)
          envFrom:
            - configMapRef:
                name: APP_NAME-config

          # Writable tmp directory (readOnlyRootFilesystem=true)
          volumeMounts:
            - name: tmp
              mountPath: /tmp

      volumes:
        - name: tmp
          emptyDir:
            sizeLimit: 100Mi
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: APP_NAME
  namespace: APP_NAME
  labels:
    app.kubernetes.io/name: APP_NAME
    app.kubernetes.io/managed-by: codeforge
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app.kubernetes.io/name: APP_NAME
```

### Ingress (with TLS)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: APP_NAME
  namespace: APP_NAME
  labels:
    app.kubernetes.io/name: APP_NAME
    app.kubernetes.io/managed-by: codeforge
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - APP_NAME.example.com
      secretName: APP_NAME-tls
  rules:
    - host: APP_NAME.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: APP_NAME
                port:
                  name: http
```

### HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: APP_NAME
  namespace: APP_NAME
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: APP_NAME
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
```

### PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: APP_NAME
  namespace: APP_NAME
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: APP_NAME
```

### NetworkPolicy (Default Deny + Allow)

```yaml
# Default deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: APP_NAME
spec:
  podSelector: {}
  policyTypes:
    - Ingress

---
# Allow ingress only from Ingress controller
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
  namespace: APP_NAME
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: APP_NAME
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: http
```

### ServiceAccount

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: APP_NAME
  namespace: APP_NAME
  labels:
    app.kubernetes.io/name: APP_NAME
    app.kubernetes.io/managed-by: codeforge
automountServiceAccountToken: false
```

## Resource Calculation Defaults

Adjust `resources` based on Stack Profile:

| Language | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---|---|---|---|
| Node.js | 100m | 500m | 128Mi | 512Mi |
| Python | 100m | 500m | 128Mi | 512Mi |
| Go | 50m | 250m | 32Mi | 128Mi |
| Java | 250m | 1000m | 512Mi | 1Gi |
| Rust | 50m | 250m | 32Mi | 128Mi |
| .NET | 200m | 500m | 256Mi | 512Mi |

## Adaptation Rules

- Replace all `APP_NAME` placeholders with the actual application name from Stack Profile
- Replace `APP_PORT` with the detected application port
- Replace `REGISTRY/IMAGE:TAG` with the container registry path from CI/CD pipeline output
- If databases are detected, generate additional NetworkPolicy rules allowing app → database egress
- If the app does not have a `/health` endpoint, use TCP socket probes instead of HTTP
- For stateful applications, generate StatefulSet instead of Deployment
