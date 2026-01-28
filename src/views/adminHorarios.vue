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

const idABorrar = ref(null);
const confirmarBorradoInterno = async () => {
  try {
    console.log('[AdminHorarios] Eliminando horario permanentemente:', idABorrar.value)
    await window.api.borrarHorarioPermanente(idABorrar.value)
    console.log('[AdminHorarios] Horario eliminado exitosamente')
    
    // Recargar datos después de eliminar
    await new Promise(resolve => setTimeout(resolve, 150))
    await cargarHorariosInactivos()
    await cargarHorariosBase()
    
    idABorrar.value = null // Cerrar modal
  } catch (error: any) {
    console.error('[AdminHorarios] Error borrando horario:', error)
    alert('Error al eliminar el horario')
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <header class="mb-10">
      <h1 class="text-3xl font-black text-gray-800 dark:text-white tracking-tighter">
        Administración de <span class="text-cyan-600">Horarios</span>
      </h1>
      <p class="text-gray-500 dark:text-gray-400 font-medium">Configura los turnos base y bloqueos específicos por
        fecha.</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

      <div
        class="bg-white dark:bg-[#1e293b] rounded-[32px] p-6 border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col h-[550px]">
        <h2 class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 px-2">Horarios
          activos</h2>

        <div class="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          <div v-for="h in horariosBase" :key="h.id"
            class="flex items-center justify-between bg-gray-50 dark:bg-[#0f172a] rounded-2xl px-5 py-4 border border-transparent hover:border-cyan-500/30 transition-all group">
            <span class="text-gray-800 dark:text-white font-black text-sm">{{ h.hora }}</span>
            <button @click="desactivarHorario(h.id)"
              class="text-[10px] font-black uppercase text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
              Desactivar
            </button>
          </div>
          <div v-if="horariosBase.length === 0" class="text-gray-400 text-center py-10 text-xs italic">Sin horarios
            activos</div>
        </div>

        <div class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex gap-2">
          <input v-model="nuevaHora" type="time"
            class="flex-1 rounded-xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-white px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
          <button @click="crearHorario"
            class="bg-cyan-600 hover:bg-cyan-500 px-5 rounded-xl font-black text-white transition-all shadow-lg shadow-cyan-600/20 active:scale-90">
            +
          </button>
        </div>
      </div>

      <div
        class="bg-white dark:bg-[#1e293b] rounded-[32px] p-6 border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col h-[550px]">
        <h2 class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 px-2">
          Desactivados</h2>

        <div class="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          <div v-for="h in horariosInactivos" :key="h.id"
            class="flex items-center justify-between bg-gray-50 dark:bg-[#0f172a] rounded-2xl px-5 py-4 border border-dashed border-gray-200 dark:border-gray-800 opacity-70 hover:opacity-100 transition-all group">

            <span class="text-gray-500 dark:text-gray-400 font-bold text-sm line-through">{{ h.hora }}</span>

            <div class="flex items-center gap-3">
              <button @click="activarHorario(h.id)"
                class="text-[10px] font-black uppercase text-emerald-500 hover:text-emerald-400 transition-all">
                Activar
              </button>

              <button @click="idABorrar = h.id"
                class="p-2 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all active:scale-90"
                title="Eliminar permanentemente">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                  stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>

          </div>
          <div v-if="horariosInactivos.length === 0" class="text-gray-400 text-center py-10 text-xs italic">Nada
            desactivado</div>
        </div>
      </div>

      <div
        class="bg-white dark:bg-[#1e293b] rounded-[32px] p-6 border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col h-[550px]">
        <h2 class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 px-2">Bloquear
          por fecha</h2>

        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-[10px] font-black text-cyan-600 uppercase ml-2">Fecha</label>
            <input v-model="fechaBloqueo" @change="onFechaChange" type="date"
              class="w-full rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-white px-4 py-4 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black text-cyan-600 uppercase ml-2">Hora a bloquear</label>
            <select v-model="horaBloqueo"
              class="w-full rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-white px-4 py-4 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none appearance-none">
              <option value="">Seleccionar hora...</option>
              <option v-for="h in horariosBase" :key="h.id" :value="h.hora">{{ h.hora }} hs</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black text-cyan-600 uppercase ml-2">Motivo</label>
            <input v-model="motivoBloqueo" placeholder="Ej: Feriado, Almuerzo..."
              class="w-full rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-white px-4 py-4 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none" />
          </div>

          <button @click="bloquearHorario()"
            class="w-full bg-orange-500 hover:bg-orange-600 py-5 rounded-2xl font-black text-white uppercase text-[11px] tracking-[2px] transition-all shadow-lg shadow-orange-500/20 active:scale-95 mt-4">
            Bloquear Horario
          </button>
        </div>
      </div>

      <div
        class="bg-white dark:bg-[#1e293b] rounded-[32px] p-6 border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col h-[550px]">
        <h2 class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 px-2">Horarios
          bloqueados</h2>

        <div v-if="!fechaBloqueo" class="flex-1 flex items-center justify-center text-center p-6">
          <p class="text-xs text-gray-400 font-medium italic">Selecciona una fecha para ver o gestionar bloqueos</p>
        </div>

        <div v-else class="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          <div v-for="b in horariosBloqueados" :key="b.id"
            class="flex flex-col gap-2 bg-amber-50 dark:bg-amber-500/5 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-500/20">
            <div class="flex justify-between items-center">
              <span class="text-amber-700 dark:text-amber-400 font-black text-sm">{{ b.hora }} hs</span>
              <button @click="desbloquearHorario(b.fecha, b.hora)"
                class="text-[9px] font-black uppercase bg-white dark:bg-[#1e293b] px-2 py-1 rounded-lg text-rose-500 border border-rose-100 dark:border-rose-900/50">
                Eliminar
              </button>
            </div>
            <p v-if="b.motivo" class="text-[10px] text-amber-600/70 dark:text-amber-400/50 font-bold italic">{{ b.motivo
              }}</p>
          </div>
          <div v-if="horariosBloqueados.length === 0" class="text-gray-400 text-center py-10 text-xs italic">No hay
            bloqueos este día</div>
        </div>
      </div>

    </div>
  </div>
  <div v-if="idABorrar !== null" 
     class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
  
  <div class="bg-white dark:bg-[#1e293b] w-full max-w-sm rounded-[32px] border border-gray-200 dark:border-gray-800 p-8 shadow-2xl scale-in-95 animate-in duration-200">
    <div class="text-center">
      <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-100 dark:bg-rose-500/10 mb-6">
        <svg class="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <h3 class="text-xl font-black text-gray-800 dark:text-white mb-2">¿Estás seguro?</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Esta acción eliminará el horario permanentemente. No podrás recuperarlo.
      </p>

      <div class="flex gap-3">
        <button @click="idABorrar = null" 
                class="flex-1 px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          Cancelar
        </button>
        <button @click="confirmarBorradoInterno" 
                class="flex-1 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-rose-600/20 transition-all active:scale-95">
          Eliminar
        </button>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped>
/* MEJORA DE BARRA DE DESPLAZAMIENTO */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  /* Gris claro para modo light */
  border-radius: 10px;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
  /* Gris azulado para modo dark (coincide con dark-border) */
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #0891b2;
  /* Cyan al pasar el mouse */
}

/* Para Firefox */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

.dark .custom-scrollbar {
  scrollbar-color: #334155 transparent;
}
</style>