require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const app = express();
require('./database/connection');
const taskRepository = require('./database/task.repository');
const userRepository = require('./database/user.repository');
const PORT = process.env.PORT || 3000;

// Crea cartella uploads se non esiste
const uploadsDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurazione multer per avatar
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
    }
});
const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimeOk = allowed.test(file.mimetype);
        if (extOk && mimeOk) return cb(null, true);
        cb(new Error('Solo immagini (jpg, png, gif, webp) sono accettate.'));
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    const { credenziale, password, rememberMe } = req.body;
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

        // rememberMe → JWT e cookie a 7 giorni; altrimenti sessione (chiude col browser)
        const tokenExpiry = rememberMe ? '7d' : '1d';
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: tokenExpiry }
        );

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax'
        };
        if (rememberMe) {
            cookieOptions.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 giorni in ms
        }
        // Se rememberMe è false non settiamo maxAge → session cookie

        res.cookie('jwt', token, cookieOptions);
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
    userRepository.getUserById(req.user.id, (err, user) => {
        if (err) {
            console.error('Errore recupero utente:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Utente non trovato.' });
        }
        res.status(200).json({
            isAuthenticated: true,
            user: { id: user.id, username: user.username, photo_url: user.photo_url }
        });
    });
});

// ==================== AVATAR ====================

app.post('/api/auth/avatar', authenticateToken, (req, res) => {
    avatarUpload.single('avatar')(req, res, (err) => {
        if (err) {
            const msg = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
                ? 'Il file è troppo grande (max 5MB).'
                : err.message || 'Errore durante l\'upload.';
            return res.status(400).json({ error: msg });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file selezionato.' });
        }
        const photoUrl = `/uploads/avatars/${req.file.filename}`;

        // Rimuovi vecchia foto se esiste
        userRepository.getUserById(req.user.id, (err2, user) => {
            if (!err2 && user && user.photo_url) {
                const oldPath = path.join(__dirname, user.photo_url);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            userRepository.updatePhotoUrl(req.user.id, photoUrl, (err3) => {
                if (err3) {
                    console.error('Errore aggiornamento foto:', err3);
                    return res.status(500).json({ error: 'Errore interno.' });
                }
                res.status(200).json({ message: 'Foto aggiornata!', photo_url: photoUrl });
            });
        });
    });
});

app.delete('/api/auth/avatar', authenticateToken, (req, res) => {
    userRepository.getUserById(req.user.id, (err, user) => {
        if (err) {
            console.error('Errore recupero utente:', err);
            return res.status(500).json({ error: 'Errore interno.' });
        }
        if (user && user.photo_url) {
            const filePath = path.join(__dirname, user.photo_url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        userRepository.updatePhotoUrl(req.user.id, null, (err2) => {
            if (err2) {
                console.error('Errore rimozione foto:', err2);
                return res.status(500).json({ error: 'Errore interno.' });
            }
            res.status(200).json({ message: 'Foto rimossa.' });
        });
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

// ==================== AUTO MIGRATION ====================
const db = require('./database/connection');
db.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'photo_url'",
    (err, results) => {
        if (!err && results.length === 0) {
            db.query("ALTER TABLE users ADD COLUMN photo_url VARCHAR(255) DEFAULT NULL AFTER password_hash", (err2) => {
                if (err2) console.error('⚠️ Migrazione photo_url fallita:', err2.message);
                else console.log('✅ Colonna photo_url aggiunta alla tabella users.');
            });
        }
    }
);

app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});