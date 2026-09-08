# AI Developer Job Hunter

> Phase 1 ✅ — Phase 2 ✅ — Phase 3 ✅

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, TypeScript, Express.js |
| Database | Supabase PostgreSQL, Prisma ORM |
| Auth | JWT, Argon2, HttpOnly cookies |

---

## Installation

```bash
# 1. Copy env template
cp .env.example server/.env
# Fill in Supabase DATABASE_URL, DIRECT_URL, JWT_SECRET

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Deploy migrations to Supabase
cd server && npx prisma migrate deploy

# 4. Start backend
cd server && npm run dev

# 5. Start frontend
cd client && npm run dev
```

---

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Register |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/profile` | Yes | Get profile |
| PUT | `/api/profile` | Yes | Save profile |
| PATCH | `/api/profile` | Yes | Update name |
| GET | `/api/profile/skills` | Yes | List skills |
| POST | `/api/profile/skills` | Yes | Add skill |
| PATCH | `/api/profile/skills/:id` | Yes | Update skill |
| DELETE | `/api/profile/skills/:id` | Yes | Delete skill |
| GET | `/api/jobs` | Yes | Search jobs (paginated) |
| GET | `/api/jobs/stats` | Yes | Job counts |
| GET | `/api/jobs/sources` | Yes | Source health |
| POST | `/api/jobs/ingest` | Yes | Trigger ingestion |
| GET | `/api/jobs/:id` | Yes | Job detail |

---

## Phase 3 — Job Discovery Engine

### Supported Sources
| Source | Type | Auth Required | Notes |
|--------|------|--------------|-------|
| **Arbeitnow** | Free public API | None | EU/remote tech jobs |
| **The Muse** | Free public API v2 | Optional (`THEMUSE_API_KEY`) | Engineering categories |

### Adding a new source
1. Create `server/src/jobs/sources/yourSource/index.ts`
2. Implement the `JobSource` interface (`sourceName`, `fetchJobs()`, `getStatus()`)
3. Register it in `server/src/jobs/sources/registry.ts`

### Triggering ingestion
```bash
# Via API (requires auth)
POST /api/jobs/ingest

# Or click "Search for new jobs" in the dashboard
```

### Job filters (GET /api/jobs)
`keyword`, `remote`, `country`, `employmentType`, `source`, `sortBy`, `page`, `limit`

---

## Database Models

### User — `users`
`id, email, passwordHash, firstName, lastName`

### DeveloperProfile — `developer_profiles`
`userId, professionalTitle, bio, experienceLevel, specializations, skills, jobTypes, workPreferences, salary, location, availability, portfolioUrl`

### ProfileSkill — `profile_skills`
`profileId, name, category, proficiency`

### Job — `jobs`
`source, sourceJobId, title, companyName, description, location, remoteType, employmentType, tags, salary, applicationUrl, originalUrl, status, postedAt, discoveredAt`

### SourceHealth — `source_health`
`sourceName, status, lastRunAt, jobsFetched, jobsNew, jobsDuplicate`

---

## Roadmap

| Phase | Title | Status |
|-------|-------|--------|
| **Phase 1** | Foundation | ✅ Complete |
| **Phase 2** | Developer Profile | ✅ Complete |
| **Phase 3** | Job Discovery Engine | ✅ Complete |
| Phase 4 | Job Verification | ⏳ Planned |
| Phase 5 | AI Matching | ⏳ Planned |
| Phase 6 | Application Center | ⏳ Planned |
| Phase 7 | Automation | ⏳ Planned |
