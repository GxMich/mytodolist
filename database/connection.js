// db/db.js
const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: process.env.DB_HOST,      
    user: process.env.DB_USER,           
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_DATABASE
});
connection.connect(err => {
    if (err) {
        console.error('⚠️ Errore di connessione a MySQL:', err.stack);
        return;
    }
    console.log('✅ Connesso al database MySQL con ID:', connection.threadId);
});
module.exports = connection;