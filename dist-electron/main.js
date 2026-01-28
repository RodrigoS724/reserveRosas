import { app as m, ipcMain as c, BrowserWindow as H } from "electron";
import { fileURLToPath as I } from "node:url";
import d from "node:path";
import A from "better-sqlite3";
import b from "node:fs";
const _ = I(import.meta.url), y = d.dirname(_);
typeof globalThis < "u" && (globalThis.__filename = _, globalThis.__dirname = y);
let t = null, g = !1;
function i() {
  var o, e;
  if (t)
    return console.log("✅ [DB] Reutilizando conexión existente"), t;
  if (g && (console.log("⏳ [DB] Conexión en progreso, esperando..."), t))
    return t;
  g = !0;
  try {
    if (!m.isReady())
      throw new Error("Electron app not ready");
    const r = m.getPath("userData"), a = d.join(r, "reservas.db");
    if (b.existsSync(r) || b.mkdirSync(r, { recursive: !0 }), console.log("🔌 [DB] Creando nueva conexión a:", a), t = new A(a, {
      readonly: !1,
      fileMustExist: !1,
      timeout: 3e4
    }), console.log("🔧 [DB] Configurando pragmas..."), t.pragma("query_only = FALSE"), t.pragma("journal_mode = OFF"), t.pragma("synchronous = OFF"), t.pragma("cache_size = -64000"), t.pragma("temp_store = MEMORY"), t.pragma("foreign_keys = ON"), t.pragma("busy_timeout = 100000"), console.log("✅ [DB] Pragmas configurados correctamente"), t.exec(`
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
      estado TEXT DEFAULT 'pendiente',
      notas TEXT
    );
  `), t.exec(`
    CREATE TABLE IF NOT EXISTS horarios_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hora TEXT UNIQUE NOT NULL,
      activo INTEGER DEFAULT 1
    );
  `), t.exec(`
    CREATE TABLE IF NOT EXISTS bloqueos_horarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      motivo TEXT
    );
  `), t.exec(`
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
  `), t.prepare(`
    SELECT COUNT(*) as total FROM horarios_base
  `).get().total === 0) {
      const n = t.prepare(`
      INSERT INTO horarios_base (hora) VALUES (?)
    `), E = [
        "08:00",
        "09:00",
        "10:00",
        "11:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00"
      ];
      t.transaction(() => {
        E.forEach((P) => n.run(P));
      })();
    }
    console.log("🔄 [DB] Ejecutando migraciones...");
    try {
      t.exec("ALTER TABLE reservas ADD COLUMN notas TEXT"), console.log('✅ [DB] Columna "notas" agregada a reservas');
    } catch (n) {
      (o = n == null ? void 0 : n.message) != null && o.includes("duplicate column") ? console.log('ℹ️ [DB] Columna "notas" ya existe en reservas') : (e = n == null ? void 0 : n.message) != null && e.includes("no such table") ? console.log("ℹ️ [DB] Tabla reservas no existe (será creada por CREATE TABLE IF NOT EXISTS)") : console.warn("⚠️ [DB] Error durante migración:", n == null ? void 0 : n.message);
    }
    return console.log("✅ DB inicializada en:", a), t;
  } finally {
    g = !1;
  }
}
function R(o) {
  const [e, r] = o.split(":").map(Number);
  if (isNaN(e) || isNaN(r))
    throw new Error("Formato de hora inválido");
  return `${String(e).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
function x(o) {
  return (/* @__PURE__ */ new Date(`${o}T00:00:00`)).getDay() === 6;
}
function F() {
  console.log("[Service] Obteniendo horarios base activos...");
  const e = i().prepare(`
    SELECT * FROM horarios_base
    WHERE activo = 1
    ORDER BY hora
  `).all();
  return console.log("[Service] Horarios obtenidos:", e), e;
}
function M(o) {
  let r = i().prepare(`
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
  `).all(o, o);
  return x(o) && (r = r.filter((a) => a.hora < "12:00")), r;
}
function U(o) {
  console.log("[Service] Creando horario:", o);
  const e = i(), r = R(o);
  try {
    e.transaction(() => {
      if (e.prepare(`
        SELECT id FROM horarios_base WHERE hora = ?
      `).get(r))
        throw new Error("El horario ya existe");
      e.prepare(`
        INSERT INTO horarios_base (hora, activo)
        VALUES (?, 1)
      `).run(r), console.log("[Service] Horario creado:", r);
    })();
  } catch (a) {
    throw console.error("[Service] Error en crearHorario:", a), a;
  }
}
function B(o) {
  console.log("[Service] Desactivando horario:", o);
  const e = i();
  try {
    e.transaction(() => {
      e.prepare(`
        UPDATE horarios_base
        SET activo = 0
        WHERE id = ?
      `).run(o), console.log("[Service] Horario desactivado:", o);
    })();
  } catch (r) {
    throw console.error("[Service] Error en desactivarHorario:", r), r;
  }
}
function z() {
  console.log("[Service] Obteniendo horarios inactivos");
  const e = i().prepare(`
    SELECT id, hora FROM horarios_base WHERE activo = 0 ORDER BY hora
  `).all();
  return console.log("[Service] Horarios inactivos encontrados:", e.length), e;
}
function q(o) {
  const e = i();
  e.transaction(() => {
    e.prepare(`
      UPDATE horarios_base
      SET activo = 1
      WHERE id = ?
    `).run(o);
  })();
}
function $(o, e, r) {
  console.log("[Service] Bloqueando horario:", { fecha: o, hora: e, motivo: r });
  const a = i(), s = new Date(o).toISOString().split("T")[0], n = R(e);
  console.log("[Service] Fecha normalizada:", o, "->", s), console.log("[Service] Hora normalizada:", e, "->", n);
  try {
    a.transaction(() => {
      if (a.prepare(`
        SELECT id FROM bloqueos_horarios
        WHERE fecha = ? AND hora = ?
      `).get(s, n)) {
        console.log("[Service] Horario ya bloqueado");
        return;
      }
      a.prepare(`
        INSERT INTO bloqueos_horarios (fecha, hora, motivo)
        VALUES (?, ?, ?)
      `).run(s, n, r ?? ""), console.log("[Service] Horario bloqueado");
    })();
  } catch (E) {
    throw console.error("[Service] Error en bloquearHorario:", E), E;
  }
}
function X(o, e) {
  console.log("[Service] Desbloqueando horario:", { fecha: o, hora: e });
  const r = i(), a = new Date(o).toISOString().split("T")[0], s = R(e);
  console.log("[Service] Fecha normalizada:", o, "->", a), console.log("[Service] Hora normalizada:", e, "->", s);
  try {
    r.transaction(() => {
      r.prepare(`
        DELETE FROM bloqueos_horarios
        WHERE fecha = ? AND hora = ?
      `).run(a, s), console.log("[Service] Horario desbloqueado");
    })();
  } catch (n) {
    throw console.error("[Service] Error en desbloquearHorario:", n), n;
  }
}
function W(o) {
  console.log("[Service] Obteniendo horarios bloqueados para:", o);
  const e = i(), r = new Date(o).toISOString().split("T")[0];
  console.log("[Service] Fecha normalizada:", o, "->", r);
  const a = e.prepare(`
    SELECT * FROM bloqueos_horarios
    WHERE fecha = ?
    ORDER BY hora
  `).all(r);
  console.log("[Service] Horarios bloqueados encontrados:", a);
  const s = e.prepare("SELECT * FROM bloqueos_horarios ORDER BY fecha, hora").all();
  return console.log("[Service] TODOS los bloqueos en BD:", s), a;
}
function Y(o) {
  console.log("[Service] Borrando horario permanentemente:", o);
  const e = i();
  try {
    e.transaction(() => {
      const a = e.prepare(`
        SELECT * FROM horarios_base WHERE id = ?
      `).get(o);
      if (!a)
        throw console.log("[Service] Horario no encontrado:", o), new Error("Horario no encontrado");
      e.prepare(`
        DELETE FROM horarios_base WHERE id = ?
      `).run(o), console.log("[Service] Horario eliminado permanentemente:", a);
    })();
  } catch (r) {
    throw console.error("[Service] Error en borrarHorarioPermanente:", r), r;
  }
}
let T = !1;
const h = [];
let k = 0;
async function l(o) {
  return new Promise((e, r) => {
    const a = `op_${++k}`, s = Date.now();
    h.push({ id: a, fn: o, resolve: e, reject: r, createdAt: s }), console.log(`[Lock] ${a} encolada. Cola: ${h.length} operaciones. Locked: ${T}`), O();
  });
}
async function O() {
  if (T) {
    console.log("[Lock] Sistema bloqueado, esperando liberación...");
    return;
  }
  if (h.length === 0) {
    console.log("[Lock] Cola vacía, nada que procesar");
    return;
  }
  T = !0;
  const o = h.shift(), r = Date.now() - o.createdAt;
  console.log(`[Lock] INICIANDO ${o.id} (esperó ${r}ms). Quedan: ${h.length}`);
  try {
    const a = o.fn();
    if (a instanceof Promise) {
      const s = await a;
      o.resolve(s);
    } else
      o.resolve(a);
    console.log(`[Lock] ${o.id} completada exitosamente`);
  } catch (a) {
    console.error(`[Lock] ${o.id} ERROR:`, (a == null ? void 0 : a.message) || a), o.reject(a instanceof Error ? a : new Error(String(a)));
  } finally {
    T = !1, console.log(`[Lock] ${o.id} liberada. Quedan: ${h.length}`), h.length > 0 && (console.log("[Lock] Procesando siguiente..."), setImmediate(() => O()));
  }
}
function V() {
  c.handle("horarios:base", async () => {
    console.log("[IPC] Obteniendo horarios base...");
    try {
      const o = await l(() => F());
      return console.log("[IPC] Horarios base obtenidos:", o), o;
    } catch (o) {
      throw console.error("[IPC] Error obteniendo horarios base:", o), o;
    }
  }), c.handle(
    "horarios:disponibles",
    (o, e) => M(e)
  ), c.handle(
    "horarios:crear",
    async (o, e) => await l(() => U(e))
  ), c.handle("horarios:desactivar", async (o, e) => {
    console.log("[IPC] Desactivando horario:", e);
    try {
      const r = await l(() => B(e));
      return console.log("[IPC] Horario desactivado exitosamente"), r;
    } catch (r) {
      throw console.error("[IPC] Error desactivando horario:", r), r;
    }
  }), c.handle("horarios:activar", async (o, e) => {
    console.log("[IPC] Activando horario:", e);
    try {
      const r = await l(() => q(e));
      return console.log("[IPC] Horario activado exitosamente"), r;
    } catch (r) {
      throw console.error("[IPC] Error activando horario:", r), r;
    }
  }), c.handle("horarios:inactivos", async () => {
    console.log("[IPC] Obteniendo horarios inactivos...");
    try {
      const o = await l(() => z());
      return console.log("[IPC] Horarios inactivos obtenidos:", o), o;
    } catch (o) {
      throw console.error("[IPC] Error obteniendo horarios inactivos:", o), o;
    }
  }), c.handle(
    "horarios:bloquear",
    async (o, e) => await l(
      () => $(e.fecha, e.hora, e.motivo)
    )
  ), c.handle("horarios:desbloquear", async (o, e) => {
    console.log("[IPC] Desbloqueando horario:", e);
    try {
      const r = await l(
        () => X(e.fecha, e.hora)
      );
      return console.log("[IPC] Horario desbloqueado exitosamente"), r;
    } catch (r) {
      throw console.error("[IPC] Error desbloqueando horario:", r), r;
    }
  }), c.handle("horarios:bloqueados", async (o, e) => {
    console.log("[IPC] Obteniendo horarios bloqueados para:", e);
    try {
      const r = await l(() => W(e));
      return console.log("[IPC] Horarios bloqueados obtenidos:", r), r;
    } catch (r) {
      throw console.error("[IPC] Error obteniendo horarios bloqueados:", r), r;
    }
  }), c.handle("horarios:borrar", async (o, e) => {
    console.log("[IPC] Borrando horario permanentemente:", e);
    try {
      const r = await l(() => Y(e));
      return console.log("[IPC] Horario eliminado exitosamente"), r;
    } catch (r) {
      throw console.error("[IPC] Error borrando horario:", r), r;
    }
  });
}
const p = 3, f = 100;
async function C(o, e = 0) {
  try {
    return console.log(`[Service] Intento ${e + 1}/${p}`), o();
  } catch (r) {
    if ((r == null ? void 0 : r.code) === "SQLITE_BUSY" && e < p - 1)
      return console.warn(`[Service] SQLITE_BUSY, reintentando en ${f}ms...`), await new Promise((a) => setTimeout(a, f)), C(o, e + 1);
    throw r;
  }
}
async function j(o) {
  console.log("[Service] Iniciando crearReserva...");
  const e = new Date(o.fecha).toISOString().split("T")[0];
  return console.log("[Service] Fecha normalizada:", o.fecha, "->", e), C(() => {
    const r = i(), a = r.transaction(() => {
      console.log("[Service] Dentro de transaction...");
      const n = r.prepare(`
        INSERT INTO reservas (
          nombre, cedula, telefono,
          marca, modelo, km, matricula,
          tipo_turno, fecha, hora, detalles
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        o.nombre,
        o.cedula,
        o.telefono,
        o.marca,
        o.modelo,
        o.km,
        o.matricula,
        o.tipo_turno,
        e,
        o.hora,
        o.detalles ?? ""
      );
      return console.log("[Service] Reserva insertada con ID:", n.lastInsertRowid), r.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES (?, 'creación', '', 'reserva creada', datetime('now'))
      `).run(n.lastInsertRowid), console.log("[Service] Historial registrado"), n.lastInsertRowid;
    });
    console.log("[Service] Ejecutando transaction...");
    const s = a();
    return console.log("[Service] Transaction completada con ID:", s), s;
  });
}
function G(o) {
  return console.log("[Service] Obteniendo reserva:", o), i().prepare("SELECT * FROM reservas WHERE id = ?").get(o);
}
function Q(o) {
  console.log("[Service] Borrando reserva:", o);
  const e = i();
  try {
    e.transaction(() => {
      const a = e.prepare(`
        SELECT * FROM reservas WHERE id = ?
      `).get(o);
      if (!a) {
        console.log("[Service] Reserva no encontrada:", o);
        return;
      }
      e.prepare("DELETE FROM reservas WHERE id = ?").run(o), console.log("[Service] Reserva borrada"), e.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES (?, 'eliminación', ?, 'reserva eliminada', datetime('now'))
      `).run(o, JSON.stringify(a)), console.log("[Service] Historial registrado para borrado");
    })();
  } catch (r) {
    throw console.error("[Service] Error en borrarReserva:", r), r;
  }
}
function K(o, e, r) {
  console.log("[Service] Moviendo reserva:", { id: o, nuevaFecha: e, nuevaHora: r });
  const a = i();
  try {
    a.transaction(() => {
      const n = a.prepare(`
        SELECT fecha, hora FROM reservas WHERE id = ?
      `).get(o);
      if (!n) {
        console.log("[Service] Reserva no encontrada para mover:", o);
        return;
      }
      a.prepare(`
        UPDATE reservas
        SET fecha = ?, hora = COALESCE(?, hora)
        WHERE id = ?
      `).run(e, r ?? null, o), console.log("[Service] Reserva movida"), e !== n.fecha && (a.prepare(`
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES (?, 'fecha', ?, ?, datetime('now'))
        `).run(o, n.fecha, e), console.log("[Service] Cambio de fecha registrado")), r && r !== n.hora && (a.prepare(`
          INSERT INTO historial_reservas
          (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
          VALUES (?, 'hora', ?, ?, datetime('now'))
        `).run(o, n.hora, r), console.log("[Service] Cambio de hora registrado"));
    })();
  } catch (s) {
    throw console.error("[Service] Error en moverReserva:", s), s;
  }
}
function J(o, e) {
  console.log("[Service] Actualizando reserva:", o, e);
  const r = i();
  try {
    const a = r.prepare(`
      SELECT nombre, fecha, hora, estado, detalles
      FROM reservas
      WHERE id = ?
    `).get(o);
    if (!a) {
      console.log("[Service] Reserva no encontrada para actualizar:", o);
      return;
    }
    r.transaction(() => {
      r.prepare(`
        UPDATE reservas
        SET nombre = ?, fecha = ?, hora = ?, estado = ?, detalles = ?
        WHERE id = ?
      `).run(
        e.nombre,
        e.fecha,
        e.hora,
        e.estado,
        e.detalles,
        e.id
      ), console.log("[Service] Datos actualizados");
      for (const n of Object.keys(a))
        a[n] !== e[n] && (r.prepare(`
            INSERT INTO historial_reservas
            (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
            VALUES (?, ?, ?, ?, datetime('now'))
          `).run(
          e.id,
          n,
          a[n],
          e[n]
        ), console.log(`[Service] Cambio registrado: ${n}`));
    })();
  } catch (a) {
    throw console.error("[Service] Error en actualizarReserva:", a), a;
  }
}
function Z(o, e) {
  console.log("[Service] Obteniendo reservas entre:", o, "y", e);
  const r = i(), a = new Date(o).toISOString().split("T")[0], s = new Date(e).toISOString().split("T")[0];
  console.log("[Service] Fechas normalizadas:", a, "a", s);
  const n = r.prepare(`
    SELECT * FROM reservas
    WHERE fecha >= ? AND fecha <= ?
    ORDER BY fecha, hora
  `).all(a, s);
  console.log("[Service] Reservas encontradas:", n);
  const E = r.prepare("SELECT * FROM reservas ORDER BY fecha, hora").all();
  return console.log("[Service] TODAS las reservas en BD:", E), n;
}
function ee() {
  console.log("[Service] Obteniendo TODAS las reservas");
  const e = i().prepare(`
    SELECT * FROM reservas
    ORDER BY fecha DESC, hora DESC
  `).all();
  return console.log("[Service] Total de reservas:", e.length), e;
}
function oe(o, e) {
  console.log("[Service] Actualizando notas para reserva:", o);
  const r = i();
  try {
    const a = r.prepare(`
      SELECT notas FROM reservas WHERE id = ?
    `).get(o);
    if (!a) {
      console.log("[Service] Reserva no encontrada:", o);
      return;
    }
    r.transaction(() => {
      r.prepare(`
        UPDATE reservas SET notas = ? WHERE id = ?
      `).run(e, o), console.log("[Service] Notas actualizadas"), r.prepare(`
        INSERT INTO historial_reservas
        (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
        VALUES (?, 'notas', ?, ?, datetime('now'))
      `).run(o, a.notas || "", e), console.log("[Service] Cambio de notas registrado en historial");
    })();
  } catch (a) {
    throw console.error("[Service] Error en actualizarNotasReserva:", a), a;
  }
}
function re() {
  c.handle("reservas:crear", async (o, e) => {
    const r = Date.now();
    console.log(`
` + "=".repeat(50)), console.log("[IPC] Recibiendo solicitud de reserva:"), console.log(e), console.log("=".repeat(50));
    try {
      console.log("[IPC] Esperando lock...");
      const a = await l(async () => (console.log("[IPC] Lock adquirido, ejecutando crearReserva"), await j(e))), s = Date.now() - r;
      return console.log(`[IPC] Reserva creada exitosamente en ${s}ms, retornando ID:`, a), console.log("=".repeat(50) + `
`), a;
    } catch (a) {
      const s = Date.now() - r;
      throw console.error(`[IPC] Error en reservas:crear (${s}ms):`, (a == null ? void 0 : a.message) || a), console.error("Stack:", a == null ? void 0 : a.stack), console.log("=".repeat(50) + `
`), a;
    }
  }), c.handle("reservas:obtener", (o, e) => (console.log("[IPC] Obteniendo reserva:", e), G(e))), c.handle("reservas:borrar", async (o, e) => {
    console.log("[IPC] Borrando reserva:", e);
    try {
      const r = await l(() => Q(e));
      return console.log("[IPC] Reserva borrada exitosamente"), r;
    } catch (r) {
      throw console.error("[IPC] Error en reservas:borrar:", r), r;
    }
  }), c.handle("reservas:mover", async (o, e) => {
    console.log("[IPC] Moviendo reserva:", e);
    try {
      const r = await l(
        () => K(e.id, e.nuevaFecha, e.nuevaHora)
      );
      return console.log("[IPC] Reserva movida exitosamente"), r;
    } catch (r) {
      throw console.error("[IPC] Error en reservas:mover:", r), r;
    }
  }), c.handle("reservas:actualizar", async (o, e) => {
    console.log("[IPC] Actualizando reserva:", e);
    try {
      const r = await l(
        () => J(e.id, e)
      );
      return console.log("[IPC] Reserva actualizada exitosamente"), r;
    } catch (r) {
      throw console.error("[IPC] Error en reservas:actualizar:", r), r;
    }
  }), c.handle("reservas:semana", async (o, e) => {
    console.log("[IPC] Obteniendo reservas de semana:", e);
    try {
      const r = await l(
        () => Z(e.desde, e.hasta)
      );
      return console.log("[IPC] Reservas de semana obtenidas:", r.length, "registros"), r;
    } catch (r) {
      throw console.error("[IPC] Error en reservas:semana:", r), r;
    }
  }), c.handle("reservas:todas", async (o) => {
    console.log("[IPC] Obteniendo TODAS las reservas");
    try {
      const e = await l(() => ee());
      return console.log("[IPC] Total de reservas obtenidas:", e.length), e;
    } catch (e) {
      throw console.error("[IPC] Error en reservas:todas:", e), e;
    }
  }), c.handle("reservas:actualizar-notas", async (o, e, r) => {
    console.log("[IPC] Actualizando notas para reserva:", e);
    try {
      const a = await l(() => oe(e, r));
      return console.log("[IPC] Notas actualizadas exitosamente"), a;
    } catch (a) {
      throw console.error("[IPC] Error en reservas:actualizar-notas:", a), a;
    }
  });
}
function v(o) {
  return {
    nombre: "Nombre",
    fecha: "Fecha",
    hora: "Hora",
    estado: "Estado",
    detalles: "Observaciones",
    creación: "Creación",
    eliminación: "Eliminación"
  }[o] ?? o;
}
function ae(o, e, r) {
  return o === "creación" ? "Reserva creada" : o === "eliminación" ? "Reserva eliminada" : e === null && r !== null ? `Se estableció ${v(o)}: ${r}` : e !== null && r === null ? `Se eliminó ${v(o)}` : e !== r ? `Cambió ${v(o)} de "${e}" a "${r}"` : `Actualización de ${v(o)}`;
}
function ne(o) {
  if (!Number.isInteger(o))
    throw new Error("ID de reserva inválido");
  return i().prepare(`
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
  `).all(o).map((a) => ({
    ...a,
    descripcion: ae(
      a.campo,
      a.valor_anterior,
      a.valor_nuevo
    )
  }));
}
function se(o, e, r, a, s) {
  const n = i();
  n.transaction(() => {
    n.prepare(`
      INSERT INTO historial_reservas
      (reserva_id, campo, valor_anterior, valor_nuevo, fecha, usuario)
      VALUES (?, ?, ?, ?, datetime('now'), ?)
    `).run(
      o,
      e,
      r,
      a,
      s ?? "sistema"
    );
  })();
}
function te() {
  c.handle(
    "historial:obtener",
    (o, e) => ne(e)
  ), c.handle(
    "historial:registrar",
    async (o, e) => await l(
      () => se(
        e.reservaId,
        e.campo,
        e.anterior,
        e.nuevo,
        e.usuario
      )
    )
  );
}
function ie() {
  console.log(` 
🧩 Cargando IPC handlers  
`), V(), re(), te(), console.log(` 
 ✅ IPC handlers cargados 
`);
}
const N = I(import.meta.url), w = d.dirname(N);
globalThis.__filename = N;
globalThis.__dirname = w;
process.env.APP_ROOT = d.join(w, "..");
const S = process.env.VITE_DEV_SERVER_URL, ce = d.join(process.env.APP_ROOT, "dist-electron"), L = d.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = S ? d.join(process.env.APP_ROOT, "public") : L;
let u = null;
function le() {
  u = new H({
    width: 1366,
    height: 768,
    minWidth: 1024,
    // Mínimo para que no se rompa el diseño
    minHeight: 700,
    title: "ReserveRosas - Taller Central",
    autoHideMenuBar: !0,
    frame: !0,
    // Mantenemos el marco de Windows (cerrar, minimizar)
    webPreferences: {
      preload: d.join(ce, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), u.webContents.openDevTools({ mode: "detach" }), u.maximize(), u.on("page-title-updated", (o) => o.preventDefault()), S ? u.loadURL(S) : u.loadFile(d.join(L, "index.html"));
}
m.whenReady().then(() => {
  i(), ie(), le();
});
export {
  ce as MAIN_DIST,
  L as RENDERER_DIST,
  S as VITE_DEV_SERVER_URL
};
