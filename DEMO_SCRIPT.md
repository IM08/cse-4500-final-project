# Mosaic — Demo Script

Run-of-show for the in-class final-project presentation. Total target time:
**8–10 minutes** (5 min slides + 3 min live demo + Q&A).

## Before class — checklist

- [ ] Pull latest `main` (or `solomon-start` if not yet merged).
- [ ] `npm install` is current; `node -v` reports `v22.x`.
- [ ] Test run: `npm start`, open `http://localhost:3000`, confirm albums view loads.
- [ ] Have **3 sample images** ready in a known folder for the live upload.
- [ ] Live URL ready (Render) — paste it on the title slide of `presentation.md`
  and re-export the PDF.
- [ ] Browser bookmarked: `http://localhost:3000` and the Render URL.
- [ ] Slides open in presenter mode (`presentation.pdf` full-screen).

## Run of show

### Slide 1 — Title (15s)

> "Hi, we're team Mosaic. I'm Solomon, with Issac, Dominic, and Charles. Our
> final project is **Mosaic — a photo album portfolio**. It's deployed live at
> `<Render URL>`."

### Slide 2 — The problem (30s)

> "The course covered HTML, CSS, JavaScript, Express, and database management as
> separate modules. The final project asks us to combine all of them. We picked
> a photo album because it forces us to use every layer at once: a styled
> responsive frontend, REST routes, multipart file uploads, a relational schema
> with a foreign-key cascade, and persistent file storage on deploy."

### Slide 3 — Architecture (45s)

> "On the left is the browser. On the right is one Express process running on
> Node 22. The two API surfaces are albums and images. The interesting wiring
> is delete — we use SQLite's `ON DELETE CASCADE` so deleting an album removes
> its image rows for free, and the server then unlinks the actual files from
> disk. That's how we keep the database and the uploads folder from drifting
> apart."

### Slide 4 — Live demo (3 minutes — switch to browser)

**Scripted clicks:**

1. Open `http://localhost:3000`. Show empty albums view.
   > "Fresh DB, no albums yet."
2. Click **+ New Album**. Type `Final Demo`. Hit Create.
   > "POST to `/api/albums`. Inserts a row into the `albums` table, returns the
   > new id, and the client refetches the list."
3. Click the new album card.
   > "Now we're in gallery view. The frontend hid the albums section and
   > swapped in the gallery. State is just one variable: `activeAlbumId`."
4. Click **Choose File**, pick the first sample image, hit **Upload**.
   > "Multipart POST to `/api/upload`. Multer parses, writes the file to
   > `uploads/` with a server-generated name, and inserts a row into the
   > `images` table linking it to this album."
5. Upload two more images.
   > "Notice the count badge updates on the album card — the client refetches
   > after every mutation, so the views stay in sync."
6. Click a thumbnail. Lightbox opens.
   > "Lightbox is just a `display:none` div we toggle. The dim backdrop catches
   > clicks and closes."
7. Close lightbox. Click the **×** on a thumbnail. Confirm delete.
   > "DELETE `/api/images/:id` removes the DB row and `fs.unlink`s the file.
   > If you check the `uploads/` folder on the server it's gone."
8. Click **Back**. Now click **×** on the album card. Confirm.
   > "DELETE `/api/albums/:id`. Cascade deletes the image rows, and the server
   > collects the filenames first so it can clean up disk."

**Backup if something breaks:**
- If the server crashes: Ctrl-C, `npm start`, browser hard-refresh.
- If the DB is in a weird state: Ctrl-C, `rm database.db`, `npm start`.
- If the uploads folder is full of junk: Ctrl-C, `find uploads -type f -delete`,
  `npm start`.

### Slide 5 — Tech stack (30s)

> "Six choices worth calling out. Node 22 because better-sqlite3 is a native
> module and we needed a stable ABI. Express because it's what the course
> taught. better-sqlite3 because it's synchronous — no callback plumbing — and
> for class scale that's a feature, not a bug. Multer for the multipart
> handling, capped at 10 megabytes per file. The frontend is plain JS and CSS,
> no framework, and notably no `innerHTML` anywhere — we use `textContent` and
> `createElement` so user-supplied album names can't inject markup. And Render
> for the deploy, with a one-gigabyte persistent disk so uploads survive
> redeploys."

### Slide 6 — Validation (45s)

> "The backend validates every request and returns JSON error envelopes the
> frontend shows as toasts. Duplicate album names, empty names, non-image
> uploads, oversized uploads, uploads to a nonexistent album, and deletes of
> missing rows all get clean error messages instead of crashing or returning
> HTML stack traces."
>
> *(Optionally tab back to browser, try uploading a `.txt` file → toast.)*

### Slide 7 — Lessons learned (60s)

> "Four things bit us during build:
>
> One — native modules pin the runtime. better-sqlite3 is compiled against a
> specific Node ABI, so a teammate on Node 25 had a binary mismatch. We pinned
> Node 22 in `.node-version` and that closes it for everyone, including Render.
>
> Two — SQLite ships with foreign keys disabled. If you don't issue
> `PRAGMA foreign_keys = ON` per connection, your `ON DELETE CASCADE` silently
> does nothing. Took us a minute to notice.
>
> Three — Multer writes the temp file to disk *before* your route handler
> runs. So if you validate the album_id and reject, you've already orphaned a
> file. We added a cleanup path that unlinks on every validation failure.
>
> Four — for XSS prevention, `textContent` is cheaper than sanitizing
> `innerHTML`. We never assign user data to innerHTML at all, which means
> there's no parser to confuse — XSS is structurally impossible for that
> field, no library required."

### Slide 8 — Team (15s)

> "Mosaic is a joint effort. Thanks to my teammates."

### Slide 9 — Q&A (remainder)

**Anticipated questions + answers:**

| Q | A |
|---|---|
| "Why no auth?" | "Out of scope for this assignment. The course covered the persistence + transport layers, not session management. If we extended it, we'd add session cookies + a `users` table with a per-album owner FK." |
| "What if two people upload the same filename?" | "We don't trust the original name. Saved filenames are `<timestamp>-<random>.<ext>`, generated server-side. The original name is only kept for display and the alt text." |
| "How big can the uploads folder get?" | "Render disk is 1 GB. Per file is capped at 10 MB by Multer. Beyond that we'd need a real object store (S3, R2)." |
| "Why not React?" | "Adds dependencies, build steps, and a framework runtime that the course didn't teach. The whole client is one HTML file, one CSS file, and one JS file — under 600 lines of script for a CRUD app." |
| "Is the API safe from SQL injection?" | "Yes — every query uses `better-sqlite3`'s parameter binding, no string interpolation. IDs are coerced through `Number()` before they hit the prepared statement." |
| "What happens if the server crashes mid-upload?" | "Multer's temp file is on disk, but no `images` row exists for it. It's an orphan. We don't have a janitor pass for that — would add one for production." |

## Slide-to-speaker assignment (suggestion)

| Slide | Speaker |
|-------|---------|
| 1 Title | Solomon |
| 2 Problem | Issac |
| 3 Architecture | Dominic |
| 4 Live demo | Solomon (driver) + everyone narrating |
| 5 Tech stack | Charles |
| 6 Validation | Issac |
| 7 Lessons | Dominic |
| 8 Team | Charles |
| 9 Q&A | All |

Adjust to taste — but every team member should speak at least once.

## After the demo

- [ ] Push any last-minute fixes.
- [ ] Submit the repo URL + `report.pdf` + `presentation.pdf` per the
  Canvas/Blackboard instructions.
- [ ] Take down or scale the Render service to free if you're on a paid plan.
