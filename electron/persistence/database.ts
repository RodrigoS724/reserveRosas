import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

// Guardamos la base de datos en la carpeta de datos de usuario de la app
const dbPath = path.join(app.getPath('userData'), 'agenda.db');
const db = new Database(dbPath);

// Creamos la tabla si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT,
    fecha TEXT, -- Formato YYYY-MM-DD
    hora TEXT    -- Formato HH:mm
  )
`);

export default db;