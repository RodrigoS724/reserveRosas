<script setup>
import { ref, onMounted } from 'vue'

const SETTINGS_KEY = 'rr_settings'
const isDark = ref(true)
const soundEnabled = ref(true)

const applyTheme = (value) => {
  isDark.value = value
  document.documentElement.classList.toggle('dark', isDark.value)
}

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data && typeof data === 'object') {
      isDark.value = data.theme !== 'light'
      soundEnabled.value = data.soundEnabled !== false
    }
  } catch {}
}

const saveSettings = (patch = {}) => {
  const next = {
    theme: isDark.value ? 'dark' : 'light',
    soundEnabled: soundEnabled.value,
    ...patch
  }
  isDark.value = next.theme === 'dark'
  soundEnabled.value = Boolean(next.soundEnabled)
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  window.ipcRenderer?.send?.('settings:update', next)
  window.dispatchEvent(new CustomEvent('rr:settings', { detail: next }))
}

const toggleTheme = () => {
  saveSettings({ theme: isDark.value ? 'light' : 'dark' })
}

const toggleSound = () => {
  saveSettings({ soundEnabled: !soundEnabled.value })
}

onMounted(() => {
  loadSettings()
  applyTheme(isDark.value)
})
</script>

<template>
  <div class="h-full w-full overflow-auto bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100">
    <div class="max-w-5xl mx-auto px-6 py-10">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl md:text-3xl font-black tracking-tight">Panel de configuracion</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Preferencias generales y ayuda</p>
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-6 shadow-sm">
          <h2 class="text-sm uppercase tracking-widest font-black text-gray-500 dark:text-gray-400">Interfaz</h2>
          <div class="mt-4 flex items-center justify-between">
            <div>
              <p class="text-sm font-bold">Modo oscuro</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Cambia el estilo de la app</p>
            </div>
            <button @click="toggleTheme" class="h-6 w-11 rounded-full relative transition-colors" :class="isDark ? 'bg-blue-600' : 'bg-gray-300'">
              <div :class="isDark ? 'translate-x-6' : 'translate-x-1'" class="absolute top-1 h-4 w-4 rounded-full bg-white transition-transform shadow-md"></div>
            </button>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-6 shadow-sm">
          <h2 class="text-sm uppercase tracking-widest font-black text-gray-500 dark:text-gray-400">Notificaciones</h2>
          <div class="mt-4 flex items-center justify-between">
            <div>
              <p class="text-sm font-bold">Sonido de alertas</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Activa o desactiva el sonido</p>
            </div>
            <button @click="toggleSound" class="h-6 w-11 rounded-full relative transition-colors" :class="soundEnabled ? 'bg-emerald-600' : 'bg-gray-300'">
              <div :class="soundEnabled ? 'translate-x-6' : 'translate-x-1'" class="absolute top-1 h-4 w-4 rounded-full bg-white transition-transform shadow-md"></div>
            </button>
          </div>
        </div>
      </div>

      <div class="mt-8 grid gap-6 md:grid-cols-2">
        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-6 shadow-sm">
          <h2 class="text-sm uppercase tracking-widest font-black text-gray-500 dark:text-gray-400">Manual de usuario</h2>
          <div class="mt-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p>Pasos rapidos para trabajar en el sistema.</p>
            <ul class="list-disc pl-5">
              <li>Agenda: revisa turnos y arrastra para mover.</li>
              <li>Reservas: crea y edita datos del cliente.</li>
              <li>Historial: consulta cambios y actividad.</li>
              <li>Usuarios: administra accesos del equipo.</li>
            </ul>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-6 shadow-sm">
          <h2 class="text-sm uppercase tracking-widest font-black text-gray-500 dark:text-gray-400">Acerca de</h2>
          <div class="mt-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p>ReservaRosas es un sistema de gestion de turnos para Taller Central.</p>
            <p class="font-bold">Creado por Rodrigo Sayas</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
