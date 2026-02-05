<script setup lang="ts">
import { onMounted, ref } from 'vue'

const envText = ref('')
const status = ref('')
const statusOk = ref(true)
const statusDetail = ref('')
const guardando = ref(false)

const cargarEnv = async () => {
  envText.value = await window.api.obtenerEnvConfig()
}

const guardarEnv = async () => {
  guardando.value = true
  status.value = 'Guardando...'
  statusOk.value = true
  statusDetail.value = ''
  try {
    await window.api.guardarEnvConfig(envText.value)
    status.value = 'Configuración guardada. Forzando reconexión...'
    statusOk.value = true
    const result = await window.api.probarConexionDB()
    if (result.ok) {
      status.value = 'Conexión exitosa a MySQL.'
      statusOk.value = true
    } else {
      status.value = 'No se pudo conectar a MySQL.'
      statusOk.value = false
      statusDetail.value = result.error || ''
    }
  } catch (error: any) {
    status.value = error?.message || 'Error al guardar la configuración'
    statusOk.value = false
    statusDetail.value = error?.stack || ''
  } finally {
    guardando.value = false
  }
}

const probarConexion = async () => {
  status.value = 'Probando conexión...'
  statusOk.value = true
  statusDetail.value = ''
  try {
    const result = await window.api.probarConexionDB()
    if (result.ok) {
      status.value = 'Conexión exitosa a MySQL.'
      statusOk.value = true
    } else {
      status.value = result.error || 'No se pudo conectar.'
      statusOk.value = false
      statusDetail.value = result.error || ''
    }
  } catch (error: any) {
    status.value = error?.message || 'Error al probar conexión'
    statusOk.value = false
    statusDetail.value = error?.stack || ''
  }
}

onMounted(() => {
  cargarEnv()
})
</script>

<template>
  <div class="h-screen flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 bg-gray-50 dark:bg-[#0f172a] gap-6 overflow-hidden">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 dark:text-gray-100 tracking-tight">CONFIGURACIÓN</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Pegá el contenido completo del archivo `.env`.</p>
      </div>
      <button
        @click="cargarEnv"
        class="px-4 py-2 rounded-xl bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
      >
        Recargar
      </button>
    </div>

    <div class="flex-1 flex flex-col gap-4 overflow-hidden">
      <div class="flex-1 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <textarea
          v-model="envText"
          class="w-full h-full p-4 bg-transparent text-gray-800 dark:text-gray-100 font-mono text-xs outline-none resize-none"
          placeholder="MYSQL_HOST=...\nMYSQL_PORT=3306\nMYSQL_USER=...\nMYSQL_PASSWORD=...\nMYSQL_DATABASE=..."
        ></textarea>
      </div>

      <div class="flex items-center justify-between">
        <div :class="statusOk ? 'text-emerald-500 text-xs' : 'text-rose-500 text-xs'">{{ status }}</div>
        <div class="flex items-center gap-2">
          <button
            @click="probarConexion"
            class="px-5 py-3 rounded-xl bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-black uppercase tracking-widest text-xs shadow-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            Probar Conexión
          </button>
          <button
            @click="guardarEnv"
            :disabled="guardando"
            class="px-6 py-3 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {{ guardando ? 'Guardando...' : 'Guardar Configuración' }}
          </button>
        </div>
      </div>
      <div v-if="!statusOk && statusDetail" class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200 text-xs font-mono whitespace-pre-wrap">
        {{ statusDetail }}
      </div>
    </div>
  </div>
</template>
