# Mosaic — Photo Album Portfolio
**CSE 4500 (Platform Computing) — Final Project Report**
**Team:** Solomon Smith, Issac Munoz, Dominic Arrezola, Charles Phan
**Date:** May 2026

## 1. Problem

The course covered HTML, CSS, JavaScript, Express.js, and database
management as separate modules. The final project asked us to combine
those layers into one cohesive web application. We chose a **photo
album portfolio** because it exercises every layer at once: a styled
responsive frontend, REST routes, multipart file uploads, a relational
schema with a foreign-key cascade, and persistent file storage on
deploy.

## 2. Architecture

```
Browser  ──HTTP──>  Express (Node 22)
                      │
                      ├─ GET    /api/albums          → SQLite (LEFT JOIN)
                      ├─ POST   /api/albums          → SQLite INSERT
                      ├─ DELETE /api/albums/:id      → SQLite + fs.unlink
                      ├─ POST   /api/upload          → multer + SQLite INSERT
                      ├─ DELETE /api/images/:id      → SQLite + fs.unlink
                      ├─ /uploads/*                  → static (image files)
                      └─ /                           → static (public/ SPA)
```

The database has two tables — `albums` and `images` — with
`images.album_id` referencing `albums(id)` under
`ON DELETE CASCADE`. Foreign keys are turned on per connection
(`PRAGMA foreign_keys = ON;`) because SQLite ships with them disabled
by default. When an album is deleted, the cascade removes its image
rows, and the server then issues `fs.unlink` for each file to keep the
disk and the database in sync.

## 3. Tech stack

- **Node.js 22** — pinned via `.node-version`, matches Render runtime.
- **Express 4** — routing and static middleware.
- **better-sqlite3** — synchronous SQLite driver, ideal for class-scale
  apps because it eliminates async plumbing without sacrificing safety.
- **Multer** — multipart parsing with a file-extension filter and a
  10 MB upload cap.
- **Vanilla JS / CSS** — no framework. Rendering uses `createElement`
  and `textContent` exclusively (no `innerHTML`), so user-supplied
  album names cannot inject markup.
- **Render** — deployment via `render.yaml` Blueprint with a 1 GB
  persistent disk mounted at `/uploads/`.

## 4. Features

- Create, list, and delete albums.
- Upload images (JPEG / PNG / GIF / WEBP, ≤ 10 MB).
- Each album shows a cover thumbnail, the album name, and the image
  count; an empty album shows a folder placeholder.
- Click an album → gallery view with a thumbnail grid.
- Click a thumbnail → full-screen lightbox with click-backdrop-to-close.
- Delete an image (DB row + file on disk) or a whole album (cascade).
- Toast notifications for every action; errors from the backend are
  surfaced verbatim.
- Mobile-first responsive layout (375 px and up).

## 5. Validation

The backend validates every request, returning JSON error envelopes
the frontend can show as toasts: duplicate album name (HTTP 409),
empty name (400), non-image upload (400), upload too large (400),
upload to a nonexistent album (404), and deletion of a missing
record (404). When the album-existence check fails after multer has
already written the temp file to disk, the route unlinks the orphan
before responding so the filesystem never drifts from the DB.

## 6. Team

Mosaic is a joint effort by all four team members. Every member
contributed across the stack — frontend, backend, database, deployment,
report, and presentation:

- Solomon Smith
- Issac Munoz
- Dominic Arrezola
- Charles Phan

## 7. Lessons learned

- **Native modules pin the runtime.** `better-sqlite3` is compiled
  against a specific Node ABI; we had to pin Node 22 across machines
  to avoid `NODE_MODULE_VERSION` mismatches. The `.node-version` file
  documents this for teammates and for Render.
- **Foreign keys are off by default in SQLite.** Without
  `PRAGMA foreign_keys = ON;` the cascade we relied on for delete
  would silently no-op.
- **Multer writes before your route runs.** Validating the album_id
  *after* the upload middleware means a bad request leaves an orphan
  file on disk unless the route explicitly unlinks it.
- **Avoiding `innerHTML` is cheaper than sanitizing it.** Using
  `textContent` for every user-supplied string structurally rules out
  XSS without bringing in a sanitizer dependency.

## 8. Live demo

Deployed via Render Blueprint (see `render.yaml`).
**Live URL:** _(filled in on the title slide once the deploy completes)_
