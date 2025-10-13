// server.js
// CARICA LE VARIABILI D'AMBIENTE (come PORT, DB_USER, ecc.)
require('dotenv').config(); 

const express = require('express');
const path = require('path');
// const mysql = require('mysql2'); // NON installato/usato ancora, ma sarai pronto
const app = express();
const PORT = process.env.PORT || 3000; // Usa la variabile da .env, altrimenti 3000

// Middleware per leggere JSON e dati form
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// ... (logica di connessione MySQL rimossa temporaneamente) ...

// --- SERVING STATICO ---
app.use('/resorces', express.static(path.join(__dirname, 'resorces')));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Esempio di API (per ora senza database)
app.post('/api/tasks', (req, res) => {
    // Quando avrai MySQL, qui inserirai la logica db.query()
    console.log('Task ricevuto:', req.body);
    res.status(201).send({ message: 'Task ricevuto dal server, ma non salvato nel DB.' });
});

// Avvio del server
app.listen(PORT, () => {
    console.log(`Server Node.js in esecuzione su http://localhost:${PORT}`);
});