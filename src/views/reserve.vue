<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import ReservaWindow from '../components/reservaWindow.vue'

const semanaOffset = ref(0)
const busquedaCedula = ref('')
const estadoFiltro = ref('TODOS')

// Horarios: se cargarán dinámicamente desde la BD
const horariosDisponibles = ref<string[]>([])

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

// Estructura de semana
const diasSemana = ref([
  { id: 0, nombre: 'Lunes' },
  { id: 1, nombre: 'Martes' },
  { id: 2, nombre: 'Miércoles' },
  { id: 3, nombre: 'Jueves' },
  { id: 4, nombre: 'Viernes' },
  { id: 5, nombre: 'Sábado' }
])

// Matriz de reservas: [dia][hora] => []
const matrizReservas = ref<Record<string, Record<string, any[]>>>({})

/* =========================
 * CARGAR HORARIOS BASE ACTIVOS
 * ========================= */
const cargarHorariosBase = async () => {
  try {
    console.log('[Reserve] Cargando horarios base...')
    const result = await window.api.obtenerHorariosBase()
    console.log('[Reserve] Horarios recibidos:', result)
    
    // Filtrar solo los horarios activos y ordenarlos
    const horariosActivos = result
      .filter((h: any) => h.activo === 1)
      .map((h: any) => h.hora)
      .sort()
    
    horariosDisponibles.value = horariosActivos
    console.log('[Reserve] Horarios activos cargados:', horariosActivos)
  } catch (error: any) {
    console.error('[Reserve] Error cargando horarios:', error)
    // Fallback a horarios por defecto si falla
    horariosDisponibles.value = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
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
    const fechaISO = fecha.toISOString().split('T')[0]
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

    const desdeStr = lunes.toISOString().split('T')[0]
    const hastaStr = sabado.toISOString().split('T')[0]
    const rangeKey = `${desdeStr}_${hastaStr}`
    if (rangeKey !== currentRangeKey) {
      currentRangeKey = rangeKey
      isInitialLoad = true
      knownReservaIds.clear()
    }

    console.log('[Reserve] Cargando reservas desde', desdeStr, 'hasta', hastaStr)

    const nuevasReservas = await window.api.obtenerReservasSemana({ desde: desdeStr, hasta: hastaStr })
    console.log('[Reserve] Reservas recibidas:', nuevasReservas)

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

    // Inicializar matriz vacía
    const nuevaMatriz: Record<string, Record<string, any[]>> = {}
    
    fechasWeek.value.forEach(dia => {
      nuevaMatriz[dia.fecha] = {}
      horariosDisponibles.value.forEach(hora => {
        nuevaMatriz[dia.fecha][hora] = []
      })
    })

    // Llenar la matriz con reservas
    nuevasReservas.forEach((reserva: any) => {
      if (nuevaMatriz[reserva.fecha] && nuevaMatriz[reserva.fecha][reserva.hora]) {
        nuevaMatriz[reserva.fecha][reserva.hora].push({
          ...reserva,
          estado: reserva.estado || 'Pendiente'
        })
      }
    })

    matrizReservas.value = nuevaMatriz
    console.log('[Reserve] Matriz actualizada')
    isInitialLoad = false

  } catch (error: any) {
    console.error('[Reserve] Error cargando reservas:', error)
  }
}

