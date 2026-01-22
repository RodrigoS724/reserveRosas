import { app, ipcMain, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Database from "better-sqlite3";
import fs from "node:fs";
const __filename$2 = fileURLToPath(import.meta.url);
path.dirname(__filename$2);
let db = null;
function initDatabase() {
  if (db) return db;
  if (!app.isReady()) {
    throw new Error("Electron app not ready");
  }
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "reservas.db");
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      cedula TEXT,
      telefono TEXT,
      marca TEXT,
      modelo TEXT,
      km TEXT,
      matricula TEXT,
      tipo_turno TEXT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      detalles TEXT,
      estado TEXT DEFAULT 'pendiente'
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS horarios_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hora TEXT UNIQUE NOT NULL,
      activo INTEGER DEFAULT 1
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS bloqueos_horarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      motivo TEXT
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS historial_reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reserva_id INTEGER NOT NULL,
      campo TEXT NOT NULL,
      valor_anterior TEXT,
      valor_nuevo TEXT,
      fecha TEXT NOT NULL,
      usuario TEXT,
      FOREIGN KEY (reserva_id) REFERENCES reservas(id)
    );
  `);
  const count = db.prepare(`
    SELECT COUNT(*) as total FROM horarios_base
  `).get();
  if (count.total === 0) {
    const insert = db.prepare(`
      INSERT INTO horarios_base (hora) VALUES (?)
    `);
    const horas = [
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00"
    ];
    const transaction = db.transaction(() => {
      horas.forEach((h) => insert.run(h));
    });
    transaction();
  }
  console.log("✅ DB inicializada en:", dbPath);
  return db;
}
function obtenerHorariosBase() {
  const db2 = initDatabase();
  return db2.prepare(`
    SELECT * FROM horarios_base
    WHERE activo = 1
    ORDER BY hora
  `).all();
}
function obtenerHorariosDisponibles(fecha) {
  const db2 = initDatabase();
  return db2.prepare(`
    SELECT h.hora
    FROM horarios_base h
    WHERE h.activo = 1
      AND h.hora NOT IN (
        SELECT hora FROM reservas WHERE fecha = ?
      )
      AND h.hora NOT IN (
        SELECT hora FROM bloqueos_horarios WHERE fecha = ?
      )
    ORDER BY h.hora
  `).all(fecha, fecha);
}
function crearHorario(hora) {
  const db2 = initDatabase();
  db2.prepare(`
    INSERT INTO horarios_base (hora) VALUES (?)
  `).run(hora);
}
function desactivarHorario(id) {
  const db2 = initDatabase();
  db2.prepare(`
    UPDATE horarios_base SET activo = 0 WHERE id = ?
  `).run(id);
}
function bloquearHorario(fecha, hora, motivo) {
  const db2 = initDatabase();
  db2.prepare(`
    INSERT INTO bloqueos_horarios (fecha, hora, motivo)
    VALUES (?, ?, ?)
  `).run(fecha, hora, motivo);
}
function setupHorariosHandlers() {
  console.log("/nHorarios Handler funcionando /n");
  ipcMain.handle(
    "horarios:base",
    () => obtenerHorariosBase()
  );
  ipcMain.handle(
    "horarios:disponibles",
    (_e, fecha) => obtenerHorariosDisponibles(fecha)
  );
  ipcMain.handle("horarios:crear", (_e, hora) => {
    crearHorario(hora);
    return { success: true };
  });
  ipcMain.handle("horarios:desactivar", (_e, id) => {
    desactivarHorario(id);
    return { success: true };
  });
  ipcMain.handle("horarios:bloquear", (_e, data) => {
    bloquearHorario(data.fecha, data.hora, data.motivo);
    return { success: true };
  });
}
function crearReserva(data) {
  const db2 = initDatabase();
  const result = db2.prepare(`
    INSERT INTO reservas (
      nombre, cedula, telefono,
      marca, modelo, km, matricula,
      tipo_turno, fecha, hora, detalles
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.nombre,
    data.cedula,
    data.telefono,
    data.marca,
    data.modelo,
    data.km,
    data.matricula,
    data.tipo_turno,
    data.fecha,
    data.hora,
    data.detalles ?? ""
  );
  db2.prepare(`
    INSERT INTO historial_reservas
    (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
    VALUES (?, 'creación', '', 'reserva creada', datetime('now'))
  `).run(result.lastInsertRowid);
  return result.lastInsertRowid;
}
function obtenerReserva(id) {
  const db2 = initDatabase();
  return db2.prepare(`
    SELECT * FROM reservas WHERE id = ?
  `).get(id);
}
function borrarReserva(id) {
  const db2 = initDatabase();
  const reserva = db2.prepare(`
    SELECT * FROM reservas WHERE id = ?
  `).get(id);
  if (!reserva) return;
  db2.prepare(`
    DELETE FROM reservas WHERE id = ?
  `).run(id);
  db2.prepare(`
    INSERT INTO historial_reservas
    (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
    VALUES (?, 'eliminación', ?, 'reserva eliminada', datetime('now'))
  `).run(id, JSON.stringify(reserva));
}
function moverReserva(id, nuevaFecha, nuevaHora) {
  const db2 = initDatabase();
  const anterior = db2.prepare(`
    SELECT fecha, hora FROM reservas WHERE id = ?
  `).get(id);
  db2.prepare(`
    UPDATE reservas SET fecha = ?, hora = COALESCE(?, hora)
    WHERE id = ?
  `).run(nuevaFecha, null, id);
  if (nuevaFecha !== anterior.fecha) {
    db2.prepare(`
      INSERT INTO historial_reservas
      (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
      VALUES (?, 'fecha', ?, ?, datetime('now'))
    `).run(id, anterior.fecha, nuevaFecha);
  }
}
function actualizarReserva(id, reserva) {
  const db2 = initDatabase();
  const anterior = db2.prepare(`
 SELECT nombre, fecha, hora, estado, detalles
    FROM reservas
    WHERE id = ?
  `).get(id);
  db2.prepare(`
    UPDATE reservas
    SET
      nombre = ?,
      fecha = ?,
      hora = ?,
      estado = ?,
      detalles = ?
    WHERE id = ?
  `).run(
    reserva.nombre,
    reserva.fecha,
    reserva.hora,
    reserva.estado,
    reserva.detalles,
    reserva.id
  );
  Object.keys(anterior).forEach((campo) => {
    if (anterior[campo] !== reserva[campo]) {
      db2.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(
        reserva.id,
        campo,
        anterior[campo],
        reserva[campo]
      );
    }
  });
}
function obtenerReservasSemana(desde, hasta) {
  const db2 = initDatabase();
  return db2.prepare(`
    SELECT * FROM reservas
    WHERE fecha BETWEEN ? AND ?
    ORDER BY fecha, hora
  `).all(desde, hasta);
}
function setupReservasHandlers() {
  ipcMain.handle("reservas:guardar", (_e, datos) => {
    crearReserva(datos);
    return { success: true };
  });
  ipcMain.handle("reservas:obtener", (_e, id) => {
    obtenerReserva(id);
    return { success: true };
  });
  ipcMain.handle("reservas:borrar", (_e, id) => {
    borrarReserva(id);
    return { success: true };
  });
  ipcMain.handle("reservas:mover", (_e, data) => {
    moverReserva(data.id, data.nuevaFecha);
    return { success: true };
  });
  ipcMain.handle(
    "reservas:semana",
    (_e, rango) => obtenerReservasSemana(rango.desde, rango.hasta)
  );
  ipcMain.handle("reservas:detalles", (_e, data) => {
    actualizarReserva(data.id, data.detalles);
    return { success: true };
  });
  ipcMain.handle("reservas:actualizar", (_e, data) => {
    console.log("RESERVA RECIBIDA", data);
    actualizarReserva(data.id, data.detalles);
    return { success: true };
  });
}
function obtenerHistorial(reservaId) {
  const db2 = initDatabase();
  return db2.prepare(`
    SELECT * FROM historial_reservas
    WHERE reserva_id = ?
    ORDER BY fecha DESC
  `).all(reservaId);
}
function setupHistorialHandlers() {
  ipcMain.handle(
    "historial:reserva",
    (_e, id) => obtenerHistorial(id)
  );
}
function setupIpcHandlers() {
  console.log(" \n\n\n🧩 Cargando IPC handlers  \n\n\n");
  setupHorariosHandlers();
  setupReservasHandlers();
  setupHistorialHandlers();
  console.log(" \n\n\n ✅ IPC handlers cargados \n\n\n");
}
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    // Mínimo para que no se rompa el diseño
    minHeight: 700,
    title: "ReserveRosas - Taller Central",
    autoHideMenuBar: true,
    frame: true,
    // Mantenemos el marco de Windows (cerrar, minimizar)
    webPreferences: {
      preload: path.join(MAIN_DIST, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.webContents.openDevTools({ mode: "detach" });
  win.maximize();
  win.on("page-title-updated", (e) => e.preventDefault());
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.whenReady().then(() => {
  initDatabase();
  setupIpcHandlers();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
