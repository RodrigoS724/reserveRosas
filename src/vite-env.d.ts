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
        particular_tipo: string | null
        garantia_tipo: string | null
        garantia_fecha_compra: string | null
        garantia_numero_service: string | null
        garantia_problema: string | null
        fecha: string
        hora: string
        detalles: string
      }) => Promise<number>

      obtenerReserva: (id: number) => Promise<any>

      borrarReserva: (id: number) => Promise<void>

      moverReserva: (data: {
        id: number
        nuevaFecha: string
        nuevaHora: string
      }) => Promise<void>

      actualizarReserva: (data: {
        id: number
        nombre: string
        fecha: string
        hora: string
        estado: string
        detalles: string
      }) => Promise<void>

      obtenerReservasSemana: (data: {
        desde: string
        hasta: string
      }) => Promise<any[]>

      obtenerCambiosReservas: (data: {
        since: string
        lastId: number
        limit?: number
      }) => Promise<{
        id: number
        reserva_id: number
        campo: string
        valor_anterior: string | null
        valor_nuevo: string | null
        fecha: string
        nombre: string | null
        reserva_fecha: string | null
        reserva_hora: string | null
      }[]>

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
        motivo: string
      }) => Promise<void>

      desbloquearHorario: (data: {
        fecha: string
        hora: string
      }) => Promise<void>

      obtenerHorariosBloqueados: (fecha: string) => Promise<{
        id: number
        fecha: string
        hora: string
        motivo: string
      }[]>

      borrarHorarioPermanente: (id: number) => Promise<void>

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
        usuario: string
      }[]>

      obtenerVehiculos: () => Promise<{
        id: number
        matricula: string
        marca: string
        modelo: string
        nombre: string
        telefono: string
        created_at: string
        ultima_fecha: string | null
        ultimo_km: string | null
        ultimo_tipo_turno: string | null
        ultimo_particular_tipo: string | null
        ultimo_garantia_tipo: string | null
      }[]>

      obtenerHistorialVehiculo: (vehiculoId: number) => Promise<{
        id: number
        vehiculo_id: number
        fecha: string
        km: string | null
        tipo_turno: string | null
        particular_tipo: string | null
        garantia_tipo: string | null
        garantia_fecha_compra: string | null
        garantia_numero_service: string | null
        garantia_problema: string | null
        detalles: string | null
        created_at: string
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
        particular_tipo: string | null
        garantia_tipo: string | null
        garantia_fecha_compra: string | null
        garantia_numero_service: string | null
        garantia_problema: string | null
        fecha: string
        hora: string
        detalles: string
        estado: string
        notas: string
      }[]>

      actualizarNotasReserva: (id: number, notas: string) => Promise<void>

      obtenerEnvConfig: () => Promise<string>
      guardarEnvConfig: (text: string) => Promise<{ ok: boolean }>
      probarConexionDB: () => Promise<{ ok: boolean; error: string }>

      obtenerUsuariosLogin: () => Promise<{
        id: number
        nombre: string
        username: string
        role: string
        permissions: string[]
      }[]>
      login: (username: string, password: string) => Promise<{
        ok: boolean
        error: string
        user: {
          id: number
          nombre: string
          username: string
          role: string
          permissions: string[]
        }
      }>
      listarUsuarios: () => Promise<{
        id: number
        nombre: string
        username: string
        role: string
        permissions: string[]
        activo: number
        created_at: string
      }[]>
      crearUsuario: (data: any) => Promise<{ ok: boolean; error: string }>
      actualizarUsuario: (data: any) => Promise<{ ok: boolean; error: string }>
      borrarUsuario: (data: { id: number; actor: { username: string; role: string } }) => Promise<{ ok: boolean; error: string }>
      actualizarPasswordUsuario: (data: { id: number; password: string; actor: { username: string; role: string } }) => Promise<{ ok: boolean; error: string }>
      obtenerAuditoriaUsuarios: () => Promise<{
        id: number
        actor_username: string | null
        actor_role: string | null
        accion: string
        target_username: string | null
        detalle: string | null
        created_at: string
      }[]>
    }
  }
}
export {}


