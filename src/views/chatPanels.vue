<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() => String(route.meta.title || 'Panel').trim())
const subtitle = computed(() => String(route.meta.subtitle || 'Se gestiona desde el chat service independiente.').trim())
const accent = computed(() => route.path === '/pedidos-repuestos' ? 'from-amber-500 to-orange-500' : 'from-cyan-500 to-blue-500')
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_28%),linear-gradient(135deg,#07111c_0%,#0f172a_45%,#08111f_100%)] px-4 py-4 sm:px-6 sm:py-6 text-slate-100">
    <div class="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-7">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">
            Chat Service
          </div>
          <h1 class="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {{ title }}
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            {{ subtitle }}
          </p>
        </div>
        <div class="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-200">
          Separado de la app principal
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-[1.3fr_.9fr]">
        <section class="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 shadow-lg shadow-slate-950/20">
          <div class="flex items-center gap-3">
            <div :class="['h-12 w-12 rounded-2xl bg-gradient-to-br', accent, 'shadow-lg']"></div>
            <div>
              <h2 class="text-xl font-black text-white">Próxima integración</h2>
              <p class="text-sm text-slate-400">Estos paneles consumirán el servicio de chat y pedidos sin cargar la API principal.</p>
            </div>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Canal</div>
              <div class="mt-1 text-sm font-semibold text-white">{{ title }}</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Estado</div>
              <div class="mt-1 text-sm font-semibold text-white">Disponible para conectar</div>
            </div>
          </div>

          <div class="mt-5 rounded-2xl border border-dashed border-white/15 bg-slate-950/50 p-5 text-sm leading-6 text-slate-300">
            Cuando terminemos la integración, acá se listarán las conversaciones y pedidos correspondientes. La idea es mantener esta lógica fuera de la API principal para no sobrecargarla.
          </div>
        </section>

        <aside class="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
          <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Acciones</div>
          <div class="mt-4 space-y-3 text-sm text-slate-300">
            <div class="rounded-2xl border border-white/10 bg-slate-950/50 p-4">Mensajes directos entre usuarios</div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/50 p-4">Pedidos de moto y seguimiento</div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/50 p-4">Pedidos de repuestos y control</div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>