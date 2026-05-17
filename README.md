# Nexus Distributed File Storage Platform

Welcome to the **Nexus Distributed File Storage Platform** — a highly scalable, containerized microservices-based system designed for managing multi-part file uploads, time-bound link generation, storage quotas, public link sharing, distributed replication, and secure rate-limited API gateways.

---

## 1. Platform Architecture & Port Map

The platform is composed of **9 specialized microservices** communicating via high-performance REST APIs and asynchronous event-driven messages (Apache Kafka), orchestrated on **Kubernetes** and **Docker-Compose**.

| Service Name | Port | Database Engine | Responsibility | Primary Contact |
| :--- | :---: | :--- | :--- | :--- |
| **File Quota Service** | `3001` | PostgreSQL (`quota_db`) | Verifies and updates user storage thresholds. | Basant Awad |
| **Presigned URL Service** | `3002` | PostgreSQL (`url_db`) | Generates secure time-bound upload/download URLs. | Basant Awad |
| **Download Orchestrator** | `3003` | MongoDB (`download_orchestrator_db`) | Manages download planning and routes metrics. | Merna Adel |
| **File Sharing Service** | `3004` | MongoDB (`file_sharing_db`) | Manages public file sharing tokens and notifications. | Merna Adel |
| **API Keys Service** | `3005` | PostgreSQL (`api_keys_db`) | Generates, verifies, and revokes SHA-256 API tokens. | Mohamed Alsariti |
| **Rate Limit Service** | `3006` | PostgreSQL (`rate_limit_db`) | Implements a sliding 1-minute rate limit window. | Mohamed Alsariti |
| **File Registry** | `3007` | PostgreSQL (`file_registry_db`) | Tracks core file metadata catalogs and versions. | Nadira Mohamed |
| **Upload Session Service** | `3008` | PostgreSQL (`upload_session_db`) | Coordinates multi-part chunked upload workflows. | Nadira Mohamed |
| **Distributed Services** | `N/A` | Distributed Memory | Handles chunk replication and storage rebalancing. | Ahmed Adel |

---

## 2. Kubernetes & Helm Deployment

The entire system is production-ready for **Kubernetes (v1.28+)** deployment. Manifests are organized under a centralized Helm chart and individual declarative templates.

