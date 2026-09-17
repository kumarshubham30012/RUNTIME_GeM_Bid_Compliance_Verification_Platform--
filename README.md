# GeM Bid Compliance Verification Platform

Phase 1 provides the project foundation: an Express + TypeScript backend, SQLite initialization, and a React + Vite frontend.

Phase 2 adds multi-role authentication (bidder, officer, admin), JWT-protected APIs, demo users, a login page, and three dashboard shells.

Phase 3 adds officer-side tender management: create tenders, list the officer's tenders, view tender details, and display a date-derived status.

Phase 4 adds an officer requirement builder on each owned tender: name, tender clause, mandatory/optional, verification method, and rule type. Bidder-facing tender browsing is not implemented yet.

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

Existing databases are updated in place. Phase 3 adds tender columns (`department`, `opening_date`, `closing_date`). Phase 4 adds requirement columns (`name`, `tender_clause`, `verification_method`, `rule_type`). Those `ALTER TABLE` steps are idempotent and run from `db:init`, `db:migrate`, and backend startup. They do not drop tables or users.

```bash
npm run db:migrate
```

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
| `GET` | `/api/tenders` | Officer role | List tenders created by the authenticated officer |
| `POST` | `/api/tenders` | Officer role | Create a tender for the authenticated officer |
| `GET` | `/api/tenders/:id` | Officer role | Get one of the officer's tenders |
| `GET` | `/api/tenders/:id/requirements` | Officer role | List requirements for an owned tender |
| `POST` | `/api/tenders/:id/requirements` | Officer role | Create a requirement for an owned tender |
| `PATCH` | `/api/tenders/:id/requirements/:requirementId` | Officer role | Update a requirement on an owned tender |
| `DELETE` | `/api/tenders/:id/requirements/:requirementId` | Officer role | Delete a requirement on an owned tender |

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

## Tender management (Phase 3)

Officer accounts can create and view their own tenders. Status is calculated on the server from the current date and the tender's opening/closing dates. It is not accepted from the client.

| Status | Rule |
| --- | --- |
| `upcoming` | Current time is before the opening date (UTC start of day) |
| `open` | Current time is on or after the opening date and on or before the closing date (UTC end of day) |
| `closed` | Current time is after the closing date |

Tender fields:

- `title` (required)
- `department` (required)
- `openingDate` (`YYYY-MM-DD`, required)
- `closingDate` (`YYYY-MM-DD`, required, must not be before opening date)
- `created_by_user_id` is always the authenticated officer; the client cannot set it

Bidder count, pending reviews, and completed reviews are returned as `0` with `statsPlaceholder: true`. They are not real application/review counts.

Validation errors return `400` with a specific `error` message, for example:

- `Title is required`
- `Department is required`
- `Opening date is required`
- `Closing date is required`
- `Opening date is invalid`
- `Closing date is invalid`
- `Closing date must not be before opening date`

Officer permissions:

- Create, list, and view tenders they created
- Bidders and admins receive `403 Insufficient permissions` for these endpoints
- Unauthenticated requests receive `401 Authentication required`

Example officer create/list:

```bash
TOKEN=$(curl -sS -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"officer@demo.local","password":"DemoOfficer123!"}' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")

curl -sS -X POST http://localhost:3001/api/tenders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Office laptops","department":"IT","openingDate":"2026-09-20","closingDate":"2026-09-30"}'

curl -sS http://localhost:3001/api/tenders \
  -H "Authorization: Bearer $TOKEN"
```

Frontend officer routes:

| Path | Access |
| --- | --- |
| `/officer` | Tender list |
| `/officer/tenders/new` | Create tender |
| `/officer/tenders/:id` | Tender details |

The bidder dashboard does not include Create Tender. A bidder JWT still cannot create tenders through `POST /api/tenders`.

## Requirement builder (Phase 4)

Officers configure per-tender compliance requirements from the tender detail page. Requirements belong to a tender through `tender_id` and are isolated per tender. Ownership is taken from the authenticated officer and the tender row; the client cannot assign a requirement to another officer's tender.

Requirement fields:

- `name` (required)
- `tenderClause` (required)
- `mandatory` (required JSON boolean: `true` = MANDATORY, `false` = OPTIONAL)
- `verificationMethod`: `DOCUMENT` \| `GST` \| `UDYAM` \| `OEM` \| `MANUAL`
- `ruleType`: `EXISTS` \| `EXACT_MATCH` \| `MATCH` \| `MANUAL_REVIEW`

These values are stored as configuration only. Phase 4 does not evaluate PASS/FAIL or run verification providers.

Example:

```bash
curl -sS -X POST http://localhost:3001/api/tenders/$TENDER_ID/requirements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"GST Registration","tenderClause":"Bidder must provide a valid GST registration certificate.","mandatory":true,"verificationMethod":"GST","ruleType":"EXISTS"}'
```



### Role authorization

`requireAuth` verifies the JWT and loads the user from the database.

`requireRole("bidder" | "officer" | "admin")` rejects authenticated users whose role does not match.

Frontend route guards only improve UX. API authorization is enforced independently on the server.

## Frontend routes

| Path | Access |
| --- | --- |
| `/login` | Public login page |
| `/bidder` | Bidder dashboard shell |
| `/officer` | Officer tender list |
| `/officer/tenders/new` | Create tender (officer) |
| `/officer/tenders/:id` | Tender details (officer) |
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
│   │   ├── routes/        # health, auth, role probes, tenders, requirements
│   │   ├── tenders/       # tender repository and status
│   │   ├── requirements/  # requirement constants and repository
│   │   ├── users/         # user repository
│   │   ├── app.ts
│   │   └── index.ts
│   ├── data/              # SQLite database file (generated)
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/           # health, auth, and tender requests
│   │   ├── auth/          # auth state and route guards
│   │   ├── components/    # shared shell and tender display
│   │   ├── pages/         # login, dashboards, officer tender screens
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
| `npm run db:migrate` | Apply safe SQLite schema updates without dropping data |
| `npm run db:seed` | Seed demo users (development/testing) |
| `npm run dev:backend` | Start the backend in watch mode |
| `npm run dev:frontend` | Start the frontend development server |
| `npm run build:backend` | Compile the backend TypeScript |
| `npm run build:frontend` | Type-check and build the frontend |
| `npm run start:backend` | Run the compiled backend |
