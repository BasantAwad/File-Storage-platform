# Nexus Distributed File Storage System

## Team Nexus — Microservices Distribution

This repository contains the integrated microservices for the Nexus Distributed File Storage Platform. It combines the core components developed by the team.

---

## Services Overview

| Service                                        | Port | Database                             | Responsible Member      |
| ---------------------------------------------- | ---- | ------------------------------------ | ----------------------- |
| File Quota Service                             | 3001 | `quota_db` (PostgreSQL)              | Basant Awad             |
| Presigned URL Service                          | 3002 | `url_db` (PostgreSQL)                | Basant Awad             |
| API Keys Service                               | 3005 | `api_keys_db` (PostgreSQL)           | Mohamed Alsariti        |
| Rate Limit Service                             | 3006 | `rate_limit_db` (PostgreSQL)         | Mohamed Alsariti        |
| File Registry                                  | 3007 | `file_registry_db` (PostgreSQL)      | Nadira Mohamed Elsirafy |
| Upload Session                                 | 3008 | `upload_session_db` (PostgreSQL)     | Nadira Mohamed Elsirafy |
| Download Orchestrator                          | 3003 | `download_orchestrator_db` (MongoDB) | Merna Adel Abdelrahman  |
| File Sharing                                   | 3004 | `file_sharing_db` (MongoDB)          | Merna Adel Abdelrahman  |
| Distributed Services (Replication & Rebalance) | N/A  | N/A                                  | Ahmed Adel Abdelrahman  |

---

## API Keys Service

**Responsibility:** Manages creation, verification, and revocation of API keys for all services in the platform.

**Architecture:** Layered (Controller → Service → Repository)

**Communication:** Hybrid REST + Kafka

- Publishes `api_key.created` when a key is created
- Publishes `api_key.revoked` when a key is revoked

**Database Schema:**

```sql
api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner        VARCHAR NOT NULL,
  key_hash     VARCHAR(64) NOT NULL UNIQUE,
  scopes_json  TEXT NOT NULL DEFAULT '[]',
  expires_at   TIMESTAMP,
  revoked_at   TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
)
```

**Endpoints:**

| Method | Path             | Description               |
| ------ | ---------------- | ------------------------- |
| GET    | /health          | Liveness check            |
| GET    | /ready           | Readiness check (DB ping) |
| POST   | /keys            | Create a new API key      |
| POST   | /keys/verify     | Verify an API key         |
| POST   | /keys/:id/revoke | Revoke a key by ID        |

**Example — Create Key:**

```bash
curl -X POST http://localhost:3005/keys \
  -H "Content-Type: application/json" \
  -d '{"owner": "user-123", "scopes": ["read", "write"], "expires_at": null}'
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "owner": "user-123",
    "key": "nxs_<64-hex-chars>",
    "scopes": ["read", "write"],
    "expires_at": null,
    "created_at": "2026-04-26T..."
  },
  "meta": { "service": "api-keys-service", "request_id": "..." }
}
```

> **Note:** The raw key is returned only once on creation. It is never stored — only its SHA-256 hash is persisted.

**Example — Verify Key:**

```bash
curl -X POST http://localhost:3005/keys/verify \
  -H "Content-Type: application/json" \
  -d '{"key": "nxs_<your-key>"}'
```

**Example — Revoke Key:**

```bash
curl -X POST http://localhost:3005/keys/<key-id>/revoke
```

---

## Rate Limit Service

**Responsibility:** Enforces per-identity rate limiting across all public endpoints of the platform using a sliding 1-minute window counter.

**Architecture:** Layered (Controller → Service → Repository)

**Communication:** Hybrid REST + Kafka

- Publishes `rate_limit.exceeded` when a limit is breached

**Database Schema:**

```sql
rate_limits (
  identity        VARCHAR PRIMARY KEY,
  limit_per_minute INTEGER NOT NULL DEFAULT 60,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
)

rate_counters (
  id           SERIAL PRIMARY KEY,
  identity     VARCHAR NOT NULL,
  window_start TIMESTAMP NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  INDEX (identity, window_start)
)
```

**Endpoints:**

| Method | Path              | Description                        |
| ------ | ----------------- | ---------------------------------- |
| GET    | /health           | Liveness check                     |
| GET    | /ready            | Readiness check (DB ping)          |
| POST   | /ratelimit/check  | Check and increment rate counter   |
| POST   | /ratelimit/config | Set a custom limit for an identity |

**Example — Check Rate Limit:**

```bash
curl -X POST http://localhost:3006/ratelimit/check \
  -H "Content-Type: application/json" \
  -d '{"identity": "user-123"}'
```

Response (allowed):

```json
{
  "success": true,
  "data": {
    "allowed": true,
    "identity": "user-123",
    "limit_per_minute": 60,
    "current_count": 1,
    "remaining": 59,
    "window_start": "2026-04-26T12:00:00.000Z"
  },
  "meta": { "service": "rate-limit-service", "request_id": "..." }
}
```

Response (blocked, HTTP 429):

```json
{
  "success": false,
  "data": { "allowed": false, ... },
  "meta": { ... }
}
```