const chequearCambiosRemotos = async () => {
  try {
    const cambios = await window.api.obtenerCambiosReservas({
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
      if (campo === 'creación' || campo === 'creacion') accion = 'creada'
      if (campo === 'eliminación' || campo === 'eliminacion') accion = 'eliminada'

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

onMounted(async () => {
  console.log('[Reserve] Inicializando vista...')
  await cargarHorariosBase()
  await cargarReservas()
  await chequearCambiosRemotos()

  const ipc = window.ipcRenderer
  if (ipc?.on) {
    const onLocalNotify = (_event: any, payload: any) => {
      const id = Number(payload?.reserva?.id || 0)
      if (id) {
        suppressUntilByReservaId.set(id, Date.now() + 10000)
      }
    }
    ipc.on('reservas:notify', onLocalNotify)
    onBeforeUnmount(() => {
      ipc.off('reservas:notify', onLocalNotify)
    })
  }
  
  console.log('[Reserve] Iniciando auto-refresh cada 5 segundos...')
  intervaloRefresco = window.setInterval(async () => {
    console.log('[Reserve] Auto-refresh: Recargando reservas...')
    await chequearCambiosRemotos()
    await cargarReservas()
  }, 5000) // Recargar cada 5 segundos
})

onBeforeUnmount(() => {
  console.log('[Reserve] Deteniendo auto-refresh...')
  if (intervaloRefresco) {
    clearInterval(intervaloRefresco)
    intervaloRefresco = null
  }
})

// Filtrado por cédula
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

const obtenerReservasEnCelda = (fecha: string, hora: string) => {
  const reservas = matrizReservas.value[fecha]?.[hora] || []
  const filtradas = reservas.filter(r => {
    if (busquedaCedula.value && !r.cedula.includes(busquedaCedula.value)) {
      return false
    }
    if (estadoFiltro.value !== 'TODOS') {
      return normalizarEstadoKey(r.estado) === estadoFiltro.value
    }
    return true
  })
  return filtradas
}

// Verificar si el horario debe mostrarse para la fecha (sábados solo hasta 12:00)
// const debeRechazoHora = (fecha: string, hora: string) => {
//   const date = new Date(fecha)
//   const esSabado = date.getDay() === 6  // 6 es sábado
//   if (esSabado && hora >= '12:00') {
//     return true  // Rechazar horarios >= 12:00 en sábados
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

const abrirVentana = (reserva: any) => {
  reservaActiva.value = { ...reserva }
  mostrarVentana.value = true
}

const manejarCierre = async () => {
  mostrarVentana.value = false
  setTimeout(() => {
    cargarReservas()
  }, 150)
}

// Función para manejar los estilos dinámicos de las tarjetas
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

const obtenerTipoResumen = (reserva: any) => {
  if (reserva.tipo_turno === 'Garantía') {
    return `Garantía${reserva.garantia_tipo ? ` - ${reserva.garantia_tipo}` : ''}`
  }
  if (reserva.tipo_turno === 'Particular') {
    return `Particular${reserva.particular_tipo ? ` - ${reserva.particular_tipo}` : ''}`
  }
  return reserva.tipo_turno || ''
}

const obtenerDetalleResumen = (reserva: any) => {
  if (reserva.tipo_turno === 'Garantía') {
    if (reserva.garantia_tipo === 'Service') {
      return reserva.garantia_numero_service ? `Service: ${reserva.garantia_numero_service}` : ''
    }
    if (reserva.garantia_tipo === 'Reparación') {
      return reserva.garantia_problema || ''
    }
  }
  if (reserva.tipo_turno === 'Particular') {
    if (reserva.particular_tipo === 'Taller') {
      return reserva.detalles || ''
    }
    return 'Mantenimiento programado'
  }
  return reserva.detalles || ''
}

</script>

<template>
  <div class="h-screen flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 bg-gray-50 dark:bg-[#0f172a] gap-4 sm:gap-5 md:gap-6 lg:gap-7 overflow-hidden">
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
              <option value="EN REVISION">En revisión</option>
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
    </header>

    <div class="flex-1 overflow-auto rounded-2xl sm:rounded-3xl md:rounded-4xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b]/50 shadow-xl custom-scrollbar">
      <table class="w-full border-collapse table-fixed">
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
          <tr v-for="hora in horariosDisponibles" :key="hora">
            <td class="p-2 sm:p-3 md:p-4 text-center border-r border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f172a]/30">
              <span class="text-[7px] sm:text-[8px] md:text-xs font-black text-gray-400 dark:text-gray-500">{{ hora }}</span>
            </td>

            <td v-for="dia in fechasWeek" :key="`${dia.fecha}-${hora}`" 
                class="p-1 sm:p-2 md:p-3 border-l border-gray-100 dark:border-gray-800/30 min-h-[80px] sm:min-h-[100px] md:min-h-[120px] align-top hover:bg-cyan-500/5 transition-colors">
              
              <div class="flex flex-col gap-1 sm:gap-2">
                <div v-for="r in obtenerReservasEnCelda(dia.fecha, hora)" :key="r.id"
                     @click="abrirVentana(r)"
                     :class="['p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95', getCardStyles(r.estado)]">
                  <div class="text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase truncate mb-1">{{ r.nombre }}</div>
                  <div class="text-[7px] sm:text-[8px] md:text-[9px] font-bold opacity-80 mb-1">
                    {{ obtenerTipoResumen(r) }}
                  </div>
                  <div v-if="obtenerDetalleResumen(r)" class="text-[7px] sm:text-[8px] md:text-[9px] opacity-70 truncate mb-1">
                    {{ obtenerDetalleResumen(r) }}
                  </div>
                  <div class="text-[7px] sm:text-[8px] md:text-[9px] font-bold opacity-80 leading-tight">
                    {{ r.marca }} {{ r.modelo }}<br/>
                    <span class="opacity-60">{{ r.cedula }}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <ReservaWindow v-if="mostrarVentana" :reserva="reservaActiva" @cerrar="manejarCierre" />
  </div>
</template>




