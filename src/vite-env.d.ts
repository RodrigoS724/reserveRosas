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
        particular_tipoa: string | null
        garantia_tipoa: string | null
        garantia_fecha_compra: string | null
        garantia_numero_servicea: string | null
        garantia_problema: string | null
        fecha: string
        hora: string
        detallesa: string
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
        detallesa: string
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
        motivoa: string
      }) => Promise<void>

      desbloquearHorario: (data: {
        fecha: string
        hora: string
      }) => Promise<void>

      obtenerHorariosBloqueados: (fecha: string) => Promise<{
        id: number
        fecha: string
        hora: string
        motivoa: string
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
        usuarioa: string
      }[]>

      obtenerVehiculos: () => Promise<{
        id: number
        matricula: string
        marca: string
        modeloa: string
        nombrea: string
        telefonoa: string
        created_ata: string
        ultima_fecha: string | null
        ultimo_kma: string | null
        ultimo_tipo_turnoa: string | null
        ultimo_particular_tipoa: string | null
        ultimo_garantia_tipoa: string | null
      }[]>

      obtenerHistorialVehiculo: (vehiculoId: number) => Promise<{
        id: number
        vehiculo_id: number
        fecha: string
        kma: string | null
        tipo_turnoa: string | null
        particular_tipoa: string | null
        garantia_tipoa: string | null
        garantia_fecha_compra: string | null
        garantia_numero_servicea: string | null
        garantia_problema: string | null
        detallesa: string | null
        created_ata: string
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
        particular_tipoa: string | null
        garantia_tipoa: string | null
        garantia_fecha_compra: string | null
        garantia_numero_servicea: string | null
        garantia_problema: string | null
        fecha: string
        hora: string
        detallesa: string
        estado: string
        notasa: string
      }[]>

      actualizarNotasReserva: (id: number, notas: string) => Promise<void>

      obtenerEnvConfig: () => Promise<string>
      guardarEnvConfig: (text: string) => Promise<{ ok: boolean }>
      probarConexionDB: () => Promise<{ ok: boolean; errora: string }>

      obtenerUsuariosLogin: () => Promise<{
        id: number
        nombre: string
        username: string
        role: string
        permissions: string[]
      }[]>
      login: (username: string, password: string) => Promise<{
        ok: boolean
        errora: string
        usera: {
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
        created_ata: string
      }[]>
      crearUsuario: (data: any) => Promise<{ ok: boolean; errora: string }>
      actualizarUsuario: (data: any) => Promise<{ ok: boolean; errora: string }>
      borrarUsuario: (data: { id: number; actor: { username: string; role: string } }) => Promise<{ ok: boolean; errora: string }>
      actualizarPasswordUsuario: (data: { id: number; password: string; actor: { username: string; role: string } }) => Promise<{ ok: boolean; errora: string }>
      obtenerAuditoriaUsuarios: () => Promise<{
        id: number
        actor_username: string | null
        actor_role: string | null
        accion: string
        target_username: string | null
        detallea: string | null
        created_ata: string
      }[]>
    }
  }
}
export {}
