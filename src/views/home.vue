<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/* =========================
 * FECHAS / CALENDARIO
 * ========================= */
const hoy = new Date()
const mesVisual = ref(hoy.getMonth())
const anioVisual = ref(hoy.getFullYear())

const MAX_DIAS_ADELANTE = 10

const nombresMeses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const mesSiguiente = () => {
  mesVisual.value === 11 ? (mesVisual.value = 0, anioVisual.value++) : mesVisual.value++
}

const mesAnterior = () => {
  mesVisual.value === 0 ? (mesVisual.value = 11, anioVisual.value--) : mesVisual.value--
}

/* =========================
 * GENERAR DÍAS
 * ========================= */
const diasCalendario = computed(() => {
  const dias = []
  const primerDia = new Date(anioVisual.value, mesVisual.value, 1).getDay()
  const diasMes = new Date(anioVisual.value, mesVisual.value + 1, 0).getDate()
  const ultimoMesAnterior = new Date(anioVisual.value, mesVisual.value, 0).getDate()

  for (let i = primerDia - 1; i >= 0; i--) {
    dias.push({ numero: ultimoMesAnterior - i, actual: false })
  }

  for (let i = 1; i <= diasMes; i++) {
    dias.push({ numero: i, actual: true })
  }

  return dias
})

/* =========================
 * SELECCIÓN
 * ========================= */
const diaSeleccionado = ref<number | null>(null)
const horaSeleccionada = ref<string | null>(null)

const fechaSeleccionadaISO = computed(() => {
  if (!diaSeleccionado.value) return null
  return new Date(
    anioVisual.value,
    mesVisual.value,
    diaSeleccionado.value
  ).toISOString().split('T')[0]
})

/* =========================
 * DISPONIBILIDAD DE DÍAS
 * ========================= */
const esDiaDisponible = (dia: number, esMesActual: boolean) => {
  if (!esMesActual) return false

  const fecha = new Date(anioVisual.value, mesVisual.value, dia)
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

  if (fecha < hoySinHora) return false
  if (fecha.getDay() === 0) return false // Domingo

  const diff = Math.floor((fecha.getTime() - hoySinHora.getTime()) / 86400000)
  return diff <= MAX_DIAS_ADELANTE
}

const obtenerClasesDia = (diaObj: any) => {
  const seleccionado = diaSeleccionado.value === diaObj.numero && diaObj.actual
  const disponible = esDiaDisponible(diaObj.numero, diaObj.actual)

  return [
    'aspect-square flex items-center justify-center text-sm rounded-full transition-all mx-1 relative mb-1',
    seleccionado && 'bg-blue-600 text-white font-bold shadow-lg scale-110',
    !diaObj.actual && 'text-gray-300 pointer-events-none',
    disponible && 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30',
    !disponible && 'cursor-not-allowed opacity-40'
  ].join(' ')
}

/* =========================
 * HORARIOS (DB)
 * ========================= */
const horariosDisponibles = ref<string[]>([])
const cargandoHorarios = ref(false)

const cargarHorarios = async () => {
  if (!fechaSeleccionadaISO.value) return

  cargandoHorarios.value = true
  horaSeleccionada.value = null

  const data = await window.api.obtenerHorariosDisponibles(
    fechaSeleccionadaISO.value
  )

  // 🔥 Normalizamos
  horariosDisponibles.value = data
  .map((h: any) => h.hora)
  .sort()


  cargandoHorarios.value = false
}

watch(fechaSeleccionadaISO, cargarHorarios)

/* =========================
 * NAVEGACIÓN
 * ========================= */
const irAFormulario = () => {
  if (!fechaSeleccionadaISO.value || !horaSeleccionada.value) return

  router.push({
    path: '/confirmacion',
    query: {
      fecha: fechaSeleccionadaISO.value,
      hora: horaSeleccionada.value
    }
  })
}
</script>

<template>
  <div class="max-w-6xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div class="bg-white dark:bg-[#1e293b] rounded-[32px] shadow-2xl border border-gray-200 dark:border-gray-800 flex overflow-hidden min-h-[620px]">

      <!-- CALENDARIO -->
      <div class="w-7/12 p-10">
        <div class="flex justify-between mb-10">
          <div>
            <h3 class="text-2xl font-black">{{ nombresMeses[mesVisual] }}</h3>
            <p class="text-gray-400">{{ anioVisual }}</p>
          </div>
          <div class="flex gap-2">
            <button @click="mesAnterior" class="p-3 rounded-2xl hover:bg-gray-100">‹</button>
            <button @click="mesSiguiente" class="p-3 rounded-2xl hover:bg-gray-100">›</button>
          </div>
        </div>

        <div class="grid grid-cols-7 mb-6 text-center">
          <div v-for="d in ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']"
               class="text-xs font-black text-gray-400">{{ d }}</div>
        </div>

        <div class="grid grid-cols-7 gap-y-2 text-center">
          <div v-for="(dia, i) in diasCalendario" :key="i"
               @click="esDiaDisponible(dia.numero, dia.actual) && (diaSeleccionado = dia.numero)"
               :class="obtenerClasesDia(dia)">
            {{ dia.numero }}
          </div>
        </div>
      </div>

      <!-- HORARIOS -->
      <div class="w-5/12 bg-gray-50/50 dark:bg-[#0f172a]/20 p-10 border-l flex flex-col">
        <div v-if="diaSeleccionado">
          <h4 class="text-xs font-black text-gray-400 mb-6 uppercase">
            Horarios disponibles
          </h4>

          <div v-if="cargandoHorarios" class="text-center text-gray-400 py-10">
            Cargando horarios…
          </div>

          <div v-else class="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <button v-for="h in horariosDisponibles" :key="h"
              @click="horaSeleccionada = h"
              :class="[
                'w-full p-4 rounded-2xl font-bold transition-all',
                horaSeleccionada === h
                  ? 'bg-blue-600 text-white shadow-xl scale-[1.03]'
                  : 'bg-white dark:bg-gray-800 border hover:border-blue-400'
              ]">
              {{ h }} hs
            </button>

            <p v-if="horariosDisponibles.length === 0"
               class="text-center text-gray-400 text-sm py-10">
              No hay horarios disponibles
            </p>
          </div>

          <button @click="irAFormulario"
                  :disabled="!horaSeleccionada"
                  class="mt-8 w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest disabled:opacity-40">
            Confirmar Turno
          </button>
        </div>

        <div v-else class="flex-1 flex items-center justify-center text-gray-400">
          Seleccioná un día
        </div>
      </div>
    </div>
  </div>
</template>
