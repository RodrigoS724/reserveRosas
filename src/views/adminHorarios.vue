<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

/* =========================
 * ESTADO
 * ========================= */
const horariosBase = ref<any[]>([])
const nuevaHora = ref('')

const fechaBloqueo = ref('')
const horaBloqueo = ref('')
const motivoBloqueo = ref('')

const cargando = ref(false)

/* =========================
 * CARGAR DATOS
 * ========================= */
const cargarHorariosBase = async () => {
  horariosBase.value = await window.api.obtenerHorariosBase()
}

onMounted(cargarHorariosBase)

/* =========================
 * ACCIONES
 * ========================= */
const crearHorario = async () => {
  if (!nuevaHora.value) return

  await window.api.crearHorario(nuevaHora.value)
  nuevaHora.value = ''
  cargarHorariosBase()
}

const desactivarHorario = async (id: number) => {
  await window.api.desactivarHorario(id)
  cargarHorariosBase()
}

const bloquearHorario = async () => {
  if (!fechaBloqueo.value || !horaBloqueo.value) return

  await window.api.bloquearHorario({
    fecha: fechaBloqueo.value,
    hora: horaBloqueo.value,
    motivo: motivoBloqueo.value
  })

  fechaBloqueo.value = ''
  horaBloqueo.value = ''
  motivoBloqueo.value = ''
}
</script>

<template>
  <div class="max-w-7xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <h1 class="text-2xl font-black text-white mb-8">
      Administración de Horarios
    </h1>

    <div class="grid grid-cols-2 gap-8">
      <!-- =======================
           HORARIOS BASE
      ======================== -->
      <div class="bg-[#1e293b] rounded-3xl p-6 shadow-xl">
        <h2 class="text-sm font-black text-gray-400 uppercase mb-4">
          Horarios base
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
        </div>

        <div class="mt-6 flex gap-3">
          <input
            v-model="nuevaHora"
            type="time"
            class="flex-1 rounded-xl bg-[#0f172a] border border-gray-700 text-white px-4 py-3"
          />
          <button
            @click="crearHorario"
            class="bg-blue-600 hover:bg-blue-700 px-6 rounded-xl font-black text-white transition"
          >
            +
          </button>
        </div>
      </div>

      <!-- =======================
           BLOQUEAR HORARIO
      ======================== -->
      <div class="bg-[#1e293b] rounded-3xl p-6 shadow-xl">
        <h2 class="text-sm font-black text-gray-400 uppercase mb-4">
          Bloquear horario por fecha
        </h2>

        <div class="space-y-4">
          <input
            v-model="fechaBloqueo"
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
            class="w-full bg-red-500 hover:bg-red-600 py-4 rounded-2xl font-black text-white uppercase tracking-widest transition"
          >
            Bloquear horario
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
