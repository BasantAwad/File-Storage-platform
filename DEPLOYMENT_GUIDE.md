# Deployment & Testing Guide

## 1. Kubernetes Deployment

### Prerequisites
- kubectl installed
- Kubernetes cluster (v1.24+)
- Helm 3.x installed

### Deploy using Helm

```bash
# Create namespace
kubectl create namespace cse474-prod

# Install Helm chart
helm install cse474 ./helm/cse474 \
  --namespace cse474-prod \
  --values helm/cse474/values.yaml

# Verify deployment
kubectl get pods -n cse474-prod
kubectl get svc -n cse474-prod
```

### Manual Deployment with kubectl

```bash
# Deploy configuration
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/download-orchestrator-configmap.yaml
kubectl apply -f k8s/download-orchestrator-secret.yaml
kubectl apply -f k8s/file-sharing-configmap.yaml
kubectl apply -f k8s/file-sharing-secret.yaml

# Deploy services
kubectl apply -f k8s/download-orchestrator-deployment.yaml
kubectl apply -f k8s/file-sharing-deployment.yaml
kubectl apply -f k8s/download-orchestrator-service.yaml
kubectl apply -f k8s/file-sharing-service.yaml

# Configure networking
kubectl apply -f k8s/ingress.yaml
```

### Port Forwarding (for local testing)

```bash
# Download Orchestrator
kubectl port-forward -n cse474-prod svc/download-orchestrator 3001:80

# File Sharing Service
kubectl port-forward -n cse474-prod svc/file-sharing 3002:80
```

## 2. Running Tests

### Unit Tests
```bash
cd services/download-orchestrator
npm test -- --testPathPattern="unit.test.js"

cd services/file-sharing
npm test -- --testPathPattern="unit.test.js"
```

### Integration Tests
```bash
cd services/download-orchestrator
npm test -- --testPathPattern="integration.test.js"

cd services/file-sharing
npm test -- --testPathPattern="integration.test.js"
```

### Coverage Report
```bash
cd services/download-orchestrator
npm test -- --coverage
# Report generated at: tests/coverage/

cd services/file-sharing
npm test -- --coverage
# Report generated at: tests/coverage/
```

## 3. CI/CD Pipeline

Automated workflows trigger on:
- Push to `main` or `develop` branches
- Pull requests to `main`

Pipeline stages:
1. **Lint** - ESLint static analysis
2. **Build** - Install dependencies
3. **Test** - Run unit & integration tests
4. **Docker Build** - Build & push container image
5. **Deploy** - Deploy to Kubernetes cluster

Workflow files:
- `.github/workflows/download-orchestrator-ci-cd.yml`
- `.github/workflows/file-sharing-ci-cd.yml`

## 4. Observability

### Prometheus Metrics

Access metrics at:
- `http://localhost:3001/metrics` (download-orchestrator)
- `http://localhost:3002/metrics` (file-sharing)

Prometheus configuration: `observability/prometheus.yml`

Scrape interval: 30 seconds

Key metrics:
- `http_requests_total` - Total HTTP requests
- `http_errors_total` - Total HTTP errors
- `http_request_duration_seconds` - Request latency (p50/p95/p99)

### Structured Logging

Services emit JSON logs with:
- timestamp (ISO 8601 format)
- service name
- request_id (for tracing)
- log level
- message

Logger utility: `observability/logger.js`

### Distributed Tracing

Traces exported to Jaeger:
- Endpoint: `http://jaeger:14268/api/traces`
- Tracer utility: `observability/tracer.js`

Multi-service traces capture:
- Service name
- Operation name
- Latency
- Status

## 5. API Documentation

### Swagger UI

Access interactive API docs at:
- `http://localhost:3001/docs` (download-orchestrator)
- `http://localhost:3002/docs` (file-sharing)

OpenAPI specifications:
- `docs/download-orchestrator-openapi.json`
- `docs/file-sharing-openapi.json`

### Health Endpoints

- GET `/health` - Service health status
- GET `/ready` - Readiness probe
- GET `/metrics` - Prometheus metrics

## Verification Checklist

- [x] K8s deployment manifests with replicas: 2
- [x] Resource limits and requests defined
- [x] Liveness and Readiness probes configured
- [x] Environment variables via ConfigMap/Secret
- [x] Service manifests (ClusterIP)
- [x] Ingress resource configured
- [x] Namespace: cse474-prod
- [x] Helm chart with values override support
- [x] Unit tests (5+ per service)
- [x] Integration tests (3+ per service)
- [x] Coverage reports (50%+ threshold)
- [x] CI/CD pipeline with all stages
- [x] Structured JSON logging
- [x] Prometheus metrics endpoint
- [x] Distributed tracing with Jaeger
- [x] Swagger UI at /docs
- [x] OpenAPI specs included

## Directory Structure

```
/k8s/                              # Kubernetes manifests
  ├── namespace.yaml
  ├── download-orchestrator-*.yaml
  ├── file-sharing-*.yaml
  └── ingress.yaml

/helm/cse474/                       # Helm chart
  ├── Chart.yaml
  ├── values.yaml
  └── templates/

/observability/                     # Observability config
  ├── prometheus.yml
  ├── prometheus-rules.yml
  ├── logger.js
  ├── metrics.js
  └── tracer.js

/.github/workflows/                 # CI/CD workflows
  ├── download-orchestrator-ci-cd.yml
  └── file-sharing-ci-cd.yml

/docs/                              # API documentation
  ├── download-orchestrator-openapi.json
  └── file-sharing-openapi.json

/services/download-orchestrator/
  ├── tests/
  │   ├── unit.test.js
  │   ├── integration.test.js
  │   ├── app.test.js
  │   └── coverage/
  └── jest.config.js

/services/file-sharing/
  ├── tests/
  │   ├── unit.test.js
  │   ├── integration.test.js
  │   ├── app.test.js
  │   └── coverage/
  └── jest.config.js
```
