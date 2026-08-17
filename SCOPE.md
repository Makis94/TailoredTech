# Scope of work

How responsibility for this project was split between human direction and AI-assisted implementation (Claude Code).

## Owned by the author (Maksym)

- **Technology stack**: NestJS for the backend (specified up front), Prisma + PostgreSQL, React + TypeScript + Vite + Tailwind for the frontend, S3-compatible object storage, and JWT email/password authentication over Google OAuth (avoids needing external OAuth credentials for local development).
- **Architectural direction**: the overall shape of the solution — Data Room → Folder → File hierarchy, read-only sharing via public links and per-user invites, and which optional/extra-credit features to build (search, file versioning).
- **Repository and folder structure**: the `backend/` / `frontend/` split and the naming of modules/folders within each, and ongoing management of the monorepo as a whole.
- **Database schema design**: the tables, relations, and fields in `prisma/schema.prisma` (`DataRoom` → `Folder`/`File` → `FileVersion`, the polymorphic `Share`/`ShareGrant` pair) were designed by Maksym; Claude Code implemented the Prisma syntax, migrations, and the technical details needed to satisfy that structure (e.g. the `parentKey`/`folderKey` sentinel workaround for Postgres' `NULL`-uniqueness gap).
- **Frontend component conventions**: component-authoring rules (structure, naming, where logic vs. presentation lives) were set by Maksym; Claude Code's components were reviewed against them.
- **Code review**: all AI-generated code was reviewed before being accepted, including a pass over the written frontend components and backend API specifically for code quality.
- **Deployment process**: provisioning and account-level setup across Render (backend), Vercel (frontend), Neon (Postgres), and Cloudflare R2 (object storage) — creating the services, generating credentials, and driving each platform's dashboard through to a live deploy.

## Implemented by Claude Code (AI)

- Backend: NestJS modules, controllers, services, DTOs, the Prisma migrations and schema syntax for the structure Maksym designed, the access-control logic, and the S3 storage abstraction — including the technical implementation decisions within that architecture (e.g. the uniqueness-constraint sentinel-key workaround, the versioning-on-name-conflict behavior, the access-resolution model for shares).
- Frontend: all React components, pages, hooks, and API client code, written to the component conventions Maksym set.
- Documentation: this file and `README.md`.

See `README.md` → "A note on how AI was used" for the technical specifics of that process (including bugs the review/testing process caught).
