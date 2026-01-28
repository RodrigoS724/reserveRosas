/// <reference types="vite/client" />
/// <reference types="vue" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<any, any, any>
  export default component
}

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

      obtenerHorariosInactivos: () => Promise<{
        id: number
        hora: string
      }[]>

      obtenerHorariosDisponibles: (fecha: string) => Promise<{
        hora: string
      }[]>

      crearHorario: (hora: string) => Promise<void>

      desactivarHorario: (id: number) => Promise<void>

      activarHorario: (id: number) => Promise<void>

      bloquearHorario: (data: {
        fecha: string
        hora: string
        motivo?: string
      }) => Promise<void>

      desbloquearHorario: (data: {
        fecha: string
        hora: string
      }) => Promise<void>

      obtenerHorariosBloqueados: (fecha: string) => Promise<{
        id: number
        fecha: string
        hora: string
        motivo?: string
      }[]>

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

      obtenerTodasLasReservas: () => Promise<{
        id: number
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
        estado: string
        notas?: string
      }[]>

      actualizarNotasReserva: (id: number, notas: string) => Promise<void>
    }
  }
}
export {}
