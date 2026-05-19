const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'restaurant.db'));

db.serialize(() => {
    // ⚠️ CHANGEMENT IMPORTANT : id en TEXT pour UUID
    db.run(`
        CREATE TABLE IF NOT EXISTS restaurants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS menu_items (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT,
            available BOOLEAN DEFAULT 1,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS tables (
            number INTEGER PRIMARY KEY,
            capacity INTEGER,
            available BOOLEAN DEFAULT 1
        )
    `);

    console.log('✅ Tables SQLite créées avec ID en TEXT');
});

module.exports = db;