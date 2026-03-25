<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'

const router = useRouter()

const MAX_DAYS_AHEAD = 21

const mesVisual = ref(0)
const anioVisual = ref(0)
const diaSeleccionado = ref<number | null>(null)
const horaSeleccionada = ref<string | null>(null)
const horariosDisponibles = ref<string[]>([])
const cargandoHorarios = ref(false)
const cargandoDisponibilidad = ref(false)
const availabilityCache = ref<Record<string, boolean>>({})

const nombresMeses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const getReservaMinDateTime = () => {
  return new Date()
}

const startOfDay = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const getMinCalendarDate = () => startOfDay(getReservaMinDateTime())

const getMaxCalendarDate = () => {
  const d = getMinCalendarDate()
  d.setDate(d.getDate() + MAX_DAYS_AHEAD)
  return d
}

const formatFechaISO = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const buildDateFromParts = (year: number, month: number, day: number) => {
  return new Date(year, month, day, 0, 0, 0, 0)
}

const isSunday = (date: Date) => date.getDay() === 0

const isDateInRange = (date: Date) => {
  return date >= getMinCalendarDate() && date <= getMaxCalendarDate()
}

const horaToMinutes = (hora: string) => {
  const [hh, mm] = String(hora).split(':').map(Number)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  return hh * 60 + mm
}

const isHoraPermitida = (fechaIso: string, hora: string) => {
  const mins = horaToMinutes(hora)
  if (mins === null) return false
  const [y, m, d] = fechaIso.split('-').map(Number)
  const hh = Math.floor(mins / 60)
  const mm = mins % 60
  const reservaDate = new Date(y, m - 1, d, hh, mm, 0, 0)
  return reservaDate.getTime() >= getReservaMinDateTime().getTime()
}

const mesSiguiente = () => {
  if (mesVisual.value === 11) {
    mesVisual.value = 0
    anioVisual.value++
    return
  }
  mesVisual.value++
}

const mesAnterior = () => {
  if (mesVisual.value === 0) {
    mesVisual.value = 11
    anioVisual.value--
    return
  }
  mesVisual.value--
}

const diasCalendario = computed(() => {
  const dias: Array<{ numero: number; actual: boolean }> = []
  const primerDiaSemana = new Date(anioVisual.value, mesVisual.value, 1).getDay()
  const ultimoDiaMesPasado = new Date(anioVisual.value, mesVisual.value, 0).getDate()
  const diasEnMes = new Date(anioVisual.value, mesVisual.value + 1, 0).getDate()

  for (let i = primerDiaSemana - 1; i >= 0; i--) {
    dias.push({ numero: ultimoDiaMesPasado - i, actual: false })
  }
  for (let i = 1; i <= diasEnMes; i++) {
    dias.push({ numero: i, actual: true })
  }
  return dias
})

const fechaSeleccionadaIso = computed(() => {
  if (!diaSeleccionado.value) return ''
  return `${anioVisual.value}-${String(mesVisual.value + 1).padStart(2, '0')}-${String(diaSeleccionado.value).padStart(2, '0')}`
})

const consultarDisponibilidadFecha = async (iso: string) => {
  try {
    const horarios = await api.obtenerHorariosDisponibles(iso)
    const filtrados = (horarios || [])
      .map((h: any) => h.hora)
      .filter((h: string) => isHoraPermitida(iso, h))
    return filtrados.length > 0
  } catch {
    return false
  }
}

const cargarDisponibilidadMes = async () => {
  if (cargandoDisponibilidad.value) return
  cargandoDisponibilidad.value = true
  try {
    const y = anioVisual.value
    const m = mesVisual.value
    const diasEnMes = new Date(y, m + 1, 0).getDate()
    const pendientes: string[] = []

    for (let day = 1; day <= diasEnMes; day++) {
      const d = new Date(y, m, day)
      const iso = formatFechaISO(d)
      if (!isDateInRange(d) || isSunday(d)) {
        availabilityCache.value[iso] = false
        continue
      }
      if (typeof availabilityCache.value[iso] !== 'undefined') continue
      pendientes.push(iso)
    }

    const chunkSize = 5
    for (let i = 0; i < pendientes.length; i += chunkSize) {
      const chunk = pendientes.slice(i, i + chunkSize)
      const results = await Promise.all(chunk.map((iso) => consultarDisponibilidadFecha(iso)))
      for (let j = 0; j < chunk.length; j++) {
        availabilityCache.value[chunk[j]] = results[j]
      }
    }
  } finally {
    cargandoDisponibilidad.value = false
  }
}

