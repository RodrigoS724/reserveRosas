<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'

/* =========================
 * ESTADO
 * ========================= */
const reservas = ref<any[]>([])
const filtroTexto = ref('')
const fechaDesde = ref('')
const fechaHasta = ref('')
const estadoFiltro = ref('TODOS')
const cargando = ref(false)

function normalizarEstadoKey(estado?: string) {
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

function formatearEstado(estado?: string) {
  const key = normalizarEstadoKey(estado)
  if (key === 'PENDIENTE REPUESTOS') return 'Pendiente repuestos'
  if (key === 'EN REVISION') return 'En revisión'
  if (key === 'EN PROCESO') return 'En proceso'
  if (key === 'CANCELADO') return 'Cancelado'
  if (key === 'PRONTO') return 'Pronto'
  return 'Pendiente'
}

const reservasFiltradas = computed(() => {
  return reservas.value.filter(r => {
    // Filtro por búsqueda CI/Nombre
    if (filtroTexto.value) {
      const search = filtroTexto.value.toLowerCase()
      const nombre = r.nombre?.toLowerCase() || ''
      const cedula = r.cedula?.toLowerCase() || ''
      if (!nombre.includes(search) && !cedula.includes(search)) {
        return false
      }
    }

    // Filtro por fecha desde
    if (fechaDesde.value) {
      if (r.fecha < fechaDesde.value) return false
    }

    // Filtro por fecha hasta
    if (fechaHasta.value) {
      if (r.fecha > fechaHasta.value) return false
    }

    if (estadoFiltro.value !== 'TODOS') {
      return normalizarEstadoKey(r.estado) === estadoFiltro.value
    }

    return true
  })
})

// Modal de notas
const mostrarModalNotas = ref(false)
const reservaActual = ref<any>(null)
const notasActuales = ref('')
const modoEdicion = ref(false)

// Intervalo para auto-refresh
let intervaloRefresco: number | null = null
const cargarReservas = async () => {
  cargando.value = true
  try {
    console.log('[Historial] Cargando todas las reservas...')
    const result = await window.api.obtenerTodasLasReservas()
    console.log('[Historial] Reservas recibidas:', result)
    
    // Ordenar por fecha descendente (más recientes primero)
    reservas.value = (result || []).sort((a: any, b: any) => {
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    })
    
    console.log('[Historial] Total de reservas:', reservas.value.length)
  } catch (error: any) {
    console.error('[Historial] Error cargando reservas:', error)
    alert('Error cargando reservas')
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  console.log('[Historial] Inicializando vista...')
  cargarReservas()
  
  console.log('[Historial] Iniciando auto-refresh cada 5 segundos...')
  intervaloRefresco = window.setInterval(async () => {
    console.log('[Historial] Auto-refresh: Recargando reservas...')
    await cargarReservas()
  }, 5000) // Recargar cada 5 segundos
})

onBeforeUnmount(() => {
  console.log('[Historial] Deteniendo auto-refresh...')
  if (intervaloRefresco) {
    clearInterval(intervaloRefresco)
    intervaloRefresco = null
  }
})

/* =========================
 * ACCIONES DE NOTAS
 * ========================= */
const abrirModalNotas = (reserva: any) => {
  reservaActual.value = { ...reserva }
  notasActuales.value = reserva.notas || ''
  modoEdicion.value = false
  mostrarModalNotas.value = true
}

const guardarNotas = async () => {
  if (!reservaActual.value) return

  try {
    console.log('[Historial] Guardando notas para reserva:', reservaActual.value.id)
    await window.api.actualizarNotasReserva(reservaActual.value.id, notasActuales.value)
    console.log('[Historial] Notas guardadas exitosamente')

    // Actualizar en la lista local
    const index = reservas.value.findIndex(r => r.id === reservaActual.value.id)
    if (index !== -1) {
      reservas.value[index].notas = notasActuales.value
    }

    mostrarModalNotas.value = false
    alert('Notas guardadas exitosamente')
  } catch (error: any) {
    console.error('[Historial] Error guardando notas:', error)
    alert('Error guardando notas')
  }
}

const cerrarModalNotas = () => {
  mostrarModalNotas.value = false
  reservaActual.value = null
  notasActuales.value = ''
  modoEdicion.value = false
}

const habilitarEdicion = () => {
  modoEdicion.value = true
}

/* =========================
 * UTILIDADES
 * ========================= */
const formatearFecha = (fecha: string) => {
  const date = new Date(fecha)
  return date.toLocaleDateString('es-UY', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const obtenerTipoResumen = (reserva: any) => {
  if (reserva?.tipo_turno === 'Garantía') {
    return `Garantía${reserva.garantia_tipo ? ` - ${reserva.garantia_tipo}` : ''}`
  }
  if (reserva?.tipo_turno === 'Particular') {
    return `Particular${reserva.particular_tipo ? ` - ${reserva.particular_tipo}` : ''}`
  }
  return reserva?.tipo_turno || ''
}

const obtenerDetalleResumen = (reserva: any) => {
  if (reserva?.tipo_turno === 'Garantía') {
    if (reserva.garantia_tipo === 'Service') {
      return reserva.garantia_numero_service ? `Service: ${reserva.garantia_numero_service}` : ''
    }
    if (reserva.garantia_tipo === 'Reparación') {
      return reserva.garantia_problema || ''
    }
  }
  if (reserva?.tipo_turno === 'Particular') {
    if (reserva.particular_tipo === 'Taller') {
      return reserva.detalles || ''
    }
    return 'Mantenimiento programado'
  }
  return reserva?.detalles || ''
}

const exportarACSV = () => {
  if (reservasFiltradas.value.length === 0) {
    alert('No hay reservas para exportar')
    return
  }

  // Crear encabezados
  const headers = [
    'ID', 'Nombre', 'CI', 'Teléfono', 'Marca', 'Modelo', 'Km', 'Matrícula',
    'Tipo', 'Tipo Particular', 'Tipo Garantía', 'Fecha Compra', 'N° Service', 'Problema',
    'Fecha', 'Hora', 'Estado', 'Notas'
  ]
  
  // Crear filas
  const rows = reservasFiltradas.value.map(r => [
    r.id,
    r.nombre,
    r.cedula,
    r.telefono,
    r.marca,
    r.modelo,
    r.km,
    r.matricula,
    r.tipo_turno,
    r.particular_tipo || '',
    r.garantia_tipo || '',
    r.garantia_fecha_compra || '',
    r.garantia_numero_service || '',
    r.garantia_problema || '',
    r.fecha,
    r.hora,
    r.estado,
    r.notas || ''
  ])

  // Combinar
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

  // Descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `historial-reservas-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const getBadgeStyles = (estado: string) => {
  const styles = {
    'PENDIENTE': 'bg-amber-50 dark:bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    'PENDIENTE REPUESTOS': 'bg-orange-50 dark:bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
    'PRONTO': 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    'CANCELADO': 'bg-rose-50 dark:bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400',
    'EN PROCESO': 'bg-sky-50 dark:bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400',
    'EN REVISION': 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
  };
  const key = normalizarEstadoKey(estado)
  return styles[key as keyof typeof styles] || 'bg-gray-50 dark:bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-gray-400';
};
</script>

<template>
  <div class="h-screen flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 bg-gray-50 dark:bg-[#0f172a] gap-4 sm:gap-5 md:gap-6 lg:gap-7 overflow-hidden">
    <header class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-black text-gray-800 dark:text-white tracking-tighter">Historial</h1>
        <p class="text-gray-500 dark:text-gray-400 font-medium">Registro completo de reservas y servicios</p>
      </div>
      <button @click="cargarReservas" class="bg-white dark:bg-[#1e293b] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 transition-all font-bold text-sm md:text-base shadow-sm">
        {{ cargando ? 'Cargando...' : '🔄 Actualizar' }}
      </button>
    </header>

    <div class="bg-white dark:bg-[#1e293b] p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-center gap-3 md:gap-4 shadow-sm">
      <input v-model="filtroTexto" type="text" placeholder="Buscar por nombre o CI..." 
             class="flex-1 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 rounded-lg sm:rounded-xl md:rounded-2xl py-2 sm:py-2.5 px-3 sm:px-4 text-xs sm:text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
      
      <div class="flex items-center gap-3 md:gap-4 px-2 md:px-4 border-l border-gray-100 dark:border-gray-800">
        <input v-model="fechaDesde" type="date" class="bg-transparent text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 outline-none" />
        <span class="text-gray-300">→</span>
        <input v-model="fechaHasta" type="date" class="bg-transparent text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 outline-none" />
      </div>

      <div class="flex items-center gap-2 px-2 md:px-4 border-l border-gray-100 dark:border-gray-800">
        <span class="text-[10px] uppercase tracking-widest text-gray-400 font-black">Estado</span>
        <select v-model="estadoFiltro"
          class="bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 rounded-lg sm:rounded-xl px-3 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">
          <option value="TODOS">Todos</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="PENDIENTE REPUESTOS">Pendiente repuestos</option>
          <option value="EN REVISION">En revisión</option>
          <option value="PRONTO">Pronto</option>
          <option value="EN PROCESO">En proceso</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      <button @click="exportarACSV" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl md:rounded-2xl font-black text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-700/20">
        Exportar CSV
      </button>
    </div>

    <div class="flex-1 overflow-hidden bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl md:rounded-4xl flex flex-col shadow-sm">
      <div class="overflow-auto flex-1 custom-scrollbar">
        <table class="w-full text-left border-separate border-spacing-0">
          <thead class="sticky top-0 z-10 bg-gray-50 dark:bg-[#1e293b] border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th class="p-3 sm:p-4 md:p-5 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Cliente / CI</th>
              <th class="p-3 sm:p-4 md:p-5 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Vehículo / KM</th>
              <th class="p-3 sm:p-4 md:p-5 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Turno</th>
              <th class="p-3 sm:p-4 md:p-5 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Estado</th>
              <th class="p-3 sm:p-4 md:p-5 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Notas</th>
              <th class="p-3 sm:p-4 md:p-5 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="r in reservasFiltradas" :key="r.id" class="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <td class="p-3 sm:p-4 md:p-5">
                <div class="flex flex-col">
                  <span class="text-xs sm:text-sm font-black text-gray-800 dark:text-gray-100">{{ r.nombre }}</span>
                  <span class="text-[8px] sm:text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400 font-bold">{{ r.cedula }} • {{ r.telefono }}</span>
                </div>
              </td>
              <td class="p-3 sm:p-4 md:p-5">
                <div class="flex flex-col">
                  <span class="text-[10px] sm:text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300">{{ r.marca }} {{ r.modelo }}</span>
                  <span class="text-[7px] sm:text-[8px] md:text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase">{{ r.matricula }} • {{ r.km }} KM</span>
                </div>
              </td>
              <td class="p-3 sm:p-4 md:p-5 text-center">
                <div class="inline-flex flex-col bg-gray-100 dark:bg-[#0f172a] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl md:rounded-2xl border border-gray-200 dark:border-gray-800">
                  <span class="text-[8px] sm:text-xs font-black text-cyan-600">{{ obtenerTipoResumen(r) }}</span>
                  <span v-if="obtenerDetalleResumen(r)" class="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500">
                    {{ obtenerDetalleResumen(r) }}
                  </span>
                  <span class="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-gray-400">{{ formatearFecha(r.fecha) }}</span>
                  <span class="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-gray-400">{{ r.hora }} hs</span>
                </div>
              </td>
              <td class="p-3 sm:p-4 md:p-5">
                <span :class="['px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-widest border', getBadgeStyles(r.estado)]">
                  {{ formatearEstado(r.estado) }}
                </span>
              </td>
              <td class="p-3 sm:p-4 md:p-5 max-w-[150px] lg:max-w-[200px]">
                <p class="text-[8px] sm:text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400 italic truncate">
                  {{ r.notas || 'Sin notas' }}
                </p>
              </td>
              <td class="p-3 sm:p-4 md:p-5 text-right">
                <button @click="abrirModalNotas(r)" class="bg-cyan-600 hover:bg-cyan-700 text-white px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg sm:rounded-xl md:rounded-2xl text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-cyan-600/20">
                   Ver Notas
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="mostrarModalNotas" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-xl sm:rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="p-6 sm:p-7 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start">
          <div>
            <h2 class="text-lg sm:text-xl md:text-2xl font-black text-gray-800 dark:text-white">Notas de Reserva</h2>
            <p class="text-xs sm:text-sm text-gray-500 mt-1">{{ reservaActual?.nombre }} • CI: {{ reservaActual?.cedula }}</p>
          </div>
          <button @click="cerrarModalNotas" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div class="p-6 sm:p-7 md:p-8">
          <textarea 
            v-model="notasActuales" 
            :readonly="!modoEdicion && reservaActual?.notas"
            placeholder="Escribe los detalles aquí..." 
            class="w-full h-40 sm:h-44 md:h-48 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none font-medium"
            :class="{ 'opacity-70 cursor-not-allowed': !modoEdicion && reservaActual?.notas }"
          ></textarea>
        </div>
        <div class="p-6 sm:p-7 md:p-8 bg-gray-50/50 dark:bg-black/20 flex justify-end gap-3">
          <button @click="cerrarModalNotas" class="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl md:rounded-2xl font-bold text-gray-500 text-xs sm:text-sm">Cancelar</button>
          <button v-if="!modoEdicion && reservaActual?.notas" @click="habilitarEdicion" class="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-amber-500 text-white rounded-lg sm:rounded-xl md:rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20">Editar</button>
          <button @click="guardarNotas" class="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg sm:rounded-xl md:rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-cyan-600/20 transition-all">
            {{ modoEdicion ? 'Guardar Cambios' : 'Guardar Notas' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
