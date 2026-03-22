import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { config } from '../config.js';
import bcrypt from 'bcrypt';
let db;
export function getDb() {
    if (!db) {
        mkdirSync(dirname(config.dbPath), { recursive: true });
        db = new Database(config.dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initDb();
    }
    return db;
}
function initDb() {
    const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf-8');
    db.exec(schema);
    // Seed admin user if not exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!existing) {
        const hash = bcrypt.hashSync('admin123!', 10);
        db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
    }
}
//# sourceMappingURL=database.js.map