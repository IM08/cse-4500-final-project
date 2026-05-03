/**
 * server.js — Mosaic Express backend
 * CSE 4500 Final Project
 *
 * Routes:
 *   GET    /api/albums        — all albums with their images
 *   POST   /api/albums        — create a new album
 *   POST   /api/upload        — upload an image to an album
 *   DELETE /api/images/:id    — delete an image record
 *
 * Static:
 *   /uploads/*  — serves saved image files
 *   /*          — serves public/ frontend
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const cors    = require('cors');
const db      = require('./db');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads/ exists at startup (Render persistent disk may mount empty)
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Best-effort delete of a file in uploads/. Missing file is not an error.
function unlinkUpload(filename) {
  if (!filename) return;
  fs.unlink(path.join(UPLOADS_DIR, filename), err => {
    if (err && err.code !== 'ENOENT') console.error('unlink failed:', filename, err.message);
  });
}

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// Serve uploaded images before the catch-all static middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// ─── Multer configuration ─────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    // Prefix with timestamp + random number to avoid collisions
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = /\.(jpeg|jpg|png|gif|webp)$/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, png, gif, webp)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB max
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/albums
 * Returns all albums, each with a nested images array.
 * Empty albums are included with images: [].
 */
app.get('/api/albums', (req, res) => {
  const rows = db.prepare(`
    SELECT
      a.id,
      a.name,
      a.created_at,
      json_group_array(
        CASE WHEN i.id IS NOT NULL
          THEN json_object(
            'id',            i.id,
            'filename',      i.filename,
            'original_name', i.original_name,
            'uploaded_at',   i.uploaded_at
          )
        END
      ) AS images
    FROM albums a
    LEFT JOIN images i ON i.album_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `).all();

  const albums = rows.map(row => ({
    ...row,
    images: JSON.parse(row.images).filter(Boolean)
  }));

  res.json(albums);
});

/**
 * POST /api/albums
 * Body: { name: string }
 * Creates a new album. Returns 409 if name already exists.
 */
app.post('/api/albums', (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'Album name is required' });

  try {
    const result = db.prepare('INSERT INTO albums (name) VALUES (?)').run(name);
    res.status(201).json({ id: result.lastInsertRowid, name });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Album "${name}" already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/upload
 * Multipart form: image (file) + album_id (string)
 * Saves file to /uploads/, records in DB. Returns the new image record.
 *
 * Note: multer's diskStorage writes the file BEFORE the route handler
 * runs, so any validation failure below must clean up the orphaned file
 * via unlinkUpload() to keep the disk and DB in sync.
 */
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });

  if (!req.body.album_id) {
    unlinkUpload(req.file.filename);
    return res.status(400).json({ error: 'album_id is required' });
  }

  const albumId = Number(req.body.album_id);

  // Verify the album exists; if not, clean up the orphaned upload.
  const album = db.prepare('SELECT id FROM albums WHERE id = ?').get(albumId);
  if (!album) {
    unlinkUpload(req.file.filename);
    return res.status(404).json({ error: 'Album not found' });
  }

  const result = db.prepare(
    'INSERT INTO images (filename, original_name, album_id) VALUES (?, ?, ?)'
  ).run(req.file.filename, req.file.originalname, albumId);

  res.status(201).json({
    id:            result.lastInsertRowid,
    filename:      req.file.filename,
    original_name: req.file.originalname,
    album_id:      albumId
  });
});

/**
 * DELETE /api/images/:id
 * Removes the image record from the DB and the file from disk.
 */
app.delete('/api/images/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT filename FROM images WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Image not found' });

  db.prepare('DELETE FROM images WHERE id = ?').run(id);
  unlinkUpload(row.filename);
  res.json({ success: true });
});

/**
 * DELETE /api/albums/:id
 * Removes the album, all its images (FK cascade), and their files from disk.
 */
app.delete('/api/albums/:id', (req, res) => {
  const id = Number(req.params.id);
  const album = db.prepare('SELECT id FROM albums WHERE id = ?').get(id);
  if (!album) return res.status(404).json({ error: 'Album not found' });

  // Collect filenames before cascade so we can clean up disk afterward
  const files = db.prepare('SELECT filename FROM images WHERE album_id = ?').all(id);
  db.prepare('DELETE FROM albums WHERE id = ?').run(id);
  files.forEach(f => unlinkUpload(f.filename));

  res.json({ success: true, deleted_files: files.length });
});

// ─── Error handler ────────────────────────────────────────────────────────────

/*
 * Catch-all error handler. Express recognizes this signature (4 args) as
 * an error middleware. We map every error to a JSON envelope so the
 * frontend can rely on response.json() succeeding regardless of HTTP
 * status. Multer's MulterError carries a `code` field (e.g.
 * LIMIT_FILE_SIZE), which we surface as a 400 with the message; anything
 * else is a 500.
 */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Multer file-filter / size-limit / etc.
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: err.message, code: err.code });
  }

  // Custom errors thrown from imageFilter() above.
  if (err instanceof Error) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Mosaic running at http://localhost:${PORT}`);
});
