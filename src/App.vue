<script setup>
import { ref, onMounted, computed } from 'vue'
import { clearSession, getSession, setSession, hasPermission } from './auth'

const isDark = ref(true)
const session = ref(null)
const usuariosLogin = ref([])
const loginUser = ref('')
const loginPass = ref('')
const loginError = ref('')
const cargandoLogin = ref(false)

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
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

onMounted(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
  session.value = getSession()
  cargarUsuariosLogin()
})
</script>

<template>
  <div
    class="flex h-screen w-screen bg-gray-50 dark:bg-[#0f172a] overflow-hidden text-gray-900 dark:text-gray-100 transition-colors duration-300">

    <aside
      class="w-64 bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
      <div class="p-8 text-xl font-black border-b border-gray-100 dark:border-gray-800 tracking-tighter italic">
        LOGO PRINCIPAL ReserveRosas
      </div>

      <nav class="flex-1 p-4 flex flex-col gap-2">

        <router-link v-if="puede('agenda')" to="/" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-sm border-r-4 border-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
          ]">
            <span class="text-lg">Icono</span>
            <span>Agenda</span>
          </div>
        </router-link>

        <router-link v-if="puede('reservas')" to="/reservas" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-sm border-r-4 border-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
          ]">
            <span class="text-lg">Icono</span>
            <span>Panel Reservas</span>
          </div>
        </router-link>

        <router-link v-if="puede('ajustes')" to="/ajustes" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-sm border-r-4 border-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
          ]">
            <span class="text-lg">Icono</span>
            <span>Ajustes de horarios</span>
          </div>
        </router-link>

        <router-link v-if="puede('historial')" to="/historial" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-sm border-r-4 border-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
          ]">
            <span class="text-lg">Icono</span>
            <span>Historial</span>
          </div>
        </router-link>

        <router-link v-if="puede('vehiculos')" to="/vehiculos" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-sm border-r-4 border-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
          ]">
            <span class="text-lg">Icono</span>
            <span>Historial BD Gestor</span>
          </div>
        </router-link>

        <router-link v-if="puede('config')" to="/config" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-sm border-r-4 border-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
          ]">
            <span class="text-lg">Icono</span>
            <span>Configuracion DB</span>
          </div>
        </router-link>

        <router-link v-if="puede('usuarios')" to="/usuarios" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-sm border-r-4 border-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
          ]">
            <span class="text-lg">icono</span>
            <span>Usuarios</span>
          </div>
        </router-link>

      </nav>

      <div class="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
        <div class="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800/50 rounded-2xl">
          <span class="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 ml-1">Modo Oscuro</span>
          <button @click="toggleTheme"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
            :class="isDark ? 'bg-blue-600' : 'bg-gray-300'">
            <span :class="isDark ? 'translate-x-6' : 'translate-x-1'"
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md">
            </span>
          </button>
        </div>
        <div class="flex items-center justify-between p-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div class="text-xs font-bold text-gray-600 dark:text-gray-300">
            {{ session?.nombre || 'Sin sesion' }}
          </div>
          <button v-if="session" @click="cerrarSesion"
            class="text-[10px] uppercase tracking-widest font-black text-rose-500 hover:text-rose-400">
            Cerrar sesion
          </button>
        </div>
      </div>
    </aside>

    <main class="flex-1 overflow-hidden h-full w-full">
      <div class="w-full h-full overflow-hidden">
        <router-view />
      </div>
    </main>
  </div>

  <div v-if="mostrarLogin" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
    <div class="relative w-[480px] max-w-[90vw] rounded-3xl border border-white/10 bg-[#0b1220]/90 p-8 shadow-2xl text-white">
      <h3 class="text-2xl font-black tracking-tight">Iniciar sesion</h3>
      <p class="text-sm text-slate-300 mt-1">Selecciona tu usuario y escribe tu contrasena.</p>

      <div class="mt-6 space-y-4">
        <div>
          <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Usuario</label>
          <select v-model="loginUser"
            class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100">
            <option v-for="u in usuariosLogin" :key="u.id" :value="u.username">{{ u.nombre }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Contrasena</label>
          <input v-model="loginPass" type="password"
            class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
        </div>
        <div v-if="loginError" class="text-xs text-rose-400">{{ loginError }}</div>
        <button @click="iniciarSesion" :disabled="cargandoLogin"
          class="w-full py-3 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
          {{ cargandoLogin ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </div>
    </div>
  </div>
</template>
