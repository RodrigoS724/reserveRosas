<script setup lang="ts">
import { ref, onMounted } from 'vue'

/* =========================
 * ESTADO
 * ========================= */
const horariosBase = ref<any[]>([])
const horariosInactivos = ref<any[]>([])
const horariosBloqueados = ref<any[]>([])
const nuevaHora = ref('')

const fechaBloqueo = ref('')
const horaBloqueo = ref('')
const motivoBloqueo = ref('')

/* =========================
 * CARGAR DATOS
 * ========================= */
const cargarHorariosBase = async () => {
  try {
    console.log('[AdminHorarios] Cargando horarios base...')
    const result = await window.api.obtenerHorariosBase()
    console.log('[AdminHorarios] Horarios activos recibidos:', result)
    horariosBase.value = result || []
    console.log('[AdminHorarios] Vista actualizada con', horariosBase.value.length, 'horarios activos')
  } catch (error: any) {
    console.error('[AdminHorarios] Error cargando horarios:', error)
    horariosBase.value = []
  }
}

const cargarHorariosInactivos = async () => {
  try {
    console.log('[AdminHorarios] Cargando horarios inactivos...')
    const result = await window.api.obtenerHorariosInactivos()
    console.log('[AdminHorarios] Horarios inactivos recibidos:', result)
    horariosInactivos.value = result || []
    console.log('[AdminHorarios] Vista actualizada con', horariosInactivos.value.length, 'horarios inactivos')
  } catch (error: any) {
    console.error('[AdminHorarios] Error cargando horarios inactivos:', error)
    horariosInactivos.value = []
  }
}

const cargarHorariosBloqueados = async () => {
  if (!fechaBloqueo.value) return
  
  try {
    console.log('[AdminHorarios] Cargando horarios bloqueados para:', fechaBloqueo.value)
    const result = await window.api.obtenerHorariosBloqueados(fechaBloqueo.value)
    console.log('[AdminHorarios] Horarios bloqueados recibidos:', result)
    horariosBloqueados.value = result || []
  } catch (error: any) {
    console.error('[AdminHorarios] Error cargando horarios bloqueados:', error)
    horariosBloqueados.value = []
  }
}

onMounted(() => {
  cargarHorariosBase()
  cargarHorariosInactivos()
})

/* =========================
 * ACCIONES
 * ========================= */
const crearHorario = async () => {
  if (!nuevaHora.value) return

  try {
    console.log('[AdminHorarios] Creando horario:', nuevaHora.value)
    await window.api.crearHorario(nuevaHora.value)
    console.log('[AdminHorarios] Horario creado exitosamente')
    nuevaHora.value = ''
    await cargarHorariosBase()
    await cargarHorariosInactivos()
  } catch (error: any) {
    console.error('[AdminHorarios] Error creando horario:', error)
  }
}

const desactivarHorario = async (id: number) => {
  try {
    console.log('[AdminHorarios] Desactivando horario:', id)
    await window.api.desactivarHorario(id)
    console.log('[AdminHorarios] Horario desactivado exitosamente')
    await new Promise(resolve => setTimeout(resolve, 150))
    await cargarHorariosBase()
    await cargarHorariosInactivos()
  } catch (error: any) {
    console.error('[AdminHorarios] Error desactivando horario:', error)
  }
}

const activarHorario = async (id: number) => {
  try {
    console.log('[AdminHorarios] Activando horario:', id)
    await window.api.activarHorario(id)
    console.log('[AdminHorarios] Horario activado exitosamente')
    await new Promise(resolve => setTimeout(resolve, 150))
    await cargarHorariosBase()
    await cargarHorariosInactivos()
  } catch (error: any) {
    console.error('[AdminHorarios] Error activando horario:', error)
  }
}

const bloquearHorario = async () => {
  if (!fechaBloqueo.value || !horaBloqueo.value) return

  try {
    console.log('[AdminHorarios] Bloqueando horario:', { fecha: fechaBloqueo.value, hora: horaBloqueo.value })
    await window.api.bloquearHorario({
      fecha: fechaBloqueo.value,
      hora: horaBloqueo.value,
      motivo: motivoBloqueo.value
    })
    console.log('[AdminHorarios] Horario bloqueado exitosamente')
    motivoBloqueo.value = ''
    horaBloqueo.value = ''
    await cargarHorariosBloqueados()
  } catch (error: any) {
    console.error('[AdminHorarios] Error bloqueando horario:', error)
  }
}

const desbloquearHorario = async (fecha: string, hora: string) => {
  try {
    console.log('[AdminHorarios] Desbloqueando horario:', { fecha, hora })
    await window.api.desbloquearHorario({
      fecha,
      hora
    })
    console.log('[AdminHorarios] Horario desbloqueado exitosamente')
    await cargarHorariosBloqueados()
  } catch (error: any) {
    console.error('[AdminHorarios] Error desbloqueando horario:', error)
  }
}

const onFechaChange = async () => {
  await cargarHorariosBloqueados()
}
</script>

