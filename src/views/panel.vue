<script setup>
import { ref, onMounted } from 'vue'
import { api, ipc } from '../api'
import { getSession } from '../auth'

const SETTINGS_KEY = 'rr_settings'
const isDark = ref(true)
const soundEnabled = ref(true)
const session = ref(getSession())

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const cambiandoPassword = ref(false)
const passwordStatus = ref('')
const passwordStatusOk = ref(true)

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
  ipc?.send?.('settings:update', next)
  window.dispatchEvent(new CustomEvent('rr:settings', { detail: next }))
}

const toggleTheme = () => {
  saveSettings({ theme: isDark.value ? 'light' : 'dark' })
}

const toggleSound = () => {
  saveSettings({ soundEnabled: !soundEnabled.value })
}

const cambiarPassword = async () => {
  passwordStatus.value = ''
  passwordStatusOk.value = true

  const user = session.value
  if (!user?.username) {
    passwordStatus.value = 'No hay sesion activa para cambiar la contrasena'
    passwordStatusOk.value = false
    return
  }
  if (!currentPassword.value) {
    passwordStatus.value = 'Ingresa tu contrasena actual'
    passwordStatusOk.value = false
    return
  }
  if (newPassword.value.length < 8) {
    passwordStatus.value = 'La nueva contrasena debe tener al menos 8 caracteres'
    passwordStatusOk.value = false
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordStatus.value = 'La confirmacion no coincide con la nueva contrasena'
    passwordStatusOk.value = false
    return
  }
  if (currentPassword.value === newPassword.value) {
    passwordStatus.value = 'La nueva contrasena debe ser distinta de la actual'
    passwordStatusOk.value = false
    return
  }

  cambiandoPassword.value = true
  try {
    await api.cambiarPasswordPropia({
      username: user.username,
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    passwordStatus.value = 'Contrasena actualizada correctamente'
    passwordStatusOk.value = true
  } catch (error) {
    passwordStatus.value = error?.message || 'No se pudo cambiar la contrasena'
    passwordStatusOk.value = false
  } finally {
    cambiandoPassword.value = false
  }
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
        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] p-6 shadow-sm md:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm uppercase tracking-widest font-black text-gray-500 dark:text-gray-400">Seguridad</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Cambio de contrasena del usuario activo.</p>
            </div>
            <span class="text-xs font-black uppercase tracking-widest text-blue-500">@{{ session?.username || 'sin-sesion' }}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Contrasena actual</label>
              <input
                v-model="currentPassword"
                type="password"
                autocomplete="current-password"
                class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Nueva contrasena</label>
              <input
                v-model="newPassword"
                type="password"
                autocomplete="new-password"
                class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Confirmar nueva contrasena</label>
              <input
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between gap-3">
            <div :class="passwordStatusOk ? 'text-emerald-500 text-xs' : 'text-rose-500 text-xs'">{{ passwordStatus }}</div>
            <button
              @click="cambiarPassword"
              :disabled="cambiandoPassword"
              class="px-5 py-3 rounded-xl bg-emerald-600 text-white font-black uppercase tracking-widest text-xs shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {{ cambiandoPassword ? 'Actualizando...' : 'Actualizar contrasena' }}
            </button>
          </div>
        </div>

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
