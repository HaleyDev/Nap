# Nap

> A vibe coding playground — building whatever feels right, one idea at a time.

This is an **exploratory, vibe-driven project**. No rigid roadmap, no fixed scope — just ideas flowing into code. Features get added when inspiration strikes. The stack is intentionally over-engineered for the fun of it.

**More features are always on the way.** ✨

---

## Tech Stack

### Backend

| Technology | Role |
|------------|------|
| **Python 3.11+** | Runtime |
| **FastAPI** | Async web framework, API routing & static file serving |
| **SQLAlchemy 2.0** (Async) | ORM with full async support |
| **asyncpg** | High-performance PostgreSQL driver |
| **Pydantic V2** | Data validation & serialization |
| **pydantic-settings** | Environment-based configuration management |
| **Uvicorn** | ASGI server |

### Frontend

| Technology | Role |
|------------|------|
| **Vue 3** | UI framework (Composition API, `<script setup>`) |
| **TypeScript** | Type-safe frontend development |
| **Vuetify 3** | Material Design component library (dark theme) |
| **Vite** | Next-gen build tool & dev server |
| **Vue Router 4** | Client-side routing (HTML5 history mode) |
| **Web Audio API** | Browser-native sound effects |
| **Canvas API** | Animated particle backgrounds |

### Infrastructure

| Technology | Role |
|------------|------|
| **Docker** | Multi-stage build (Node.js + Python) |
| **Docker Compose** | Service orchestration |
| **PostgreSQL 13+** | Primary database |
| **Vite Build Pipeline** | Frontend compiled to static assets, served by FastAPI |

### Architecture Highlights

- **SPA + API monolith** — Vue frontend compiled and served directly by FastAPI, no reverse proxy needed
- **Fully async** — End-to-end async from HTTP handler to database query
- **Multi-stage Docker build** — `node:20-slim` compiles the frontend, `python:3.11-slim` runs the backend
- **Zero-config deployment** — Single `docker compose up` to launch everything

---

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

---

## Project Structure

```
├── frontend/          # Vue 3 + TypeScript + Vuetify 3
│   └── src/
│       ├── views/     # Page components
│       ├── api/       # API client layer
│       ├── composables/  # Reusable logic (audio, canvas, storage)
│       └── types/     # Shared TypeScript interfaces
├── app/               # FastAPI backend
│   ├── routers/       # API endpoints
│   ├── services/      # Business logic
│   ├── models.py      # SQLAlchemy ORM models
│   ├── schemas.py     # Pydantic schemas
│   └── config.py      # Settings management
├── docs/              # Project & API documentation
├── plans/             # Development plans
├── memory/            # Agent session history
├── Dockerfile         # Multi-stage build
└── docker-compose.yml # Service orchestration
```

---

## Vibe Coding?

This project is built with a **vibe coding** philosophy:

- Build what feels interesting right now
- Explore technologies by actually using them
- No pressure to ship — just enjoy the process
- Let the project evolve organically

If something here looks over-engineered or oddly specific — that's the point. It's a sandbox for trying things out.

---

## License

MIT