<template>
  <div class="max-w-7xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <h1 class="text-2xl font-black text-white mb-8">
      Administración de Horarios
    </h1>

    <div class="grid grid-cols-4 gap-6">
      <!-- =======================
           HORARIOS BASE (ACTIVOS)
      ======================== -->
      <div class="bg-[#1e293b] rounded-3xl p-6 shadow-xl">
        <h2 class="text-sm font-black text-gray-400 uppercase mb-4">
          Horarios activos
        </h2>

        <div class="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
          <div
            v-for="h in horariosBase"
            :key="h.id"
            class="flex items-center justify-between bg-[#0f172a] rounded-2xl px-4 py-3"
          >
            <span class="text-white font-bold">
              {{ h.hora }}
            </span>

            <button
              @click="desactivarHorario(h.id)"
              class="text-xs font-black uppercase text-red-400 hover:text-red-300 transition"
            >
              Desactivar
            </button>
          </div>

          <div v-if="horariosBase.length === 0" class="text-gray-500 text-center py-4">
            Sin horarios activos
          </div>
        </div>

        <div class="mt-6 flex gap-3">
          <input
            v-model="nuevaHora"
            type="time"
            class="flex-1 rounded-xl bg-[#0f172a] border border-gray-700 text-white px-4 py-3"
          />
          <button
            @click="crearHorario"
            class="bg-cyan-600 hover:bg-cyan-700 px-6 rounded-xl font-black text-white transition"
          >
            +
          </button>
        </div>
      </div>

      <!-- =======================
           HORARIOS INACTIVOS
      ======================== -->
      <div class="bg-[#1e293b] rounded-3xl p-6 shadow-xl">
        <h2 class="text-sm font-black text-gray-400 uppercase mb-4">
          Horarios desactivados
        </h2>

        <div class="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
          <div
            v-for="h in horariosInactivos"
            :key="h.id"
            class="flex items-center justify-between bg-[#0f172a] rounded-2xl px-4 py-3 border border-yellow-700/30"
          >
            <span class="text-yellow-400 font-bold">
              {{ h.hora }}
            </span>

            <button
              @click="activarHorario(h.id)"
              class="text-xs font-black uppercase text-green-400 hover:text-green-300 transition"
            >
              Activar
            </button>
          </div>

          <div v-if="horariosInactivos.length === 0" class="text-gray-500 text-center py-4">
            Sin horarios desactivados
          </div>
        </div>
      </div>

      <!-- =======================
           BLOQUEAR HORARIO
      ======================== -->
      <div class="bg-[#1e293b] rounded-3xl p-6 shadow-xl">
        <h2 class="text-sm font-black text-gray-400 uppercase mb-4">
          Bloquear horario
        </h2>

        <div class="space-y-4">
          <input
            v-model="fechaBloqueo"
            @change="onFechaChange"
            type="date"
            class="w-full rounded-xl bg-[#0f172a] border border-gray-700 text-white px-4 py-3"
          />

          <select
            v-model="horaBloqueo"
            class="w-full rounded-xl bg-[#0f172a] border border-gray-700 text-white px-4 py-3"
          >
            <option value="">Seleccionar hora</option>
            <option v-for="h in horariosBase" :key="h.id" :value="h.hora">
              {{ h.hora }}
            </option>
          </select>

          <input
            v-model="motivoBloqueo"
            placeholder="Motivo (opcional)"
            class="w-full rounded-xl bg-[#0f172a] border border-gray-700 text-white px-4 py-3"
          />

          <button
            @click="bloquearHorario"
            class="w-full bg-orange-500 hover:bg-orange-600 py-4 rounded-2xl font-black text-white uppercase tracking-widest transition"
          >
            Bloquear horario
          </button>
        </div>
      </div>

      <!-- =======================
           HORARIOS BLOQUEADOS
      ======================== -->
      <div class="bg-[#1e293b] rounded-3xl p-6 shadow-xl">
        <h2 class="text-sm font-black text-gray-400 uppercase mb-4">
          Horarios bloqueados
        </h2>

        <div v-if="!fechaBloqueo" class="text-gray-500 text-center py-8">
          Selecciona una fecha para ver los bloques
        </div>

        <div v-else class="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
          <div
            v-for="b in horariosBloqueados"
            :key="b.id"
            class="flex items-center justify-between bg-yellow-950 rounded-2xl px-4 py-3 border border-yellow-700"
          >
            <div class="flex-1">
              <div class="text-white font-bold">{{ b.hora }}</div>
              <div v-if="b.motivo" class="text-xs text-yellow-300">{{ b.motivo }}</div>
            </div>

            <button
              @click="desbloquearHorario(b.fecha, b.hora)"
              class="text-xs font-black uppercase text-green-400 hover:text-green-300 transition whitespace-nowrap ml-2"
            >
              Desbloquear
            </button>
          </div>

          <div v-if="horariosBloqueados.length === 0" class="text-gray-500 text-center py-4">
            Sin bloqueos para esta fecha
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
