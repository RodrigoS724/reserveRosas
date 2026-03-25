import { safeHandle } from './safeHandle'
import { withDbLock } from './withDBLock'
import {
  crearApronte,
  obtenerApronte,
  borrarApronte,
  actualizarApronte,
  obtenerAprontesPorFecha,
  obtenerTodosLosAprontes
} from '../services/aprontes.service'
import {
  obtenerHorariosAprontesBase,
  obtenerHorariosAprontesInactivos,
  obtenerHorariosAprontesDisponibles,
  crearHorarioApronte,
  actualizarCupoHorarioApronte,
  desactivarHorarioApronte,
  activarHorarioApronte,
  borrarHorarioApronte
} from '../services/horarios-aprontes.service'

export function registrarHandlersAprontes() {
  safeHandle('aprontes:crear', async (_event, data) =>
    await withDbLock(() => crearApronte(data))
  )

  safeHandle('aprontes:obtener', (_event, id: number) =>
    obtenerApronte(id)
  )

  safeHandle('aprontes:borrar', async (_event, id: number) =>
    await withDbLock(() => borrarApronte(id))
  )

  safeHandle('aprontes:actualizar', async (_event, payload) =>
    await withDbLock(() => actualizarApronte(payload?.id, payload))
  )

  safeHandle('aprontes:fecha', (_event, fecha: string) =>
    obtenerAprontesPorFecha(fecha)
  )

  safeHandle('aprontes:todas', () =>
    obtenerTodosLosAprontes()
  )

  safeHandle('horarios-aprontes:base', () =>
    obtenerHorariosAprontesBase()
  )

  safeHandle('horarios-aprontes:inactivos', () =>
    obtenerHorariosAprontesInactivos()
  )

  safeHandle('horarios-aprontes:disponibles', (_event, fecha: string) =>
    obtenerHorariosAprontesDisponibles(fecha)
  )

  safeHandle('horarios-aprontes:crear', async (_event, payload) =>
    await withDbLock(() => crearHorarioApronte(payload?.hora, payload?.cupo))
  )

  safeHandle('horarios-aprontes:actualizar-cupo', async (_event, payload) =>
    await withDbLock(() => actualizarCupoHorarioApronte(payload?.id, payload?.cupo))
  )

  safeHandle('horarios-aprontes:desactivar', async (_event, id: number) =>
    await withDbLock(() => desactivarHorarioApronte(id))
  )

  safeHandle('horarios-aprontes:activar', async (_event, id: number) =>
    await withDbLock(() => activarHorarioApronte(id))
  )

  safeHandle('horarios-aprontes:borrar', async (_event, id: number) =>
    await withDbLock(() => borrarHorarioApronte(id))
  )
}
