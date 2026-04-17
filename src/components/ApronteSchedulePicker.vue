<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api } from '../api'

const props = withDefaults(defineProps<{
  fecha?: string
  hora?: string
  label?: string
}>(), {
  fecha: '',
  hora: '',
  label: 'Fecha y horario'
})

const emit = defineEmits<{
  'update:fecha': [value: string]
  'update:hora': [value: string]
}>()

type HorarioApronte = {
  id?: number
  hora: string
  cupo?: number
  usados?: number
  disponibles?: number
  disabled?: boolean
}

const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const diasSemana = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

const hoy = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
}

const formatFechaIso = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const parseFechaIso = (iso: string) => {
  const raw = String(iso || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const [y, m, d] = raw.split('-').map(Number)
  const date = new Date(y, m - 1, d, 0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

const mesVisual = ref(hoy().getMonth())
const anioVisual = ref(hoy().getFullYear())
const cargandoHorarios = ref(false)
const cargandoDisponibilidad = ref(false)
const horariosDisponibles = ref<HorarioApronte[]>([])
const availabilityCache = ref<Record<string, boolean | null>>({})
const horariosCache = ref<Record<string, HorarioApronte[]>>({})

const fechaSeleccionada = computed(() => String(props.fecha || '').trim())
const mesTitulo = computed(() => `${meses[mesVisual.value]} ${anioVisual.value}`)

const syncVisualDate = (iso: string) => {
  const parsed = parseFechaIso(iso) || hoy()
  mesVisual.value = parsed.getMonth()
  anioVisual.value = parsed.getFullYear()
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

const getIsoForDay = (day: number) => formatFechaIso(new Date(anioVisual.value, mesVisual.value, day, 0, 0, 0, 0))

const getDiaSemana = (iso: string) => {
  const selected = parseFechaIso(iso)
  if (!selected) return -1
  return selected.getDay()
}

const horaEnMinutos = (hora: string) => {
  const parts = String(hora || '').split(':')
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1
  return h * 60 + m
}

const aplicarReglaFinDeSemana = (iso: string, horarios: any[]) => {
  const dia = getDiaSemana(iso)
  if (dia === 0) {
    return []
  }
  if (dia !== 6) {
    return horarios
  }
  return horarios.filter((h: any) => horaEnMinutos(String(h?.hora || '')) <= 12 * 60)
}

const isPastDate = (iso: string) => {
  const selected = parseFechaIso(iso)
  if (!selected) return true
  return selected.getTime() < hoy().getTime()
}

const consultarDisponibilidadFecha = async (iso: string): Promise<boolean | null> => {
  try {
    const horarios = await api.obtenerHorariosAprontesDisponibles(iso)
    const filtrados = aplicarReglaFinDeSemana(iso, horarios || [])
    return filtrados.some((h: any) => Number(h?.disponibles || 0) > 0)
  } catch {
    return null
  }
}

const cargarDisponibilidadMes = async () => {
  if (cargandoDisponibilidad.value) return
  cargandoDisponibilidad.value = true
  try {
    const diasEnMes = new Date(anioVisual.value, mesVisual.value + 1, 0).getDate()
    const pendientes: string[] = []
    for (let day = 1; day <= diasEnMes; day++) {
      const iso = getIsoForDay(day)
      if (isPastDate(iso)) {
        availabilityCache.value[iso] = false
        continue
      }
      if (typeof availabilityCache.value[iso] === 'undefined') {
        pendientes.push(iso)
      }
    }

    const chunkSize = 6
    for (let i = 0; i < pendientes.length; i += chunkSize) {
      const chunk = pendientes.slice(i, i + chunkSize)
      const results = await Promise.allSettled(chunk.map((iso) => consultarDisponibilidadFecha(iso)))
      for (let j = 0; j < chunk.length; j++) {
        const result = results[j]
        const iso = chunk[j]
        if (result.status === 'fulfilled' && result.value !== null) {
          availabilityCache.value[iso] = result.value
        }
      }
    }
  } finally {
    cargandoDisponibilidad.value = false
  }
}

const cargarHorariosSeleccionados = async () => {
  const iso = fechaSeleccionada.value
  if (!iso) {
    horariosDisponibles.value = []
    emit('update:hora', '')
    return
  }

  cargandoHorarios.value = true
  try {
    const horarios = await api.obtenerHorariosAprontesDisponibles(iso)
    const horariosFiltrados = aplicarReglaFinDeSemana(iso, horarios || [])
    const current = String(props.hora || '').trim()
    const list = horariosFiltrados
      .map((h: any) => ({
        ...h,
        hora: String(h?.hora || ''),
        disponibles: Number(h?.disponibles || 0),
        disabled: Number(h?.disponibles || 0) <= 0 && String(h?.hora || '') !== current
      }))
      .filter((h: HorarioApronte) => h.hora)

    const dia = getDiaSemana(iso)
    const currentPermitido =
      current && dia !== 0 && (dia !== 6 || horaEnMinutos(current) <= 12 * 60)

    if (currentPermitido && !list.some((h: HorarioApronte) => h.hora === current)) {
      list.unshift({ hora: current, disponibles: 1, cupo: 0, usados: 0, disabled: false })
    }

    horariosDisponibles.value = list
    horariosCache.value[iso] = list
    availabilityCache.value[iso] = list.some((h: HorarioApronte) => !h.disabled)

    if (current && !list.some((h: HorarioApronte) => h.hora === current && !h.disabled)) {
      emit('update:hora', '')
    }
  } catch (error) {
    console.error('[ApronteSchedulePicker] Error cargando horarios:', error)
    horariosDisponibles.value = horariosCache.value[iso] || []
  } finally {
    cargandoHorarios.value = false
  }
}

const seleccionarDia = (day: number, actual: boolean) => {
  if (!actual) return
  const iso = getIsoForDay(day)
  if (isPastDate(iso)) return
  if (iso !== fechaSeleccionada.value) {
    emit('update:hora', '')
  }
  emit('update:fecha', iso)
}

const seleccionarHora = (hora: string, disabled: boolean) => {
  if (disabled) return
  emit('update:hora', hora)
}

const mesSiguiente = () => {
  if (mesVisual.value === 11) {
    mesVisual.value = 0
    anioVisual.value += 1
    return
  }
  mesVisual.value += 1
}

const mesAnterior = () => {
  const primerDiaMes = new Date(anioVisual.value, mesVisual.value, 1)
  const minMonth = new Date(hoy().getFullYear(), hoy().getMonth(), 1)
  if (primerDiaMes <= minMonth) return
  if (mesVisual.value === 0) {
    mesVisual.value = 11
    anioVisual.value -= 1
    return
  }
  mesVisual.value -= 1
}

const obtenerClasesDia = (dia: { numero: number; actual: boolean }) => {
  if (!dia.actual) return 'calendar-day is-outside'

  const iso = getIsoForDay(dia.numero)
  const isSelected = fechaSeleccionada.value === iso
  const isPast = isPastDate(iso)
  const availability = availabilityCache.value[iso]

  return [
    'calendar-day',
    isSelected ? 'is-selected' : '',
    isPast ? 'is-past' : '',
    availability === false && !isSelected ? 'is-unavailable' : '',
    availability === true && !isSelected ? 'has-availability' : '',
    availability == null && !isSelected && !isPast ? 'is-pending' : ''
  ].join(' ')
}

watch(
  () => props.fecha,
  async (iso) => {
    syncVisualDate(String(iso || ''))
    await cargarHorariosSeleccionados()
  },
  { immediate: true }
)

watch(
  () => props.hora,
  () => {
    if (fechaSeleccionada.value) {
      const current = String(props.hora || '').trim()
      if (current && !horariosDisponibles.value.some((h) => h.hora === current)) {
        horariosDisponibles.value = [{ hora: current, disponibles: 1, disabled: false }, ...horariosDisponibles.value]
      }
    }
  },
  { immediate: true }
)

watch([mesVisual, anioVisual], async () => {
  await cargarDisponibilidadMes()
}, { immediate: true })
</script>

<template>
  <div class="schedule-picker rounded-2xl p-4 md:col-span-2">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div>
        <div class="text-[10px] uppercase tracking-widest text-slate-400 font-black">{{ label }}</div>
        <div class="mt-1 text-sm font-bold text-slate-100">{{ mesTitulo }}</div>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="nav-btn" @click="mesAnterior">‹</button>
        <button type="button" class="nav-btn" @click="mesSiguiente">›</button>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)]">
      <div>
        <div class="mb-2 grid grid-cols-7 text-center">
          <div v-for="day in diasSemana" :key="day" class="weekday-cell">{{ day }}</div>
        </div>
        <div class="grid grid-cols-7 gap-y-1">
          <button
            v-for="(dia, index) in diasCalendario"
            :key="`${index}-${dia.numero}-${dia.actual}`"
            type="button"
            :class="obtenerClasesDia(dia)"
            :disabled="!dia.actual || isPastDate(getIsoForDay(dia.numero))"
            @click="seleccionarDia(dia.numero, dia.actual)"
          >
            {{ dia.numero }}
          </button>
        </div>
      </div>

      <div class="hours-panel">
        <div class="hours-title">Horarios disponibles</div>
        <div v-if="!fechaSeleccionada" class="hours-empty">Elegi una fecha para ver los horarios.</div>
        <div v-else-if="cargandoHorarios" class="hours-empty">Cargando horarios...</div>
        <div v-else-if="horariosDisponibles.length === 0" class="hours-empty">No hay horarios para esa fecha.</div>
        <div v-else class="hours-list custom-scrollbar">
          <button
            v-for="h in horariosDisponibles"
            :key="h.hora"
            type="button"
            :disabled="Boolean(h.disabled)"
            :class="['hour-chip', props.hora === h.hora ? 'is-selected' : '', h.disabled ? 'is-disabled' : '']"
            @click="seleccionarHora(h.hora, Boolean(h.disabled))"
          >
            <span>{{ h.hora }} hs</span>
            <span class="hour-meta">{{ Number(h.disponibles || 0) }}/{{ Number(h.cupo || 0) || Number(h.disponibles || 0) }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-picker {
  border: 1px solid #1e293b;
  background: #07122a;
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

.nav-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 1.2rem;
  line-height: 1;
}

.weekday-cell {
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(148 163 184);
  padding-bottom: 0.35rem;
}

.calendar-day {
  margin-inline: 0.12rem;
  aspect-ratio: 1;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.82rem;
  font-weight: 700;
  color: #cbd5e1;
  transition: all 0.16s ease;
}

.calendar-day.is-outside {
  color: #475569;
  pointer-events: none;
}

.calendar-day.is-past,
.calendar-day.is-unavailable {
  color: #64748b;
  opacity: 0.45;
}

.calendar-day.is-pending:not(.is-selected),
.calendar-day.has-availability:not(.is-selected) {
  background: rgba(15, 23, 42, 0.92);
}

.calendar-day.has-availability:not(.is-selected) {
  border-color: rgba(16, 185, 129, 0.38);
  color: #99f6e4;
}

.calendar-day.is-selected {
  background: rgb(5 150 105);
  color: white;
  box-shadow: 0 8px 18px rgba(5, 150, 105, 0.28);
  transform: scale(1.06);
}

.calendar-day:not(.is-outside):not(.is-past):hover {
  border-color: rgba(5, 150, 105, 0.35);
}

.hours-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-radius: 1rem;
  border: 1px solid #334155;
  background: #111827;
  padding: 0.85rem;
}

.hours-title {
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgb(100 116 139);
  margin-bottom: 0.75rem;
}

.hours-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.76rem;
  color: #94a3b8;
  min-height: 7rem;
}

.hours-list {
  display: flex;
  max-height: 15rem;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  padding-right: 0.2rem;
}

.hour-chip {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-radius: 0.85rem;
  border: 1px solid #334155;
  background: #0f172a;
  padding: 0.8rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 800;
  color: #e2e8f0;
  transition: all 0.16s ease;
}

.hour-chip.is-selected {
  border-color: rgb(5 150 105);
  background: rgb(5 150 105);
  color: white;
}

.hour-chip.is-disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.hour-meta {
  font-size: 0.7rem;
  opacity: 0.8;
}

@media (max-width: 640px) {
  .calendar-day {
    font-size: 0.75rem;
  }

  .hours-list {
    max-height: 11rem;
  }
}
</style>