const seleccionarPrimerDiaDisponible = async () => {
  const maxDate = getMaxCalendarDate()
  const d = getMinCalendarDate()

  while (d <= maxDate) {
    if (!isSunday(d)) {
      const iso = formatFechaISO(d)
      if (typeof availabilityCache.value[iso] === 'undefined') {
        availabilityCache.value[iso] = await consultarDisponibilidadFecha(iso)
      }
      if (availabilityCache.value[iso]) {
        anioVisual.value = d.getFullYear()
        mesVisual.value = d.getMonth()
        diaSeleccionado.value = d.getDate()
        return
      }
    }
    d.setDate(d.getDate() + 1)
  }

  anioVisual.value = getMinCalendarDate().getFullYear()
  mesVisual.value = getMinCalendarDate().getMonth()
  diaSeleccionado.value = null
}

const esDiaDisponible = (dia: number, esMesActual: boolean) => {
  if (!esMesActual) return false
  const fecha = buildDateFromParts(anioVisual.value, mesVisual.value, dia)
  if (!isDateInRange(fecha)) return false
  if (isSunday(fecha)) return false
  const iso = formatFechaISO(fecha)
  return availabilityCache.value[iso] !== false
}

const obtenerClasesDia = (diaObj: { numero: number; actual: boolean }) => {
  const { numero, actual } = diaObj
  const disponible = esDiaDisponible(numero, actual)
  const seleccionado = diaSeleccionado.value === numero && actual

  return [
    'aspect-square flex items-center justify-center text-sm rounded-full transition-all mx-1 relative mb-1',
    seleccionado ? 'bg-emerald-600 text-white font-bold shadow-lg z-10 scale-110' : '',
    !actual ? 'text-gray-300 dark:text-gray-700 pointer-events-none' : '',
    actual && disponible ? 'cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : '',
    actual && !disponible ? 'cursor-not-allowed text-gray-300 dark:text-gray-600 opacity-40' : ''
  ].join(' ')
}

const cargarHorariosSeleccionados = async () => {
  if (!diaSeleccionado.value || !fechaSeleccionadaIso.value) {
    horariosDisponibles.value = []
    horaSeleccionada.value = null
    return
  }

  cargandoHorarios.value = true
  try {
    const horarios = await api.obtenerHorariosDisponibles(fechaSeleccionadaIso.value)
    const horas = (horarios || [])
      .map((h: any) => h.hora)
      .filter((h: string) => isHoraPermitida(fechaSeleccionadaIso.value, h))
    horariosDisponibles.value = horas
    horaSeleccionada.value = null
    availabilityCache.value[fechaSeleccionadaIso.value] = horas.length > 0
  } catch (error) {
    console.error('[Home] Error cargando horarios:', error)
    horariosDisponibles.value = []
    horaSeleccionada.value = null
    availabilityCache.value[fechaSeleccionadaIso.value] = false
  } finally {
    cargandoHorarios.value = false
  }
}

const seleccionarDia = (dia: number, actual: boolean) => {
  if (!esDiaDisponible(dia, actual)) return
  diaSeleccionado.value = dia
}

const irAFormulario = () => {
  if (!horaSeleccionada.value || !diaSeleccionado.value) return
  router.push({
    path: '/confirmacion',
    query: {
      fecha: fechaSeleccionadaIso.value,
      hora: horaSeleccionada.value
    }
  })
}

watch(diaSeleccionado, () => {
  cargarHorariosSeleccionados()
})

watch([mesVisual, anioVisual], async () => {
  await cargarDisponibilidadMes()
})

onMounted(async () => {
  await seleccionarPrimerDiaDisponible()
  await cargarDisponibilidadMes()
  await cargarHorariosSeleccionados()
})
</script>

