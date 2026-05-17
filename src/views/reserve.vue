<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount, watch } from 'vue'
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
const session = getSession()
const esTaller = isTallerRole(session)

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
  const filtroCedula = busquedaCedula.value.trim()
  const filtroEstado = estadoFiltro.value

  for (const [fecha, porHora] of Object.entries(matrizReservas.value)) {
    resultado[fecha] = {}
    for (const [hora, reservas] of Object.entries(porHora)) {
      resultado[fecha][hora] = reservas.filter((r: any) => {
        if (filtroCedula && !String(r?.cedula || '').includes(filtroCedula)) {
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
  <div class="h-screen flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 bg-gray-50 dark:bg-[#0f172a] gap-4 sm:gap-5 md:gap-6 lg:gap-7 overflow-y-auto overflow-x-hidden">
    <header class="flex justify-between items-end">
      <div class="space-y-3 sm:space-y-4 md:space-y-5">
        <h2 class="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
          CALENDARIO <span class="text-cyan-600">SEMANAL</span>
        </h2>
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative group">
            <input 
              v-model="busquedaCedula" 
              placeholder="Buscar por CI..." 
              class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl md:rounded-3xl py-3 px-4 sm:px-5 md:px-6 text-gray-700 dark:text-gray-200 w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium shadow-sm" 
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Estado</span>
            <select v-model="estadoFiltro"
              class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl py-2.5 px-4 text-gray-700 dark:text-gray-200 text-xs font-bold uppercase tracking-widest">
              <option value="TODOS">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PENDIENTE REPUESTOS">Pendiente repuestos</option>
              <option value="EN REVISION">En revision</option>
              <option value="PRONTO">Pronto</option>
              <option value="EN PROCESO">En proceso</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          <label class="inline-flex items-center gap-2 cursor-pointer select-none">
            <span class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Solo hoy en lista</span>
            <input v-model="soloHoyEnLista" type="checkbox" class="sr-only peer" />
            <span class="relative h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors peer-checked:bg-cyan-600">
              <span class="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5"></span>
            </span>
          </label>
        </div>
      </div>

      <div class="flex bg-white dark:bg-[#1e293b] p-1.5 rounded-xl sm:rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <button @click="cambiarSemana(-1)" class="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold text-[8px] sm:text-[9px] md:text-xs uppercase tracking-widest">Anterior</button>
        <button @click="semanaOffset = 0; cargarReservas()" class="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-cyan-600 text-white font-bold text-[8px] sm:text-[9px] md:text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Hoy</button>
        <button @click="cambiarSemana(1)" class="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold text-[8px] sm:text-[9px] md:text-xs uppercase tracking-widest">Siguiente</button>
      </div>

      <div class="flex bg-white dark:bg-[#1e293b] p-1.5 rounded-xl sm:rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <button
          @click="panelActivo = 'agenda'"
          :class="[
            'px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[8px] sm:text-[9px] md:text-xs uppercase tracking-widest transition-all',
            panelActivo === 'agenda'
              ? 'bg-cyan-600 text-white shadow-lg'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          ]"
        >
          Panel Reservas
        </button>
        <button
          @click="panelActivo = 'aprontes'"
          :class="[
            'px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[8px] sm:text-[9px] md:text-xs uppercase tracking-widest transition-all',
            panelActivo === 'aprontes'
              ? 'bg-cyan-600 text-white shadow-lg'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          ]"
        >
          Panel Aprontes
        </button>
      </div>
    </header>

    <div v-if="!esTaller && panelActivo === 'agenda'" class="flex flex-wrap items-center gap-2 sm:gap-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 shadow-sm">
      <span class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
        Seleccionadas: {{ reservasSeleccionadas.length }}
      </span>
      <button
        @click="seleccionarVisibles"
        class="px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Seleccionar visibles
      </button>
      <button
        @click="limpiarSeleccion"
        class="px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Limpiar
      </button>
      <select
        v-model="estadoMasivo"
        class="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200"
      >
        <option v-for="estado in OPCIONES_ESTADO" :key="estado.value" :value="estado.value">
          {{ estado.label }}
        </option>
      </select>
      <button
        :disabled="aplicandoEstadoMasivo || reservasSeleccionadas.length === 0"
        @click="aplicarEstadoMasivo"
        class="px-3 sm:px-4 py-1.5 rounded-lg bg-cyan-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-700 transition-colors"
      >
        {{ aplicandoEstadoMasivo ? 'Aplicando...' : 'Cambiar estado' }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto overflow-x-hidden rounded-2xl sm:rounded-3xl md:rounded-4xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b]/50 shadow-xl custom-scrollbar">
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

          <div v-else class="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
            <div
              v-for="r in reservasHoyLista"
              :key="`hoy-${r.id}`"
              @click="abrirVentana(r)"
              :class="['p-3 sm:p-3.5 rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-95 min-w-0', getCardStyles(r.estado)]"
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
                     :class="['p-2.5 sm:p-3 rounded-lg sm:rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-95 min-w-0', getCardStyles(r.estado)]">
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <table class="hidden lg:table w-full border-collapse table-fixed">
        <thead class="sticky top-0 z-20 bg-white dark:bg-[#1e293b]">
          <tr>
            <th class="w-16 xl:w-20 p-2 xl:p-3 text-[8px] xl:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800">Hora</th>
            <th v-for="dia in fechasWeek" :key="dia.fecha" class="p-2 xl:p-3 border-b border-gray-200 dark:border-gray-800 border-l border-gray-100 dark:border-gray-800/50">
              <div class="flex flex-col items-center">
                <span class="text-[8px] xl:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">{{ dia.nombre }}</span>
                <span class="text-base xl:text-xl font-black text-gray-800 dark:text-gray-100">{{ dia.fecha?.split('-')[2] }}</span>
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
                <span class="text-[8px] xl:text-xs font-black text-gray-400 dark:text-gray-500">{{ item.hora }}</span>
              </td>

              <td v-for="dia in fechasWeek" :key="`${dia.fecha}-${item.hora}`" 
                  class="p-1.5 xl:p-2.5 border-l border-gray-100 dark:border-gray-800/30 min-h-[84px] xl:min-h-[112px] align-top hover:bg-cyan-500/5 transition-colors">
                
                <div class="flex-1 flex flex-col gap-1.5">
                  <div v-for="r in obtenerReservasEnCelda(dia.fecha, item.hora)" :key="r.id"
                       @click="abrirVentana(r)"
                       :class="['p-2 xl:p-2.5 rounded-lg xl:rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 min-w-0', getCardStyles(r.estado)]">
                    <div class="flex items-start justify-between gap-2 mb-1">
                      <div class="text-[8px] xl:text-[10px] font-black uppercase break-words leading-tight">{{ r.nombre }}</div>
                      <input
                        :checked="reservaSeleccionada(r.id)"
                        @click.stop
                        @change="toggleReservaSeleccionada(r.id)"
                        type="checkbox"
                        class="h-3.5 w-3.5 xl:h-4 xl:w-4 accent-cyan-600 shrink-0"
                      />
                    </div>
                    <div class="text-[7px] xl:text-[9px] font-bold opacity-80 mb-1 break-words leading-tight">
                      {{ r.tipo_resumen }}
                    </div>
                    <div v-if="r.detalle_resumen" class="text-[7px] xl:text-[9px] opacity-70 break-words leading-tight mb-1">
                      {{ r.detalle_resumen }}
                    </div>
                    <div v-if="r.garantia_fecha_compra" class="text-[7px] xl:text-[9px] opacity-70 break-words leading-tight mb-1">
                      Compra: {{ r.garantia_fecha_compra }}
                    </div>
                    <div class="text-[7px] xl:text-[9px] font-bold opacity-80 leading-tight break-words">
                      {{ r.marca }} {{ r.modelo }}<br/>
                      <span class="opacity-60">{{ r.cedula }}</span>
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
    <ReservaWindow v-if="mostrarVentana" :key="modalKey" :reserva="reservaActiva" @cerrar="manejarCierre" />
    <ApronteWindow
      v-if="mostrarApronte"
      :key="apronteModalKey"
      :apronte="apronteActivo"
      @cerrar="manejarCierreApronte"
      @actualizar="() => { cargarReservas(); cargarMetricasAprontes(true) }"
    />
  </div>
</template>


