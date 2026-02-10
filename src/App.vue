<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { clearSession, getSession, setSession, hasPermission } from './auth'

const isDark = ref(true)
const soundEnabled = ref(true)
const SETTINGS_KEY = 'rr_settings'
const session = ref(null)
const usuariosLogin = ref([])
const loginUser = ref('')
const loginPass = ref('')
const loginError = ref('')
const cargandoLogin = ref(false)
const notifications = ref([])
let notificationSeq = 0

const applyTheme = (value) => {
  isDark.value = value
  document.documentElement.classList.toggle('dark', isDark.value)
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

const toggleTheme = () => {
  saveSettings({ theme: isDark.value ? 'light' : 'dark' })
}

const cargarUsuariosLogin = async () => {
  usuariosLogin.value = await window.api.obtenerUsuariosLogin()
  if (!loginUser.value && usuariosLogin.value.length) {
    loginUser.value = usuariosLogin.value[0].username
  }
}

const iniciarSesion = async () => {
  loginError.value = ''
  cargandoLogin.value = true
  try {
    const result = await window.api.login(loginUser.value, loginPass.value)
    if (!result.ok || !result.user) {
      loginError.value = result.error || 'No se pudo iniciar sesión'
      return
    }
    setSession(result.user)
    session.value = result.user
    loginPass.value = ''
  } finally {
    cargandoLogin.value = false
  }
}

const cerrarSesion = () => {
  clearSession()
  session.value = null
  loginPass.value = ''
}

const puede = (perm) => hasPermission(session.value, perm)

const mostrarLogin = computed(() => !session.value)

const pushNotification = (message, variant = 'info') => {
  const id = ++notificationSeq
  notifications.value.push({ id, message, variant })
  setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }, 6000)
}

onMounted(() => {
  loadSettings()
  document.documentElement.classList.toggle('dark', isDark.value)
  window.ipcRenderer?.send?.('settings:update', {
    theme: isDark.value ? 'dark' : 'light',
    soundEnabled: soundEnabled.value
  })
  session.value = getSession()
  cargarUsuariosLogin()

  const ipc = window.ipcRenderer
  if (ipc?.on) {
    const onReservaNotify = (_event, payload) => {
      const accion = payload?.accion || 'modificada'
      const r = payload?.reserva || {}
      const nombre = r?.nombre || 'Reserva'
      const fecha = r?.fecha ? ` ${r.fecha}` : ''
      const hora = r?.hora ? ` ${r.hora}` : ''
      const tipo = accion === 'creada' ? 'Nueva reserva' : 'Reserva modificada'
      const message = `${tipo}: ${nombre}${fecha}${hora}`.trim()
      pushNotification(message, accion === 'creada' ? 'success' : 'info')
    }

    ipc.on('reservas:notify', onReservaNotify)

    onUnmounted(() => {
      ipc.off('reservas:notify', onReservaNotify)
    })
  }

  const onUiNotify = (event) => {
    const detail = event?.detail || {}
    if (detail.message) {
      pushNotification(String(detail.message), detail.variant || 'info')
    }
  }
  window.addEventListener('ui:notify', onUiNotify)
  const onSettingsEvent = (event) => {
    const detail = event?.detail || {}
    if (detail.theme) {
      applyTheme(detail.theme === 'dark')
    }
    if (typeof detail.soundEnabled !== 'undefined') {
      soundEnabled.value = Boolean(detail.soundEnabled)
    }
  }
  window.addEventListener('rr:settings', onSettingsEvent)
  onUnmounted(() => {
    window.removeEventListener('ui:notify', onUiNotify)
    window.removeEventListener('rr:settings', onSettingsEvent)
  })
})
</script>

