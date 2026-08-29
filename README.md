# LMS — Learning Management System

A Learning Management System built with **Next.js** (frontend) and **Strapi** (headless CMS /
backend), with four user roles: Admin, Content Manager, Instructor and Student.

**Live:**

- **App** — https://learning-management-system-gamma-six.vercel.app
- **API** — https://learning-management-system-production-9abf.up.railway.app

Sign in with any of these to look around (all share the password `Demo1234!`):

| Email | Role | What you land on |
|---|---|---|
| `sadia@university.test` | Student | Three courses, one of them 3 of 5 lessons done — 60% |
| `tanvir@university.test` | Student | One course finished, one part-way |
| `kamrul@university.test` | Instructor | Owns *Admission Test: Mathematics* only |
| `farhana@university.test` | Instructor | Owns *Admission Test: English* only |
| `nusrat@university.test` | Content Manager | Every course, plus the blog |

The demo content is a university admission-prep programme: four courses, two of them
owned by different instructors, two quizzes, real progress part-way through, quiz
attempts already on record, and one blog post still in draft.

Two things worth trying, because they are the point of the whole design:

- Open a course **signed out**. You get the lesson titles as a syllabus, but no lesson
  bodies and nothing to click — the backend refuses lesson content to anyone who is not
  enrolled, so there is nothing to reveal by inspecting the page.
- Sign in as **Kamrul** and open *Admission Test: English*, which Farhana owns. The editor
  refuses it. Instructors write their own courses and nobody else's.

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

Generate each secret in `.env` with:

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

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

## Sample data

An empty install works perfectly and shows you nothing, so there is a seed:

```bash
cd backend && npm run seed:demo
```

It adds a content manager, two instructors and three students, four courses with
lessons, two quizzes, enrolments with real progress part-way through, quiz attempts,
and two published posts plus a draft. Running it twice is safe - anything already there
is left alone. It prints the logins when it finishes.

To clear what a previous run created and start again:

```bash
cd backend && npm run seed:reset
```

## Feature checklist

- [x] Authentication + role-based access
- [x] Course management
- [x] Course enrollment
- [x] Lesson viewing
- [x] Progress tracking
- [x] Quiz with auto-grading
- [x] Admin panel
- [x] Blog with draft/publish

### What each one means here

| Feature | Where it lives |
|---|---|
| Auth + roles | Strapi JWT in an httpOnly cookie; four roles seeded in code, permissions applied on every boot |
| Courses & lessons | Content managers work across the library, instructors only on courses they own |
| Enrollment | Students enrol themselves; the student is taken from the token, never the request |
| Lesson viewing | Lesson bodies require enrolment — the syllabus is public, the content is not |
| Progress | One row per completed lesson; the percentage is computed on read, never stored |
| Quizzes | Marked on the server; a student's copy of a quiz is built without the answer key |
| Admin panel | Platform stats, all users, role reassignment |
| Blog | Strapi's native draft & publish, with the published version forced for non-staff |

## Checking it works

Three scripts assert the behaviour that is easy to get quietly wrong. Start the
app first - each says which halves it needs.

```bash
cd backend  && npm run check:matrix        # the brief's permission table, cell by cell
cd backend  && npm run check:permissions   # every role against every endpoint
cd frontend && npm run check:guards        # which roles may open which pages
cd frontend && npm run check:login         # signing in, end to end
```

`check:matrix` prints the permission table from the brief with the real HTTP
status behind every cell, so the implementation can be read straight against the
spec - including the rows that say "own only" and "own courses".

`check:permissions` is the important one. It calls the API directly as each
role, including the requests the UI never offers a button for, because a
permission leak looks exactly like a working app from the browser.

> Strapi rate-limits sign-ins to a handful a minute, and these scripts sign in
> several times. Running them back to back trips it; the scripts say so rather
> than failing with a wall of unrelated errors.

## Deployment

### Backend → Railway

1. **New project → Deploy from GitHub repo**, and set the service **root directory** to
   `backend`.
2. **Add a Postgres database** to the same project. Railway exposes it as `DATABASE_URL`.
3. Under **Variables**, set everything listed in [`backend/.env.production.example`](backend/.env.production.example).
   Generate fresh secrets — do not reuse the local ones.
4. Deploy. Railway runs `npm install`, then `npm run build` (which builds the admin panel),
   then `npm start`.
5. Once it has a domain, set `PUBLIC_URL` to it and redeploy.

Two variables exist purely because of the proxy in front of the app, and are easy to miss:

- `PUBLIC_URL` — Strapi builds absolute URLs from this. Left unset it guesses from the
  request and produces `http://` where the browser expects `https://`, which shows up as an
  admin panel that loads blank.
- `IS_PROXIED=true` — Railway terminates TLS and forwards over plain HTTP. Without this Koa
  believes the connection is insecure and drops cookies marked `secure`.

The four application roles, their permissions and the first admin account are all created by
the bootstrap on first boot — there is nothing to click in the admin panel to make the API
work. See [`backend/src/bootstrap/`](backend/src/bootstrap/).

### Frontend → Vercel

1. **Import the repo**, and set the **root directory** to `frontend`.
2. Set `NEXT_PUBLIC_STRAPI_URL` to the Railway URL, with **no trailing slash**.
3. Deploy.

Then go back to Railway and set `FRONTEND_URL` to the Vercel URL, or CORS will block the
browser. It accepts a comma-separated list, so preview deployments can be added alongside
production.

### The order that matters

Each side needs the other's URL, so the first deploy is a two-pass job: deploy the backend,
deploy the frontend against it, then update `PUBLIC_URL` and `FRONTEND_URL` on the backend and
redeploy. Doing it in one pass leaves CORS failing in a way that looks like a frontend bug.
