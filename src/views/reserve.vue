<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount, watch } from 'vue'
import IngresoModal from '../components/IngresoModal.vue'
import ReservaWindow from '../components/reservaWindow.vue'
import ApronteWindow from '../components/apronteWindow.vue'
import { api, ipc } from '../api'
import { getSession, isTallerRole } from '../auth'

const semanaOffset = ref(0)
const busquedaCedula = ref('')
const estadoFiltro = ref('TODOS')
const soloHoyEnLista = ref(false)
const panelActivo = ref<'agenda' | 'aprontes'>('agenda')
const reservasSeleccionadas = ref<number[]>([])
const estadoMasivo = ref('PENDIENTE')
const aplicandoEstadoMasivo = ref(false)
const error = ref('')
const sidebarAbiertoLocal = ref(true)
const sidebarAbierto = computed({
  get: () => sidebarAbiertoLocal.value,
  set: (val) => {
    sidebarAbiertoLocal.value = val
    localStorage.setItem('reserve-sidebar-open', String(val))
  }
})

onMounted(() => {
  const stored = localStorage.getItem('reserve-sidebar-open')
  if (stored !== null) {
    sidebarAbiertoLocal.value = stored === 'true'
  }
})
const session = getSession()
const esTaller = isTallerRole(session)
const esMecanico = session?.role === 'mecanico'

const OPCIONES_ESTADO = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'PENDIENTE REPUESTOS', label: 'Pendiente repuestos' },
  { value: 'EN REVISION', label: 'En revision' },
  { value: 'PRONTO', label: 'Pronto' },
  { value: 'EN PROCESO', label: 'En proceso' },
  { value: 'CANCELADO', label: 'Cancelado' }
]

// Horarios: se cargarÃƒÂ¡n dinÃƒÂ¡micamente desde la BD
const horariosBase = ref<string[]>([])
const horariosDisponibles = ref<string[]>([])

const obtenerHoraNumero = (hora: string) => {
  const h = Number(String(hora || '').split(':')[0])
  return Number.isFinite(h) ? h : -1
}

const horariosConDivisor = computed(() => {
  const horas = horariosDisponibles.value || []
  const tieneManiana = horas.some((h) => obtenerHoraNumero(h) >= 0 && obtenerHoraNumero(h) < 12)
  const tieneTarde = horas.some((h) => obtenerHoraNumero(h) >= 12)
  if (!tieneManiana || !tieneTarde) {
    return horas.map((hora) => ({ tipo: 'hora' as const, hora }))
  }
  const items: Array<{ tipo: 'hora'; hora: string } | { tipo: 'divider' }> = []
  let inserted = false
  for (const hora of horas) {
    if (!inserted && obtenerHoraNumero(hora) >= 12) {
      items.push({ tipo: 'divider' })
      inserted = true
    }
    items.push({ tipo: 'hora', hora })
  }
  return items
})

// Intervalo para auto-refresh
let intervaloRefresco: number | null = null
let currentRangeKey = ''
let isInitialLoad = true
const knownReservaIds = new Set<number>()
const knownChangeIds = new Set<number>()
const changeQueue: number[] = []
let lastChangeAt = new Date().toISOString()
let lastChangeId = 0
let isInitialChangesLoad = true
const suppressUntilByReservaId = new Map<number, number>()
let refreshEnCurso = false
let onVisibilityChangeRef: (() => void) | null = null

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const normalizarFechaAgenda = (value: any) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch?.[1]) return isoMatch[1]

  const date = new Date(raw)
  if (!Number.isNaN(date.getTime())) {
    return formatLocalDate(date)
  }

  return ''
}

const normalizarHoraAgenda = (value: any) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const hhmm = raw.match(/(\d{1,2}):(\d{2})/)
  if (!hhmm) return ''

  const h = Number(hhmm[1])
  const m = Number(hhmm[2])
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return ''
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const abrirFichaTrabajoDesdeReserva = (reserva: any, seccion: 'ingreso' | 'egreso' = 'ingreso') => {
  void abrirIngresoDesdeReserva(reserva, seccion)
}

// Estructura de semana
const diasSemana = ref([
  { id: 0, nombre: 'Lunes' },
  { id: 1, nombre: 'Martes' },
  { id: 2, nombre: 'Miercoles' },
  { id: 3, nombre: 'Jueves' },
  { id: 4, nombre: 'Viernes' },
  { id: 5, nombre: 'Sabado' }
])

// Matriz de reservas: [dia][hora] => []
const matrizReservas = ref<Record<string, Record<string, any[]>>>({})
const matrizAprontes = ref<Record<string, Record<string, any[]>>>({})
const cargandoMetricasAprontes = ref(false)
const metricasAprontes = ref({
  mesActual: 0,
  mesAnterior: 0,
  variacionPct: 0,
  promedioDiarioMes: 0,
  estadosMes: {} as Record<string, number>,
  horasTopMes: [] as Array<{ hora: string; total: number }>
})
let ultimoFetchMetricasAprontes = 0
// Caché de aprontes para evitar parpadeos cuando el fetch falla
const cacheAprontes = new Map<string, any[]>()

const obtenerMesIso = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

