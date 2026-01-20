import { ReservaModel } from '../models/reserva.model';

export const ReservaController = {
  // Función para guardar
  async crearNueva(datos: any) {
    console.log("Controlador recibió:", datos);
    try {
      const id = ReservaModel.create(datos);
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Función para ver qué horas están tomadas
  async consultarOcupados(fecha: string) {
    const filas = ReservaModel.getOcupadosByFecha(fecha);
    return filas.map((f: any) => f.hora);
  }
};