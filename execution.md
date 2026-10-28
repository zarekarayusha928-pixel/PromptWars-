# Saheli Backend Execution Guide & Roadmap

This document outlines the step-by-step instructions for running, testing, and developing the **Saheli Backend API**, followed by the phased technical execution plan.

---

## 1. Quick Start Execution Guide

### 1.1 Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or newer
- **PostgreSQL Database**: Neon Serverless Postgres instance (or local PostgreSQL 15+) with SSL support.

### 1.2 Installation
Navigate to the `Backend` directory and install project dependencies:

```powershell
cd Backend
npm install
```

### 1.3 Environment Configuration
Create a `.env` file inside the `Backend/` directory:

```powershell
# Copy the example file or create a new one
Copy-Item .env.example .env
```

Ensure the following variables are defined in `Backend/.env`:

```env
# Server Port
PORT=4000

# Neon PostgreSQL Connection URL with SSL
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/neondb?sslmode=require

# Authentication Signing Secret
JWT_SECRET=saheli-super-secret-jwt-key-2026-change-in-production

# Client Application URL for CORS
CLIENT_URL=http://localhost:5173
```

> [!IMPORTANT]
> If you are using a local PostgreSQL database instead of Neon, set `DATABASE_URL=postgresql://postgres:password@localhost:5432/saheli_db` and ensure SSL mode handling in `db/db.js` does not enforce remote SSL certificates.

---

## 2. Database Setup & Initialization

Run the following commands from the `Backend` directory:

### Step 1: Initialize Database Schema
Creates tables (`profiles`, `users`, `symptom_logs`, `custom_questions`, `safety_events`) and indexes idempotently:
```powershell
npm run db:init
```

### Step 2: Seed Clinical Demo Personas
Seeds demo accounts matching the front end's personas (Priya, Amara, Ananya, Meera, and Guest):
```powershell
npm run db:seed
```

### Optional: Reset Demo Data
Safely clears only rows marked `is_demo = true` and re-seeds without wiping custom accounts:
```powershell
npm run db:reset-demo
```

---

## 3. Starting the Server

### Development Mode (with hot-reload)
```powershell
npm run dev
```
*Runs `node --watch index.js` on `http://localhost:4000`.*

### Production Mode
```powershell
npm start
```

### Health Check Verification
Verify the service is active:
```powershell
curl http://localhost:4000/api/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-10-28T10:00:00.000Z"
}
```

---

## 4. Pre-configured Demo Accounts

The database seed provides pre-configured credentials matching `src/pages/AuthPage.jsx`:

| Persona | Clinical Condition | Email | Password |
| :--- | :--- | :--- | :--- |
| **Priya Sharma** | Endometriosis-suspected | `priya.sharma@demo.saheli.health` | `demo-password-123` |
| **Amara K.** | Dysmenorrhea baseline | `amara.k@demo.saheli.health` | `demo-password-123` |
| **Ananya Sen** | PCOS-suspected | `ananya.sen@demo.saheli.health` | `demo-password-123` |
| **Meera Patel** | Heavy bleeding / Anaemia | `meera.patel@demo.saheli.health` | `demo-password-123` |
| **Personal Diary** | Custom blank diary | `guest@demo.saheli.health` | `demo-password-123` |

---

## 5. Phased Backend Execution Roadmap

```mermaid
flowchart TD
    P1["Phase 1: Architecture & Modular Refactoring"] --> P2["Phase 2: Security & Authorization Hardening"]
    P2 --> P3["Phase 3: Clinical Domain Engine & Analytics"]
    P3 --> P4["Phase 4: Clinician Briefs & Sharing Services"]
    P4 --> P5["Phase 5: React Frontend Integration"]
    P5 --> P6["Phase 6: Quality Assurance & Production Hardening"]
```

---

### Phase 1: Architecture Modularization & Data Resilience
**Goal**: Break up the monolithic `index.js` (833 lines) into modular controllers, routes, and middleware; eliminate crashes when environment variables are missing.

- [x] **1.1 Directory Structure Refactoring**
  - Modularized `Backend/` into:
    - `controllers/` (`authController.js`, `profileController.js`, `logController.js`, `questionController.js`, `safetyController.js`, `exportController.js`)
    - `routes/` (`authRoutes.js`, `profileRoutes.js`, `healthRoutes.js`, `index.js`)
    - `middleware/` (`auth.js`, `validate.js`, `errorHandler.js`)
    - `config/` (`env.js`, `db.js`)
    - `utils/` (`auth.js`, `formatters.js`)
    - `app.js` & `index.js` clean entry point
