# GeM Bid Compliance Verification Platform

Phase 1 provides the project foundation: an Express + TypeScript backend, SQLite initialization, and a React + Vite frontend.

Phase 2 adds multi-role authentication (bidder, officer, admin), JWT-protected APIs, demo users, a login page, and three dashboard shells.

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

Set `JWT_SECRET` in `backend/.env` to a long random string before running the backend.

## Environment variables

Backend (`backend/.env`):

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Backend HTTP port | `3001` |
| `FRONTEND_ORIGIN` | Allowed CORS origin for the frontend | `http://localhost:5173` |
| `DATABASE_PATH` | SQLite file path, relative to the backend working directory | `./data/app.db` |
| `JWT_SECRET` | Secret used to sign and verify authentication tokens | **required, no default** |
| `JWT_EXPIRES_IN` | JWT lifetime (for example `8h`) | `8h` |

Frontend (`frontend/.env`):

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_URL` | Backend base URL used by the frontend | `http://localhost:3001` |

Do not commit real secrets. `.env` files are ignored by git; use `.env.example` as the template.

## Database initialization

From the repository root:

```bash
npm run db:init
```

This creates `backend/data/app.db` (or the path in `DATABASE_PATH`) and applies the schema, including the `users` table used for authentication.

## Seed demo users

**Development/testing only.** These credentials are not for production.

```bash
npm run db:seed
```

The seed is idempotent. Re-running it updates the three demo accounts in place instead of creating duplicates.

| Role | Email | Password |
| --- | --- | --- |
| Bidder | `bidder@demo.local` | `DemoBidder123!` |
| Officer | `officer@demo.local` | `DemoOfficer123!` |
| Admin | `admin@demo.local` | `DemoAdmin123!` |

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

## Running the frontend

Development:

```bash
npm run dev:frontend
```

The Vite dev server listens on `http://localhost:5173` by default.

Build:

```bash
npm run build:frontend
```

Preview a production build:

```bash
npm run preview -w frontend
```

## Authentication

Login is performed against the backend. The issued JWT includes the user id (`sub`) and role. The frontend stores the token in `localStorage` and restores the session with `GET /api/auth/me` after refresh.

Roles are taken from the authenticated user record on the server. The login UI does not allow selecting a role.

Passwords are stored as bcrypt hashes. Password hashes are never returned by the API.

### API endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Backend health check |
| `POST` | `/api/auth/login` | Public | Login with email and password |
| `GET` | `/api/auth/me` | Authenticated | Current user profile |
| `GET` | `/api/bidder/me` | Bidder role | Bidder identity probe |
| `GET` | `/api/officer/me` | Officer role | Officer identity probe |
| `GET` | `/api/admin/me` | Admin role | Admin identity probe |

Send the token as:

```http
Authorization: Bearer <token>
```

Example login:

```bash
curl -sS -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bidder@demo.local","password":"DemoBidder123!"}'
```

### Error responses

```json
{ "error": "Authentication required" }
```

`401` is returned for missing or invalid authentication.

```json
{ "error": "Insufficient permissions" }
```

`403` is returned when the authenticated user does not have the required role.

### Role authorization

`requireAuth` verifies the JWT and loads the user from the database.

`requireRole("bidder" | "officer" | "admin")` rejects authenticated users whose role does not match.

Frontend route guards only improve UX. API authorization is enforced independently on the server.

## Frontend routes

| Path | Access |
| --- | --- |
| `/login` | Public login page |
| `/bidder` | Bidder dashboard shell |
| `/officer` | Officer dashboard shell |
| `/admin` | Admin dashboard shell |

Unauthenticated users are redirected to `/login`. An authenticated user who opens another role's dashboard is redirected to their own dashboard. Logout clears the stored token and returns to login.

## Project structure

```text
.
├── backend/
│   ├── src/
│   │   ├── auth/          # JWT, middleware, roles
│   │   ├── config/        # environment configuration
│   │   ├── db/            # SQLite client, schema, seed
│   │   ├── routes/        # health, auth, role probes
│   │   ├── users/         # user repository
│   │   ├── app.ts
│   │   └── index.ts
│   ├── data/              # SQLite database file (generated)
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/           # health and auth requests
│   │   ├── auth/          # auth state and route guards
│   │   ├── pages/         # login and dashboard shells
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── package.json
└── README.md
```

## npm scripts

| Command | Description |
| --- | --- |
| `npm install` | Install all workspace dependencies |
| `npm run db:init` | Initialize the SQLite database |
| `npm run db:seed` | Seed demo users (development/testing) |
| `npm run dev:backend` | Start the backend in watch mode |
| `npm run dev:frontend` | Start the frontend development server |
| `npm run build:backend` | Compile the backend TypeScript |
| `npm run build:frontend` | Type-check and build the frontend |
| `npm run start:backend` | Run the compiled backend |
