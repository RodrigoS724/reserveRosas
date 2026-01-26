import { app, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Database from "better-sqlite3";
import fs from "node:fs";
let db = null;
let dbConnectionInProgress = false;
function initDatabase() {
  if (db) {
    console.log("✅ [DB] Reutilizando conexión existente");
    return db;
  }
  if (dbConnectionInProgress) {
    console.log("⏳ [DB] Conexión en progreso, esperando...");
    if (db) return db;
  }
  dbConnectionInProgress = true;
  try {
    if (!app.isReady()) {
      throw new Error("Electron app not ready");
    }
    const userDataPath = app.getPath("userData");
    const dbPath = path.join(userDataPath, "reservas.db");
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    console.log("🔌 [DB] Creando nueva conexión a:", dbPath);
    db = new Database(dbPath, {
      readonly: false,
      fileMustExist: false,
      timeout: 3e4
    });
    console.log("🔧 [DB] Configurando pragmas...");
    db.pragma("query_only = FALSE");
    db.pragma("journal_mode = OFF");
    db.pragma("synchronous = OFF");
    db.pragma("cache_size = -64000");
    db.pragma("temp_store = MEMORY");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 100000");
    console.log("✅ [DB] Pragmas configurados correctamente");
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
  } finally {
    dbConnectionInProgress = false;
  }
}
function normalizarHora(hora) {
  const [h, m] = hora.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) {
    throw new Error("Formato de hora inválido");
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function esSabado(fecha) {
  const d = /* @__PURE__ */ new Date(`${fecha}T00:00:00`);
  return d.getDay() === 6;
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
  let horarios = db2.prepare(`
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
  if (esSabado(fecha)) {
    horarios = horarios.filter((h) => h.hora < "12:00");
  }
  return horarios;
}
function crearHorario(hora) {
  console.log("⏰ [Service] Creando horario:", hora);
  const db2 = initDatabase();
  const horaNormalizada = normalizarHora(hora);
  try {
    const tx = db2.transaction(() => {
      const existe = db2.prepare(`
        SELECT id FROM horarios_base WHERE hora = ?
      `).get(horaNormalizada);
      if (existe) {
        throw new Error("El horario ya existe");
      }
      db2.prepare(`
        INSERT INTO horarios_base (hora, activo)
        VALUES (?, 1)
      `).run(horaNormalizada);
      console.log("✅ [Service] Horario creado:", horaNormalizada);
    });
    tx();
  } catch (error) {
    console.error("❌ [Service] Error en crearHorario:", error);
    throw error;
  }
}
function desactivarHorario(id) {
  console.log("❌ [Service] Desactivando horario:", id);
  const db2 = initDatabase();
  try {
    const tx = db2.transaction(() => {
      db2.prepare(`
        UPDATE horarios_base
        SET activo = 0
        WHERE id = ?
      `).run(id);
      console.log("✅ [Service] Horario desactivado:", id);
    });
    tx();
  } catch (error) {
    console.error("❌ [Service] Error en desactivarHorario:", error);
    throw error;
  }
}
function bloquearHorario(fecha, hora, motivo) {
  console.log("🚫 [Service] Bloqueando horario:", { fecha, hora, motivo });
  const db2 = initDatabase();
  const horaNormalizada = normalizarHora(hora);
  try {
    const tx = db2.transaction(() => {
      const existe = db2.prepare(`
        SELECT id FROM bloqueos_horarios
        WHERE fecha = ? AND hora = ?
      `).get(fecha, horaNormalizada);
      if (existe) {
        console.log("⚠️ [Service] Horario ya bloqueado");
        return;
      }
      db2.prepare(`
        INSERT INTO bloqueos_horarios (fecha, hora, motivo)
        VALUES (?, ?, ?)
      `).run(fecha, horaNormalizada, motivo ?? "");
      console.log("✅ [Service] Horario bloqueado");
    });
    tx();
  } catch (error) {
    console.error("❌ [Service] Error en bloquearHorario:", error);
    throw error;
  }
}
let isLocked = false;
const queue = [];
let operationCounter = 0;
async function withDbLock(fn) {
  return new Promise((resolve, reject) => {
    const id = `op_${++operationCounter}`;
    const now = Date.now();
    queue.push({ id, fn, resolve, reject, createdAt: now });
    console.log(`⏳ [Lock] ${id} encolada. Cola: ${queue.length} operaciones. Locked: ${isLocked}`);
    processQueue();
  });
}
async function processQueue() {
  if (isLocked) {
    console.log(`🔒 [Lock] Sistema bloqueado, esperando liberación...`);
    return;
  }
  if (queue.length === 0) {
    console.log(`✅ [Lock] Cola vacía, nada que procesar`);
    return;
  }
  isLocked = true;
  const operation = queue.shift();
  const now = Date.now();
  const waitTime = now - operation.createdAt;
  console.log(`🔓 [Lock] INICIANDO ${operation.id} (esperó ${waitTime}ms). Quedan: ${queue.length}`);
  try {
    const result = operation.fn();
    if (result instanceof Promise) {
      const resolvedResult = await result;
      operation.resolve(resolvedResult);
    } else {
      operation.resolve(result);
    }
    console.log(`✅ [Lock] ${operation.id} completada exitosamente`);
  } catch (error) {
    console.error(`❌ [Lock] ${operation.id} ERROR:`, (error == null ? void 0 : error.message) || error);
    operation.reject(error instanceof Error ? error : new Error(String(error)));
  } finally {
    isLocked = false;
    console.log(`🔓 [Lock] ${operation.id} liberada. Quedan: ${queue.length}`);
    if (queue.length > 0) {
      console.log(`➡️ [Lock] Procesando siguiente...`);
      setImmediate(() => processQueue());
    }
  }
}
function registrarHandlersHorarios() {
  ipcMain.handle(
    "horarios:base",
    () => obtenerHorariosBase()
  );
  ipcMain.handle(
    "horarios:disponibles",
    (_, fecha) => obtenerHorariosDisponibles(fecha)
  );
  ipcMain.handle(
    "horarios:crear",
    async (_, hora) => await withDbLock(() => crearHorario(hora))
  );
  ipcMain.handle(
    "horarios:desactivar",
    async (_, id) => await withDbLock(() => desactivarHorario(id))
  );
  ipcMain.handle(
    "horarios:bloquear",
    async (_, payload) => await withDbLock(
      () => bloquearHorario(payload.fecha, payload.hora, payload.motivo)
    )
  );
}
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;
async function executeWithRetry(fn, retryCount = 0) {
  try {
    console.log(`📦 [Service] Intento ${retryCount + 1}/${MAX_RETRIES}`);
    return fn();
  } catch (error) {
    if ((error == null ? void 0 : error.code) === "SQLITE_BUSY" && retryCount < MAX_RETRIES - 1) {
      console.warn(`⚠️ [Service] SQLITE_BUSY, reintentando en ${RETRY_DELAY_MS}ms...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return executeWithRetry(fn, retryCount + 1);
    }
    throw error;
  }
}
async function crearReserva(data) {
  console.log("📝 [Service] Iniciando crearReserva...");
  return executeWithRetry(() => {
    const db2 = initDatabase();
    const tx = db2.transaction(() => {
      console.log("🔒 [Service] Dentro de transaction...");
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
      console.log("✅ [Service] Reserva insertada con ID:", result.lastInsertRowid);
      db2.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES (?, 'creación', '', 'reserva creada', datetime('now'))
      `).run(result.lastInsertRowid);
      console.log("✅ [Service] Historial registrado");
      return result.lastInsertRowid;
    });
    console.log("⚙️ [Service] Ejecutando transaction...");
    const lastId = tx();
    console.log("✅ [Service] Transaction completada con ID:", lastId);
    return lastId;
  });
}
function obtenerReserva(id) {
  console.log("📖 [Service] Obteniendo reserva:", id);
  const db2 = initDatabase();
  return db2.prepare(`SELECT * FROM reservas WHERE id = ?`).get(id);
}
function borrarReserva(id) {
  console.log("🗑️ [Service] Borrando reserva:", id);
  const db2 = initDatabase();
  try {
    const tx = db2.transaction(() => {
      const reserva = db2.prepare(`
        SELECT * FROM reservas WHERE id = ?
      `).get(id);
      if (!reserva) {
        console.log("⚠️ [Service] Reserva no encontrada:", id);
        return;
      }
      db2.prepare(`DELETE FROM reservas WHERE id = ?`).run(id);
      console.log("✅ [Service] Reserva borrada");
      db2.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES (?, 'eliminación', ?, 'reserva eliminada', datetime('now'))
      `).run(id, JSON.stringify(reserva));
      console.log("✅ [Service] Historial registrado para borrado");
    });
    tx();
  } catch (error) {
    console.error("❌ [Service] Error en borrarReserva:", error);
    throw error;
  }
}
function moverReserva(id, nuevaFecha, nuevaHora) {
  console.log("📍 [Service] Moviendo reserva:", { id, nuevaFecha, nuevaHora });
  const db2 = initDatabase();
  try {
    const tx = db2.transaction(() => {
      const anterior = db2.prepare(`
        SELECT fecha, hora FROM reservas WHERE id = ?
      `).get(id);
      if (!anterior) {
        console.log("⚠️ [Service] Reserva no encontrada para mover:", id);
        return;
      }
      db2.prepare(`
        UPDATE reservas
        SET fecha = ?, hora = COALESCE(?, hora)
        WHERE id = ?
      `).run(nuevaFecha, nuevaHora ?? null, id);
      console.log("✅ [Service] Reserva movida");
      if (nuevaFecha !== anterior.fecha) {
        db2.prepare(`
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES (?, 'fecha', ?, ?, datetime('now'))
        `).run(id, anterior.fecha, nuevaFecha);
        console.log("✅ [Service] Cambio de fecha registrado");
      }
      if (nuevaHora && nuevaHora !== anterior.hora) {
        db2.prepare(`
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES (?, 'hora', ?, ?, datetime('now'))
        `).run(id, anterior.hora, nuevaHora);
        console.log("✅ [Service] Cambio de hora registrado");
      }
    });
    tx();
  } catch (error) {
    console.error("❌ [Service] Error en moverReserva:", error);
    throw error;
  }
}
function actualizarReserva(id, reserva) {
  console.log("✏️ [Service] Actualizando reserva:", id, reserva);
  const db2 = initDatabase();
  try {
    const anterior = db2.prepare(`
      SELECT nombre, fecha, hora, estado, detalles
      FROM reservas
      WHERE id = ?
    `).get(id);
    if (!anterior) {
      console.log("⚠️ [Service] Reserva no encontrada para actualizar:", id);
      return;
    }
    const transaction = db2.transaction(() => {
      db2.prepare(`
        UPDATE reservas
        SET nombre = ?, fecha = ?, hora = ?, estado = ?, detalles = ?
        WHERE id = ?
      `).run(
        reserva.nombre,
        reserva.fecha,
        reserva.hora,
        reserva.estado,
        reserva.detalles,
        reserva.id
      );
      console.log("✅ [Service] Datos actualizados");
      for (const campo of Object.keys(anterior)) {
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
          console.log(`✅ [Service] Cambio registrado: ${campo}`);
        }
      }
    });
    transaction();
  } catch (error) {
    console.error("❌ [Service] Error en actualizarReserva:", error);
    throw error;
  }
}
function obtenerReservasSemana(desde, hasta) {
  const db2 = initDatabase();
  return db2.prepare(`
    SELECT * FROM reservas
    WHERE fecha BETWEEN ? AND ?
    ORDER BY fecha, hora
  `).all(desde, hasta);
}
function registrarHandlersReservas() {
  ipcMain.handle("reservas:crear", async (_, data) => {
    const startTime = Date.now();
    console.log("\n" + "=".repeat(50));
    console.log("✅ [IPC] Recibiendo solicitud de reserva:");
    console.log(data);
    console.log("=".repeat(50));
    try {
      console.log("⏳ [IPC] Esperando lock...");
      const result = await withDbLock(async () => {
        console.log("🔐 [IPC] Lock adquirido, ejecutando crearReserva");
        return await crearReserva(data);
      });
      const elapsed = Date.now() - startTime;
      console.log(`✅ [IPC] Reserva creada exitosamente en ${elapsed}ms, retornando ID:`, result);
      console.log("=".repeat(50) + "\n");
      return result;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ [IPC] Error en reservas:crear (${elapsed}ms):`, (error == null ? void 0 : error.message) || error);
      console.error("Stack:", error == null ? void 0 : error.stack);
      console.log("=".repeat(50) + "\n");
      throw error;
    }
  });
  ipcMain.handle("reservas:obtener", (_, id) => {
    console.log("🔍 [IPC] Obteniendo reserva:", id);
    return obtenerReserva(id);
  });
  ipcMain.handle("reservas:borrar", async (_, id) => {
    console.log("🗑️ [IPC] Borrando reserva:", id);
    try {
      const result = await withDbLock(() => borrarReserva(id));
      console.log("✅ [IPC] Reserva borrada exitosamente");
      return result;
    } catch (error) {
      console.error("❌ [IPC] Error en reservas:borrar:", error);
      throw error;
    }
  });
  ipcMain.handle("reservas:mover", async (_, payload) => {
    console.log("📍 [IPC] Moviendo reserva:", payload);
    try {
      const result = await withDbLock(
        () => moverReserva(payload.id, payload.nuevaFecha, payload.nuevaHora)
      );
      console.log("✅ [IPC] Reserva movida exitosamente");
      return result;
    } catch (error) {
      console.error("❌ [IPC] Error en reservas:mover:", error);
      throw error;
    }
  });
  ipcMain.handle("reservas:actualizar", async (_, payload) => {
    console.log("✏️ [IPC] Actualizando reserva:", payload);
    try {
      const result = await withDbLock(
        () => actualizarReserva(payload.id, payload)
      );
      console.log("✅ [IPC] Reserva actualizada exitosamente");
      return result;
    } catch (error) {
      console.error("❌ [IPC] Error en reservas:actualizar:", error);
      throw error;
    }
  });
  ipcMain.handle("reservas:semana", (_, payload) => {
    console.log("📅 [IPC] Obteniendo reservas de semana:", payload);
    return obtenerReservasSemana(payload.desde, payload.hasta);
  });
}
function traducirCampo(campo) {
  const mapa = {
    nombre: "Nombre",
    fecha: "Fecha",
    hora: "Hora",
    estado: "Estado",
    detalles: "Observaciones",
    creación: "Creación",
    eliminación: "Eliminación"
  };
  return mapa[campo] ?? campo;
}
function describirCambio(campo, anterior, nuevo) {
  if (campo === "creación") {
    return "Reserva creada";
  }
  if (campo === "eliminación") {
    return "Reserva eliminada";
  }
  if (anterior === null && nuevo !== null) {
    return `Se estableció ${traducirCampo(campo)}: ${nuevo}`;
  }
  if (anterior !== null && nuevo === null) {
    return `Se eliminó ${traducirCampo(campo)}`;
  }
  if (anterior !== nuevo) {
    return `Cambió ${traducirCampo(campo)} de "${anterior}" a "${nuevo}"`;
  }
  return `Actualización de ${traducirCampo(campo)}`;
}
function obtenerHistorial(reservaId) {
  if (!Number.isInteger(reservaId)) {
    throw new Error("ID de reserva inválido");
  }
  const db2 = initDatabase();
  const filas = db2.prepare(`
    SELECT
      id,
      reserva_id,
      campo,
      valor_anterior,
      valor_nuevo,
      fecha,
      usuario
    FROM historial_reservas
    WHERE reserva_id = ?
    ORDER BY datetime(fecha) DESC, id DESC
  `).all(reservaId);
  return filas.map((row) => ({
    ...row,
    descripcion: describirCambio(
      row.campo,
      row.valor_anterior,
      row.valor_nuevo
    )
  }));
}
function registrarEventoHistorial(reservaId, campo, anterior, nuevo, usuario) {
  const db2 = initDatabase();
  const tx = db2.transaction(() => {
    db2.prepare(`
      INSERT INTO historial_reservas
      (reserva_id, campo, valor_anterior, valor_nuevo, fecha, usuario)
      VALUES (?, ?, ?, ?, datetime('now'), ?)
    `).run(
      reservaId,
      campo,
      anterior,
      nuevo,
      usuario ?? "sistema"
    );
  });
  tx();
}
function registrarHandlersHistorial() {
  ipcMain.handle(
    "historial:obtener",
    (_, reservaId) => obtenerHistorial(reservaId)
  );
  ipcMain.handle(
    "historial:registrar",
    async (_, payload) => await withDbLock(
      () => registrarEventoHistorial(
        payload.reservaId,
        payload.campo,
        payload.anterior,
        payload.nuevo,
        payload.usuario
      )
    )
  );
}
function setupIpcHandlers() {
  console.log(" \n🧩 Cargando IPC handlers  \n");
  registrarHandlersHorarios();
  registrarHandlersReservas();
  registrarHandlersHistorial();
  console.log(" \n ✅ IPC handlers cargados \n");
}
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
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
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
