# LMS — Learning Management System

A Learning Management System built with **Next.js** (frontend) and **Strapi** (headless CMS /
backend), with four user roles: Admin, Content Manager, Instructor and Student.

> Status: in development. See [Feature checklist](#feature-checklist) for what is done.

## Repository layout

```
.
├── backend/    Strapi 5 — content types, roles, permissions, custom endpoints
└── frontend/   Next.js (App Router) — the UI students and staff actually use
```

The two apps deploy separately (Strapi → Railway, Next.js → Vercel) but live in one repo so the
API contract stays in sync.

## Running locally

You need **Node 20+** and npm.

### 1. Backend (Strapi)

```bash
cd backend
cp .env.example .env     # then fill in the secrets, see below
npm install
npm run develop
```

Strapi starts on <http://localhost:1337>. The first run opens the admin panel signup at
`/admin` — create your Strapi admin account there. That account is for the CMS itself; the
four application roles (admin / content manager / instructor / student) are separate and are
seeded automatically on boot.

### 2. Frontend (Next.js)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The app runs on <http://localhost:3000> and talks to Strapi at `NEXT_PUBLIC_STRAPI_URL`.

Start the backend first — the frontend fetches courses on the home page and will show an
empty state if Strapi isn't up.

## Feature checklist

Updated as modules land.

- [ ] Authentication + role-based access
- [ ] Course management
- [ ] Course enrollment
- [ ] Lesson viewing
- [ ] Progress tracking
- [ ] Quiz with auto-grading
- [ ] Admin panel
- [ ] Blog with draft/publish

## Deployment

- Frontend → Vercel
- Backend → Railway (PostgreSQL)

Environment variables for both are documented in each app's `.env.example`.
