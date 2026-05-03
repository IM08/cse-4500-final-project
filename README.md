# Mosaic — Photo Album Portfolio

CSE 4500 (Platform Computing) — Final Project — CSUSB

**Team:** Solomon Smith, Issac Munoz, Dominic Arrezola, Charles Phan

A small full-stack web app for creating photo albums, uploading images,
viewing them in a full-screen lightbox, and managing them. Backend is
Node + Express + SQLite; frontend is hand-rolled HTML / CSS / vanilla JS
with no framework.

![Mosaic albums view](./mosaic-albums-with-covers.png)

## Run it locally

Requires Node 22 (pinned in `.node-version`).

```bash
npm install
npm start
# → Mosaic running at http://localhost:3000
```

The dev variant `npm run dev` re-launches on file change via `node --watch`.

## Project layout

```
.
├── server.js            Express app + all REST routes
├── db.js                SQLite schema + connection (better-sqlite3)
├── render.yaml          Render Blueprint (web service + persistent disk)
├── package.json
├── public/
│   ├── index.html       Single-page client shell
│   ├── styles.css       All styling — design tokens, grid, lightbox, etc.
│   └── script.js        Fetch wrappers, rendering, event wiring
├── uploads/             (gitignored) Image files served at /uploads/*
├── database.db          (gitignored) SQLite database
├── report.md            1-page project report
├── presentation.md      Marp slide deck source
└── README.md
```

## REST API

| Method | Path                | Purpose                                       |
|--------|---------------------|-----------------------------------------------|
| GET    | `/api/albums`       | List every album with its nested images       |
| POST   | `/api/albums`       | Create a new album. Body: `{ "name": "..." }` |
| DELETE | `/api/albums/:id`   | Delete album + all images + their disk files  |
| POST   | `/api/upload`       | Multipart: `image` (file) + `album_id`        |
| DELETE | `/api/images/:id`   | Delete one image record + its file on disk    |

All non-OK responses return `{ "error": "<message>" }` with the
appropriate HTTP status (400 / 404 / 409 / 500).

## Database schema

```sql
CREATE TABLE albums (
  id         INTEGER  PRIMARY KEY AUTOINCREMENT,
  name       TEXT     NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE images (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  filename      TEXT     NOT NULL,
  original_name TEXT     NOT NULL,
  album_id      INTEGER  NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  uploaded_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Foreign keys are explicitly enabled on every connection
(`PRAGMA foreign_keys = ON;`) so deleting an album cascades to its
`images` rows; the server then unlinks each file from disk to keep the
filesystem and database in sync.

## Validation surface

| Scenario                          | Status | Body                                   |
|-----------------------------------|--------|----------------------------------------|
| Duplicate album name              | 409    | `{ error: "Album \"X\" already…" }`    |
| Empty album name                  | 400    | `{ error: "Album name is required" }`  |
| Non-image upload (`.txt`, etc.)   | 400    | `{ error: "Only image files…" }`       |
| Upload > 10 MB                    | 400    | `{ error: "File too large", code: … }` |
| Upload to nonexistent album       | 404    | `{ error: "Album not found" }`         |
| Delete nonexistent image / album  | 404    | `{ error: "Image not found" }` etc.    |

## Deploy to Render

`render.yaml` is a Render Blueprint that provisions one web service plus
a 1 GB persistent disk mounted at `/uploads/`, so uploaded images
survive redeploys.

```bash
# After connecting the repo on render.com:
#   New → Blueprint → pick this repo → Apply.
# Render builds with `npm install` and starts `node server.js`.
```

## License

Educational use only — coursework for CSE 4500 at CSUSB.
