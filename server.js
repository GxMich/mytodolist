require('dotenv').config(); 
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken'); 
const app = express();
require('./database/connection'); 
const taskRepository = require('./database/task.repository'); 
const userRepository = require('./database/user.repository');
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser());
const authenticateToken = (req, res, next) => {
    const token = req.cookies.jwt; 
    if (!token) {
        return res.status(401).json({ error: 'Accesso negato.' });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token non valido o scaduto.' });
        }
        req.user = user; 
        next();
    });
};
app.post('/api/auth/register', (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password || username.length < 3 || password.length < 8) {
        return res.status(400).json({ error: 'Dati non validi o incompleti.' });
    }
    userRepository.checkIfUserExists(username, email, (err, exists) => {
        if (err) {
            console.error('Errore nel controllo esistenza:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        if (exists) { 
            return res.status(409).json({ error: 'Username o email già in uso.' });
        }
        userRepository.newUser(username, email, password, (err, result) => {
            if (err) {
                console.error('Errore durante la registrazione:', err);
                return res.status(500).json({ error: 'Errore interno.' });
            }
            res.status(201).json({ message: 'Utente registrato con successo!', userId: result.insertId });
        });
    });
});
app.post('/api/auth/login', (req, res) => {
    const { credenziale, password } = req.body; 
    if (!credenziale || !password) {
        return res.status(400).json({ error: 'Credenziali incomplete.' });
    }
    userRepository.findUser(credenziale, password, (err, user) => {
        if (err) {
            console.error('Errore durante il login:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        if (!user) { 
            return res.status(401).json({ error: 'Credenziali non valide.' }); 
        }
        const token = jwt.sign(
            { id: user.id, username: user.username }, 
            process.env.JWT_SECRET,                 
            { expiresIn: '1h' }                    
        );
        res.cookie('jwt', token, {
            httpOnly: true,              
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 3600000              
        });
        res.status(200).json({ 
            message: 'Accesso riuscito',
            user: { id: user.id, username: user.username }
        });
    });
});
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('jwt', { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    
    res.status(200).json({ message: 'Logout effettuato con successo.' });
});
app.patch('/api/auth/update', authenticateToken, (req, res) => {
    const userId = req.user.id; 
    const { username, email, password } = req.body;
    if (!username && !email && !password) {
        return res.status(400).json({ error: 'Almeno un campo è richiesto.' });
    }
    userRepository.updateCredentials(userId, username, email, password, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') { 
                return res.status(409).json({ error: 'Username o email già in uso.' });
            }
            console.error('Errore durante l\'aggiornamento credenziali:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        if (result.message) { 
            return res.status(200).json({ message: result.message });
        }
        res.status(200).json({ message: 'Credenziali aggiornate con successo.', changedRows: result.changedRows });
    });
});
app.get('/api/me', authenticateToken, (req, res) => {
    res.status(200).json({ 
        isAuthenticated: true,
        user: { id: req.user.id, username: req.user.username }
    });
});
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});