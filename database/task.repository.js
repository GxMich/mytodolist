const db = require('./connection');
const saveTask = (taskData, callback) => {
    const { userId, titolo, genere, tag, dettagli, inizioOra, inizioData, fineOra, fineData, inGiornata, priorita } = taskData;
    const sql = `INSERT INTO tasks (user_id, titolo, genere, tag, dettagli, inizio_ora, inizio_data, fine_ora, fine_data, in_giornata, priorita) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [userId, titolo, genere, tag, dettagli,inizioOra, inizioData, fineOra, fineData, inGiornata, priorita];
    db.query(sql, values, callback); 
};
const getAllTasks = (userId, callback) => {
    const sql = 'SELECT * FROM tasks WHERE user_id = ?'; 
    db.query(sql, [userId], callback);
};
const getTaskById = (taskId, userId, callback) => {
    const sql = 'SELECT * FROM tasks WHERE id = ? AND user_id = ?';
    db.query(sql, [taskId, userId], (err, results) => {
        if (err) return callback(err);
        if (results.length === 0) return callback(null, null); 
        callback(null, results[0]);
    });
};
module.exports = {
    saveTask,
    getAllTasks,
    getTaskById
};