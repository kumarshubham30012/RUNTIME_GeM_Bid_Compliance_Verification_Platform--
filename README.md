# GeM Bid Compliance Verification Platform

Phase 1 provides the project foundation: an Express + TypeScript backend, SQLite initialization, and a React + Vite frontend shell that can reach the backend health endpoint.

## Prerequisites

- Node.js 20 or later
- npm 10 or later

## Installation

From the repository root:

```bash
npm install
```

This installs backend and frontend dependencies via npm workspaces.

Copy the example environment files if you are setting up a fresh clone:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## Environment variables

Backend (`backend/.env`):

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Backend HTTP port | `3001` |
| `FRONTEND_ORIGIN` | Allowed CORS origin for the frontend | `http://localhost:5173` |
| `DATABASE_PATH` | SQLite file path, relative to the backend working directory | `./data/app.db` |

Frontend (`frontend/.env`):

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_URL` | Backend base URL used by the health check | `http://localhost:3001` |

Do not commit real secrets. `.env` files are ignored by git; use `.env.example` as the template.

## Database initialization

From the repository root:

```bash
npm run db:init
```

This creates `backend/data/app.db` (or the path in `DATABASE_PATH`) and applies the initial schema:

- `users`
- `tenders`
- `tender_requirements`
- `bidders`

The schema is idempotent (`CREATE TABLE IF NOT EXISTS`). The backend also applies the same schema on startup if the database file is missing.

## Running the backend

Development:

```bash
npm run dev:backend
```

Production-style run after building:

```bash
npm run build:backend
npm run start:backend
```

The backend listens on `http://localhost:3001` by default.

## Backend health endpoint

```http
GET /api/health
```

Example response:

```json
{
  "status": "ok",
  "service": "gem-bid-compliance-backend",
  "timestamp": "2026-09-17T08:00:00.000Z"
}
```

## Running the frontend

Development:

```bash
npm run dev:frontend
```

The Vite dev server listens on `http://localhost:5173` by default. The landing shell shows backend health status from `GET /api/health`.

Build:

```bash
npm run build:frontend
```

Preview a production build:

```bash
npm run preview -w frontend
```

## Project structure

```text
.
├── backend/
│   ├── src/
│   │   ├── config/        # environment configuration
│   │   ├── db/            # SQLite client, schema, init script
│   │   ├── routes/        # health endpoint
│   │   ├── app.ts         # Express app
│   │   └── index.ts       # server entry point
│   ├── data/              # SQLite database file (generated)
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/           # health check utility
│   │   ├── App.tsx        # application shell
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── package.json           # workspace scripts
└── README.md
```

## npm scripts

| Command | Description |
| --- | --- |
| `npm install` | Install all workspace dependencies |
| `npm run db:init` | Initialize the SQLite database |
| `npm run dev:backend` | Start the backend in watch mode |
| `npm run dev:frontend` | Start the frontend development server |
| `npm run build:backend` | Compile the backend TypeScript |
| `npm run build:frontend` | Type-check and build the frontend |
| `npm run start:backend` | Run the compiled backend |
