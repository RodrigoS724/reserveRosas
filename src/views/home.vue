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
  <div class="max-w-6xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div class="bg-white dark:bg-[#1e293b] rounded-[32px] shadow-2xl border border-gray-200 dark:border-gray-800 flex overflow-hidden min-h-[620px]">
      
      <div class="w-7/12 p-10">
        <div class="flex items-center justify-between mb-10">
          <div>
            <h3 class="text-2xl font-black text-gray-800 dark:text-white leading-none">
              {{ nombresMeses[mesVisual] }}
            </h3>
            <p class="text-gray-400 font-medium mt-1">{{ anioVisual }}</p>
          </div>
          <div class="flex gap-2">
            <button @click="mesAnterior" class="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl text-gray-500 transition-colors">‹</button>
            <button @click="mesSiguiente" class="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl text-gray-500 transition-colors">›</button>
          </div>
        </div>
        
        <div class="grid grid-cols-7 text-center mb-6">
          <div v-for="d in ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']" :key="d" 
               class="text-[11px] font-black text-gray-400 tracking-widest uppercase">
            {{ d }}
          </div>
        </div>

        <div class="grid grid-cols-7 text-center gap-y-2">
          <div v-for="(dia, index) in diasCalendario" :key="index" 
            @click="esDiaDisponible(dia.numero, dia.actual) ? diaSeleccionado = dia.numero : null"
            :class="obtenerClasesDia(dia)">
            {{ dia.numero }}
          </div>
        </div>
      </div>

      <div class="w-5/12 bg-gray-50/50 dark:bg-[#0f172a]/20 p-10 border-l border-gray-100 dark:border-gray-800 flex flex-col">
        <div v-if="diaSeleccionado">
          <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Horarios para el día {{ diaSeleccionado }}</h4>
          <div v-if="cargandoHorarios" class="flex items-center justify-center py-8">
            <div class="text-gray-400 text-sm">Cargando horarios...</div>
          </div>
          <div v-else-if="horariosDisponibles.length > 0" class="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <button v-for="h in horariosDisponibles" :key="h"
              @click="horaSeleccionada = h"
              :class="[
                'w-full p-4 rounded-2xl border transition-all text-sm font-bold',
                horaSeleccionada === h 
                  ? 'bg-cyan-600 border-transparent text-white shadow-xl scale-[1.03]' 
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-cyan-400 hover:shadow-sm'
              ]">
              {{ h }} hs
            </button>
          </div>
          <div v-else class="text-center py-8">
            <p class="text-gray-400 text-sm">No hay horarios disponibles para este día</p>
          </div>
          <button @click="irAFormulario" 
                  :disabled="!horaSeleccionada"
                  :class="[!horaSeleccionada ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyan-700 shadow-cyan-500/20 shadow-xl active:scale-95']"
                  class="mt-8 w-full bg-cyan-600 text-white font-black py-5 rounded-2xl transition-all uppercase tracking-widest">
            Confirmar Turno
          </button>
        </div>
        <div v-else class="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
          <div class="text-4xl mb-4">📅</div>
          <p class="text-sm font-medium">Seleccione un día disponible para ver los horarios</p>
        </div>
      </div>
    </div>
  </div>
</template>