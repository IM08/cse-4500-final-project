/**
 * ============================================================================
 * Mosaic — seed.js
 * CSE 4500 (Platform Computing) — Final Project
 * ----------------------------------------------------------------------------
 * Demo-time fallback. If the live demo stalls (laptop hiccup, network
 * blip, browser cache weirdness), wipe the DB, drop in three pre-named
 * albums populated with sample images, and you have a populated state
 * in under five seconds.
 *
 *   USAGE:
 *     node seed.js              — seed the existing DB (creates one if absent)
 *     node seed.js --reset      — delete database.db and uploads/* first
 *
 * After seeding you'll see three folios:
 *   - Vacation 2026   (3 prints)
 *   - Senior Project Demo  (1 print)
 *   - Campus Photos   (1 print)
 *
 * Sample images are pulled live from picsum.photos with stable seeds so
 * the same shots come back every run. No external account or key needed.
 * ============================================================================
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ROOT        = __dirname;
const UPLOADS_DIR = path.join(ROOT, 'uploads');
const DB_PATH     = path.join(ROOT, 'database.db');

const reset = process.argv.includes('--reset');

// Optional reset path: clear DB + uploads first.
if (reset) {
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log('  wiped database.db');
    }
    if (fs.existsSync(UPLOADS_DIR)) {
        for (const f of fs.readdirSync(UPLOADS_DIR)) {
            fs.unlinkSync(path.join(UPLOADS_DIR, f));
        }
        console.log('  wiped uploads/');
    }
}

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Database setup ─────────────────────────────────────────────────────────
// Reuse the production schema by requiring db.js itself (which CREATEs the
// tables idempotently). That keeps the seed in lockstep with the real schema.
const db = require('./db');

// ─── Seed plan ──────────────────────────────────────────────────────────────
// Each entry binds an album to one or more picsum.photos seed names, so
// the images are visually distinct yet deterministic across runs.
const PLAN = [
    { name: 'Vacation 2026',       seeds: ['mosaic1', 'mosaic2', 'mosaic3'] },
    { name: 'Senior Project Demo', seeds: ['mosaic4'] },
    { name: 'Campus Photos',       seeds: ['mosaic5'] },
];

/**
 * Download a JPEG from picsum.photos to the given destination path.
 * Resolves to the destination on success; rejects on any HTTP error.
 *
 * @param {string} seed — picsum seed (any URL-safe string)
 * @param {string} dest — absolute file path to write to
 * @returns {Promise<string>}
 */
function fetchSampleImage(seed, dest) {
    const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/600`;
    return new Promise((resolve, reject) => {
        const get = (target, hops = 0) => {
            if (hops > 5) return reject(new Error(`too many redirects for ${seed}`));
            https.get(target, res => {
                // Follow 30x redirects (picsum bounces through pisum.photos -> CDN).
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    res.resume();
                    return get(res.headers.location, hops + 1);
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`HTTP ${res.statusCode} fetching ${seed}`));
                }
                const out = fs.createWriteStream(dest);
                res.pipe(out);
                out.on('finish', () => out.close(() => resolve(dest)));
                out.on('error', reject);
            }).on('error', reject);
        };
        get(url);
    });
}

/**
 * Generate a unique on-disk filename for an uploaded image. Mirrors the
 * pattern used by multer in server.js so the seeded files look identical
 * to user-uploaded ones.
 *
 * @param {string} ext — extension including the leading dot (e.g. ".jpg")
 * @returns {string}
 */
function uniqueFilename(ext = '.jpg') {
    const stamp = Date.now();
    const rand  = Math.round(Math.random() * 1e9);
    return `${stamp}-${rand}${ext}`;
}

// ─── Run ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('Seeding Mosaic with demo content…');

    const insertAlbum = db.prepare('INSERT INTO albums (name) VALUES (?)');
    const insertImage = db.prepare(
        'INSERT INTO images (filename, original_name, album_id) VALUES (?, ?, ?)'
    );

    for (const folio of PLAN) {
        let albumId;
        try {
            const result = insertAlbum.run(folio.name);
            albumId = result.lastInsertRowid;
            console.log(`  album "${folio.name}" -> id ${albumId}`);
        } catch (err) {
            // If the album already exists (UNIQUE constraint), reuse its id
            // so a re-run without --reset is still a no-op for the schema.
            if (String(err.message).includes('UNIQUE')) {
                albumId = db.prepare('SELECT id FROM albums WHERE name = ?')
                            .get(folio.name).id;
                console.log(`  album "${folio.name}" already present (id ${albumId})`);
            } else {
                throw err;
            }
        }

        for (const seed of folio.seeds) {
            const filename = uniqueFilename('.jpg');
            const dest     = path.join(UPLOADS_DIR, filename);
            await fetchSampleImage(seed, dest);
            insertImage.run(filename, `${seed}.jpg`, albumId);
            console.log(`    + ${filename}  (${seed})`);
        }
    }

    const counts = db.prepare(`
        SELECT a.name, COUNT(i.id) AS n
          FROM albums a
          LEFT JOIN images i ON i.album_id = a.id
         GROUP BY a.id
         ORDER BY a.created_at DESC
    `).all();
    console.log('\nDone. Current state:');
    for (const row of counts) {
        console.log(`  ${row.name.padEnd(26)} ${row.n} print${row.n === 1 ? '' : 's'}`);
    }
    console.log('\nStart the server with `npm start` and visit http://localhost:3000');
}

main().catch(err => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
