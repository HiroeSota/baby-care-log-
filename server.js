const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'baby-care.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type            TEXT NOT NULL,
    subtype         TEXT,
    label           TEXT,
    icon            TEXT,
    display_time    TEXT,
    timestamp       TEXT NOT NULL,
    duration        INTEGER,
    condition_text  TEXT,
    memo            TEXT
  );
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Logs ──────────────────────────────────────────────
app.get('/api/logs', (req, res) => {
  const rows = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC').all();
  res.json(rows.map(r => ({
    id:            r.id,
    type:          r.type,
    subtype:       r.subtype,
    label:         r.label,
    icon:          r.icon,
    displayTime:   r.display_time,
    timestamp:     r.timestamp,
    duration:      r.duration,
    conditionText: r.condition_text,
    memo:          r.memo
  })));
});

app.post('/api/logs', (req, res) => {
  const { type, subtype, label, icon, displayTime, timestamp, duration, conditionText, memo } = req.body;
  const result = db.prepare(`
    INSERT INTO logs (type, subtype, label, icon, display_time, timestamp, duration, condition_text, memo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(type, subtype ?? null, label ?? null, icon ?? null, displayTime ?? null, timestamp,
         duration ?? null, conditionText ?? null, memo ?? null);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/logs/:id', (req, res) => {
  db.prepare('DELETE FROM logs WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ── Settings ──────────────────────────────────────────
app.get('/api/settings/:key', (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
  res.json({ value: row ? row.value : null });
});

app.post('/api/settings/:key', (req, res) => {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.params.key, req.body.value);
  res.json({ ok: true });
});

app.delete('/api/settings/:key', (req, res) => {
  db.prepare('DELETE FROM settings WHERE key = ?').run(req.params.key);
  res.json({ ok: true });
});

// ── Migration (localStorage → SQLite, one-time) ───────
app.post('/api/migrate', (req, res) => {
  const existing = db.prepare('SELECT COUNT(*) as c FROM logs').get().c;
  if (existing > 0) { res.json({ ok: true, skipped: true }); return; }

  const { logs, name, activeSleep } = req.body;
  const insert = db.prepare(`
    INSERT INTO logs (type, subtype, label, icon, display_time, timestamp, duration, condition_text, memo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.transaction(() => {
    for (const l of (logs || [])) {
      insert.run(l.type, l.subtype ?? null, l.label ?? null, l.icon ?? null,
                 l.displayTime ?? null, l.timestamp, l.duration ?? null,
                 l.conditionText ?? null, l.memo ?? null);
    }
  })();

  if (name) db.prepare('INSERT OR REPLACE INTO settings VALUES (?, ?)').run('baby-name', name);
  if (activeSleep) db.prepare('INSERT OR REPLACE INTO settings VALUES (?, ?)').run('active-sleep', JSON.stringify(activeSleep));

  res.json({ ok: true, imported: (logs || []).length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Baby care server: http://localhost:${PORT}`));
