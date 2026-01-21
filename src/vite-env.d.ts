/// <reference types="vite/client" />

export { }

declare global {

  interface Window {
    api: {
      /* RESERVAS */
      guardarReserva(datos: any): Promise<any>
      obtenerReservasSemana(fechaBase?: string): Promise<any[]>
      moverReserva(payload: {
        id: number
        nuevaFecha: string
        nuevaHora?: string
      }): Promise<any>
      actualizarReserva(payload: any): Promise<any>

      /* HORARIOS */
      obtenerHorariosBase(): Promise<any[]>
      obtenerHorariosDisponibles(fecha: string): Promise<any[]>
      crearHorario(hora: string): Promise<any>
      desactivarHorario(id: number): Promise<any>
      bloquearHorario(payload: {
        fecha: string
        hora: string
        motivo?: string
      }): Promise<any>

      /* HISTORIAL */
      obtenerHistorialReserva(reservaId: number): Promise<any[]>
    }
  }
}