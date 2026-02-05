<script setup lang="ts">
import { onMounted, ref } from 'vue'

const registros = ref<any[]>([])
const cargando = ref(false)
const filtroTexto = ref('')

const cargarAuditoria = async () => {
  cargando.value = true
  try {
    registros.value = await window.api.obtenerAuditoriaUsuarios()
  } finally {
    cargando.value = false
  }
}

const registrosFiltrados = () => {
  if (!filtroTexto.value) return registros.value
  const t = filtroTexto.value.toLowerCase()
  return registros.value.filter(r =>
    `${r.actor_username || ''} ${r.accion || ''} ${r.target_username || ''} ${r.detalle || ''}`
      .toLowerCase()
      .includes(t)
  )
}

onMounted(() => {
  cargarAuditoria()
})
</script>

<template>
  <div class="h-screen flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 bg-gray-50 dark:bg-[#0f172a] gap-4 sm:gap-5 md:gap-6 lg:gap-7 overflow-hidden">
    <header class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-black text-gray-800 dark:text-white tracking-tighter">Auditoria</h1>
        <p class="text-gray-500 dark:text-gray-400 font-medium">Registro de cambios y movimientos de usuarios</p>
      </div>
      <button @click="cargarAuditoria"
        class="bg-white dark:bg-[#1e293b] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 transition-all font-bold text-sm md:text-base shadow-sm">
        {{ cargando ? 'Cargando...' : 'Actualizar' }}
      </button>
    </header>

    <div class="bg-white dark:bg-[#1e293b] p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 flex items-center gap-3 shadow-sm">
      <input v-model="filtroTexto" type="text" placeholder="Buscar por usuario, acciÃ³n o detalle..."
        class="flex-1 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 rounded-lg sm:rounded-xl md:rounded-2xl py-2 sm:py-2.5 px-3 sm:px-4 text-xs sm:text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
    </div>

    <div class="flex-1 overflow-hidden bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl md:rounded-4xl flex flex-col shadow-sm">
      <div class="overflow-auto flex-1 custom-scrollbar">
        <table class="w-full text-left border-separate border-spacing-0">
          <thead class="sticky top-0 z-10 bg-gray-50 dark:bg-[#1e293b] border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th class="p-3 sm:p-4 md:p-5 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Fecha</th>
              <th class="p-3 sm:p-4 md:p-5 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Actor</th>
              <th class="p-3 sm:p-4 md:p-5 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">AcciÃ³n</th>
              <th class="p-3 sm:p-4 md:p-5 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Usuario objetivo</th>
              <th class="p-3 sm:p-4 md:p-5 text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Detalle</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800/50">
            <tr v-for="r in registrosFiltrados()" :key="r.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <td class="p-3 sm:p-4 md:p-5 text-xs text-gray-500 dark:text-gray-400">
                {{ r.created_at || '' }}
              </td>
              <td class="p-3 sm:p-4 md:p-5 text-xs text-gray-700 dark:text-gray-200 font-bold">
                {{ r.actor_username || 'sistema' }}
              </td>
              <td class="p-3 sm:p-4 md:p-5 text-xs text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">
                {{ r.accion }}
              </td>
              <td class="p-3 sm:p-4 md:p-5 text-xs text-gray-700 dark:text-gray-200">
                {{ r.target_username || '-' }}
              </td>
              <td class="p-3 sm:p-4 md:p-5 text-xs text-gray-500 dark:text-gray-400">
                {{ r.detalle || '' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
