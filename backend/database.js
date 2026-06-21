const path = require('path');
const fs   = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const DB_PATH  = path.join(DATA_DIR, 'cyber_panel.db');

let _db  = null;
let _SQL = null;

async function initDb() {
  if (_db) return;
  _SQL = await require('sql.js')();
  if (fs.existsSync(DB_PATH)) {
    _db = new _SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new _SQL.Database();
  }
  _db.run('PRAGMA foreign_keys = ON;');
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT DEFAULT 'analyst',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_login DATETIME
    );
    CREATE TABLE IF NOT EXISTS news_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL,
      title TEXT NOT NULL, link TEXT UNIQUE NOT NULL, summary TEXT,
      published_at DATETIME, fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      severity TEXT DEFAULT 'info'
    );
    CREATE TABLE IF NOT EXISTS cve_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cve_id TEXT UNIQUE NOT NULL,
      description TEXT, cvss_score REAL, cvss_vector TEXT, severity TEXT,
      published_at DATETIME, modified_at DATETIME,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS kev_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cve_id TEXT UNIQUE NOT NULL,
      vendor_project TEXT, product TEXT, vulnerability_name TEXT,
      date_added DATETIME, short_description TEXT, required_action TEXT,
      due_date DATETIME, fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL,
      title TEXT NOT NULL, message TEXT NOT NULL, severity TEXT DEFAULT 'medium',
      source TEXT, acknowledged INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      acknowledged_at DATETIME, acknowledged_by TEXT
    );
    CREATE TABLE IF NOT EXISTS ioc_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL,
      value TEXT NOT NULL, source TEXT, threat_type TEXT,
      confidence INTEGER DEFAULT 50, country TEXT, report TEXT,
      last_seen DATETIME, fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vt_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT, indicator TEXT UNIQUE NOT NULL,
      indicator_type TEXT, malicious INTEGER DEFAULT 0,
      suspicious INTEGER DEFAULT 0, undetected INTEGER DEFAULT 0,
      harmless INTEGER DEFAULT 0, reputation INTEGER DEFAULT 0,
      country TEXT, owner TEXT, tags TEXT, raw TEXT,
      queried_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      ip TEXT, hostname TEXT, os TEXT, asset_type TEXT DEFAULT 'server',
      criticality TEXT DEFAULT 'medium', owner TEXT, tags TEXT,
      notes TEXT, created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS asset_cve_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER,
      cve_id TEXT, status TEXT DEFAULT 'open',
      linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      type TEXT DEFAULT 'weekly', content TEXT, generated_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cve_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cve_id TEXT NOT NULL,
      note TEXT NOT NULL, author TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cve_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cve_id TEXT NOT NULL,
      tag TEXT NOT NULL, author TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS alert_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      description TEXT, source TEXT DEFAULT 'cve',
      conditions TEXT DEFAULT '[]', actions TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1, triggered_count INTEGER DEFAULT 0,
      created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS rule_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, rule_id INTEGER,
      rule_name TEXT, trigger_data TEXT, actions_taken TEXT,
      triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS scan_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL,
      score INTEGER, grade TEXT, ssl_info TEXT, headers TEXT,
      reputation TEXT, cves TEXT, recommendations TEXT, raw TEXT,
      scanned_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const rows = _db.exec("SELECT id FROM users WHERE username='admin'");
  if (!rows.length || !rows[0].values.length) {
    const hashed = bcrypt.hashSync('admin123', 10);
    _db.run("INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)",
      ['admin','admin@cyberpanel.local',hashed,'admin']);
    console.log('[DB] Default admin: admin / admin123');
  }
  _save();
  console.log('[DB] Ready →', DB_PATH);
}

function _save() {
  if (!_db) return;
  try { fs.writeFileSync(DB_PATH, Buffer.from(_db.export())); }
  catch (e) { console.error('[DB] Save error:', e.message); }
}

function _query(sql, params = []) {
  try {
    const stmt = _db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      const obj = {};
      cols.forEach((c, i) => { obj[c] = vals[i]; });
      rows.push(obj);
    }
    stmt.free();
    return rows;
  } catch (e) {
    console.error('[DB] query error:', e.message, '\nSQL:', sql);
    return [];
  }
}

function _run(sql, params = []) {
  try {
    _db.run(sql, params);
    const idRows = _db.exec('SELECT last_insert_rowid() as id');
    const lastId = idRows[0]?.values[0]?.[0] ?? null;
    _save();
    return { lastInsertRowid: lastId, changes: 1 };
  } catch (e) {
    console.error('[DB] run error:', e.message, '\nSQL:', sql);
    return { lastInsertRowid: null, changes: 0 };
  }
}

function prepare(sql) {
  return {
    get(...args)  { const p = args.length===1&&Array.isArray(args[0])?args[0]:args; return _query(sql,p)[0]; },
    all(...args)  { const p = args.length===1&&Array.isArray(args[0])?args[0]:args; return _query(sql,p); },
    run(...args)  { const p = args.length===1&&Array.isArray(args[0])?args[0]:args; return _run(sql,p); },
  };
}

function exec(sql) { _db.run(sql); _save(); }

const db = { prepare, exec };
module.exports = { initDb, getDbProxy: () => db };
