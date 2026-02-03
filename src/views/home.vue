<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- ESTADO DEL CALENDARIO ---
const hoy = new Date() // Fecha real del sistema
const mesVisual = ref(hoy.getMonth())
const anioVisual = ref(hoy.getFullYear())

const nombresMeses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// --- LÓGICA DE NAVEGACIÓN ---
const mesSiguiente = () => {
  if (mesVisual.value === 11) {
    mesVisual.value = 0
    anioVisual.value++
  } else {
    mesVisual.value++
  }
}

const mesAnterior = () => {
  if (mesVisual.value === 0) {
    mesVisual.value = 11
    anioVisual.value--
  } else {
    mesVisual.value--
  }
}

// --- GENERACIÓN DE DÍAS (Estilo Windows) ---
const diasCalendario = computed(() => {
  const dias = []
  const primerDiaSemana = new Date(anioVisual.value, mesVisual.value, 1).getDay()
  const ultimoDiaMesPasado = new Date(anioVisual.value, mesVisual.value, 0).getDate()
  const diasEnMes = new Date(anioVisual.value, mesVisual.value + 1, 0).getDate()

  // Relleno mes anterior
  for (let i = primerDiaSemana - 1; i >= 0; i--) {
    dias.push({ numero: ultimoDiaMesPasado - i, actual: false })
  }
  // Mes actual
  for (let i = 1; i <= diasEnMes; i++) {
    dias.push({ numero: i, actual: true })
  }
  return dias
})

// --- LÓGICA DE SELECCIÓN ---
const diaSeleccionado = ref<number | null>(null)
const horaSeleccionada = ref<string | null>(null)
const horariosDisponibles = ref<string[]>([])
const cargandoHorarios = ref(false)

// Horarios base que se mostrarán si la API falla
const horariosPorDefecto = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

const esDiaDisponible = (dia: number, esMesActual: boolean) => {
  if (!esMesActual) return false
  const fecha = new Date(anioVisual.value, mesVisual.value, dia)
  const numeroDiaSemana = fecha.getDay()
  
  // Limpiar horas de hoy para comparar solo fechas
  const soloHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  if (fecha < soloHoy) return false // No pasados
  if (numeroDiaSemana === 0) return false // Domingos no
  
  return true
}

const obtenerClasesDia = (diaObj: any) => {
  const { numero, actual } = diaObj
  const disponible = esDiaDisponible(numero, actual)
  const seleccionado = diaSeleccionado.value === numero && actual
  
  // Comparar si es hoy exactamente
  const esHoy = actual && 
                numero === hoy.getDate() && 
                mesVisual.value === hoy.getMonth() && 
                anioVisual.value === hoy.getFullYear()

  return [
    'aspect-square flex items-center justify-center text-sm rounded-full transition-all mx-1 relative mb-1',
    seleccionado ? 'bg-cyan-600 text-white font-bold shadow-lg z-10 scale-110' : '',
    !actual ? 'text-gray-300 dark:text-gray-700 pointer-events-none' : '',
    actual && disponible ? 'cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/30' : '',
    actual && !disponible ? 'cursor-not-allowed text-gray-300 dark:text-gray-600 opacity-40' : '',
    esHoy && !seleccionado ? 'ring-2 ring-cyan-500/50' : ''
  ].join(' ')
}

// Cargar horarios disponibles cuando cambia el día seleccionado
watch(diaSeleccionado, async (nuevoDia) => {
  if (!nuevoDia) {
    horariosDisponibles.value = []
    horaSeleccionada.value = null
    return
  }

  cargandoHorarios.value = true
  try {
    // Construir la fecha en formato ISO
    const fechaStr = `${anioVisual.value}-${String(mesVisual.value + 1).padStart(2, '0')}-${String(nuevoDia).padStart(2, '0')}`
    console.log('[Home] Cargando horarios para fecha:', fechaStr)

    const horarios = await window.api.obtenerHorariosDisponibles(fechaStr)
    console.log('[Home] Horarios disponibles:', horarios)

    // Extraer solo las horas
    horariosDisponibles.value = horarios.map((h: any) => h.hora)

    // Si no hay horarios, usar los por defecto (para debugging)
    if (horariosDisponibles.value.length === 0) {
      console.warn('[Home] No hay horarios disponibles, usando por defecto')
      horariosDisponibles.value = horariosPorDefecto
    }

    horaSeleccionada.value = null
  } catch (error) {
    console.error('[Home] Error cargando horarios:', error)
    // Fallback a horarios por defecto
    horariosDisponibles.value = horariosPorDefecto
  } finally {
    cargandoHorarios.value = false
  }
})

