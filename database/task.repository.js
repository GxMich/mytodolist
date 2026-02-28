const db = require('./connection');

const saveTask = (taskData, callback) => {
    const { userId, titolo, genere, tag, categoria, dettagli, inizioOra, inizioData, fineOra, fineData, inGiornata, taskGiornaliera, urgenza, priorita } = taskData;
    const sql = `INSERT INTO tasks (user_id, titolo, genere, tag, categoria, dettagli, inizio_ora, inizio_data, fine_ora, fine_data, in_giornata, task_giornaliera, urgenza, priorita) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [userId, titolo, genere, tag || null, categoria || null, dettagli || null, inizioOra || null, inizioData || null, fineOra || null, fineData || null, inGiornata ? 1 : 0, taskGiornaliera ? 1 : 0, urgenza || null, priorita || null];
    db.query(sql, values, callback);
};

const getAllTasks = (userId, callback) => {
    const sql = 'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC';
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

const updateTask = (taskId, userId, updates, callback) => {
    const fieldsToUpdate = [];
    const values = [];
    const allowedFields = ['titolo', 'genere', 'tag', 'categoria', 'dettagli', 'inizio_ora', 'inizio_data', 'fine_ora', 'fine_data', 'in_giornata', 'task_giornaliera', 'urgenza', 'priorita', 'status'];
    
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            fieldsToUpdate.push(`${key} = ?`);
            values.push(value);
        }
    }
    if (fieldsToUpdate.length === 0) return callback(null, { message: 'Nessun campo da aggiornare.' });
    
    const sql = `UPDATE tasks SET ${fieldsToUpdate.join(', ')} WHERE id = ? AND user_id = ?`;
    values.push(taskId, userId);
    db.query(sql, values, callback);
};

const deleteTask = (taskId, userId, callback) => {
    const sql = 'UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?';
    db.query(sql, ['deleted', taskId, userId], callback);
};

const permanentDeleteTask = (taskId, userId, callback) => {
    const sql = 'DELETE FROM tasks WHERE id = ? AND user_id = ?';
    db.query(sql, [taskId, userId], callback);
};

const restoreTask = (taskId, userId, callback) => {
    const sql = 'UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?';
    db.query(sql, ['pending', taskId, userId], callback);
};

module.exports = {
    saveTask,
    getAllTasks,
    getTaskById,
    updateTask,
    deleteTask,
    permanentDeleteTask,
    restoreTask
};