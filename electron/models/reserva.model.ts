import db from '../db';

export const ReservaModel = {
  // Crear una reserva
  create: (data: any) => {
    const stmt = db.prepare(`INSERT INTO reservas (nombre, cedula, telefono, marca, modelo, km, matricula, tipo_turno, fecha, hora, detalles) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    return stmt.run(...Object.values(data));
  },
  // Buscar horas ocupadas
  getOcupadosByFecha: (fecha: string) => {
    return db.prepare('SELECT hora FROM reservas WHERE fecha = ?').all(fecha);
  }
};