- [x] **1.2 Database Client Resilience**
  - Updated `config/db.js` and `db/db.js` so it doesn't crash with `process.exit(1)` when `DATABASE_URL` is missing.
  - Added non-blocking `checkDatabaseConnection()` and dynamic status on `/api/health`.
- [x] **1.3 Request Validation with Zod**
  - Installed `zod`.
  - Defined strict schemas in `validators/schemas.js` for symptom log inputs, profile edits, signup/login payloads, questions, and safety events.
  - Built reusable `validate(schema, source)` middleware returning structured 400 Bad Request errors.
- [x] **1.4 Migration Management**
  - Added `db/migrations/001_initial_schema.sql` and `db/migrate.js` with `_migrations` tracking table.
  - Added `npm run db:migrate` command to `package.json`.

---

### Phase 2: Security, Authentication & Access Control
**Goal**: Resolve critical authorization vulnerabilities (BOLA/IDOR), enforce ownership checks, and standardize authentication tokens.

- [x] **2.1 Replace Custom Crypto Auth with Industry Standard**
  - Installed `bcryptjs` and `jsonwebtoken`.
  - Upgraded password hashing to standard salted bcrypt (10 rounds) while preserving legacy scrypt support.
  - Completely removed insecure plain-text password fallback comparison.
  - Implemented dual-token architecture: 15-minute Access Tokens and 7-day Refresh Tokens (`POST /api/auth/refresh`).
- [x] **2.2 Enforce Object-Level Ownership Authorization (BOLA/IDOR Protection)**
  - Implemented `requireAuth` and `requireProfileOwnership` middleware in `Backend/middleware/auth.js`.
  - Applied ownership checks to all `/api/profiles/:id/*` endpoints: users can only view and modify their own health profiles and symptom logs. Any unauthorized attempt returns `403 Forbidden`.
- [x] **2.3 API Hardening**
  - Integrated `helmet` with secure HTTP headers (`X-Content-Type-Options: nosniff`, HSTS, CSP frame protection).
  - Integrated `express-rate-limit` with 300 req/15min for general API and 25 req/15min on auth endpoints (`/login`, `/signup`, `/refresh`).
  - Added recursive input sanitization in `middleware/sanitize.js` to strip HTML script injections from user notes and clinical questions.
  - Added automated security test suite `Backend/tests/phase2_security.test.js`.

---

### Phase 3: Clinical Domain Engine & Health Analytics
**Goal**: Migrate clinical intelligence, cycle calculations, and safety triage rules from the frontend to the backend service.

- [x] **3.1 Cycle Calculation Engine**
  - Ported calculation utilities to `Backend/services/cycleService.js`.
  - Automatically computes `cycleDay`, `currentPhase`, and estimated next period date on log upsert.
- [x] **3.2 Longitudinal Clinical Rule Evaluation**
  - Ported rules to `Backend/services/clinicalEngine.js`.
  - Added endpoint `GET /api/profiles/:id/insights` and `GET /api/profiles/:id/cycle-summary`:
    - **Endometriosis indicators**: Severe dysmenorrhea (pain $\ge 7$), mid-cycle ovulatory pain, incapacitation days.
    - **PCOS indicators**: Cycle length variability (>35 days), hormonal skin/hair symptom clusters.
    - **Menorrhagia & Anaemia indicators**: $\ge 3$ consecutive heavy bleeding days, high fatigue, and dizziness.
- [x] **3.3 Automated Safety Triage Engine**
  - Ported safety engine to `Backend/services/safetyEngine.js`.
  - Evaluates real-time red flags inside `PUT /api/profiles/:id/logs/:date` (emergency pain $\ge 9$, syncope/vomiting, orthostatic dizziness with hemorrhage).
  - Automatically persists red flags to `safety_events` table and returns safety alerts with response.
  - Added automated test suite `Backend/tests/phase3_clinical.test.js`.

---

### Phase 4: Clinician Briefs & Consultation Sharing
**Goal**: Backend services for 15-minute doctor consultation preparation and secure temporary data sharing.

- [ ] **4.1 Doctor Brief Aggregation Endpoint**
  - Create `GET /api/profiles/:id/visit-brief`:
    - Summarizes chief complaints, tracking duration, cycle statistics, peak pain windows, and selected clinician questions.
