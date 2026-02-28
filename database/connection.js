// db/db.js
const mysql = require('mysql2');

let connection;

// Railway fornisce MYSQL_URL come connection string completa
if (process.env.MYSQL_URL) {
    connection = mysql.createConnection(process.env.MYSQL_URL);
} else {
    connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });
}

connection.connect(err => {
    if (err) {
        console.error('⚠️ Errore di connessione a MySQL:', err.stack);
        return;
    }
    console.log('✅ Connesso al database MySQL con ID:', connection.threadId);
});

module.exports = connection;