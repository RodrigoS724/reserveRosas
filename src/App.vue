<script setup>
import { ref, onMounted } from 'vue'

const isDark = ref(true)

const toggleTheme = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

onMounted(() => {
  // Verificamos si ya está en modo oscuro o lo forzamos
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})
</script>

<template>
  <div
    class="flex min-h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 transition-colors duration-300">

    <aside
      class="w-64 bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
      <div class="p-6 text-xl font-bold border-b border-gray-100 dark:border-gray-800">
        🏍️ ReserveRosas
      </div>

      <nav class="flex-1 p-4 space-y-2">
        <router-link to="/"
          class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium">
          📅 Agenda
        </router-link>
        <router-link to="/reservas"
          class="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white px-4 py-2 rounded-xl text-sm font-black hover:bg-blue-600 hover:text-white transition-all shadow-sm">
          📋 Panel de Reservas
        </router-link>
      </nav>

      <div class="p-4 border-t border-gray-100 dark:border-gray-800">
        <div class="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-xl transition-colors">
          <span class="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 ml-2">Modo</span>
          <button @click="toggleTheme"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
            :class="isDark ? 'bg-blue-600' : 'bg-gray-300'">
            <span :class="isDark ? 'translate-x-6' : 'translate-x-1'"
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm">
            </span>
          </button>
        </div>
      </div>
    </aside>

    <main class="flex-1 p-8">
      <router-view />
    </main>
  </div>
</template>