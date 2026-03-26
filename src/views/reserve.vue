<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import ReservaWindow from '../components/reservaWindow.vue'
import ApronteWindow from '../components/apronteWindow.vue'
import { api, ipc } from '../api'

const semanaOffset = ref(0)
const busquedaCedula = ref('')
const estadoFiltro = ref('TODOS')

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
// Caché de aprontes para evitar parpadeos cuando el fetch falla
const cacheAprontes = new Map<string, any[]>()

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
    aprontesPorDia.forEach((lista) => {
      if (!Array.isArray(lista)) return
      lista.forEach((apronte: any) => {
        const hora = String(apronte?.hora || '').trim()
        if (hora) horasAprontesSemana.add(hora)
      })
    })

    const horasSemana = Array.from(new Set([
      ...horariosBase.value,
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
      if (nuevaMatriz[reserva.fecha] && nuevaMatriz[reserva.fecha][reserva.hora]) {
        const tipoResumen = obtenerTipoResumen(reserva)
        const detalleResumen = obtenerDetalleResumen(reserva)
        nuevaMatriz[reserva.fecha][reserva.hora].push({
          ...reserva,
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
        const hora = apronte?.hora
        if (hora && nuevaMatrizAprontes[fecha] && nuevaMatrizAprontes[fecha][hora]) {
          nuevaMatrizAprontes[fecha][hora].push(apronte)
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
  } finally {
    refreshEnCurso = false
  }
}

onMounted(async () => {
  await cargarHorariosBase()
  await refrescarDatos(true)

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

const obtenerReservasEnCelda = (fecha: string, hora: string) => {
  return matrizReservasFiltrada.value[fecha]?.[hora] || []
}

const obtenerAprontesEnCelda = (fecha: string, hora: string) => {
  return matrizAprontes.value[fecha]?.[hora] || []
}

const obtenerHorasConContenido = (fecha: string) => {
  return (horariosDisponibles.value || []).filter((hora) => {
    const reservas = obtenerReservasEnCelda(fecha, hora)
    const aprontes = obtenerAprontesEnCelda(fecha, hora)
    return reservas.length > 0 || aprontes.length > 0
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
        </div>
      </div>

      <div class="flex bg-white dark:bg-[#1e293b] p-1.5 rounded-xl sm:rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <button @click="cambiarSemana(-1)" class="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold text-[8px] sm:text-[9px] md:text-xs uppercase tracking-widest">Anterior</button>
        <button @click="semanaOffset = 0; cargarReservas()" class="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-cyan-600 text-white font-bold text-[8px] sm:text-[9px] md:text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Hoy</button>
        <button @click="cambiarSemana(1)" class="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold text-[8px] sm:text-[9px] md:text-xs uppercase tracking-widest">Siguiente</button>
      </div>
    </header><div class="flex-1 overflow-y-auto overflow-x-hidden rounded-2xl sm:rounded-3xl md:rounded-4xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b]/50 shadow-xl custom-scrollbar">
      <div class="2xl:hidden p-3 sm:p-4 md:p-5 space-y-4 sm:space-y-5">
        <div v-for="dia in fechasWeek" :key="`list-${dia.fecha}`" class="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f172a]/35 overflow-hidden">
          <div class="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#1e293b]/80">
            <div class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{{ dia.nombre }}</div>
            <div class="text-sm sm:text-base font-black text-gray-800 dark:text-gray-100">{{ dia.fechaFormato }}</div>
          </div>

          <div v-if="!tieneContenidoEnDia(dia.fecha)" class="px-3 sm:px-4 py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
            Sin reservas ni aprontes para este día.
          </div>

          <div v-else class="divide-y divide-gray-200/70 dark:divide-gray-800/70">
            <div v-for="hora in obtenerHorasConContenido(dia.fecha)" :key="`${dia.fecha}-list-${hora}`" class="px-3 sm:px-4 py-3 sm:py-4">
              <div class="text-[10px] sm:text-xs font-black tracking-widest uppercase text-cyan-600 mb-2">{{ hora }} hs</div>

              <div class="space-y-2">
                <div v-for="r in obtenerReservasEnCelda(dia.fecha, hora)" :key="`list-r-${r.id}`"
                     @click="abrirVentana(r)"
                     :class="['p-2.5 sm:p-3 rounded-lg sm:rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-95', getCardStyles(r.estado)]">
                  <div class="text-[10px] sm:text-[11px] font-black uppercase truncate mb-1">{{ r.nombre }}</div>
                  <div class="text-[9px] sm:text-[10px] font-bold opacity-80">{{ r.tipo_resumen }}</div>
                  <div v-if="r.detalle_resumen" class="text-[9px] sm:text-[10px] opacity-70 truncate">{{ r.detalle_resumen }}</div>
                  <div class="text-[9px] sm:text-[10px] font-bold opacity-75">{{ r.marca }} {{ r.modelo }} · {{ r.cedula }}</div>
                </div>

                <div v-for="a in obtenerAprontesEnCelda(dia.fecha, hora)" :key="`list-a-${a.id}`"
                     @click="abrirApronte(a)"
                     class="p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-cyan-200 dark:border-cyan-500/40 bg-cyan-50/80 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-200 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-95">
                  <div class="text-[9px] sm:text-[10px] font-black uppercase tracking-wide">Apronte</div>
                  <div class="text-[10px] sm:text-[11px] font-bold truncate">{{ a.nombre }}</div>
                  <div class="text-[9px] sm:text-[10px] opacity-70 truncate">{{ a.marca }} {{ a.modelo }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <table class="hidden 2xl:table w-full border-collapse table-fixed">
        <thead class="sticky top-0 z-20 bg-white dark:bg-[#1e293b]">
          <tr>
            <th class="w-20 sm:w-24 p-3 sm:p-4 md:p-5 text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800">Hora</th>
            <th v-for="dia in fechasWeek" :key="dia.fecha" class="p-2 sm:p-3 md:p-4 border-b border-gray-200 dark:border-gray-800 border-l border-gray-100 dark:border-gray-800/50">
              <div class="flex flex-col items-center">
                <span class="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">{{ dia.nombre }}</span>
                <span class="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-gray-800 dark:text-gray-100">{{ dia.fecha?.split('-')[2] }}</span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 dark:divide-gray-800/50">
          <template v-for="item in horariosConDivisor" :key="item.tipo === 'divider' ? 'divider' : item.hora">
            <tr v-if="item.tipo === 'divider'">
              <td :colspan="fechasWeek.length + 1" class="px-3 py-2 sm:py-3 bg-white dark:bg-[#1e293b]">
                <div class="flex items-center justify-center gap-3 text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.35em] text-emerald-600/80">
                  <span class="h-px w-10 sm:w-16 bg-emerald-500/30"></span>
                  ROSAS AVENTURAS
                  <span class="h-px w-10 sm:w-16 bg-emerald-500/30"></span>
                </div>
              </td>
            </tr>
            <tr v-else>
              <td class="p-2 sm:p-3 md:p-4 text-center border-r border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f172a]/30">
                <span class="text-[7px] sm:text-[8px] md:text-xs font-black text-gray-400 dark:text-gray-500">{{ item.hora }}</span>
              </td>

              <td v-for="dia in fechasWeek" :key="`${dia.fecha}-${item.hora}`" 
                  class="p-1 sm:p-2 md:p-3 border-l border-gray-100 dark:border-gray-800/30 min-h-[80px] sm:min-h-[100px] md:min-h-[120px] align-top hover:bg-cyan-500/5 transition-colors">
                
                <div class="flex gap-2">
                  <div class="flex-1 flex flex-col gap-1 sm:gap-2">
                    <div v-for="r in obtenerReservasEnCelda(dia.fecha, item.hora)" :key="r.id"
                         @click="abrirVentana(r)"
                         :class="['p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95', getCardStyles(r.estado)]">
                      <div class="text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase truncate mb-1">{{ r.nombre }}</div>
                      <div class="text-[7px] sm:text-[8px] md:text-[9px] font-bold opacity-80 mb-1">
                        {{ r.tipo_resumen }}
                      </div>
                      <div v-if="r.detalle_resumen" class="text-[7px] sm:text-[8px] md:text-[9px] opacity-70 truncate mb-1">
                        {{ r.detalle_resumen }}
                      </div>
                      <div v-if="r.garantia_fecha_compra" class="text-[7px] sm:text-[8px] md:text-[9px] opacity-70 truncate mb-1">
                        Compra: {{ r.garantia_fecha_compra }}
                      </div>
                      <div class="text-[7px] sm:text-[8px] md:text-[9px] font-bold opacity-80 leading-tight">
                        {{ r.marca }} {{ r.modelo }}<br/>
                        <span class="opacity-60">{{ r.cedula }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="obtenerAprontesEnCelda(dia.fecha, item.hora).length"
                       class="w-24 sm:w-28 md:w-32 flex flex-col gap-1 sm:gap-2">
                    <div v-for="a in obtenerAprontesEnCelda(dia.fecha, item.hora)" :key="a.id"
                         @click="abrirApronte(a)"
                         class="p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-cyan-200 dark:border-cyan-500/40 bg-cyan-50/80 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-200 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95">
                      <div class="text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-wide">Apronte</div>
                      <div class="text-[7px] sm:text-[8px] md:text-[9px] font-bold truncate">{{ a.nombre }}</div>
                      <div class="text-[7px] sm:text-[8px] md:text-[9px] opacity-70 truncate">{{ a.marca }} {{ a.modelo }}</div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <ReservaWindow v-if="mostrarVentana" :key="modalKey" :reserva="reservaActiva" @cerrar="manejarCierre" />
    <ApronteWindow
      v-if="mostrarApronte"
      :key="apronteModalKey"
      :apronte="apronteActivo"
      @cerrar="manejarCierreApronte"
      @actualizar="cargarReservas"
    />
  </div>
</template>


