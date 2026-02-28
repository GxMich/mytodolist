-- Creazione database
CREATE DATABASE IF NOT EXISTS my_todolist_db;
USE my_todolist_db;

-- Tabella utenti
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella tasks
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    titolo VARCHAR(255) NOT NULL,
    genere ENUM('task', 'event', 'note') NOT NULL DEFAULT 'task',
    tag VARCHAR(50) DEFAULT NULL,
    categoria VARCHAR(50) DEFAULT NULL,
    dettagli TEXT DEFAULT NULL,
    inizio_ora TIME DEFAULT NULL,
    inizio_data DATE DEFAULT NULL,
    fine_ora TIME DEFAULT NULL,
    fine_data DATE DEFAULT NULL,
    in_giornata TINYINT(1) DEFAULT 0,
    task_giornaliera TINYINT(1) DEFAULT 0,
    urgenza ENUM('alta', 'media', 'bassa') DEFAULT NULL,
    priorita ENUM('alta', 'media', 'bassa') DEFAULT NULL,
    status ENUM('pending', 'completed', 'deleted') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
