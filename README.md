<p align="center"><img src="https://raw.githubusercontent.com/BasantAwad/BasantAwad/main/assets/introduction-banner.svg" alt="Terminal-inspired project banner" width="100%" /></p>

<!-- terminal-badges -->
<p align="center">
  <img src="https://img.shields.io/badge/Distributed%20Systems-8B5CF6?style=flat-square&logo=apachekafka&logoColor=white" alt="Distributed Systems" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
</p>

<p align="center"><img src="https://raw.githubusercontent.com/BasantAwad/BasantAwad/main/assets/introduction-banner.svg" alt="Animated terminal profile for Basant Awad Mohamed" width="100%" /></p>

# Nexus Distributed File Storage Platform

A distributed file-storage platform built around event-driven services, secure file access, and asynchronous processing. The repository contains the platform services and supporting infrastructure for quota management, presigned URLs, file registration, upload sessions, sharing, and orchestration.

## Highlights

- Kafka-based asynchronous workflows for file-processing events.
- PostgreSQL and MongoDB services selected by workload.
- Presigned URLs for controlled file access.
- Redis caching and service-level health/readiness endpoints.
- Docker Compose environment for local development.

## Stack

Node.js, Apache Kafka, PostgreSQL, MongoDB, Redis, Docker, REST APIs, event-driven microservices.

## Run locally

```bash
docker compose up --build
```

Read the service-level documentation in each service directory before exposing the stack outside a local development environment.

## Service responsibilities

The platform includes quota, URL, API-key, rate-limit, registry, upload-session, download-orchestration, and file-sharing services. The companion [`microservices`](https://github.com/BasantAwad/microservices) repository contains a separate Django/RabbitMQ microservices exercise.
