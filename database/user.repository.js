const db = require('./connection');
const bcrypt = require('bcryptjs');

const newUser = (username, email, password, callback) => {
    bcrypt.hash(password, 10, (err, hash) => {
        if(err){console.error("Errore hashing passowort"); return callback(err);}
        const sql = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
        const value = [username, email, hash];
        db.query(sql, value, (dbErr, result) =>{
            if(dbErr){return callback(dbErr);}
            return callback(null, result);
        });
    });
}

const findUser = (credenziale, password, callback) => {
    const sql = 'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?';
    db.query(sql, [credenziale, credenziale],(err, results) => {
        if(err){return callback(err);}
        if(results.length === 0){return callback(null, null);}
        const user = results[0];
        bcrypt.compare(password, user.password_hash, (errCompare, resultCompare) => {
            if(errCompare){return callback(errCompare);}
            if(resultCompare){delete user.password_hash; return callback(null, user)}
            else{return callback(null, false);}
        });
    });
}

const updateCredentials = (userId, newUsername, newEmail, newPassword, callback) => {
    const fieldsToUpdate = [];
    const values = [];
    if (newUsername) {fieldsToUpdate.push('username = ?');values.push(newUsername);}
    if (newEmail) {fieldsToUpdate.push('email = ?');values.push(newEmail);}
    if (newPassword) {
        bcrypt.hash(newPassword, 10, (err, hash) => {
            if (err) {return callback(err);}
            fieldsToUpdate.push('password_hash = ?');
            values.push(hash);
            executeDbUpdate(fieldsToUpdate, values, userId, callback);
        });
    } else {executeDbUpdate(fieldsToUpdate, values, userId, callback);}
};

const executeDbUpdate = (fieldsToUpdate, values, userId, callback) => {
    if (fieldsToUpdate.length === 0) {return callback(null, { message: 'Nessun campo fornito per l\'aggiornamento.' });}
    const sql = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
    values.push(userId); 
    db.query(sql, values, callback);
};

const checkIfUserExists = (username, email, callback) => {
    const sql = 'SELECT id FROM users WHERE username = ? OR email = ?';
    db.query(sql, [username, email], (err, results) => {
        if (err) {return callback(err);}
        const userExists = results.length > 0;
        callback(null, userExists);
    });
};

module.exports = {
    newUser,
    findUser,
    updateCredentials,
    checkIfUserExists,
}