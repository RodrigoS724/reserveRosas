<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import ReservaWindow from '../components/reservaWindow.vue'

const semanaOffset = ref(0)
const busquedaCedula = ref('')

// Horarios: se cargarán dinámicamente desde la BD
const horariosDisponibles = ref<string[]>([])

// Intervalo para auto-refresh
let intervaloRefresco: number | null = null

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

    console.log('[Reserve] Cargando reservas desde', desdeStr, 'hasta', hastaStr)

    const nuevasReservas = await window.api.obtenerReservasSemana({ desde: desdeStr, hasta: hastaStr })
    console.log('[Reserve] Reservas recibidas:', nuevasReservas)

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

  } catch (error: any) {
    console.error('[Reserve] Error cargando reservas:', error)
  }
}

onMounted(async () => {
  console.log('[Reserve] Inicializando vista...')
  await cargarHorariosBase()
  await cargarReservas()
  
  console.log('[Reserve] Iniciando auto-refresh cada 5 segundos...')
  intervaloRefresco = window.setInterval(async () => {
    console.log('[Reserve] Auto-refresh: Recargando reservas...')
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
const obtenerReservasEnCelda = (fecha: string, hora: string) => {
  const reservas = matrizReservas.value[fecha]?.[hora] || []
  if (!busquedaCedula.value) return reservas
  return reservas.filter(r => r.cedula?.includes(busquedaCedula.value))
}

// Verificar si el horario debe mostrarse para la fecha (sábados solo hasta 12:00)
const debeRechazoHora = (fecha: string, hora: string) => {
  const date = new Date(fecha)
  const esSabado = date.getDay() === 6  // 6 es sábado
  if (esSabado && hora >= '12:00') {
    return true  // Rechazar horarios >= 12:00 en sábados
  }
  return false
}

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

// DRAG & DROP
let arrastreDatos: any = null

const iniciarArrastre = (evento: DragEvent, reserva: any) => {
  arrastreDatos = reserva
  evento.dataTransfer!.effectAllowed = 'move'
  if (evento.dataTransfer) {
    evento.dataTransfer.setData('application/json', JSON.stringify(reserva))
  }
}

const soltarEnCelda = async (evento: DragEvent, fechaDestino: string, horaDestino: string) => {
  evento.preventDefault()
  
  if (!arrastreDatos) return

  try {
    const fechaOrigen = arrastreDatos.fecha
    const horaOrigen = arrastreDatos.hora

    // Evitar soltar en el mismo lugar
    if (fechaOrigen === fechaDestino && horaOrigen === horaDestino) {
      arrastreDatos = null
      return
    }

    console.log('[Reserve] Moviendo reserva de', horaOrigen, 'en', fechaOrigen, 'a', horaDestino, 'en', fechaDestino)

    // Actualizar la reserva en el backend con todos los campos necesarios
    await window.api.actualizarReserva({
      ...arrastreDatos,
      fecha: fechaDestino,
      hora: horaDestino
    })

    console.log('[Reserve] Reserva actualizada correctamente')
    cargarReservas()
    arrastreDatos = null
  } catch (error: any) {
    console.error('[Reserve] Error moviendo reserva:', error)
    arrastreDatos = null
  }
}

// Función para manejar los estilos dinámicos de las tarjetas
const getCardStyles = (estado) => {
  const styles = {
    'PENDIENTE': 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400',
    'PRONTO': 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400',
    'CANCELADO': 'bg-rose-50 dark:bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400',
    'EN PROCESO': 'bg-sky-50 dark:bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-400',
  };
  return styles[estado?.toUpperCase()] || 'bg-gray-50 dark:bg-gray-500/10 border-gray-400 text-gray-700 dark:text-gray-400';
};

</script>

<template>
  <div class="h-screen flex flex-col p-6 bg-gray-50 dark:bg-[#0f172a] gap-6 overflow-hidden">
    <header class="flex justify-between items-end">
      <div class="space-y-4">
        <h2 class="text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
          CALENDARIO <span class="text-cyan-600">SEMANAL</span>
        </h2>
        <div class="relative group">
          <input 
            v-model="busquedaCedula" 
            placeholder="Buscar por CI..." 
            class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-6 text-gray-700 dark:text-gray-200 w-80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium shadow-sm" 
          />
        </div>
      </div>

      <div class="flex bg-white dark:bg-[#1e293b] p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <button @click="cambiarSemana(-1)" class="px-5 py-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold text-xs uppercase tracking-widest">Anterior</button>
        <button @click="semanaOffset = 0; cargarReservas()" class="px-6 py-2.5 rounded-xl bg-cyan-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Hoy</button>
        <button @click="cambiarSemana(1)" class="px-5 py-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold text-xs uppercase tracking-widest">Siguiente</button>
      </div>
    </header>

    <div class="flex-1 overflow-auto rounded-[24px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b]/50 shadow-xl custom-scrollbar">
      <table class="w-full border-collapse table-fixed">
        <thead class="sticky top-0 z-20 bg-white dark:bg-[#1e293b]">
          <tr>
            <th class="w-24 p-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800">Hora</th>
            <th v-for="dia in fechasWeek" :key="dia.fecha" class="p-4 border-b border-gray-200 dark:border-gray-800 border-l border-gray-100 dark:border-gray-800/50">
              <div class="flex flex-col items-center">
                <span class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">{{ dia.nombre }}</span>
                <span class="text-lg font-black text-gray-800 dark:text-gray-100">{{ dia.fecha.split('-')[2] }}</span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 dark:divide-gray-800/50">
          <tr v-for="hora in horariosDisponibles" :key="hora">
            <td class="p-4 text-center border-r border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#0f172a]/30">
              <span class="text-xs font-black text-gray-400 dark:text-gray-500">{{ hora }}</span>
            </td>

            <td v-for="dia in fechasWeek" :key="`${dia.fecha}-${hora}`" 
                class="p-2 border-l border-gray-100 dark:border-gray-800/30 min-h-[100px] align-top hover:bg-cyan-500/5 transition-colors"
                @dragover.prevent @drop="soltarEnCelda($event, dia.fecha, hora)">
              
              <div class="flex flex-col gap-2">
                <div v-for="r in obtenerReservasEnCelda(dia.fecha, hora)" :key="r.id"
                     @click="abrirVentana(r)"
                     draggable="true" @dragstart="iniciarArrastre($event, r)"
                     :class="['p-3 rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95', getCardStyles(r.estado)]">
                  <div class="text-[10px] font-black uppercase truncate mb-1">{{ r.nombre }}</div>
                  <div class="text-[9px] font-bold opacity-80 leading-tight">
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
