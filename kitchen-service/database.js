const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'kitchen.db'));

db.serialize(() => {
    // File d'attente de la cuisine (aligné avec proto QueueOrder)
    db.run(`
        CREATE TABLE IF NOT EXISTS kitchen_queue (
            order_id TEXT PRIMARY KEY,
            items_json TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ready_at DATETIME,
            chef_name TEXT
        )
    `);

    // Personnel de cuisine
    db.run(`
        CREATE TABLE IF NOT EXISTS kitchen_staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT,
            active BOOLEAN DEFAULT 1
        )
    `);

    console.log('✅ Tables SQLite initialisées (kitchen_queue, kitchen_staff)');
});

module.exports = db;