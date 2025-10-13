// server.js

// 1. Carica le variabili d'ambiente dal file .env
require('dotenv').config(); 

// 2. Moduli base
const express = require('express');
const path = require('path');
const app = express();

// 3. Importa la connessione al DB (QUESTO FILE DEVE ESISTERE)
// Il file database/connection.js gestisce l'oggetto di connessione mysql2
require('./database/connection'); 

// 4. Importa la logica di accesso al database (Repository Pattern) (QUESTO FILE DEVE ESISTERE)
// Il file database/task.repository.js contiene le funzioni saveTask, getAllTasks, ecc.
const taskRepository = require('./database/task.repository'); 

const PORT = process.env.PORT || 3000;

// ==========================================================
// MIDDLEWARE
// ==========================================================

// Per poter leggere i dati JSON inviati dal front-end (es. fetch in addtask.js)
app.use(express.json());

// Per poter leggere i dati inviati tramite form standard URL-encoded (se usati)
app.use(express.urlencoded({ extended: true })); 

// ==========================================================
// SERVING DEI FILE STATICI
// ==========================================================

// Configura Express per servire tutti i file nella root directory (index.html, index.css, ecc.)
app.use(express.static(__dirname));

// Se hai una cartella "resorces" nella root, questa linea la serve
app.use('/resorces', express.static(path.join(__dirname, 'resorces')));

// Route principale: invia index.html all'accesso
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// ==========================================================
// ROUTES API PER I TASK
// ==========================================================

// Route POST: Aggiunge un nuovo task
app.post('/api/tasks', (req, res) => {
    const taskData = req.body;
    
    // Delega il salvataggio al Repository
    taskRepository.saveTask(taskData, (err, result) => {
        if (err) {
            console.error('❌ Errore durante l\'inserimento del task:', err);
            return res.status(500).json({ error: 'Errore interno del server durante il salvataggio.' });
        }
        
        // Risposta di successo con codice 201 (Created)
        res.status(201).json({ 
            message: 'Task salvato con successo!', 
            id: result.insertId 
        });
    });
});

// Route GET: Recupera tutti i task (esempio)
app.get('/api/tasks', (req, res) => {
    taskRepository.getAllTasks((err, tasks) => {
        if (err) {
            console.error('❌ Errore durante il recupero dei task:', err);
            return res.status(500).json({ error: 'Errore interno del server durante il recupero dei dati.' });
        }
        res.status(200).json(tasks);
    });
});


// ==========================================================
// AVVIO DEL SERVER
// ==========================================================
app.listen(PORT, () => {
    console.log(`🚀 Server Node.js in esecuzione su http://localhost:${PORT}`);
});