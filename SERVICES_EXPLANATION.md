# Microservices Documentation: File Quota & Presigned URL

This document provides a comprehensive explanation of the `file-quota-service` and `presigned-url-service` microservices. It breaks down the code structure, containerization (Docker), event-driven communication (Kafka), and inter-service communication patterns.

---

## 1. Core Services Explained

### File Quota Service
**Purpose:** Manages and enforces storage limits for users on the platform. It tracks how much storage a user has consumed and determines if they are allowed to upload new files.
**Key Features:**
- **Quota Checking:** Evaluates `used_storage` + `new_file_size` against `max_storage`.
- **Event Publishing:** Emits a Kafka event (`quota.exceeded`) if an upload exceeds the allowed storage limit.

### Presigned URL Service
**Purpose:** Secures file access by generating temporary, time-bound URLs for uploading or downloading files directly to/from the storage gateway (like AWS S3 or MinIO). 
**Key Features:**
- **Token Generation:** Generates a unique, cryptographically secure 32-byte hex token for a specific file and action (`upload` or `download`).
- **Expiration:** URLs are explicitly set to expire (e.g., in 1 hour) and are saved to the database to ensure they cannot be reused indefinitely.

---

## 2. Dockerfile Breakdown

Both services use a nearly identical `Dockerfile` optimized for production Node.js applications. 

**How it works step-by-step:**
1. `FROM node:18-alpine`: Uses a lightweight Linux distribution (Alpine) with Node.js 18 pre-installed. This keeps the image size minimal and secure.
2. `WORKDIR /app`: Sets the working directory inside the container.
3. `RUN npm install -g pm2`: Installs PM2 globally. PM2 is a production process manager that keeps the Node.js application alive forever, handles restarts on crashes, and manages logs.
4. `COPY package*.json ./` & `RUN npm install`: Copies only the dependency definitions first. This takes advantage of Docker's layer caching—if you change code but not dependencies, Docker skips the `npm install` step, making builds much faster.
5. `COPY . .`: Copies the actual source code into the container.
6. `EXPOSE 3001` (or `3002`): Documents the port that the application listens on.
7. `CMD ["pm2-runtime", "start", "ecosystem.config.js"]`: Starts the app using PM2 in "runtime" mode (which prevents the container from exiting) based on the specific configurations in `ecosystem.config.js`.

---

## 3. Why and How We Use Kafka

**Why Kafka?**
Kafka is used for **Asynchronous, Event-Driven Communication**. We use it to decouple services. If the File Quota service needs to notify the system that a user ran out of space (e.g., to send them an email or block their account), it shouldn't have to wait for the Email Service to respond. Waiting would slow down the user's API request.

**How exactly is it implemented?**
- In `file-quota-service/src/config/kafka.js`, the service initializes a **Kafka Producer**.
- When a user tries to upload a file that pushes their usage over the limit, `quota.service.js` calls `publishQuotaExceeded()`.
- This function sends a message to the `quota.exceeded` Kafka topic containing the `user_id`, `current_used`, `max_storage`, and the timestamp.
- **Other microservices** (like a Notification Service) can subscribe to this `quota.exceeded` topic as **Consumers** and send an email alert in the background, completely independent of the Quota Service.

---

## 4. How Services Communicate With Others

The platform utilizes a hybrid communication architecture:

1. **Synchronous Communication (REST/HTTP):** 
   Used when a service *must* have an immediate answer to proceed.
   - **Example:** Look inside the `src/clients` folders. The `file-quota-service` has a `fileRegistry.client.js` to fetch file sizes synchronously. The `presigned-url-service` has an `auth.client.js` to validate user tokens synchronously before generating a URL. These act as internal HTTP clients making `GET`/`POST` requests to other services.

2. **Asynchronous Communication (Message Broker):**
   Used for background tasks or publishing system-wide states via Kafka (e.g., the `quota.exceeded` event mentioned above).

---

## 5. Directory & File Structure (Clean Architecture)

Both services strictly follow a layered architecture. This separates concerns, making the code easier to test, debug, and scale.

### Directory Breakdown
- **`src/config/`**: Contains initialization logic for infrastructure.
  - `db.js`: Database connection setup (using Knex.js).
  - `kafka.js`: (In Quota Service) Connects to the Kafka broker.
- **`src/routes/`**: Express.js route definitions. It maps HTTP paths (e.g., `POST /check`) to the corresponding controller functions.
- **`src/controllers/`**: The presentation layer. 
  - Validates incoming HTTP request body/parameters.
  - Calls the Service layer.
  - Formats the final JSON response (success or error). Example: `quota.controller.js` standardizes the response with a `meta` tag for request tracking.
- **`src/services/`**: The core **Business Logic** layer.
  - Contains the actual "rules" of the application (e.g., `checkQuota` doing the math, or `createPresignedUrl` generating the crypto token). It calls the Repositories to get/save data.
- **`src/repositories/`**: The Data Access layer.
  - Strictly handles database queries (SQL inserts, selects). `quota.repository.js` and `url.repository.js` interact directly with the database schemas using the Knex query builder.
- **`src/clients/`**: The external communication layer. Contains logic to make HTTP calls to *other* microservices.
- **`src/index.js`**: The entry point. Initializes the Express app, attaches the routes, and starts the server.

### Root Files
- **`schema.sql`**: The database table structures required for the service to run independently (e.g., the `quotas` table or `presigned_urls` table).
- **`ecosystem.config.js`**: Instructs PM2 on how to run the application, including the number of instances and environment variables.
- **`package.json`**: Defines Node.js dependencies (Express, Knex, KafkaJS, etc.) and run scripts.