<template>
  <div class="flex h-screen w-screen bg-gray-50 dark:bg-[#0f172a] overflow-hidden text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans">

    <aside class="w-72 bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-xl z-20">
      
      <div class="p-8 pb-6 border-b border-gray-100 dark:border-gray-800 flex justify-center">
        <svg viewBox="0 0 350 150" class="w-full h-auto drop-shadow-md hover:scale-[1.02] transition-transform duration-500">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
            </linearGradient>
          </defs>
          <g transform="skewX(-12)">
            <rect x="10" y="10" width="330" height="130" rx="12" fill="none" stroke="url(#logoGrad)" stroke-width="6"/>
            <text x="35" y="92" font-family="Impact, sans-serif" font-weight="900" font-size="80" fill="url(#logoGrad)" letter-spacing="-2">ROSAS</text>
            <text x="175" y="112" font-family="Arial, sans-serif" font-weight="800" font-size="24" fill="#16a34a">ACTITUD</text>
            <text x="175" y="135" font-family="Arial, sans-serif" font-weight="800" font-size="24" fill="#16a34a">DEPORTIVA</text>
            <text x="45" y="140" font-family="Impact, sans-serif" font-weight="900" font-size="55" fill="url(#logoGrad)">UY</text>
          </g>
        </svg>
      </div>

      <nav class="flex-1 px-4 py-6 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        
        <div class="px-4 mb-2 mt-1">
            <span class="text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500">Principal</span>
        </div>

        <router-link v-if="puede('agenda')" to="/" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 group',
            isActive 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-blue-600'
          ]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>Agenda</span>
          </div>
        </router-link>

        <router-link v-if="puede('reservas')" to="/reservas" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 group',
            isActive 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-blue-600'
          ]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
            <span>Panel Reservas</span>
          </div>
        </router-link>

        <router-link v-if="puede('ajustes')" to="/ajustes" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 group',
            isActive 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-blue-600'
          ]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Ajustes de horarios</span>
          </div>
        </router-link>

        <div class="my-3 mx-4 border-t border-gray-100 dark:border-gray-800/60"></div>
        <div class="px-4 mb-2">
            <span class="text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500">Gestión</span>
        </div>

        <router-link v-if="puede('historial')" to="/historial" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 group',
            isActive 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-blue-600'
          ]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span>Historial</span>
          </div>
        </router-link>

        <router-link v-if="puede('vehiculos')" to="/vehiculos" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 group',
            isActive 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-blue-600'
          ]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
            <span>Historial BD Gestor</span>
          </div>
        </router-link>

        <div class="my-3 mx-4 border-t border-gray-100 dark:border-gray-800/60"></div>
        <div class="px-4 mb-2">
            <span class="text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500">Sistema</span>
        </div>

        <router-link v-if="puede('config')" to="/config" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 group',
            isActive 
              ? 'bg-slate-700 text-white shadow-md' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-blue-600'
          ]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Configuración DB</span>
          </div>
        </router-link>

        <router-link to="/panel" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 group',
            isActive 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-blue-600'
          ]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V8m6 6a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V8m6 6a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V8"/></svg>
            <span>Panel Configuracion</span>
          </div>
        </router-link>

        <router-link v-if="puede('usuarios')" to="/usuarios" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 group',
            isActive 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-blue-600'
          ]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            <span>Usuarios</span>
          </div>
        </router-link>

        <router-link v-if="puede('auditoria')" to="/auditoria" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 group',
            isActive 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-blue-600'
          ]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m2 10H7a2 2 0 01-2-2V4a2 2 0 012-2h5l5 5v13a2 2 0 01-2 2z"/></svg>
            <span>Auditoria</span>
          </div>
        </router-link>

      </nav>

      <div class="p-6 bg-gray-50/50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-800 space-y-4">
        
        <button @click="toggleTheme" class="w-full flex items-center justify-between p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-lg transition-colors group">
          <span class="text-[11px] font-black text-gray-400 group-hover:text-blue-500 uppercase transition-colors">Modo Interfaz</span>
          <div class="h-6 w-11 rounded-full relative transition-colors" :class="isDark ? 'bg-blue-600' : 'bg-gray-300'">
            <div :class="isDark ? 'translate-x-6' : 'translate-x-1'" class="absolute top-1 h-4 w-4 rounded-full bg-white transition-transform shadow-md flex items-center justify-center">
                 <span class="text-[8px] leading-none select-none">{{ isDark ? '' : '☀️' }}</span>
            </div>
          </div>
        </button>

        <div class="flex items-center gap-3 px-1">
           <div class="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20">
            {{ session?.nombre?.charAt(0)?.toUpperCase() || 'A' }}
          </div>
          <div class="flex flex-col min-w-0 flex-1">
            <span class="text-xs font-black truncate text-gray-700 dark:text-gray-200 tracking-tight">{{ session?.nombre || 'Sin sesion' }}</span>
            <button v-if="session" @click="cerrarSesion" class="text-[9px] text-left font-bold text-rose-500 hover:text-rose-400 uppercase tracking-widest transition-colors mt-0.5">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </aside>

    <main class="flex-1 overflow-hidden h-full w-full bg-white dark:bg-[#0f172a] relative">
      <div class="w-full h-full overflow-hidden">
        <router-view />
      </div>
    </main>
  </div>

  <div class="fixed top-4 right-4 z-[70] w-[360px] max-w-[92vw] space-y-3">
    <div v-for="n in notifications" :key="n.id"
      class="rounded-xl border border-white/10 bg-slate-950/90 text-white shadow-xl backdrop-blur px-4 py-3">
      <div class="flex items-start gap-3">
        <div
          class="mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-black"
          :class="n.variant === 'success' ? 'bg-emerald-600' : 'bg-blue-600'"
        >
          {{ n.variant === 'success' ? 'OK' : 'UP' }}
        </div>
        <div class="flex-1 text-[12px] font-bold leading-snug">{{ n.message }}</div>
      </div>
    </div>
  </div>

  <div v-if="mostrarLogin" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"></div>
    <div class="relative w-[480px] max-w-full rounded-3xl border border-white/10 bg-[#0f172a]/90 p-10 shadow-2xl text-white">
      
      <div class="flex justify-center mb-8">
         <svg viewBox="0 0 350 150" class="w-40 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          <g transform="skewX(-12)">
            <rect x="10" y="10" width="330" height="130" rx="12" fill="none" stroke="#22c55e" stroke-width="8"/>
            <text x="35" y="95" font-family="Impact" font-size="85" fill="#22c55e">ROSAS</text>
          </g>
        </svg>
      </div>

      <h3 class="text-2xl font-black tracking-tight text-center">Acceso al Sistema</h3>
      <p class="text-xs text-slate-400 mt-2 text-center uppercase tracking-widest mb-8">Credenciales de seguridad</p>

      <div class="space-y-5">
        <div>
          <label class="block text-[10px] uppercase tracking-widest text-blue-400 font-black mb-2 px-1">Usuario</label>
          <div class="relative">
            <select v-model="loginUser" class="w-full rounded-2xl bg-slate-900/50 border border-slate-700 px-5 py-4 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none transition-all cursor-pointer hover:bg-slate-800/50">
                <option v-for="u in usuariosLogin" :key="u.id" :value="u.username">{{ u.nombre || u.username }}</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-[10px] uppercase tracking-widest text-blue-400 font-black mb-2 px-1">Contraseña</label>
          <input v-model="loginPass" type="password" placeholder="••••••••"
            class="w-full rounded-2xl bg-slate-900/50 border border-slate-700 px-5 py-4 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600" />
        </div>

        <div v-if="loginError" class="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
            <span class="text-xs text-rose-400 font-bold">{{ loginError }}</span>
        </div>

        <button @click="iniciarSesion" :disabled="cargandoLogin"
          class="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-2">
          {{ cargandoLogin ? 'Verificando...' : 'Ingresar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Transición Fade para Router View */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Scrollbar fina y estética para el menú */
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);
}
</style>

