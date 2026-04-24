# File Sharing Management (Two Services Only)

## Overview
This project contains exactly two MVC services:
1. Download Orchestrator
2. File Sharing

Both services use Hybrid REST + Kafka, expose health/readiness endpoints, run with PM2, include tests, and are fully containerized.

## Service 1: Download Orchestrator
Endpoint:
- GET /downloads/{file_id}/plan

Behavior:
- Returns a download plan.
- Uses optional in-memory cache.
- Integrates chunk catalog and chunk location data (service-layer integration).
- Publishes Kafka event to topic `file.downloaded`.
- Background consumer records each download as:
  - billable/trackable analytics record
  - audit log record

## Service 2: File Sharing
Endpoints:
- POST /shares
- GET /shares/{token}

Database schema (implemented):
- shares(id PK via Mongo _id, file_id, token UNIQUE, expires_at)

Behavior:
- POST /shares returns a new share token.
- Publishes Kafka event to topic `file.shared`.
- Background consumer processes shared events and:
  - simulates notification email to recipient (stored log)
  - stores analytics log for share activity

## Architecture and Pattern (MVC + PM2)
Both services use this structure:

```
service-name/
  src/
    config/
    controllers/
    models/
    routes/
    services/
    docs/
    utils/
    app.js
    server.js
  tests/
  Dockerfile
  ecosystem.config.js
  package.json
```

Runtime process manager:
- PM2 (`pm2-runtime`) is used in Docker startup.

## JSON Response Standard
Success:

```json
{
  "success": true,
  "message": "...",
  "data": {},
  "timestamp": "..."
}
```

Error:

```json
{
  "success": false,
  "message": "...",
  "errors": [],
  "timestamp": "..."
}
```

## Health Endpoints
Each service exposes:
- GET /health
- GET /ready

## API Documentation
Swagger UI is exposed at:
- GET /docs

## Dockerization
Implemented:
- Correct Dockerfile for each service
- Root `docker-compose.yml` with:
  - download-orchestrator
  - file-sharing
  - kafka
  - zookeeper
  - mongo-download
  - mongo-sharing

Run:

```bash
docker compose up --build
```

## Kubernetes
Deployment files:
- k8s/download-orchestrator.yaml
- k8s/file-sharing.yaml

Both deployments use:
- replicas: 2

Apply:

```bash
kubectl apply -f k8s/download-orchestrator.yaml
kubectl apply -f k8s/file-sharing.yaml
```

## Database Setup
- Download Orchestrator DB: `download_orchestrator_db`
- File Sharing DB: `file_sharing_db`

No shared database is used.

## Kafka Setup
Topics:
- `file.downloaded`
- `file.shared`

Producer/consumer logic is implemented in both services.

## Local Setup and Tests
Install dependencies:

```bash
cd services/download-orchestrator
npm install

cd ../file-sharing
npm install
```

Run tests:

```bash
cd services/download-orchestrator
npm test

cd ../file-sharing
npm test
```
