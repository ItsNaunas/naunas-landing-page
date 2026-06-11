<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Progress tracking (non-negotiable)

`PROGRESS.md` at the repo root is this project's cross-session state. The vault sync reads it twice a day to keep the business dashboards current, so it must be true.

- **Session start**: read `PROGRESS.md` first.
- **Session end** (any session that changed code, config, or direction): update it before finishing — bump `Last updated`, rewrite `State` to one line of what works now, refresh `Next steps`, and prepend a dated entry to `Recent sessions` (what changed, decisions made, blockers hit). Trim the log to the last ~10 entries.
- Keep it a summary: detailed task lists live in their own files (e.g. `tasks/todo.md`); `PROGRESS.md` carries state, not backlog.