### 2.1 Standardized Helm Chart Structure
The chart templates under [/helm/chart/templates/](file:///c:/Users/Pc/File-Storage-platform/helm/chart/templates) are cleanly structured and decentralized service-by-service:

*   **File Quota Service**: `deployment-file-quota.yaml`, `service-file-quota.yaml`, `configmap-file-quota.yaml`, `secret-file-quota.yaml`
*   **Presigned URL Service**: `deployment-presigned-url.yaml`, `service-presigned-url.yaml`, `configmap-presigned-url.yaml`, `secret-presigned-url.yaml`
*   **Download Orchestrator**: `deployment-download-orchestrator.yaml`, `service-download-orchestrator.yaml`, `configmap-download-orchestrator.yaml`, `secret-download-orchestrator.yaml`
*   **File Sharing**: `deployment-file-sharing.yaml`, `service-file-sharing.yaml`, `configmap-file-sharing.yaml`, `secret-file-sharing.yaml`
*   **File Registry & Upload Session**: `deployment-file-registry.yaml`, `service-file-registry.yaml`, `deployment-upload-session.yaml`, `service-upload-session.yaml`, `configmap.yaml` (shared configurations)
*   **Ingress & Routing**: `ingress.yaml` (Exposes single-host path routing `api.cse474.local/` alongside subdomains like `quota.cse474.local` and `urls.cse474.local`).

### 2.2 Helm Installation
The system deploys cleanly into the target namespace using a single command:
```bash
helm install cse474 ./helm/chart --namespace cse474-prod --create-namespace
```
*Liveness/Readiness probes (`GET /health` and `GET /ready`) protect the cluster by refusing traffic until DB connections are established, and automatically restarting crashed pods.*

---

## 3. CI/CD Pipelines

Our continuous integration and continuous delivery pipelines are automated using **GitHub Actions**:

1.  **Continuous Integration** (triggers on `push` and `pull_request` to `main`):
    *   **Lint**: Evaluates code style and checks for syntax errors (`npx eslint`).
    *   **Build**: Compiles Node.js environments and registers dependencies.
    *   **Test**: Runs automated unit and integration suites, pushing coverage logs.
    *   **Docker Build & Push**: Builds lightweight container images, tags them with the commit SHA and `latest`, and pushes them to the **GitHub Container Registry (GHCR)**.
2.  **Continuous Delivery** (triggers on merge to `main`):
    *   Initiates Kubernetes target namespace setup (`namespace.yaml`).
    *   Deploys Quota & Presigned URL services via `kubectl apply -f k8s/`.
    *   Upgrades Registry & Upload Session releases using `helm upgrade --install`.
    *   *The pipeline immediately halts and aborts deployments if a single test stage fails.*

---

## 4. Platform Testing Suite

We have comprehensive automated testing environments utilizing Jest and Supertest. 

### 4.1 Running Tests Locally
To run automated test suites for any service, navigate into its folder and execute:
```bash
npm run test
```

### 4.2 Test Verification Results (100% Success)
**77 out of 77 automated unit and mocked integration tests pass cleanly:**
*   **`file-quota-service`**: **20/20 Passed** — Verifies thresholds, auto-creation of profiles, and exceeding limits (HTTP 403).
*   **`presigned-url-service`**: **18/18 Passed** — Verifies link signature algorithms and token validations.
*   **`file-registry`**: **17/17 Passed** — Validates core metadata tracking, version cataloging, and soft-deletes.
*   **`upload-session`**: **17/17 Passed** — Validates multi-part chunk workflows and final event triggers.
*   **`download-orchestrator-service`**: **2/2 Passed** — Checks download plan routers.
*   **`file-sharing-service`**: **3/3 Passed** — Verifies share token routing.

---

## 5. Observability (Logs, Metrics, & Traces)

The system implements the three pillars of observability in line with PM3 criteria:

1.  **Structured JSON Logging**: Every log entry is written as structured JSON (via Winston) detailing `timestamp`, `service`, `request_id`, `level`, and `message`, directly ingestible by Loki/ELK.
2.  **Prometheus Metrics**: Every service exposes a `GET /metrics` endpoint in Prometheus text format tracking request latency, counts, and error rates. The central target scrape config is located at [observability/prometheus.yml](file:///c:/Users/Pc/File-Storage-platform/observability/prometheus.yml).
3.  **Distributed Tracing**: Instrumented with OpenTelemetry, exporting multi-service context spans to a centralized Jaeger/Zipkin collector.

---

## 6. API Documentation

Every microservice exposes an interactive **Swagger UI** gateway served at:
*   `GET /docs` (or `GET /api-docs`)
*   *OpenAPI JSON specs are statically backed in the [/docs/](file:///c:/Users/Pc/File-Storage-platform/docs) folder.*

---

## 7. BONUS: n8n Workflow Automation

We have implemented an automated multi-service webhook workflow located at [n8n/workflows/workflow.json](file:///c:/Users/Pc/File-Storage-platform/n8n/workflows/workflow.json):
1.  **Webhook Trigger**: Fires on successful file registration.
2.  **Service Query**: Hits the `file-registry` HTTP endpoint to gather filename, size, and owner metadata.
3.  **Session Check**: Contacts the `upload-session` service to verify chunk completeness.
4.  **Notification Dispatch**: Generates a unified message and posts it directly to team alerts via the Telegram API node.

---

## 8. Development & Local Setup

### 8.1 Start the Local Environment
Ensure Docker is running, then execute the command at the root directory:
```bash
docker-compose up --build -d
```
*This spins up PostgreSQL instances, MongoDB engines, Zookeeper, Apache Kafka broker nodes, and the Kafka Web UI (`localhost:8080`).*

### 8.2 Team Directory
*   **Basant Awad** (22101405) — File Quota + Presigned URL Services
*   **Nadira Mohamed Elsirafy** (22101377) — File Registry + Upload Session
*   **Mohamed Alsariti** (22101901) — API Keys + Rate Limit Services
*   **Merna Adel Abdelrahman** (22101164) — Download Orchestrator + File Sharing
*   **Ahmed Adel Abdelrahman** (22101163) — Distributed Services (Rebalancing & Replication)
