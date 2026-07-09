<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const logoPrincipalUrl = new URL('../assets/Logo_principal.png', import.meta.url).href

const router = useRouter()
const now = ref(new Date())
let timer: number | null = null

const dayLabel = computed(() => now.value.toLocaleDateString('es-UY', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric'
}))

const timeLabel = computed(() => now.value.toLocaleTimeString('es-UY', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}))

const irAgenda = () => {
  router.push('/agenda')
}

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<template>
  <div class="h-full w-full relative overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#ecfdf5] to-[#dbeafe] dark:from-[#0b1220] dark:via-[#0f172a] dark:to-[#0a2d26]">
    <div class="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl"></div>
    <div class="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"></div>

    <div class="relative h-full flex items-center justify-center px-6">
      <section class="w-full max-w-5xl rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl p-8 sm:p-10 md:p-14">
        <div class="flex flex-col items-center text-center gap-7">
          <button
            type="button"
            @click="irAgenda"
            class="group rounded-3xl p-4 sm:p-5 border border-emerald-200/60 dark:border-emerald-700/40 bg-white/80 dark:bg-slate-800/70 hover:scale-[1.02] transition-all shadow-lg"
            title="Entrar a Agenda"
          >
            <img :src="logoPrincipalUrl" alt="Logo principal" class="w-[220px] sm:w-[280px] md:w-[320px] h-auto drop-shadow-[0_8px_18px_rgba(16,185,129,0.35)]" />
          </button>

          <h1 class="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            Bienvenido
          </h1>

          <p class="text-lg sm:text-2xl md:text-3xl font-bold capitalize text-emerald-700 dark:text-emerald-300">
            {{ dayLabel }}
          </p>

          <p class="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-cyan-700 dark:text-cyan-300 tabular-nums">
            {{ timeLabel }}
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
