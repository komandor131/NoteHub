# NoteHub

Local full-stack planner and code snippet vault.

## Features

- Calendar planner with month, week, and day views.
- Task records with type, status, priority, start/end time, due date, tags, color, and attachments.
- Code vault with Monaco editor, snippet explanation, language, tags, search, and attachments.
- Local SQLite persistence through `sql.js`.
- Local upload storage under `uploads/`.

## Run Locally

Use `npm.cmd` on this Windows machine because PowerShell may block `npm.ps1`.

```powershell
npm.cmd install
npm.cmd run dev
```

The app runs at:

- Web UI: http://localhost:5173
- API: http://localhost:5174

## Useful Commands

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd audit --audit-level=moderate
```

## Data

- SQLite database: `database/notehub.sqlite`
- Uploaded files: `uploads/`

Both are local-only runtime data and are ignored by git.
