# Nexus Distributed File Storage System
## Mohamed Alsariti — 22101901 | API Keys + Rate Limit Services

This branch implements two microservices as part of the Nexus Distributed File Storage Platform.

---

## Services Overview

| Service | Port | Database | Pattern |
|---|---|---|---|
| API Keys Service | 3005 | `api_keys_db` (PostgreSQL) | Layered + Kafka |
| Rate Limit Service | 3006 | `rate_limit_db` (PostgreSQL) | Layered + Kafka |

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

| Method | Path | Description |
|---|---|---|
| GET | /health | Liveness check |
| GET | /ready | Readiness check (DB ping) |
| POST | /keys | Create a new API key |
| POST | /keys/verify | Verify an API key |
| POST | /keys/:id/revoke | Revoke a key by ID |

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

| Method | Path | Description |
|---|---|---|
| GET | /health | Liveness check |
| GET | /ready | Readiness check (DB ping) |
| POST | /ratelimit/check | Check and increment rate counter |
| POST | /ratelimit/config | Set a custom limit for an identity |

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
- `api_keys_db` PostgreSQL (port 5435)
- `rate_limit_db` PostgreSQL (port 5436)
- `api-keys-service` (port 3005)
- `rate-limit-service` (port 3006)

Database migrations run automatically on service startup.

### Health Checks
```bash
curl http://localhost:3005/health
curl http://localhost:3005/ready
curl http://localhost:3006/health
curl http://localhost:3006/ready
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
  "data": { "..." : "..." },
  "meta": {
    "service": "service-name",
    "request_id": "uuid-v4"
  }
}
```

---

## Technical Stack

| Component | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express.js |
| DB Query Builder | Knex.js |
| Database | PostgreSQL 15 |
| Event Bus | Apache Kafka (KafkaJS) |
| Process Manager | PM2 |
| Containerization | Docker + Docker Compose |

---

## Project Context

Part of the **Nexus Distributed File Storage Platform** — Team Nexus microservices distribution:

| Member | Student ID | Services |
|---|---|---|
| Basant Awad | 22101405 | File Quota + Presigned URL |
| Nadira Mohamed Elsirafy | 22101377 | File Registry + Upload Session |
| **Mohamed Alsariti** | **22101901** | **API Keys + Rate Limit** |
| Merna Adel Abdelrahman | 22101164 | Download Orchestrator + File Sharing |
| Ahmed Adel Abdelrahman | 22101163 | Replication Worker + Rebalance |