- [ ] **4.2 Time-Limited Clinician Sharing Tokens**
  - Implement `POST /api/profiles/:id/share-link`:
    - Generates a signed, read-only clinician view token with 24h or 48h expiration.
  - Create `GET /api/shared/brief/:token`:
    - Allows a doctor to access the printable summary brief without creating an account or viewing credentials.
- [ ] **4.3 Bidirectional Backup & Restore**
  - Implement `POST /api/profiles/:id/import` to complement existing `GET /api/profiles/:id/export`.
  - Implement `DELETE /api/profiles/:id/data` (GDPR Right to Be Forgotten / full patient data wipe).

---

### Phase 5: React Frontend Integration
**Goal**: Connect the React frontend to the backend API, replacing mock `localStorage` behavior while maintaining offline resilience.

- [ ] **5.1 API Client Layer (`src/services/api.js`)**
  - Build centralized client handling base URL (`http://localhost:4000/api`), token headers, and 401 handling.
- [ ] **5.2 Authentication Flow Integration**
  - Wire `src/pages/AuthPage.jsx` into `POST /api/auth/login` and `POST /api/auth/signup`.
  - Store auth token securely (in memory/cookies or `localStorage`).
- [ ] **5.3 State Synchronization (`src/context/AppContext.jsx`)**
  - Update `AppContext.jsx` to fetch active profile and symptom logs from the API on boot.
  - Implement offline-first fallback: cache server responses to `localStorage` so the UI functions seamlessly even if offline.
- [ ] **5.4 Check-in & Doctor Visit Integration**
  - Connect `DailyCheckinPage.jsx` to `PUT /api/profiles/:id/logs/:date`.
  - Connect `DoctorVisitPage.jsx` to `PUT /api/profiles/:id/questions`.

---

### Phase 6: Testing, Observability & Production Readiness
**Goal**: Automated test coverage, structured logging, containerization, and production reliability.

- [ ] **6.1 Automated Integration Tests**
  - Install `vitest` or `jest` with `supertest`.
  - Write test suites:
    - `auth.test.js`: Sign up, login, invalid credentials, token verification.
    - `authorization.test.js`: Attempting to read/modify another user's profile yields 403 Forbidden.
    - `logs.test.js`: Validates pain scale (0-10), bleeding enums, and upsert logic.
    - `clinical.test.js`: Verifies clinical engine pattern detection accuracy.
- [ ] **6.2 Structured Logging & Tracing**
  - Replace `console.log` with `pino` or `winston` for JSON structured logs.
  - Add request ID middleware (`x-request-id`) for end-to-end tracing.
- [ ] **6.3 Containerization**
  - Create a production-ready `Backend/Dockerfile`.
  - Create root `docker-compose.yml` to spin up PostgreSQL and the Backend together locally.

---

## 6. API Verification Test Commands

You can verify the backend endpoints using PowerShell or cURL:

### 1. User Login
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"email":"priya.sharma@demo.saheli.health","password":"demo-password-123"}'

$token = $response.token
Write-Host "JWT Token: $token"
```

### 2. Fetch Profile
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/profiles/priya" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $token" }
```

### 3. Log a Daily Symptom Entry
```powershell
$logPayload = @{
  date = "2026-10-28"
  bleeding = "Heavy"
  painScore = 8
  functionalImpact = $true
  impactTypes = @("Stayed in bed", "Missed work or plans")
  symptoms = @("Severe cramps", "Pelvic pain", "Fatigue")
  energyRating = 2
  moodRating = 2
  notes = "Day 1 of heavy flow with severe lower pelvic cramping."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/profiles/priya/logs/2026-10-28" `
  -Method PUT `
  -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
  } `
  -Body $logPayload
```

### 4. Fetch All Logged Symptoms
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/profiles/priya/logs" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $token" }
```

### 5. Fetch Safety Red-Flag Events
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/profiles/priya/safety-events" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $token" }
```

---

## 7. Troubleshooting & Common Issues

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `DATABASE_URL is not set.` | Missing `.env` file in `Backend/` | Copy `.env.example` to `Backend/.env` and add your database URL. |
| `self-signed certificate in certificate chain` | Neon SSL strictness | Ensure `sslmode=require` is present in `DATABASE_URL` and `rejectUnauthorized: false` is configured in `db/db.js`. |
| `Not allowed by CORS` | Request from non-whitelisted origin | Add your frontend port to `allowedOrigins` in `index.js` (defaults to ports 5173 and 5174). |
| `Port 4000 already in use` | Another process is holding port 4000 | Kill the process holding port 4000 or set `PORT=4001` in `Backend/.env`. |
