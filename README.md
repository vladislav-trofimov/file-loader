## File Loader Service

A high-performance backend service for uploading large files in parallel, designed to efficiently handle `multipart/form-data` uploads  with streaming, job queueing, and system resilience.

This project enables multiple clients to upload large files concurrently without overwhelming the server or consuming unnecessary memory. Each upload is streamed directly to disk and processed in an isolated worker process, allowing true parallel execution without blocking the main thread.

> Ideal for building scalable backend pipelines that handle file ingestion, validation, and background processing using modern Node.js and Redis-based queueing.

## Features

-    **Parallel Uploads** — handles multiple concurrent file uploads without blocking the event loop
-    **Stream-Based Processing** — uploads are streamed directly to disk, avoiding memory overhead
-    **Multipart/Form-Data Support** — accepts large files (~250MB+) via HTTP `multipart/form-data`
-    **Worker Isolation** — each file is processed in a separate Node.js worker process
-    **Retry with Exponential Backoff** — auto-retry failed jobs with exponential delay (ex: 2s → 4s → 8s)
-    **Circuit Breaker** — prevents cascading failures during system stress
-    **Dynamic Throttling** — intelligently limits upload rate based on CPU and memory usage
-    **Concurrency Control** — limits total number of active jobs, queues overflow requests
-    **Basic Authentication** — secures endpoints with configurable credentials
-    **Health Endpoint** — reports CPU usage, memory pressure, and Redis availability
-    **Docker-Ready** — fully containerized for production or local development

## Dependencies
To run the project locally, you must have **Redis** available.

## Start

### 1. Clone the Repository

```bash
git clone <repository>
cd <project folder>
```

### 2.Configure Environment Variables
```
PORT=8000
REDIS_HOST=redis
REDIS_PORT=6379
BASIC_AUTH_USERNAME=
BASIC_AUTH_PASSWORD=
MAX_ACTIVE_JOBS=5
```

### 3.Install the packages
``` 
cd <local_project_folder>
npm i
```

### 4.Install redis(Ubuntu/Debian)
```
sudo apt install redis-server
```

### 5. Run application
```
npm run build
npm run start
```

### 6. Run the Service with Docker
```
docker-compose up --build
```

## Test

### Intergation test
```npm run test```
```bach 
curl -u username:password \
  -F "file=@file.ext" \
  http://localhost:8000/upload
```  

## Authentication

This service is protected with **Basic Authentication** to prevent unauthorized access to the upload/health endpoint.

### Credentials

The username and password are defined in environment variables:

```env
BASIC_AUTH_USERNAME=
BASIC_AUTH_PASSWORD=
```

## API Endpoints

### `POST /upload`
Upload a large file via `multipart/form-data`.
- Requires Basic Authentication
- Accepts a single file with the `file` field
- Automatically streams to worker
- ny large file technically
- Returns `202 Accepted` if the upload is successfully uploaded
- Returns `500` if error occured

#### Request:

```http
POST /upload
Authorization: Basic <base64 credentials>
Content-Type: multipart/form-data
Body: file=@file.ext
```

#### Responses:
```
Success (status 202)
{
  "jobId": "c4ae9a5e-1f4a-4a2b-9d9f-0e7415bb9c70",
  "message": "Upload complete"
}

Error (status 500)
{
    "message": "Upload failed"
}

Error (status 503)

{
    "message": "System is under pressure" 
}

Error (status 429)
{
    "message": "Too many requests. Try again later."
}

Error(status 429)
{
  "message": "Max active jobs reached"
}

Error (status 401)
{
    "message": "Invalid credentials"
}
```

### `GET /health`
Check system status and external dependencies.
- Requires Basic Authentication
- Returns memory usage, CPU load, and Redis health

```
{
  "status": "ok",
  "metrics": {
    "cpuUsage": 0.23,
    "freeMemory": 8354985984,
    "totalMemory": 17179869184,
    "memoryUsagePercent": 51.38
  },
  "dependencies": {
    "redis": "healthy"
  },
  "timestamp": "2025-03-23T18:37:11.401Z"
}
```

## Deployment
This project is configured to deploy automatically to Fly.io using GitHub Actions.

Whenever changes are pushed to the main branch, the GitHub Actions workflow triggers a deployment to Fly.io using the Fly CLI and the app configuration defined in fly.toml.

Deployment secrets (such as FLY_API_TOKEN and environment variables) are securely managed via GitHub Actions Secrets.