const irAFormulario = () => {
  if (!horaSeleccionada.value || !diaSeleccionado.value) return
  router.push({ 
    path: '/confirmacion', 
    query: { 
      fecha: `${anioVisual.value}-${String(mesVisual.value + 1).padStart(2, '0')}-${String(diaSeleccionado.value).padStart(2, '0')}`, 
      hora: horaSeleccionada.value 
    } 
  })
}
</script>

<template>
  <div class="w-full h-full overflow-y-auto custom-scrollbar max-w-full 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div class="bg-white dark:bg-[#1e293b] rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex overflow-hidden min-h-[500px] sm:min-h-[550px] md:min-h-[600px] lg:min-h-[650px] xl:min-h-[700px]">
      
      <div class="w-full lg:w-7/12 p-4 sm:p-6 md:p-8 lg:p-10">
        <div class="flex items-center justify-between mb-6 sm:mb-8 md:mb-10">
          <div>
            <h3 class="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-gray-800 dark:text-white leading-none">
              {{ nombresMeses[mesVisual] }}
            </h3>
            <p class="text-xs sm:text-sm text-gray-400 font-medium mt-1">{{ anioVisual }}</p>
          </div>
          <div class="flex gap-1 sm:gap-2">
            <button @click="mesAnterior" class="p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg sm:rounded-2xl text-gray-500 transition-colors">‹</button>
            <button @click="mesSiguiente" class="p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg sm:rounded-2xl text-gray-500 transition-colors">›</button>
          </div>
        </div>
        
        <div class="grid grid-cols-7 text-center mb-4 sm:mb-5 md:mb-6">
          <div v-for="d in ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']" :key="d" 
               class="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[11px] font-black text-gray-400 tracking-widest uppercase">
            {{ d }}
          </div>
        </div>

        <div class="grid grid-cols-7 text-center gap-y-1 sm:gap-y-2">
          <div v-for="(dia, index) in diasCalendario" :key="index" 
            @click="esDiaDisponible(dia.numero, dia.actual) ? diaSeleccionado = dia.numero : null"
            :class="obtenerClasesDia(dia)">
            {{ dia.numero }}
          </div>
        </div>
      </div>

      <div class="w-full lg:w-5/12 bg-gray-50/50 dark:bg-[#0f172a]/20 p-4 sm:p-6 md:p-8 lg:p-10 border-l border-gray-100 dark:border-gray-800 flex flex-col">
        <div v-if="diaSeleccionado">
          <h4 class="text-[10px] sm:text-xs md:text-sm font-black text-gray-400 uppercase tracking-widest mb-4 sm:mb-5 md:mb-6">Horarios para el día {{ diaSeleccionado }}</h4>
          <div v-if="cargandoHorarios" class="flex items-center justify-center py-8">
            <div class="text-gray-400 text-xs sm:text-sm">Cargando horarios...</div>
          </div>
          <div v-else-if="horariosDisponibles.length > 0" class="space-y-2 sm:space-y-3 max-h-[300px] sm:max-h-[350px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <button v-for="h in horariosDisponibles" :key="h"
              @click="horaSeleccionada = h"
              :class="[
                'w-full p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-2xl md:rounded-3xl border transition-all text-xs sm:text-sm font-bold',
                horaSeleccionada === h 
                  ? 'bg-cyan-600 border-transparent text-white shadow-xl scale-[1.03]' 
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-cyan-400 hover:shadow-sm'
              ]">
              {{ h }} hs
            </button>
          </div>
          <div v-else class="text-center py-6 sm:py-8">
            <p class="text-gray-400 text-xs sm:text-sm">No hay horarios disponibles para este día</p>
          </div>
          <button @click="irAFormulario" 
                  :disabled="!horaSeleccionada"
                  :class="[!horaSeleccionada ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyan-700 shadow-cyan-500/20 shadow-xl active:scale-95']"
                  class="mt-6 sm:mt-7 md:mt-8 w-full bg-cyan-600 text-white font-black py-4 sm:py-4.5 md:py-5 rounded-lg sm:rounded-2xl md:rounded-3xl transition-all uppercase tracking-widest text-xs sm:text-sm">
            Confirmar Turno
          </button>
        </div>
        <div v-else class="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-6 text-gray-400">
          <div class="text-3xl sm:text-4xl mb-3 sm:mb-4">📅</div>
          <p class="text-xs sm:text-sm font-medium">Seleccione un día disponible para ver los horarios</p>
        </div>
      </div>
    </div>
  </div>
      <div class="bg-white rounded-lg shadow-md p-4 w-full max-w-lg mx-auto flex flex-col items-center">
        <div class="mb-4">
          <h2 class="text-2xl font-bold text-gray-800">Agenda</h2>
        </div>
        <div class="w-full h-[400px]">
          <CalendarComponent />
        </div>
      </div>
</template>