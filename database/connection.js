// db/db.js
const mysql = require('mysql2');

let connection;

// Railway fornisce MYSQL_URL come connection string completa
if (process.env.MYSQL_URL) {
    connection = mysql.createPool(process.env.MYSQL_URL);
} else {
    connection = mysql.createPool({
        host: process.env.DB_HOST,
        user: (process.env.DB_USER || 'root').trim(),
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

// Test connessione all'avvio
connection.getConnection((err, conn) => {
    if (err) {
        console.error('⚠️ Errore di connessione a MySQL:', err.message);
        return;
    }
    console.log('✅ Connesso al database MySQL (pool)');
    conn.release();
});

module.exports = connection;