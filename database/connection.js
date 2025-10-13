// db/db.js
const mysql = require('mysql2');

// Crea l'oggetto di connessione usando le variabili d'ambiente
const connection = mysql.createConnection({
    host: process.env.DB_HOST,      
    user: process.env.DB_USER,           
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_DATABASE
});

// Opzionale: Aggiungi un metodo di connessione per il log iniziale
connection.connect(err => {
    if (err) {
        console.error('⚠️ Errore di connessione a MySQL:', err.stack);
        return;
    }
    console.log('✅ Connesso al database MySQL con ID:', connection.threadId);
});

// Esporta la connessione per poterla usare altrove
module.exports = connection;