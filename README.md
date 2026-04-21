# Nexus Distributed File Storage System - Phase 2
**Author:** Basant Awad
**Services Included:** File Quota Service, Presigned URL Service

## Architecture Overview
This implements two independent microservices for the Nexus Distributed File Storage project, adhering to Phase 2 constraints.

1. **File Quota Service (#35)**
   - **Responsibility:** Validates user storage capacity before file uploads.
   - **Pattern:** Layered Architecture (Controller, Service, Repository).
   - **Communication:** Hybrid REST + Kafka (`quota.exceeded` topic).
   - **Database:** Own private PostgreSQL DB (`quota_db`).

2. **Presigned URL Service (#36)**
   - **Responsibility:** Generates signed links for secure direct-to-storage-gateway access.
   - **Pattern:** Layered Architecture (Controller, Service, Repository).
   - **Communication:** Pure REST Only (No Kafka to ensure real-time security performance).
   - **Database:** Own private PostgreSQL DB (`url_db`).

## Technology Stack
- **Runtime Environment:** Node.js, PM2 (Process Manager)
- **Framework:** Express.js
- **Database Query Builder:** Knex.js
- **Database Engine:** PostgreSQL
- **Event Bus:** Apache Kafka + Zookeeper
- **Containerization:** Docker & Docker Compose

## API Endpoints
### File Quota Service (Port 3001)
- `GET /health` : Health check.
- `POST /quota/check` : Validates available space and reserves it if allowed.
  - **Body:** `{ "user_id": "student-1", "new_file_size": 1048576 }`

### Presigned URL Service (Port 3002)
- `GET /health` : Health check.
- `POST /url/generate` : Generates a secure tokenized URL.
  - **Body:** `{ "user_id": "student-1", "file_id": "file-123", "action": "download" }`

## Running Locally

### Pre-requisites
- Docker and Docker Compose installed.

### Setup Instructions
1. At the root directory run:
   ```bash
   docker-compose up --build -d
   ```
2. Wait a few moments for Zookeeper, Kafka, and the PostgreSQL databases to initialize.
3. The services will automatically start via PM2 in their Docker containers.
4. Test the health checks:
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3002/health
   ```
