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
const cors    = require('cors');
const db      = require('./db');

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
 */
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file)      return res.status(400).json({ error: 'No image file provided' });
  if (!req.body.album_id) return res.status(400).json({ error: 'album_id is required' });

  const albumId = Number(req.body.album_id);

  // Verify the album exists
  const album = db.prepare('SELECT id FROM albums WHERE id = ?').get(albumId);
  if (!album) return res.status(404).json({ error: 'Album not found' });

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
 * Removes the image record from the DB.
 * Note: the file remains on disk (acceptable for demo scope).
 */
app.delete('/api/images/:id', (req, res) => {
  db.prepare('DELETE FROM images WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

// ─── Start server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Mosaic running at http://localhost:${PORT}`);
});