const normalizarEstadoApronte = (estado: any) => {
  return String(estado || 'APRONTE')
    .toUpperCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const cargarMetricasAprontes = async (force = false) => {
  const nowMs = Date.now()
  if (!force && nowMs - ultimoFetchMetricasAprontes < 120000) return
  if (cargandoMetricasAprontes.value) return

  cargandoMetricasAprontes.value = true
  try {
    const lista = await api.obtenerAprontes()
    const aprontes = Array.isArray(lista) ? lista : []

    const hoy = new Date()
    const mesActualIso = obtenerMesIso(hoy)
    const mesAnteriorDate = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    const mesAnteriorIso = obtenerMesIso(mesAnteriorDate)

    const aprontesMesActual = aprontes.filter((a: any) => String(a?.fecha || '').startsWith(`${mesActualIso}-`))
    const aprontesMesAnterior = aprontes.filter((a: any) => String(a?.fecha || '').startsWith(`${mesAnteriorIso}-`))

    const estadoCounts: Record<string, number> = {}
    const horaCounts: Record<string, number> = {}

    for (const apronte of aprontesMesActual) {
      const estado = normalizarEstadoApronte(apronte?.estado)
      estadoCounts[estado] = (estadoCounts[estado] || 0) + 1

      const hora = String(apronte?.hora || '').trim()
      if (hora) {
        horaCounts[hora] = (horaCounts[hora] || 0) + 1
      }
    }

    const horasTopMes = Object.entries(horaCounts)
      .map(([hora, total]) => ({ hora, total }))
      .sort((a, b) => b.total - a.total || a.hora.localeCompare(b.hora))
      .slice(0, 3)

    const totalActual = aprontesMesActual.length
    const totalAnterior = aprontesMesAnterior.length
    const variacion = totalAnterior > 0
      ? ((totalActual - totalAnterior) / totalAnterior) * 100
      : (totalActual > 0 ? 100 : 0)

    metricasAprontes.value = {
      mesActual: totalActual,
      mesAnterior: totalAnterior,
      variacionPct: Number(variacion.toFixed(1)),
      promedioDiarioMes: Number((totalActual / Math.max(1, hoy.getDate())).toFixed(1)),
      estadosMes: estadoCounts,
      horasTopMes
    }

    ultimoFetchMetricasAprontes = nowMs
  } catch (error) {
    console.warn('[Reserve] Error cargando metricas de aprontes:', error)
  } finally {
    cargandoMetricasAprontes.value = false
  }
}

/* =========================
 * CARGAR HORARIOS BASE ACTIVOS
 * ========================= */
const cargarHorariosBase = async () => {
  try {
    const [baseResult, aprontesResult] = await Promise.allSettled([
      api.obtenerHorariosBase(),
      api.obtenerHorariosAprontesBase()
    ])

    const baseHorarios = baseResult.status === 'fulfilled'
      ? (baseResult.value || [])
          .filter((h: any) => h.activo === 1)
          .map((h: any) => String(h.hora || '').trim())
      : []

    const apronteHorarios = aprontesResult.status === 'fulfilled'
      ? (aprontesResult.value || [])
          .filter((h: any) => h.activo === 1)
          .map((h: any) => String(h.hora || '').trim())
      : []

    const unificados = Array.from(new Set([...baseHorarios, ...apronteHorarios]))
      .filter(Boolean)
      .sort()

    horariosBase.value = unificados
    horariosDisponibles.value = unificados
  } catch (error: any) {
    console.error('[Reserve] Error cargando horarios:', error)
    // Fallback a horarios por defecto si falla
    const fallback = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
    horariosBase.value = fallback
    horariosDisponibles.value = fallback
  }
}

// Obtener la fecha del lunes de la semana actual
const obtenerLunesDeWeek = () => {
  const hoy = new Date()
  const lunesActual = new Date(hoy)
  const diaSemana = hoy.getDay()
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana
  lunesActual.setDate(hoy.getDate() + diff + (semanaOffset.value * 7))
  return lunesActual
}

// Calcular fechas de la semana
const fechasWeek = computed(() => {
  const lunes = obtenerLunesDeWeek()
  return diasSemana.value.map((dia, index) => {
    const fecha = new Date(lunes)
    fecha.setDate(fecha.getDate() + index)
    const fechaISO = formatLocalDate(fecha)
    return {
      ...dia,
      fecha: fechaISO,
      fechaFormato: fecha.toLocaleDateString('es-UY', { day: '2-digit', month: 'short' })
    }
  })
})

// Cargar reservas
const cargarReservas = async () => {
  try {
    const lunes = obtenerLunesDeWeek()
    const sabado = new Date(lunes)
    sabado.setDate(sabado.getDate() + 5)

    const desdeStr = formatLocalDate(lunes)
    const hastaStr = formatLocalDate(sabado)
    const rangeKey = `${desdeStr}_${hastaStr}`
    if (rangeKey !== currentRangeKey) {
      currentRangeKey = rangeKey
      isInitialLoad = true
      knownReservaIds.clear()
    }

    const fechas = fechasWeek.value
    const [nuevasReservas, aprontesResultados] = await Promise.all([
      api.obtenerReservasSemana({ desde: desdeStr, hasta: hastaStr }),
      Promise.allSettled(
        fechas.map(async (dia) => {
          try {
            return await api.obtenerAprontesFecha(dia.fecha)
          } catch (error) {
            console.error('[Reserve] Error cargando aprontes:', error)
            // Retornar aprontes cacheados si el fetch falla
            return cacheAprontes.get(dia.fecha) || []
          }
        })
      )
    ])

    // Procesar resultados de aprontes con manejo de fulfilled/rejected
    const aprontesPorDia = aprontesResultados.map((resultado, index) => {
      const fecha = fechas[index]?.fecha || ''
      if (resultado.status === 'fulfilled') {
        const aprontes = resultado.value || []
        // Cachear los aprontes obtenidos
        if (Array.isArray(aprontes) && aprontes.length > 0) {
          cacheAprontes.set(fecha, aprontes)
        }
        return aprontes
      } else {
        // Si falla, devolver los aprontes cacheados para esa fecha
        return cacheAprontes.get(fecha) || []
      }
    })

    const horasAprontesSemana = new Set<string>()
    const horasReservasSemana = new Set<string>()

    if (Array.isArray(nuevasReservas)) {
      nuevasReservas.forEach((reserva: any) => {
        const hora = normalizarHoraAgenda(reserva?.hora)
        if (hora) horasReservasSemana.add(hora)
      })
    }

    aprontesPorDia.forEach((lista) => {
      if (!Array.isArray(lista)) return
      lista.forEach((apronte: any) => {
        const hora = normalizarHoraAgenda(apronte?.hora)
        if (hora) horasAprontesSemana.add(hora)
      })
    })

    const horasSemana = Array.from(new Set([
      ...horariosBase.value,
      ...Array.from(horasReservasSemana),
      ...Array.from(horasAprontesSemana)
    ])).sort()
    horariosDisponibles.value = horasSemana

    if (Array.isArray(nuevasReservas)) {
      const nuevas = nuevasReservas.filter((r: any) => r?.id && !knownReservaIds.has(Number(r.id)))
      nuevasReservas.forEach((r: any) => {
        if (r?.id) knownReservaIds.add(Number(r.id))
      })

      if (!isInitialLoad && nuevas.length > 0) {
        for (const r of nuevas) {
          const nombre = r?.nombre || 'Reserva'
          const fecha = r?.fecha ? ` ${r.fecha}` : ''
          const hora = r?.hora ? ` ${r.hora}` : ''
          const message = `Nueva reserva web: ${nombre}${fecha}${hora}`.trim()
          window.dispatchEvent(new CustomEvent('ui:notify', {
            detail: { message, variant: 'success' }
          }))
        }
      }
    }

    // Actualizar matriz inteligentemente: solo actualizar celdas que cambiaron
    const matrizReservasAnterior = JSON.stringify(matrizReservas.value)
    const matrizAprontesAnterior = JSON.stringify(matrizAprontes.value)

    // Inicializar matriz vacÃ­a
    const nuevaMatriz: Record<string, Record<string, any[]>> = {}
    const nuevaMatrizAprontes: Record<string, Record<string, any[]>> = {}
    
    fechas.forEach(dia => {
      nuevaMatriz[dia.fecha] = {}
      nuevaMatrizAprontes[dia.fecha] = {}
      horasSemana.forEach(hora => {
        nuevaMatriz[dia.fecha][hora] = []
        nuevaMatrizAprontes[dia.fecha][hora] = []
      })
    })

    // Llenar la matriz con reservas (deduplicando por id para evitar tarjetas duplicadas)
    const reservasUnicas: any[] = []
    const keysVistas = new Set<string>()
    nuevasReservas.forEach((reserva: any) => {
      const key = reserva?.id
        ? `id:${Number(reserva.id)}`
        : `${reserva?.fecha || ''}|${reserva?.hora || ''}|${reserva?.cedula || ''}|${reserva?.nombre || ''}`
      if (keysVistas.has(key)) return
      keysVistas.add(key)
      reservasUnicas.push(reserva)
    })

    reservasUnicas.forEach((reserva: any) => {
      const fecha = normalizarFechaAgenda(reserva?.fecha)
      const hora = normalizarHoraAgenda(reserva?.hora)
      if (fecha && hora && nuevaMatriz[fecha] && nuevaMatriz[fecha][hora]) {
        const tipoResumen = obtenerTipoResumen(reserva)
        const detalleResumen = obtenerDetalleResumen(reserva)
        nuevaMatriz[fecha][hora].push({
          ...reserva,
          fecha,
          hora,
          estado: reserva.estado || 'Pendiente',
          tipo_resumen: tipoResumen,
          detalle_resumen: detalleResumen
        })
      }
    })

    aprontesPorDia.forEach((lista, index) => {
      const fecha = fechas[index]?.fecha
      if (!fecha || !Array.isArray(lista)) return

      lista.forEach((apronte: any) => {
        const hora = normalizarHoraAgenda(apronte?.hora)
        if (hora && nuevaMatrizAprontes[fecha] && nuevaMatrizAprontes[fecha][hora]) {
          nuevaMatrizAprontes[fecha][hora].push({
            ...apronte,
            hora
          })
        }
      })
    })

    // Solo actualizar si realmente cambió (optimización de renders)
    if (JSON.stringify(nuevaMatriz) !== matrizReservasAnterior) {
      matrizReservas.value = nuevaMatriz
    }
    if (JSON.stringify(nuevaMatrizAprontes) !== matrizAprontesAnterior) {
      matrizAprontes.value = nuevaMatrizAprontes
    }
    
    isInitialLoad = false

  } catch (error: any) {
    console.error('[Reserve] Error cargando reservas:', error)
  }
}

const chequearCambiosRemotos = async () => {
  try {
    const cambios = await api.obtenerCambiosReservas({
      since: lastChangeAt,
      lastId: lastChangeId,
      limit: 200
    })

    if (!Array.isArray(cambios) || cambios.length === 0) return

    const pendingByReservaId = new Map<number, {
      accion: 'creada' | 'modificada' | 'eliminada'
      nombre: string
      fecha: string
      hora: string
    }>()
    const prioridad = { creada: 3, eliminada: 2, modificada: 1 } as const

    for (const c of cambios) {
      const id = Number(c?.id)
      if (!id || knownChangeIds.has(id)) continue

      knownChangeIds.add(id)
      changeQueue.push(id)
      if (changeQueue.length > 1000) {
        const old = changeQueue.shift()
        if (old) knownChangeIds.delete(old)
      }

      const reservaId = Number(c?.reserva_id)
      if (!reservaId) continue
      const suppressUntil = suppressUntilByReservaId.get(reservaId)
      if (suppressUntil && suppressUntil > Date.now()) continue
      if (suppressUntil && suppressUntil <= Date.now()) {
        suppressUntilByReservaId.delete(reservaId)
      }

      const campo = String(c?.campo || '').toLowerCase()
      let accion: 'creada' | 'modificada' | 'eliminada' = 'modificada'
      if (campo === 'creacion') accion = 'creada'
      if (campo === 'eliminacion') accion = 'eliminada'

      const nombre = c?.nombre || 'Reserva'
      const fecha = c?.reserva_fecha ? ` ${c.reserva_fecha}` : ''
      const hora = c?.reserva_hora ? ` ${c.reserva_hora}` : ''

      const existente = pendingByReservaId.get(reservaId)
      if (!existente || prioridad[accion] > prioridad[existente.accion]) {
        pendingByReservaId.set(reservaId, { accion, nombre, fecha, hora })
      }
    }

    if (!isInitialChangesLoad && pendingByReservaId.size > 0) {
      for (const data of pendingByReservaId.values()) {
        if (data.accion === 'creada') {
          const message = `Nueva reserva web: ${data.nombre}${data.fecha}${data.hora}`.trim()
          window.dispatchEvent(new CustomEvent('ui:notify', {
            detail: { message, variant: 'success' }
          }))
        } else if (data.accion === 'eliminada') {
          const message = `Reserva eliminada: ${data.nombre}${data.fecha}${data.hora}`.trim()
          window.dispatchEvent(new CustomEvent('ui:notify', {
            detail: { message, variant: 'info' }
          }))
        } else {
          const message = `Reserva modificada: ${data.nombre}${data.fecha}${data.hora}`.trim()
          window.dispatchEvent(new CustomEvent('ui:notify', {
            detail: { message, variant: 'info' }
          }))
        }
      }
    }

    const last = cambios[cambios.length - 1]
    if (last?.fecha) lastChangeAt = String(last.fecha)
    if (last?.id) lastChangeId = Number(last.id)
    isInitialChangesLoad = false
  } catch (error) {
    console.warn('[Reserve] Error checando cambios remotos:', error)
  }
}

const refrescarDatos = async (force = false) => {
  if (refreshEnCurso) return
  if (!force && document.hidden) return
  if (!force && mostrarVentana.value) return
  refreshEnCurso = true
  try {
    await chequearCambiosRemotos()
    await cargarReservas()
    await cargarMetricasAprontes(force)
  } finally {
    refreshEnCurso = false
  }
}

onMounted(async () => {
  await cargarHorariosBase()
  await refrescarDatos(true)
  await cargarMetricasAprontes(true)

  if (ipc?.on) {
    const onLocalNotify = (_event: any, payload: any) => {
      const id = Number(payload?.reserva?.id || 0)
      if (id) {
        suppressUntilByReservaId.set(id, Date.now() + 10000)
      }
    }
    ipc.on('reservas:notify', onLocalNotify)
    onBeforeUnmount(() => {
      ipc?.off('reservas:notify', onLocalNotify)
    })
  }
  
  onVisibilityChangeRef = () => {
    if (!document.hidden) {
      refrescarDatos(true)
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChangeRef)

  intervaloRefresco = window.setInterval(() => {
    refrescarDatos()
  }, 15000) // Recargar cada 15 segundos en lugar de 5 (reduce parpadeos)
})

onBeforeUnmount(() => {
  if (intervaloRefresco) {
    clearInterval(intervaloRefresco)
    intervaloRefresco = null
  }
  if (onVisibilityChangeRef) {
    document.removeEventListener('visibilitychange', onVisibilityChangeRef)
    onVisibilityChangeRef = null
  }
})

// Filtrado por cÃƒÂ©dula
const normalizarCedula = (value: string) => String(value || '').replace(/\D/g, '')

const normalizarEstadoKey = (estado: string) => {
  if (!estado) return 'PENDIENTE'
  const key = estado
    .toUpperCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (key === 'CANCELADA') return 'CANCELADO'
  if (key === 'REVISION') return 'EN REVISION'
  return key
}

const matrizReservasFiltrada = computed(() => {
  const resultado: Record<string, Record<string, any[]>> = {}
  const filtroCedula = normalizarCedula(busquedaCedula.value)
  const filtroEstado = estadoFiltro.value
  const sessionId = Number(session?.id || 0)

  for (const [fecha, porHora] of Object.entries(matrizReservas.value)) {
    resultado[fecha] = {}
    for (const [hora, reservas] of Object.entries(porHora)) {
      resultado[fecha][hora] = reservas.filter((r: any) => {
        if (esMecanico) {
          const asignado = Number(r?.mecanico_id || 0) === sessionId
          if (!asignado) return false
        }
        if (filtroCedula && normalizarCedula(String(r?.cedula || '')) !== filtroCedula) {
          return false
        }
        if (filtroEstado !== 'TODOS') {
          return normalizarEstadoKey(r?.estado) === filtroEstado
        }
        return true
      })
    }
  }

  return resultado
})

watch(busquedaCedula, (value) => {
  const limpio = normalizarCedula(value)
  if (limpio !== value) busquedaCedula.value = limpio
})

const fechaHoyIso = computed(() => formatLocalDate(new Date()))

const reservasHoyLista = computed(() => {
  const fecha = fechaHoyIso.value
  const porHora = matrizReservasFiltrada.value[fecha] || {}
  const horas = [...(horariosDisponibles.value || [])].sort()
  const lista: any[] = []

  for (const hora of horas) {
    const reservas = porHora[hora] || []
    for (const r of reservas) {
      lista.push({ ...r, _hora_lista: hora })
    }
  }

  return lista
})

const totalAprontesSemana = computed(() => {
  let total = 0
  for (const dia of fechasWeek.value) {
    const porHora = matrizAprontes.value[dia.fecha] || {}
    for (const lista of Object.values(porHora)) {
      total += Array.isArray(lista) ? lista.length : 0
    }
  }
  return total
})

const aprontesSemanaPanel = computed(() => {
  return fechasWeek.value.map((dia) => {
    const porHora = matrizAprontes.value[dia.fecha] || {}
    const horas = [...(horariosDisponibles.value || [])].sort()
    const items: any[] = []

    for (const hora of horas) {
      const lista = porHora[hora] || []
      for (const a of lista) {
        items.push({ ...a, _hora_panel: hora })
      }
    }

    return {
      ...dia,
      total: items.length,
      items
    }
  })
})

const estadosTopMes = computed(() => {
  return Object.entries(metricasAprontes.value.estadosMes || {})
    .map(([estado, total]) => ({ estado, total }))
    .sort((a, b) => b.total - a.total || a.estado.localeCompare(b.estado))
    .slice(0, 4)
})

const variacionAprontesLabel = computed(() => {
  const valor = metricasAprontes.value.variacionPct
  if (!Number.isFinite(valor)) return '0%'
  if (valor > 0) return `+${valor}%`
  return `${valor}%`
})

const variacionAprontesClass = computed(() => {
  const valor = metricasAprontes.value.variacionPct
  if (valor > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (valor < 0) return 'text-rose-600 dark:text-rose-400'
  return 'text-gray-500 dark:text-gray-400'
})

const idsReservasVisibles = computed(() => {
  const ids = new Set<number>()

  if (soloHoyEnLista.value) {
    for (const r of reservasHoyLista.value) {
      const id = Number(r?.id || 0)
      if (id) ids.add(id)
    }
    return ids
  }

  for (const porHora of Object.values(matrizReservasFiltrada.value)) {
    for (const reservas of Object.values(porHora)) {
      for (const r of reservas as any[]) {
        const id = Number(r?.id || 0)
        if (id) ids.add(id)
      }
    }
  }
  return ids
})

watch(idsReservasVisibles, (visibles) => {
  reservasSeleccionadas.value = reservasSeleccionadas.value.filter((id) => visibles.has(id))
})

watch(soloHoyEnLista, async (activo) => {
  if (!activo) return
  if (semanaOffset.value !== 0) {
    semanaOffset.value = 0
    await cargarReservas()
  }
})

const obtenerReservasEnCelda = (fecha: string, hora: string) => {
  return matrizReservasFiltrada.value[fecha]?.[hora] || []
}

const reservaSeleccionada = (id: number) => {
  return reservasSeleccionadas.value.includes(Number(id))
}

const toggleReservaSeleccionada = (id: number) => {
  const idNum = Number(id)
  if (!idNum) return
  if (reservaSeleccionada(idNum)) {
    reservasSeleccionadas.value = reservasSeleccionadas.value.filter((x) => x !== idNum)
    return
  }
  reservasSeleccionadas.value = [...reservasSeleccionadas.value, idNum]
}

const limpiarSeleccion = () => {
  reservasSeleccionadas.value = []
}

const seleccionarVisibles = () => {
  reservasSeleccionadas.value = Array.from(idsReservasVisibles.value)
}

const aplicarEstadoMasivo = async () => {
  const ids = [...reservasSeleccionadas.value]
  if (!ids.length) {
    alert('Selecciona al menos una reserva')
    return
  }

  const estadoDestino = estadoMasivo.value
  const ok = window.confirm(`Cambiar estado a "${estadoDestino}" para ${ids.length} reserva(s)?`)
  if (!ok) return

  aplicandoEstadoMasivo.value = true
  let exitos = 0
  let fallos = 0

  try {
    const resultados = await Promise.allSettled(
      ids.map(async (id) => {
        const reservaActual = await api.obtenerReserva(id)
        if (!reservaActual?.id) {
          throw new Error(`No se encontro la reserva ${id}`)
        }
        await api.actualizarReserva({
          ...reservaActual,
          estado: estadoDestino
        })
      })
    )

    resultados.forEach((r) => {
      if (r.status === 'fulfilled') exitos += 1
      else fallos += 1
    })

    if (fallos > 0) {
      alert(`Estado masivo aplicado parcialmente. Exitosas: ${exitos}. Fallidas: ${fallos}.`)
    } else {
      alert(`Estado actualizado en ${exitos} reserva(s).`)
    }

    limpiarSeleccion()
    await cargarReservas()
  } catch (error: any) {
    alert(error?.message || 'No se pudo aplicar el cambio masivo de estado')
  } finally {
    aplicandoEstadoMasivo.value = false
  }
}

const obtenerHorasConContenido = (fecha: string) => {
  return (horariosDisponibles.value || []).filter((hora) => {
    const reservas = obtenerReservasEnCelda(fecha, hora)
    return reservas.length > 0
  })
}

const tieneContenidoEnDia = (fecha: string) => {
  return obtenerHorasConContenido(fecha).length > 0
}

// Verificar si el horario debe mostrarse para la fecha (sÃƒÂ¡bados solo hasta 12:00)
// const debeRechazoHora = (fecha: string, hora: string) => {
//   const date = new Date(fecha)
//   const esSabado = date.getDay() === 6  // 6 es sÃƒÂ¡bado
//   if (esSabado && hora >= '12:00') {
//     return true  // Rechazar horarios >= 12:00 en sÃƒÂ¡bados
//   }
//   return false
// }

const cambiarSemana = (delta: number) => {
  semanaOffset.value += delta
  cargarReservas()
}

// VENTANA DE DETALLES
const mostrarVentana = ref(false)
const reservaActiva = ref<any>(null)
const modalKey = ref(0)

const mostrarApronte = ref(false)
const apronteActivo = ref<any>(null)
const apronteModalKey = ref(0)

const mostrarFormularioIngreso = ref(false)
const guardandoIngreso = ref(false)
const ingresoEditando = ref<any | null>(null)
const reservaIngresoActiva = ref<any | null>(null)
const ingresoCliente = ref<any | null>(null)
const ingresoVehiculos = ref<any[]>([])
const formIngreso = ref({
  monto: '',
  trabajo_realizado: '',
  fecha_ingreso: new Date().toISOString().slice(0, 10),
  fecha_salida: '',
  historia: '',
  vehiculo_id: null as number | null,
  marca: '',
  modelo: '',
  color: '',
  matricula: '',
  numero_motor: '',
  comentarios: '',
  observaciones: ''
})

const limpiarFormularioIngreso = () => {
  ingresoEditando.value = null
  reservaIngresoActiva.value = null
  ingresoCliente.value = null
  ingresoVehiculos.value = []
  formIngreso.value = {
    monto: '',
    trabajo_realizado: '',
    fecha_ingreso: new Date().toISOString().slice(0, 10),
    fecha_salida: '',
    historia: '',
    vehiculo_id: null,
    marca: '',
    modelo: '',
    color: '',
    matricula: '',
    numero_motor: '',
    comentarios: '',
    observaciones: ''
  }
}

const construirHistoriaReserva = (reserva: any, cliente: any, vehiculo: any) => {
  const partes = [
    `Reserva #${reserva?.id ?? ''}`.trim(),
    reserva?.fecha || reserva?.dia || '',
    reserva?.hora || '',
    cliente?.nombre || reserva?.nombre || '',
    cliente?.cedula || reserva?.cedula || '',
    vehiculo?.matricula || reserva?.matricula || '',
    `${vehiculo?.marca || reserva?.marca || ''} ${vehiculo?.modelo || reserva?.modelo || ''}`.trim(),
    reserva?.detalles || reserva?.garantia_problema || ''
  ]
    .map((valor) => String(valor || '').trim())
    .filter(Boolean)

  return partes.join(' | ').slice(0, 255)
}

const tomarValorNoVacio = (...valores: any[]) => {
  for (const valor of valores) {
    if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
      return valor
    }
  }
  return ''
}

const abrirIngresoDesdeReserva = async (reserva: any, seccion: 'ingreso' | 'egreso' = 'ingreso') => {
  if (!reserva) return
  reservaIngresoActiva.value = { ...reserva }
  mostrarFormularioIngreso.value = true
  error.value = ''

  try {
    const detalleCliente = await api.obtenerClienteDetalle(reserva.cliente_id || reserva.cedula || '')
    const clienteBase = detalleCliente?.cliente || {}
    ingresoCliente.value = {
      id: tomarValorNoVacio(clienteBase.id, reserva.cliente_id, reserva.clienteId, reserva.id_cliente, reserva.idCliente),
      cedula: tomarValorNoVacio(clienteBase.cedula, reserva.cedula, reserva.ci),
      nombre: tomarValorNoVacio(reserva.nombre, reserva.cliente_nombre, clienteBase.nombre),
      telefono: tomarValorNoVacio(clienteBase.telefono, reserva.telefono, reserva.cliente_telefono),
      localidad: tomarValorNoVacio(clienteBase.localidad, reserva.localidad, reserva.cliente_localidad),
      correo: tomarValorNoVacio(clienteBase.correo, reserva.correo, reserva.cliente_correo),
      email: tomarValorNoVacio(clienteBase.email, reserva.email, reserva.cliente_email),
      ...reserva,
      ...clienteBase
    }
    ingresoVehiculos.value = Array.isArray(detalleCliente?.vehiculos) ? detalleCliente.vehiculos : []
  } catch {
    ingresoCliente.value = {
      id: reserva.cliente_id ?? null,
      cedula: reserva.cedula || '',
      nombre: reserva.nombre || '',
      telefono: reserva.telefono || '',
      localidad: reserva.localidad || ''
    }
    ingresoVehiculos.value = []
  }

  const vehiculoInicial = ingresoVehiculos.value.find((vehiculo) => Number(vehiculo.id) === Number(reserva.vehiculo_id || 0)) || ingresoVehiculos.value[0] || null
  const historia = construirHistoriaReserva(reserva, ingresoCliente.value, vehiculoInicial)
  formIngreso.value = {
    monto: '',
    trabajo_realizado: '',
    fecha_ingreso: new Date().toISOString().slice(0, 10),
    fecha_salida: seccion === 'egreso' ? fechaHoyIso.value : '',
    historia,
    vehiculo_id: vehiculoInicial?.id ? Number(vehiculoInicial.id) : Number(reserva.vehiculo_id || 0) || null,
    marca: String(vehiculoInicial?.marca || vehiculoInicial?.codigo_marca || reserva.marca || ''),
    modelo: String(vehiculoInicial?.modelo || vehiculoInicial?.codigo_modelo || reserva.modelo || ''),
    color: String(vehiculoInicial?.color || reserva.color || ''),
    matricula: String(vehiculoInicial?.matricula || reserva.matricula || ''),
    numero_motor: String(vehiculoInicial?.motor || vehiculoInicial?.numero_motor || reserva.numero_motor || ''),
    comentarios: String(reserva.detalles || reserva.garantia_problema || ''),
    observaciones: String(reserva.detalles || reserva.garantia_problema || '')
  }
  ingresoEditando.value = null
}

const cerrarFormularioIngreso = () => {
  mostrarFormularioIngreso.value = false
  limpiarFormularioIngreso()
}

const clonarPlano = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

const crearSnapshotImpresion = () => ({
  cliente: ingresoCliente.value ? clonarPlano(ingresoCliente.value) : null,
  form: clonarPlano(formIngreso.value),
  ingresoId: ingresoEditando.value?.id ?? null,
  reserva: reservaIngresoActiva.value ? clonarPlano(reservaIngresoActiva.value) : null
})

const buildPrintHtml = (snapshot: ReturnType<typeof crearSnapshotImpresion>, folio?: number | string | null) => {
  const clienteSnapshot = snapshot.cliente || {}
  const formSnapshot = snapshot.form
  const folioTexto = folio ?? snapshot.ingresoId ?? ''
  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Ficha de trabajo #${folioTexto}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
        .sheet { border: 2px solid #0f172a; padding: 18px; min-height: 260mm; box-sizing: border-box; }
        .top { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; border-bottom: 1px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
        .brand { font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
        .title { font-size: 26px; font-weight: 900; margin: 6px 0 0; }
        .folio { font-size: 14px; font-weight: 800; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 14px; margin-bottom: 14px; }
        .box { border: 1px solid #0f172a; padding: 10px 12px; min-height: 30px; }
        .label { font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #475569; margin-bottom: 5px; }
        .value { font-size: 14px; font-weight: 700; }
        .block { border: 1px solid #0f172a; padding: 12px; min-height: 115px; margin-bottom: 14px; }
        .block-title { font-size: 10px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #475569; margin-bottom: 10px; }
        .history { min-height: 64px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
        .lines { height: 82px; background: repeating-linear-gradient(to bottom, transparent 0, transparent 22px, rgba(15,23,42,.22) 22px, rgba(15,23,42,.22) 23px); }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 18px; }
        .sig { border: 1px dashed #0f172a; min-height: 88px; display: flex; align-items: end; justify-content: center; padding: 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; }
      </style>
    </head>
    <body onload="window.focus();window.print();">
      <main class="sheet">
        <div class="top">
          <div>
            <div class="brand">ReserveRosas</div>
            <div class="title">Ficha de trabajo</div>
          </div>
          <div class="folio">N° ${folioTexto}</div>
        </div>

        <div class="grid">
          <div class="box"><div class="label">Ingreso</div><div class="value">${formSnapshot.fecha_ingreso || ''}</div></div>
          <div class="box"><div class="label">Egreso</div><div class="value">${formSnapshot.fecha_salida || ''}</div></div>
          <div class="box"><div class="label">Cliente</div><div class="value">${clienteSnapshot.nombre || ''}</div></div>
          <div class="box"><div class="label">Cédula</div><div class="value">${clienteSnapshot.cedula || ''}</div></div>
          <div class="box"><div class="label">Teléfono</div><div class="value">${clienteSnapshot.telefono || ''}</div></div>
          <div class="box"><div class="label">Localidad</div><div class="value">${clienteSnapshot.localidad || ''}</div></div>
          <div class="box"><div class="label">Moto</div><div class="value">${formSnapshot.marca || ''} ${formSnapshot.modelo || ''}</div></div>
          <div class="box"><div class="label">Matrícula</div><div class="value">${formSnapshot.matricula || ''}</div></div>
          <div class="box"><div class="label">Color</div><div class="value">${formSnapshot.color || ''}</div></div>
          <div class="box"><div class="label">Motor</div><div class="value">${formSnapshot.numero_motor || ''}</div></div>
        </div>

        <div class="block"><div class="block-title">Historia</div><div class="history">${formSnapshot.historia || ''}</div></div>
        <div class="block"><div class="block-title">Observaciones</div><div class="lines"></div></div>
        <div class="block"><div class="block-title">Notas de entrega</div><div class="lines"></div></div>

        <div class="signatures">
          <div class="sig">Firma del prestador</div>
          <div class="sig">Firma del cliente</div>
        </div>
      </main>
    </body>
  </html>`
}

const imprimirHoja = (snapshot: ReturnType<typeof crearSnapshotImpresion>, folio?: number | string | null, win: Window | null = null) => {
  const printWindow = win || window.open('', '_blank', 'width=980,height=1200')
  if (!printWindow) {
    error.value = 'No se pudo abrir la ventana de impresión'
    return
  }
  printWindow.document.open()
  printWindow.document.write(buildPrintHtml(snapshot, folio))
  printWindow.document.close()
}

const guardarIngreso = async () => {
  if (!ingresoCliente.value?.id) return null
  guardandoIngreso.value = true
  error.value = ''
  try {
    const payload = {
      cliente_id: ingresoCliente.value.id,
      reserva_id: reservaIngresoActiva.value?.id || null,
      fecha_actual: formIngreso.value.fecha_ingreso ? `${formIngreso.value.fecha_ingreso}T${new Date().toISOString().slice(11, 16)}:00` : undefined,
      fecha_egreso: formIngreso.value.fecha_salida ? `${formIngreso.value.fecha_salida}T${new Date().toISOString().slice(11, 16)}:00` : null,
      marca: formIngreso.value.marca,
      modelo: formIngreso.value.modelo,
      color: formIngreso.value.color,
      matricula: formIngreso.value.matricula,
      numero_motor: formIngreso.value.numero_motor,
      historia: formIngreso.value.historia,
      comentarios: formIngreso.value.comentarios,
      observaciones: formIngreso.value.observaciones,
      vehiculo_id: formIngreso.value.vehiculo_id
    }

    let guardado: any = null
    if (ingresoEditando.value?.id) {
      guardado = await api.actualizarIngreso({ id: ingresoEditando.value.id, ...payload })
    } else {
      guardado = await api.crearIngreso(payload)
    }

    if (guardado?.id) {
      ingresoEditando.value = guardado
    }
    return guardado
  } catch (err: any) {
    error.value = err?.message || 'No se pudo registrar el ingreso'
    throw err
  } finally {
    guardandoIngreso.value = false
  }
}

const guardarYImprimirIngreso = async () => {
  const snapshot = crearSnapshotImpresion()
  const printWindow = window.open('', '_blank', 'width=980,height=1200')
  if (!printWindow) {
    error.value = 'No se pudo abrir la ventana de impresión'
    return
  }
  try {
    const guardado = await guardarIngreso()
    if (guardado?.id) {
      imprimirHoja(snapshot, guardado.id, printWindow)
      mostrarFormularioIngreso.value = false
      reservaIngresoActiva.value = null
      setTimeout(() => cargarReservas(), 150)
    } else {
      printWindow.close()
    }
  } catch {
    printWindow.close()
  }
}

const abrirVentana = (reserva: any) => {
  reservaActiva.value = { ...reserva }
  modalKey.value += 1
  mostrarVentana.value = true
}

const manejarCierre = async () => {
  mostrarVentana.value = false
  reservaActiva.value = null
  setTimeout(() => {
    cargarReservas()
  }, 150)
}

const abrirApronte = (apronte: any) => {
  apronteActivo.value = { ...apronte }
  apronteModalKey.value += 1
  mostrarApronte.value = true
}

const manejarCierreApronte = async () => {
  mostrarApronte.value = false
  apronteActivo.value = null
  setTimeout(() => {
    cargarReservas()
    cargarMetricasAprontes(true)
  }, 150)
}

// FunciÃƒÂ³n para manejar los estilos dinÃƒÂ¡micos de las tarjetas
const getCardStyles = (estado: string) => {
  const styles = {
    'PENDIENTE': 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400',
    'PENDIENTE REPUESTOS': 'bg-orange-50 dark:bg-orange-500/10 border-orange-500 text-orange-700 dark:text-orange-400',
    'PRONTO': 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400',
    'CANCELADO': 'bg-rose-50 dark:bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400',
    'EN PROCESO': 'bg-sky-50 dark:bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-400',
  };
  const key = normalizarEstadoKey(estado)
  return styles[key as keyof typeof styles] || 'bg-gray-50 dark:bg-gray-500/10 border-gray-400 text-gray-700 dark:text-gray-400';
};

const normalizarTipoTurno = (tipo: any) => {
  const value = String(tipo || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (value === 'garantia') return 'Garantia'
  if (value === 'particular') return 'Particular'
  return String(tipo || '')
}

const normalizarTipoGarantia = (tipo: any) => {
  const value = String(tipo || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (value === 'service') return 'Service'
  if (value === 'reparacion') return 'Reparacion'
  return String(tipo || '')
}

const obtenerTipoResumen = (reserva: any) => {
  const tipoTurno = normalizarTipoTurno(reserva.tipo_turno)
  const tipoGarantia = normalizarTipoGarantia(reserva.garantia_tipo)
  if (tipoTurno === 'Garantia') {
    return `Garantia${tipoGarantia ? ` - ${tipoGarantia}` : ''}`
  }
  if (tipoTurno === 'Particular') {
    return `Particular${reserva.particular_tipo ? ` - ${reserva.particular_tipo}` : ''}`
  }
  return tipoTurno || ''
}

const obtenerDetalleResumen = (reserva: any) => {
  const tipoTurno = normalizarTipoTurno(reserva.tipo_turno)
  const tipoGarantia = normalizarTipoGarantia(reserva.garantia_tipo)
  if (tipoTurno === 'Garantia') {
    if (tipoGarantia === 'Service') {
      return reserva.garantia_numero_service ? `Service: ${reserva.garantia_numero_service}` : ''
    }
    if (tipoGarantia === 'Reparacion') {
      return reserva.garantia_problema || ''
    }
  }
  if (tipoTurno === 'Particular') {
    if (reserva.particular_tipo === 'Taller') {
      return reserva.detalles || ''
    }
    return 'Mantenimiento programado'
  }
  return reserva.detalles || ''
}

</script>

<template>
  <div class="h-screen flex bg-gray-50 dark:bg-[#0f172a] overflow-hidden">
    <!-- Mobile: Floating hamburger button -->
    <button v-if="!sidebarAbierto" @click="sidebarAbierto = true" class="lg:hidden fixed bottom-6 left-6 z-50 p-4 bg-cyan-600 text-white rounded-full shadow-lg hover:bg-cyan-700 transition-colors">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>

    <!-- Sidebar overlay for mobile -->
    <div v-if="sidebarAbierto" class="lg:hidden fixed inset-0 bg-black/50 z-30" @click="sidebarAbierto = false"></div>

    <!-- Sidebar -->
    <aside :class="['w-72 shrink-0 bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-lg overflow-hidden transition-transform duration-300', sidebarAbierto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0']"
           style="height: 100vh; z-index: 40;">
      <!-- Sidebar header -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 class="text-lg font-black text-gray-800 dark:text-gray-100">Filtros</h3>
        <button @click="sidebarAbierto = false" class="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Sidebar content -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        <!-- Búsqueda -->
        <div>
          <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Buscar por CI</label>
          <input 
            v-model="busquedaCedula" 
            placeholder="Ingrese CI..." 
            class="w-full bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium" 
          />
        </div>

        <!-- Estado -->
        <div>
          <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Estado</label>
          <select v-model="estadoFiltro"
            class="w-full bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-700 dark:text-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/20">
            <option value="TODOS">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PENDIENTE REPUESTOS">Pendiente repuestos</option>
            <option value="EN REVISION">En revision</option>
            <option value="PRONTO">Pronto</option>
            <option value="EN PROCESO">En proceso</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        <!-- Solo hoy en lista -->
        <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f172a]/50 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
          <input v-model="soloHoyEnLista" type="checkbox" class="w-4 h-4 accent-cyan-600" />
          <span class="text-xs font-bold text-gray-700 dark:text-gray-200">Solo hoy en lista</span>
        </label>

        <!-- Navegación de semana -->
        <div>
          <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Semana</label>
          <div class="flex gap-2">
            <button @click="cambiarSemana(-1)" class="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold text-xs">Anterior</button>
            <button @click="semanaOffset = 0; cargarReservas()" class="flex-1 px-3 py-2.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors font-bold text-xs">Hoy</button>
            <button @click="cambiarSemana(1)" class="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold text-xs">Siguiente</button>
          </div>
        </div>

        <!-- Panel toggle -->
        <div>
          <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Panel</label>
          <div class="flex gap-2">
            <button
              @click="panelActivo = 'agenda'"
              :class="[
                'flex-1 px-3 py-2.5 rounded-lg font-bold text-xs transition-all uppercase tracking-wide',
                panelActivo === 'agenda'
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              ]"
            >
              Reservas
            </button>
            <button
              @click="panelActivo = 'aprontes'"
              :class="[
                'flex-1 px-3 py-2.5 rounded-lg font-bold text-xs transition-all uppercase tracking-wide',
                panelActivo === 'aprontes'
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              ]"
            >
              Aprontes
            </button>
          </div>
        </div>

        <!-- Controles masivos -->
        <div v-if="!esTaller && panelActivo === 'agenda'" class="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div class="text-xs font-black text-cyan-600">Seleccionadas: {{ reservasSeleccionadas.length }}</div>
          <button
            @click="seleccionarVisibles"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-bold"
          >
            Seleccionar visibles
          </button>
          <button
            @click="limpiarSeleccion"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-bold"
          >
            Limpiar
          </button>
          <select
            v-model="estadoMasivo"
            class="w-full bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            <option v-for="estado in OPCIONES_ESTADO" :key="estado.value" :value="estado.value">
              {{ estado.label }}
            </option>
          </select>
          <button
            :disabled="aplicandoEstadoMasivo || reservasSeleccionadas.length === 0"
            @click="aplicarEstadoMasivo"
            class="w-full px-3 py-2.5 rounded-lg bg-cyan-600 text-white text-xs font-black uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-700 transition-colors"
          >
            {{ aplicandoEstadoMasivo ? 'Aplicando...' : 'Cambiar estado' }}
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 flex flex-col min-w-0 h-screen">
      <!-- Header with title -->
      <header class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] flex items-center justify-between flex-shrink-0">
        <h2 class="text-3xl md:text-4xl font-black text-gray-800 dark:text-gray-100">
          CALENDARIO <span class="text-cyan-600">SEMANAL</span>
        </h2>
      </header>

      <!-- Calendar content area -->
      <div class="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-[#1e293b]">
      <div v-if="panelActivo === 'agenda' && soloHoyEnLista" class="p-3 sm:p-4 md:p-5">
        <div class="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#0f172a]/40 overflow-hidden">
          <div class="px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#1e293b]/85 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Agenda del dia</div>
              <div class="text-sm sm:text-base font-black text-gray-800 dark:text-gray-100">{{ new Date(fechaHoyIso).toLocaleDateString('es-UY', { weekday: 'long', day: '2-digit', month: 'short' }) }}</div>
            </div>
            <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-cyan-600">Reservas: {{ reservasHoyLista.length }}</div>
          </div>

          <div v-if="reservasHoyLista.length === 0" class="px-3 sm:px-4 py-6 text-sm text-gray-500 dark:text-gray-400 italic">
            No hay reservas para hoy.
          </div>

          <div v-else class="p-3 sm:p-4 space-y-2 sm:space-y-2.5">
            <div
              v-for="r in reservasHoyLista"
              :key="`hoy-${r.id}`"
              @click="abrirVentana(r)"
              :class="['p-2 sm:p-2.5 rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-95 min-w-0', getCardStyles(r.estado)]"
            >
              <div class="flex items-start justify-between gap-2 mb-1">
                <div class="text-sm sm:text-base font-black uppercase break-words leading-tight">{{ r.nombre }}</div>
                <input
                  :checked="reservaSeleccionada(r.id)"
                  @click.stop
                  @change="toggleReservaSeleccionada(r.id)"
                  type="checkbox"
                  class="h-4 w-4 accent-cyan-600 shrink-0"
                />
              </div>
              <div class="text-[11px] sm:text-xs font-bold opacity-80">{{ r._hora_lista || r.hora }} hs · {{ r.tipo_resumen }}</div>
              <div v-if="r.detalle_resumen" class="text-[11px] sm:text-xs opacity-75 break-words leading-tight mt-0.5">{{ r.detalle_resumen }}</div>
              <div class="text-[11px] sm:text-xs font-bold opacity-80 break-words leading-tight mt-1">{{ r.marca }} {{ r.modelo }} · CI {{ r.cedula }}</div>
            </div>

          </div>
        </div>
      </div>

      <div v-else-if="panelActivo === 'agenda'">
      <div class="lg:hidden p-3 sm:p-4 md:p-5 space-y-4 sm:space-y-5">
        <div v-for="dia in fechasWeek" :key="`list-${dia.fecha}`" class="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f172a]/35 overflow-hidden">
          <div class="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#1e293b]/80">
            <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{{ dia.nombre }}</div>
            <div class="text-sm sm:text-base font-black text-gray-800 dark:text-gray-100">{{ dia.fechaFormato }}</div>
          </div>

          <div v-if="!tieneContenidoEnDia(dia.fecha)" class="px-3 sm:px-4 py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
            Sin reservas para este día.
          </div>

          <div v-else class="divide-y divide-gray-200/70 dark:divide-gray-800/70">
            <div v-for="hora in obtenerHorasConContenido(dia.fecha)" :key="`${dia.fecha}-list-${hora}`" class="px-3 sm:px-4 py-3 sm:py-4">
              <div class="text-[10px] sm:text-xs font-black tracking-widest uppercase text-cyan-600 mb-2">{{ hora }} hs</div>

              <div class="grid grid-cols-1 gap-2">
                <div v-for="r in obtenerReservasEnCelda(dia.fecha, hora)" :key="`list-r-${r.id}`"
                     @click="abrirVentana(r)"
                     :class="['p-1.5 sm:p-2 rounded-lg sm:rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-95 min-w-0', getCardStyles(r.estado)]">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <div class="text-[10px] sm:text-[11px] font-black uppercase break-words leading-tight">{{ r.nombre }}</div>
                    <input
                      :checked="reservaSeleccionada(r.id)"
                      @click.stop
                      @change="toggleReservaSeleccionada(r.id)"
                      type="checkbox"
                      class="h-4 w-4 accent-cyan-600 shrink-0"
                    />
                  </div>
                  <div class="text-[9px] sm:text-[10px] font-bold opacity-80">{{ r.tipo_resumen }}</div>
                  <div v-if="r.detalle_resumen" class="text-[9px] sm:text-[10px] opacity-70 break-words leading-tight">{{ r.detalle_resumen }}</div>
                  <div class="text-[9px] sm:text-[10px] font-bold opacity-75 break-words leading-tight">{{ r.marca }} {{ r.modelo }} · {{ r.cedula }}</div>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <button @click.stop="abrirFichaTrabajoDesdeReserva(r, 'ingreso')" class="rounded-full bg-cyan-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-cyan-400">
                      Ingreso
                    </button>
                    <button
                      @click.stop="abrirFichaTrabajoDesdeReserva(r, 'egreso')"
                      :disabled="!r.ingreso_id"
                      class="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Egreso
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <table class="hidden lg:table w-full border-collapse table-fixed">
        <thead class="sticky top-0 z-20 bg-white dark:bg-[#1e293b]">
          <tr>
            <th class="w-14 xl:w-[4.5rem] 2xl:w-20 p-2 xl:p-3 text-[9px] xl:text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-200 dark:border-gray-800">Hora</th>
            <th v-for="dia in fechasWeek" :key="dia.fecha" class="p-2 xl:p-3 border-b border-gray-200 dark:border-gray-800 border-l border-gray-100 dark:border-gray-800/50">
              <div class="flex flex-col items-center">
                <span class="text-[9px] xl:text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.14em]">{{ dia.nombre }}</span>
                <span class="text-lg xl:text-[1.65rem] font-black text-gray-800 dark:text-gray-100 leading-none mt-1">{{ dia.fecha?.split('-')[2] }}</span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 dark:divide-gray-800/50">
          <template v-for="item in horariosConDivisor" :key="item.tipo === 'divider' ? 'divider' : item.hora">
            <tr v-if="item.tipo === 'divider'">
              <td :colspan="fechasWeek.length + 1" class="px-3 py-2 bg-white dark:bg-[#1e293b]">
                <div class="flex items-center justify-center gap-3 text-[8px] xl:text-[10px] font-black uppercase tracking-[0.32em] text-emerald-600/80">
                  <span class="h-px w-10 xl:w-16 bg-emerald-500/30"></span>
                  ROSAS UY
                  <span class="h-px w-10 xl:w-16 bg-emerald-500/30"></span>
                </div>
              </td>
            </tr>
            <tr v-else>
              <td class="p-2 xl:p-3 text-center border-r border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f172a]/30">
                <span class="text-[9px] xl:text-[13px] font-black text-gray-400 dark:text-gray-500">{{ item.hora }}</span>
              </td>

              <td v-for="dia in fechasWeek" :key="`${dia.fecha}-${item.hora}`" 
                  class="p-1.5 xl:p-2 border-l border-gray-100 dark:border-gray-800/30 min-h-[92px] xl:min-h-[128px] align-top hover:bg-cyan-500/5 transition-colors">
                
                <div class="flex-1 flex flex-col gap-1.5">
                  <div v-for="r in obtenerReservasEnCelda(dia.fecha, item.hora)" :key="r.id"
                       @click="abrirVentana(r)"
                       :class="['p-1.5 xl:p-2 rounded-lg xl:rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 min-w-0', getCardStyles(r.estado)]">
                    <div class="flex items-start justify-between gap-2 mb-1">
                      <div class="text-[9px] xl:text-[11px] font-black uppercase break-words leading-tight">{{ r.nombre }}</div>
                      <input
                        :checked="reservaSeleccionada(r.id)"
                        @click.stop
                        @change="toggleReservaSeleccionada(r.id)"
                        type="checkbox"
                        class="h-3.5 w-3.5 xl:h-4 xl:w-4 accent-cyan-600 shrink-0"
                      />
                    </div>
                    <div class="text-[8px] xl:text-[10px] font-bold opacity-80 mb-1 break-words leading-tight">
                      {{ r.tipo_resumen }}
                    </div>
                    <div v-if="r.detalle_resumen" class="text-[8px] xl:text-[10px] opacity-70 break-words leading-tight mb-1">
                      {{ r.detalle_resumen }}
                    </div>
                    <div v-if="r.garantia_fecha_compra" class="text-[8px] xl:text-[10px] opacity-70 break-words leading-tight mb-1">
                      Compra: {{ r.garantia_fecha_compra }}
                    </div>
                    <div class="text-[8px] xl:text-[10px] font-bold opacity-80 leading-tight break-words">
                      {{ r.marca }} {{ r.modelo }}<br/>
                      <span class="opacity-60">{{ r.cedula }}</span>
                    </div>
                    <div class="mt-2 flex flex-wrap gap-1.5">
                      <button @click.stop="abrirFichaTrabajoDesdeReserva(r, 'ingreso')" class="rounded-full bg-cyan-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-cyan-400">
                        Ingreso
                      </button>
                      <button
                        @click.stop="abrirFichaTrabajoDesdeReserva(r, 'egreso')"
                        :disabled="!r.ingreso_id"
                        class="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Egreso
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      </div>

      <div v-else>
        <div class="p-3 sm:p-4 md:p-5 space-y-4 sm:space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <div class="rounded-xl sm:rounded-2xl border border-cyan-200 dark:border-cyan-700/50 bg-cyan-50/85 dark:bg-cyan-500/10 px-4 py-3">
              <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-300">Aprontes esta semana</div>
              <div class="text-2xl sm:text-3xl font-black text-cyan-800 dark:text-cyan-200 leading-none mt-1">{{ totalAprontesSemana }}</div>
            </div>

            <div class="rounded-xl sm:rounded-2xl border border-emerald-200 dark:border-emerald-700/50 bg-emerald-50/85 dark:bg-emerald-500/10 px-4 py-3">
              <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Mes actual</div>
              <div class="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-200 leading-none mt-1">{{ metricasAprontes.mesActual }}</div>
              <div class="text-[10px] sm:text-xs font-bold mt-1" :class="variacionAprontesClass">{{ variacionAprontesLabel }} vs mes anterior</div>
            </div>

            <div class="rounded-xl sm:rounded-2xl border border-amber-200 dark:border-amber-700/50 bg-amber-50/85 dark:bg-amber-500/10 px-4 py-3">
              <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Mes anterior</div>
              <div class="text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-200 leading-none mt-1">{{ metricasAprontes.mesAnterior }}</div>
            </div>

            <div class="rounded-xl sm:rounded-2xl border border-violet-200 dark:border-violet-700/50 bg-violet-50/85 dark:bg-violet-500/10 px-4 py-3">
              <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">Promedio diario mes</div>
              <div class="text-2xl sm:text-3xl font-black text-violet-800 dark:text-violet-200 leading-none mt-1">{{ metricasAprontes.promedioDiarioMes }}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
            <div class="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#0f172a]/40 px-4 py-3">
              <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Estados del mes</div>
              <div v-if="estadosTopMes.length" class="flex flex-wrap gap-2">
                <div
                  v-for="estado in estadosTopMes"
                  :key="estado.estado"
                  class="px-2.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-[10px] sm:text-xs font-black text-gray-700 dark:text-gray-200"
                >
                  {{ estado.estado }}: {{ estado.total }}
                </div>
              </div>
              <div v-else class="text-xs text-gray-500 dark:text-gray-400 italic">Sin datos del mes actual.</div>
            </div>

            <div class="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#0f172a]/40 px-4 py-3">
              <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Horas pico del mes</div>
              <div v-if="metricasAprontes.horasTopMes.length" class="space-y-2">
                <div
                  v-for="item in metricasAprontes.horasTopMes"
                  :key="item.hora"
                  class="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] px-3 py-1.5"
                >
                  <span class="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-200">{{ item.hora }}</span>
                  <span class="text-xs sm:text-sm font-bold text-cyan-700 dark:text-cyan-300">{{ item.total }} aprontes</span>
                </div>
              </div>
              <div v-else class="text-xs text-gray-500 dark:text-gray-400 italic">Sin datos del mes actual.</div>
            </div>
          </div>

          <div class="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#0f172a]/35 overflow-hidden">
            <div class="px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#1e293b]/85 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Panel semanal</div>
                <div class="text-sm sm:text-base font-black text-gray-800 dark:text-gray-100">Aprontes por dia y horario</div>
              </div>
              <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-cyan-600">{{ totalAprontesSemana }} aprontes en la semana</div>
            </div>

            <div class="lg:hidden p-3 sm:p-4 space-y-3">
              <div
                v-for="dia in aprontesSemanaPanel"
                :key="`ap-panel-mobile-${dia.fecha}`"
                class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] overflow-hidden"
              >
                <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <div class="text-[10px] font-black uppercase tracking-widest text-gray-400">{{ dia.nombre }}</div>
                    <div class="text-sm font-black text-gray-800 dark:text-gray-100">{{ dia.fechaFormato }}</div>
                  </div>
                  <div class="text-[10px] font-black uppercase tracking-widest text-cyan-600">{{ dia.total }} aprontes</div>
                </div>

                <div v-if="!dia.items.length" class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 italic">Sin aprontes.</div>
                <div v-else class="p-2.5 space-y-2">
                  <div
                    v-for="a in dia.items"
                    :key="`ap-panel-mobile-item-${a.id}`"
                    @click="abrirApronte(a)"
                    class="p-2.5 rounded-lg border border-cyan-200 dark:border-cyan-500/40 bg-cyan-50/85 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-200 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-[10px] font-black uppercase tracking-wide">{{ a._hora_panel || a.hora }}</div>
                      <div class="text-[10px] font-bold opacity-80">{{ a.estado || 'APRONTE' }}</div>
                    </div>
                    <div class="text-[11px] font-black break-words leading-tight mt-1">{{ a.nombre }}</div>
                    <div class="text-[10px] opacity-80 break-words leading-tight">{{ a.marca }} {{ a.modelo }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="hidden lg:grid lg:grid-cols-6 gap-3 p-3 sm:p-4">
              <div
                v-for="dia in aprontesSemanaPanel"
                :key="`ap-panel-desktop-${dia.fecha}`"
                class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] overflow-hidden min-h-[360px]"
              >
                <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                  <div class="text-[10px] font-black uppercase tracking-widest text-gray-400">{{ dia.nombre }}</div>
                  <div class="text-sm font-black text-gray-800 dark:text-gray-100">{{ dia.fechaFormato }}</div>
                  <div class="text-[10px] font-black uppercase tracking-widest text-cyan-600 mt-1">{{ dia.total }} aprontes</div>
                </div>

                <div v-if="!dia.items.length" class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 italic">Sin aprontes.</div>
                <div v-else class="p-2.5 space-y-2">
                  <div
                    v-for="a in dia.items"
                    :key="`ap-panel-desktop-item-${a.id}`"
                    @click="abrirApronte(a)"
                    class="p-2 rounded-lg border border-cyan-200 dark:border-cyan-500/40 bg-cyan-50/85 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-200 shadow-sm cursor-pointer transition-all hover:scale-[1.015] active:scale-95"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-[10px] font-black uppercase tracking-wide">{{ a._hora_panel || a.hora }}</div>
                      <div class="text-[10px] font-bold opacity-80">{{ a.estado || 'APRONTE' }}</div>
                    </div>
                    <div class="text-[10px] xl:text-[11px] font-black break-words leading-tight mt-1">{{ a.nombre }}</div>
                    <div class="text-[10px] opacity-80 break-words leading-tight">{{ a.marca }} {{ a.modelo }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="cargandoMetricasAprontes" class="text-xs font-bold text-gray-500 dark:text-gray-400 italic px-1">
            Actualizando metricas de aprontes...
          </div>
        </div>
      </div>
      </div>
    </main>
  </div>

  <ReservaWindow v-if="mostrarVentana" :key="modalKey" :reserva="reservaActiva" @cerrar="manejarCierre" />
    <ApronteWindow
      v-if="mostrarApronte"
      :key="apronteModalKey"
      :apronte="apronteActivo"
      @cerrar="manejarCierreApronte"
      @actualizar="() => { cargarReservas(); cargarMetricasAprontes(true) }"
    />

    <IngresoModal
      :open="mostrarFormularioIngreso"
      :cliente="ingresoCliente"
      :vehiculos="ingresoVehiculos"
      :ingreso="ingresoEditando"
      :form="formIngreso"
      :allow-print="true"
      @close="cerrarFormularioIngreso"
      @save="guardarIngreso"
      @save-and-print="guardarYImprimirIngreso"
    />
</template>


