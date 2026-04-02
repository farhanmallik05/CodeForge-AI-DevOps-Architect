# CI/CD Security — CodeForge Knowledge Base

## Supply Chain Security (SLSA Framework)

The Supply-chain Levels for Software Artifacts (SLSA) framework defines four levels of supply chain security maturity:

| Level | Requirements | CodeForge Implementation |
|---|---|---|
| SLSA 1 | Documented build process | GitHub Actions workflow checked into repo |
| SLSA 2 | Hosted build service, version control | GitHub-hosted runners, signed builds |
| SLSA 3 | Hardened build platform, provenance | BuildKit provenance attestation, SBOM |
| SLSA 4 | Two-party review, hermetic builds | Required PR reviews, reproducible builds |

### SBOM Generation

Software Bill of Materials provides transparency into all dependencies in the final artifact:

```yaml
# Using Syft in CI/CD
- name: Generate SBOM
  uses: anchore/sbom-action@v0
  with:
    image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ env.TAG }}
    format: spdx-json
    output-file: sbom.spdx.json

# Using Trivy
- name: Generate SBOM with Trivy
  run: |
    trivy image --format spdx-json \
      --output sbom.spdx.json \
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ env.TAG }}
```

### Image Signing (Cosign/Sigstore)

```yaml
- name: Sign container image
  uses: sigstore/cosign-installer@v3
- run: |
    cosign sign --yes \
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ steps.build.outputs.digest }}
```

## GitHub Actions Security

### Pin Actions to Commit SHAs

```yaml
# ❌ BAD: Version tags can be force-pushed by maintainers
- uses: actions/checkout@v4

# ✅ GOOD: SHA refs are immutable
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
```

**Why:** If a GitHub Action's repository is compromised, attackers can modify the code behind a version tag. Commit SHAs are immutable and can't be changed.

### Minimal Permissions

```yaml
# ❌ BAD: Default permissions give read-write to everything
permissions: write-all

# ✅ GOOD: Explicit, minimal permissions per job
permissions:
  contents: read        # Read repo
  packages: write       # Push to GHCR
  security-events: write # Upload SARIF
  id-token: write       # OIDC for keyless signing
```

### Secrets Management

| Method | Security Level | Use Case |
|---|---|---|
| GitHub Secrets | Good | CI/CD-only secrets (registry passwords, deploy keys) |
| GitHub OIDC + Cloud IAM | Better | Keyless access to AWS/GCP/Azure (no long-lived credentials) |
| HashiCorp Vault | Best | Centralized secret management with rotation, audit |

### Environment Protection Rules

```yaml
deploy:
  environment:
    name: production
    url: https://app.example.com
  # GitHub enforces: required reviewers, wait timer, branch restrictions
```

## Dependency Management

### Automated Updates with Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  # Application dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    reviewers:
      - "platform-team"
    labels:
      - "dependencies"
    open-pull-requests-limit: 10

  # GitHub Actions versions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "ci-cd"
```

### Vulnerability Scanning Pipeline

```
Dependency Audit ──▶ SAST (Static Analysis) ──▶ Container Scan ──▶ Runtime Scan
  npm audit            CodeQL / Semgrep         Trivy / Grype      Falco / Sysdig
  pip audit            
  go vuln check        
```

## Artifact Integrity

### Container Image Attestation

Docker BuildKit can generate provenance attestations automatically:

```yaml
- name: Build with provenance
  uses: docker/build-push-action@v6
  with:
    provenance: true    # Generates SLSA provenance attestation
    sbom: true          # Generates SBOM attestation
```

### Verification at Deploy Time

```yaml
# In deployment pipeline: verify image signature before deploying
- name: Verify image signature
  run: |
    cosign verify \
      --certificate-identity-regexp=".*@github.com" \
      --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ env.DIGEST }}
```
