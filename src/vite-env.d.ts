/// <reference types="vite/client" />

export {}

declare global {
  interface Window {
    api: {
      /* =========================
       * RESERVAS
       * ========================= */
      crearReserva: (data: {
        nombre: string
        cedula: string
        telefono: string
        marca: string
        modelo: string
        km: string
        matricula: string
        tipo_turno: string
        fecha: string
        hora: string
        detalles?: string
      }) => Promise<number>

      obtenerReserva: (id: number) => Promise<any>

      borrarReserva: (id: number) => Promise<void>

      moverReserva: (data: {
        id: number
        nuevaFecha: string
        nuevaHora?: string
      }) => Promise<void>

      actualizarReserva: (data: {
        id: number
        nombre: string
        fecha: string
        hora: string
        estado: string
        detalles?: string
      }) => Promise<void>

      obtenerReservasSemana: (data: {
        desde: string
        hasta: string
      }) => Promise<any[]>

      /* =========================
       * HORARIOS
       * ========================= */
      obtenerHorariosBase: () => Promise<{
        id: number
        hora: string
        activo: number
      }[]>

      obtenerHorariosDisponibles: (fecha: string) => Promise<{
        hora: string
      }[]>

      crearHorario: (hora: string) => Promise<void>

      desactivarHorario: (id: number) => Promise<void>

      bloquearHorario: (data: {
        fecha: string
        hora: string
        motivo?: string
      }) => Promise<void>

      /* =========================
       * HISTORIAL
       * ========================= */
      obtenerHistorial: (reservaId: number) => Promise<{
        id: number
        reserva_id: number
        campo: string
        valor_anterior: string | null
        valor_nuevo: string | null
        fecha: string
        usuario?: string
      }[]>
    }
  }
}
