// database/task.repository.js
const db = require('./connection'); // Importa la connessione all'interno della stessa cartella

const saveTask = (taskData, callback) => {
    // ... logica query SQL ...
    const { titolo, genere, tag, dettagli } = taskData;
    const sql = 'INSERT INTO tasks (titolo, genere, tag, dettagli) VALUES (?, ?, ?, ?)';
    const values = [titolo, genere, tag, dettagli];
    
    db.query(sql, values, callback); 
};

module.exports = {
    saveTask,
    // ...
};