**Example — Configure Custom Limit:**

```bash
curl -X POST http://localhost:3006/ratelimit/config \
  -H "Content-Type: application/json" \
  -d '{"identity": "premium-user-456", "limit_per_minute": 300}'
```

---

## Running Locally

### Prerequisites

- Docker >= 24
- Docker Compose >= 2

### Start All Services

```bash
docker-compose up --build -d
```

This starts:

- Zookeeper (port 2181)
- Kafka (port 9092)
- Kafka UI (port 8080)
- `quota_db` PostgreSQL (port 5432)
- `url_db` PostgreSQL (port 5433)
- `api_keys_db` PostgreSQL (port 5435)
- `rate_limit_db` PostgreSQL (port 5436)
- `file_registry_db` PostgreSQL (port 5437)
- `upload_session_db` PostgreSQL (port 5438)
- `file-quota-service` (port 3001)
- `presigned-url-service` (port 3002)
- `api-keys-service` (port 3005)
- `rate-limit-service` (port 3006)
- `file-registry` (port 3007)
- `upload-session` (port 3008)
- `download-orchestrator` (port 3003)
- `file-sharing` (port 3004)
- `mongo-download` MongoDB (port 27021)
- `mongo-sharing` MongoDB (port 27022)

Database migrations run automatically on service startup.

### Health Checks

**For Bash / Linux / macOS:**

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
curl http://localhost:3006/health
curl http://localhost:3007/health
curl http://localhost:3008/health
```

**For Windows PowerShell:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health"
Invoke-RestMethod -Uri "http://localhost:3002/health"
Invoke-RestMethod -Uri "http://localhost:3003/health"
Invoke-RestMethod -Uri "http://localhost:3004/health"
Invoke-RestMethod -Uri "http://localhost:3005/health"
Invoke-RestMethod -Uri "http://localhost:3006/health"
Invoke-RestMethod -Uri "http://localhost:3007/health"
Invoke-RestMethod -Uri "http://localhost:3008/health"
```

**Example Successful Output:**

```
success data                                        meta
------- ----                                        ----
   True @{status=healthy; service=api-keys-service} @{service=api-keys-service; request_id=d8846b07...}
```

### End-to-End Workflow Tests (PowerShell)

**1. Create a new API Key:**

```powershell
$body = @{ owner = "test-user-123"; scopes = @("read", "write") } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3005/keys" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
```

_Result:_

```
success data
------- ----
   True @{id=...; owner=test-user-123; key=nxs_...}
```

**2. Check Rate Limit:**

```powershell
$rateLimitBody = @{ identity = "test-user-123" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3006/ratelimit/check" -Method POST -Headers @{"Content-Type"="application/json"} -Body $rateLimitBody
```

_Result:_

```
success data
------- ----
   True @{allowed=True; identity=test-user-123; limit_per_minute=60; current_count=1; remaining=59...}
```

### Stop Services

```bash
docker-compose down
```

To also remove volumes (database data):

```bash
docker-compose down -v
```

---

## Standard API Response Format

All endpoints follow this envelope:

```json
{
  "success": true,
  "data": { "...": "..." },
  "meta": {
    "service": "service-name",
    "request_id": "uuid-v4"
  }
}
```

---

## Merna Contribution (Download Orchestrator + File Sharing)

This branch adds Merna Adel Abdelrahman services to the Team1 baseline:

### 1. Download Orchestrator

- Endpoint: GET /downloads/{file_id}/plan
- Publishes Kafka event: file.downloaded
- Background consumer stores:
  - download analytics record
  - download audit record

### 2. File Sharing

- Endpoints:
  - POST /shares
  - GET /shares/{token}
- Publishes Kafka event: file.shared
- Background consumer stores:
  - notification email log
  - share analytics log

### Added Infrastructure

- Docker setup for both services
- Kubernetes manifests:
  - k8s/download-orchestrator.yaml
  - k8s/file-sharing.yaml
- Kubernetes manifests in service directories (`k8s.yaml`)
- Health/readiness endpoints and test setup for both services

---

## Technical Stack

| Component        | Technology              |
| ---------------- | ----------------------- |
| Runtime          | Node.js 20              |
| Framework        | Express.js              |
| DB Query Builder | Knex.js                 |
| Database         | PostgreSQL 15           |
| Event Bus        | Apache Kafka (KafkaJS)  |
| Process Manager  | PM2                     |
| Containerization | Docker + Docker Compose |

---

## Project Context

Part of the **Nexus Distributed File Storage Platform** — Team Nexus microservices distribution:

| Member                  | Student ID | Services                             |
| ----------------------- | ---------- | ------------------------------------ |
| Basant Awad             | 22101405   | File Quota + Presigned URL           |
| Nadira Mohamed Elsirafy | 22101377   | File Registry + Upload Session       |
| Mohamed Alsariti        | 22101901   | API Keys + Rate Limit                |
| Merna Adel Abdelrahman  | 22101164   | Download Orchestrator + File Sharing |
| Ahmed Adel Abdelrahman  | 22101163   | Replication Worker + Rebalance       |
