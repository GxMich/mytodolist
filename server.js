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

// Middleware di autenticazione
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

// ==================== AUTH ====================

app.post('/api/auth/register', (req, res) => {
    const { username, email, password } = req.body;
    // Detailed validation
    if (!username || username.length < 3) {
        return res.status(400).json({ error: 'Username deve avere almeno 3 caratteri.', field: 'username' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Email non valida.', field: 'email' });
    }
    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri.', field: 'password' });
    }
    if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ error: 'La password deve contenere almeno una lettera maiuscola.', field: 'password' });
    }
    if (!/[0-9]/.test(password)) {
        return res.status(400).json({ error: 'La password deve contenere almeno un numero.', field: 'password' });
    }
    userRepository.checkIfUserExists(username, email, (err, exists) => {
        if (err) {
            console.error('Errore nel controllo esistenza:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        if (exists) {
            return res.status(409).json({ error: 'Username o email già in uso.', field: 'username' });
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

// Check username availability
app.get('/api/auth/check-username/:username', (req, res) => {
    const username = req.params.username;
    if (!username || username.length < 3) {
        return res.json({ available: false, reason: 'Troppo corto' });
    }
    userRepository.checkIfUserExists(username, '', (err, exists) => {
        if (err) {
            return res.status(500).json({ available: false, reason: 'Errore' });
        }
        res.json({ available: !exists });
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

// ==================== TASKS ====================

// Crea una nuova task
app.post('/api/tasks', authenticateToken, (req, res) => {
    const taskData = { ...req.body, userId: req.user.id };
    if (!taskData.titolo || !taskData.genere) {
        return res.status(400).json({ error: 'Titolo e genere sono obbligatori.' });
    }
    taskRepository.saveTask(taskData, (err, result) => {
        if (err) {
            console.error('Errore nel salvataggio della task:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        res.status(201).json({ message: 'Task creata con successo!', taskId: result.insertId });
    });
});

// Ottieni tutte le task dell'utente
app.get('/api/tasks', authenticateToken, (req, res) => {
    taskRepository.getAllTasks(req.user.id, (err, tasks) => {
        if (err) {
            console.error('Errore nel recupero delle task:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        res.status(200).json({ tasks });
    });
});

// Ottieni una task specifica
app.get('/api/tasks/:id', authenticateToken, (req, res) => {
    taskRepository.getTaskById(req.params.id, req.user.id, (err, task) => {
        if (err) {
            console.error('Errore nel recupero della task:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        if (!task) {
            return res.status(404).json({ error: 'Task non trovata.' });
        }
        res.status(200).json({ task });
    });
});

// Aggiorna una task
app.patch('/api/tasks/:id', authenticateToken, (req, res) => {
    taskRepository.updateTask(req.params.id, req.user.id, req.body, (err, result) => {
        if (err) {
            console.error('Errore nell\'aggiornamento della task:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        if (result.message) {
            return res.status(200).json({ message: result.message });
        }
        res.status(200).json({ message: 'Task aggiornata con successo.' });
    });
});

// Elimina una task (soft delete → status = 'deleted')
app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
    taskRepository.deleteTask(req.params.id, req.user.id, (err, result) => {
        if (err) {
            console.error('Errore nell\'eliminazione della task:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        res.status(200).json({ message: 'Task eliminata.' });
    });
});

// Ripristina una task eliminata
app.patch('/api/tasks/:id/restore', authenticateToken, (req, res) => {
    taskRepository.restoreTask(req.params.id, req.user.id, (err, result) => {
        if (err) {
            console.error('Errore nel ripristino della task:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        res.status(200).json({ message: 'Task ripristinata.' });
    });
});

// Elimina definitivamente una task
app.delete('/api/tasks/:id/permanent', authenticateToken, (req, res) => {
    taskRepository.permanentDeleteTask(req.params.id, req.user.id, (err, result) => {
        if (err) {
            console.error('Errore nell\'eliminazione definitiva:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        res.status(200).json({ message: 'Task eliminata definitivamente.' });
    });
});

// ==================== STATIC FILES ====================
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});