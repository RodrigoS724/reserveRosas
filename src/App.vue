<script setup>
import { ref, onMounted } from 'vue'

const isDark = ref(true)

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

onMounted(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
})
</script>

<template>
  <div
    class="flex h-screen w-full bg-gray-50 dark:bg-[#0f172a] overflow-hidden text-gray-900 dark:text-gray-100 transition-colors duration-300">

    <aside
      class="w-64 bg-white dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
      <div class="p-8 text-xl font-black border-b border-gray-100 dark:border-gray-800 tracking-tighter italic">
        🏍️ ReserveRosas
      </div>

      <nav class="flex-1 p-4 flex flex-col gap-2">

        <router-link to="/" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-sm border-r-4 border-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
          ]">
            <span class="text-lg">📅</span>
            <span>Agenda</span>
          </div>
        </router-link>

        <router-link to="/reservas" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-sm border-r-4 border-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
          ]">
            <span class="text-lg">📋</span>
            <span>Panel Reservas</span>
          </div>
        </router-link>

        <router-link to="/ajustes" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-sm border-r-4 border-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
          ]">
            <span class="text-lg">⏱️</span>
            <span>Ajustes de horarios</span>
          </div>
        </router-link>

        <router-link to="/historial" v-slot="{ isActive }">
          <div :class="[
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer',
            isActive
              ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-sm border-r-4 border-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600'
          ]">
            <span class="text-lg">📊</span>
            <span>Historial</span>
          </div>
        </router-link>

      </nav>

      <div class="p-4 border-t border-gray-100 dark:border-gray-800">
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
      </div>
    </aside>

    <main class="flex-1 p-8 overflow-y-auto">
      <div class="max-w-7xl mx-auto">
        <router-view />
      </div>
    </main>
  </div>
</template>