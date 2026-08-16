# Scope of work

How responsibility for this project was split between human direction and AI-assisted implementation (Claude Code).

## Owned by the author (Maksym)

- **Technology stack**: NestJS for the backend (specified up front), Prisma + PostgreSQL, React + TypeScript + Vite + Tailwind for the frontend, S3-compatible object storage, and JWT email/password authentication over Google OAuth (avoids needing external OAuth credentials for local development).
- **Architectural direction**: the overall shape of the solution — Data Room → Folder → File hierarchy, read-only sharing via public links and per-user invites, and which optional/extra-credit features to build (search, file versioning).
- **Repository and folder structure**: the `backend/` / `frontend/` split and the naming of modules/folders within each.
- **Code review**: all AI-generated code was reviewed before being accepted.

## Implemented by Claude Code (AI)

- Backend: NestJS modules, controllers, services, DTOs, the Prisma schema and migrations, the access-control logic, and the S3 storage abstraction — including the detailed design decisions within the architecture above (e.g. the uniqueness-constraint approach for folder/file names, the versioning-on-name-conflict behavior, the access-resolution model for shares).
- Frontend: all React components, pages, hooks, and API client code.
- Documentation: this file and `README.md`.

See `README.md` → "A note on how AI was used" for the technical specifics of that process (including bugs the review/testing process caught).
