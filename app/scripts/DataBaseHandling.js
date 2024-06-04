const sqlite3 = require('sqlite3').verbose();

function dbHandle(filePath) {
    const db = new sqlite3.Database(filePath);
    console.log(`Connected to the SQLite database at ${filePath}`);

    const createTableIfNotExists = (table) => {
        return new Promise((resolve, reject) => {
            const sql = `CREATE TABLE IF NOT EXISTS ${table} (key TEXT PRIMARY KEY, value TEXT)`;
            db.run(sql, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };

    const get = async (table, key) => {
        try {
            await createTableIfNotExists(table);
            const sql = `SELECT value FROM ${table} WHERE key = ?`;
            return new Promise((resolve, reject) => {
                db.get(sql, [key], (err, row) => {
                    if (err) {
                        reject(err);
                    } else if (!row) {
                        resolve(`Key "${key}" not found in table "${table}"`);
                    } else {
                        resolve(row.value);
                    }
                });
            });
        } catch (error) {
            return `Error retrieving from table "${table}": ${error.message}`;
        }
    };

    const set = async (table, key, value) => {
        try {
            await createTableIfNotExists(table);
            const sql = `INSERT OR REPLACE INTO ${table} (key, value) VALUES (?, ?)`;
            return new Promise((resolve, reject) => {
                db.run(sql, [key, value], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(`Value set for key "${key}" in table "${table}"`);
                    }
                });
            });
        } catch (error) {
            return `Error setting value in table "${table}": ${error.message}`;
        }
    };

    const remove = async (table, key) => {
        try {
            await createTableIfNotExists(table);
            const sql = `DELETE FROM ${table} WHERE key = ?`;
            return new Promise((resolve, reject) => {
                db.run(sql, [key], function (err) {
                    if (err) {
                        reject(err);
                    } else if (this.changes === 0) {
                        resolve(`Key "${key}"not found in table "${table}"`);
                    } else {
                        resolve(`Key "${key}" removed from table "${table}"`);
                    }
                });
            });
        } catch (error) {
            return `Error removing from table "${table}": ${error.message}`;
        }
    };

    return {
        get,
        set,
        remove,
    };
}

module.exports = { dbHandle };

