# LMS — Strapi backend

The API and content store for the LMS. Holds courses, lessons, enrollments, quizzes,
progress records and blog posts, and owns all role-based access control.

## Running it

```bash
cp .env.example .env    # fill in the secrets
npm install
npm run develop
```

- API: <http://localhost:1337/api>
- Admin panel: <http://localhost:1337/admin>

The admin panel account you create on first run is a **Strapi CMS account** — it is
separate from the four application roles (admin / content manager / instructor / student)
that the LMS itself uses.

## Layout

```
config/     server, database, CORS and plugin configuration
src/api/    one folder per content type: schema, controller, routes, services
src/        bootstrap code that seeds the application roles and their permissions
```
