# AI Developer Job Hunter

> Phase 1 ✅ — Phase 2 ✅

A personal AI-powered developer job discovery workspace. Automatically discover, organise, and apply to real software development jobs and gigs from legitimate sources worldwide.

---

## Current Phase: Phase 2 — Developer Profile & Job Preferences

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, TypeScript, Express.js |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT, Argon2 (password hashing), HttpOnly cookies |

---

## Project Structure

```
ai-developer-job-hunter/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/ui/   # Button, Input, Select, ToggleChip, CompletionBar, Spinner…
│       ├── context/         # AuthContext
│       ├── layouts/         # AuthLayout, AppLayout
│       ├── pages/           # Login, Register, Dashboard, Profile
│       ├── router/          # ProtectedRoute, GuestRoute
│       ├── services/        # api, auth.service, profile.service (skills included)
│       └── types/           # All TypeScript types + enum constants
│
├── server/                  # Express + TypeScript backend
│   ├── prisma/
│   │   ├── schema.prisma    # User, DeveloperProfile, ProfileSkill + all enums
│   │   └── migrations/      # Applied migrations
│   └── src/
│       ├── config/          # Environment variable loading
│       ├── constants/       # Shared enum value arrays
│       ├── controllers/     # auth, profile, skill
│       ├── lib/             # Prisma client, Winston logger
│       ├── middleware/      # authenticate, validate, errorHandler
│       ├── routes/          # auth, profile (+ nested skills), health
│       ├── services/        # auth, profile, skill
│       ├── types/           # AuthRequest, JwtPayload
│       └── utils/           # AppError, JWT helpers
│
├── .env.example
└── README.md
```

---

## Installation

### Prerequisites
- Node.js ≥ 20
- PostgreSQL running locally

### 1. Set up environment variables
```bash
cp .env.example server/.env
```
Edit `server/.env`:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/job_hunter_dev
JWT_SECRET=your_long_random_secret_here
CLIENT_URL=http://localhost:5173
PORT=4000
NODE_ENV=development
JWT_EXPIRES_IN=7d
```

### 2. Install dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 3. Run database migrations
```bash
cd server
npm run db:migrate
```

### 4. Start development servers

Backend (terminal 1):
```bash
cd server
npm run dev
```

Frontend (terminal 2):
```bash
cd client
npm run dev
```

- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:4000**

---

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Log in |
| POST | `/api/auth/logout` | No | Log out |
| GET | `/api/auth/me` | Yes | Get current user |
| GET | `/api/profile` | Yes | Get user + developer profile |
| PUT | `/api/profile` | Yes | Create/update developer profile |
| PATCH | `/api/profile` | Yes | Update first/last name |
| GET | `/api/profile/skills` | Yes | List skills |
| POST | `/api/profile/skills` | Yes | Add a skill |
| PATCH | `/api/profile/skills/:id` | Yes | Update a skill |
| DELETE | `/api/profile/skills/:id` | Yes | Remove a skill |

---

## Database Models

### User
`id, email, passwordHash, firstName, lastName, createdAt, updatedAt`

### DeveloperProfile
`id, userId, professionalTitle, bio, yearsOfExperience, experienceLevel, primarySpecialization, secondarySpecializations[], location, country, timezone, remoteWorldwide, preferredCountries[], preferredCities[], jobTypes[], workPreferences[], salaryMin, salaryMax, currency, salaryPeriod, availability, portfolioUrl`

### ProfileSkill
`id, profileId, name, category, proficiency`

---

## What works

### Phase 1 ✅
- User registration, login, logout
- JWT auth via HttpOnly cookies
- Protected routes
- Basic profile name editing
- Health check endpoint

### Phase 2 ✅
- Full developer profile: title, bio, experience level, specializations
- Technical skills with proficiency levels and categories (free-form, no hardcoded list)
- Job preferences: job types, work preferences (multi-select)
- Location preferences: country, city, remote worldwide
- Salary expectations: min/max, currency, period
- Availability
- Portfolio URL
- Profile completion percentage (calculated from real data, 0–100%)
- Full backend validation on all fields
- User isolation — users can only access their own profile/skills
- Responsive UI — mobile, tablet, desktop

---

## Roadmap

| Phase | Title | Status |
|-------|-------|--------|
| **Phase 1** | **Foundation** | ✅ Complete |
| **Phase 2** | **Developer Profile** | ✅ Complete |
| Phase 3 | GitHub Integration | ⏳ Planned |
| Phase 4 | Job Discovery Engine | ⏳ Planned |
| Phase 5 | Job Verification | ⏳ Planned |
| Phase 6 | AI Matching | ⏳ Planned |
| Phase 7 | Application Center | ⏳ Planned |
| Phase 8 | Automation | ⏳ Planned |
| Phase 9 | Private Beta | ⏳ Planned |
| Phase 10 | Public Platform | ⏳ Planned |