<template>
  <div class="w-full h-full overflow-y-auto custom-scrollbar max-w-full 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div class="bg-white dark:bg-[#1e293b] rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl border border-emerald-100 dark:border-gray-800 flex overflow-hidden min-h-[500px] sm:min-h-[550px] md:min-h-[600px] lg:min-h-[650px] xl:min-h-[700px]">
      <div class="w-full lg:w-7/12 p-4 sm:p-6 md:p-8 lg:p-10">
        <div class="flex items-center justify-between mb-6 sm:mb-8 md:mb-10">
          <div>
            <h3 class="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-emerald-900 dark:text-emerald-200 leading-none">
              {{ nombresMeses[mesVisual] }}
            </h3>
            <p class="text-xs sm:text-sm text-emerald-600/70 dark:text-emerald-300/70 font-medium mt-1">{{ anioVisual }}</p>
          </div>
          <div class="flex gap-1 sm:gap-2">
            <button @click="mesAnterior" class="p-2 sm:p-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg sm:rounded-2xl text-emerald-700 dark:text-emerald-300 transition-colors">‹</button>
            <button @click="mesSiguiente" class="p-2 sm:p-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg sm:rounded-2xl text-emerald-700 dark:text-emerald-300 transition-colors">›</button>
          </div>
        </div>

        <div class="grid grid-cols-7 text-center mb-4 sm:mb-5 md:mb-6">
          <div v-for="d in ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']" :key="d"
            class="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[11px] font-black text-emerald-600/70 dark:text-emerald-300/70 tracking-widest uppercase">
            {{ d }}
          </div>
        </div>

        <div class="grid grid-cols-7 text-center gap-y-1 sm:gap-y-2">
          <div
            v-for="(dia, index) in diasCalendario"
            :key="index"
            @click="seleccionarDia(dia.numero, dia.actual)"
            :class="obtenerClasesDia(dia)"
          >
            {{ dia.numero }}
          </div>
        </div>
      </div>

      <div class="w-full lg:w-5/12 bg-emerald-50/50 dark:bg-[#0f172a]/20 p-4 sm:p-6 md:p-8 lg:p-10 border-l border-emerald-100 dark:border-gray-800 flex flex-col">
        <div v-if="diaSeleccionado">
          <h4 class="text-[10px] sm:text-xs md:text-sm font-black text-emerald-700/80 dark:text-emerald-300/70 uppercase tracking-widest mb-4 sm:mb-5 md:mb-6">
            Horarios para el día {{ diaSeleccionado }}
          </h4>
          <div v-if="cargandoHorarios" class="flex items-center justify-center py-8">
            <div class="text-emerald-700/70 dark:text-emerald-300/70 text-xs sm:text-sm">Cargando horarios...</div>
          </div>
          <div v-else-if="horariosDisponibles.length > 0" class="space-y-2 sm:space-y-3 max-h-[300px] sm:max-h-[350px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <button
              v-for="h in horariosDisponibles"
              :key="h"
              @click="horaSeleccionada = h"
              :class="[
                'w-full p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-2xl md:rounded-3xl border transition-all text-xs sm:text-sm font-bold',
                horaSeleccionada === h
                  ? 'bg-emerald-600 border-transparent text-white shadow-xl scale-[1.03]'
                  : 'bg-white dark:bg-gray-800 border-emerald-100 dark:border-gray-700 text-emerald-800 dark:text-emerald-200 hover:border-emerald-400 hover:shadow-sm'
              ]"
            >
              {{ h }} hs
            </button>
          </div>
          <div v-else class="text-center py-6 sm:py-8">
            <p class="text-emerald-700/70 dark:text-emerald-300/70 text-xs sm:text-sm">No hay horarios disponibles para este día</p>
          </div>
          <button
            @click="irAFormulario"
            :disabled="!horaSeleccionada"
            :class="[!horaSeleccionada ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700 shadow-emerald-500/20 shadow-xl active:scale-95']"
            class="mt-6 sm:mt-7 md:mt-8 w-full bg-emerald-600 text-white font-black py-4 sm:py-4.5 md:py-5 rounded-lg sm:rounded-2xl md:rounded-3xl transition-all uppercase tracking-widest text-xs sm:text-sm"
          >
            Confirmar Turno
          </button>
        </div>
        <div v-else class="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-6 text-emerald-700/70 dark:text-emerald-300/70">
          <p class="text-xs sm:text-sm font-medium">No hay fechas con turnos disponibles dentro del rango permitido</p>
        </div>
      </div>
    </div>
  </div>
</template>
