<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Datos que vienen de la agenda
const fecha = route.query.fecha || '2026-01-21'
const hora = route.query.hora || '08:00'

// Estado para el tipo de servicio seleccionado
const tipoServicio = ref('Service') // Por defecto
</script>

<template>
  <div class="max-w-4xl mx-auto animate-in fade-in duration-500">
    <button @click="router.back()" class="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-6 font-medium group">
      <span class="group-hover:-translate-x-1 transition-transform">←</span> Volver a la agenda
    </button>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <div class="space-y-6">
        <div class="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
          <h3 class="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Resumen de Cita</h3>
          <div class="space-y-4">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-2xl">📅</div>
              <div>
                <p class="text-xs text-gray-500 font-bold uppercase">Fecha</p>
                <p class="text-gray-800 dark:text-white font-bold">{{ fecha }}</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-2xl">🕒</div>
              <div>
                <p class="text-xs text-gray-500 font-bold uppercase">Horario</p>
                <p class="text-gray-800 dark:text-white font-bold">{{ hora }} hs</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-blue-600 p-6 rounded-2xl shadow-lg text-white">
          <p class="text-sm opacity-80 mb-1 font-medium">Ubicación</p>
          <p class="font-bold flex items-center gap-2">📍 Taller Central Rosas</p>
        </div>
      </div>

      <div class="lg:col-span-2 bg-white dark:bg-[#1e293b] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-8 text-balance">Datos de la Reserva</h2>
        
        <form class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-xs font-black text-gray-400 uppercase ml-1">Nombre Completo</label>
              <input type="text" placeholder="Ej: Rodrigo Rosas" class="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white">
            </div>
            <div class="space-y-2">
              <label class="text-xs font-black text-gray-400 uppercase ml-1">Cédula de Identidad</label>
              <input type="text" placeholder="1.234.567-8" class="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white">
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="space-y-2">
              <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Marca</label>
              <input type="text" class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-blue-500 outline-none dark:text-white">
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Modelo</label>
              <input type="text" class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-blue-500 outline-none dark:text-white">
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-black text-gray-400 uppercase ml-1">KM</label>
              <input type="number" class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-blue-500 outline-none dark:text-white">
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Matrícula</label>
              <input type="text" class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-blue-500 outline-none dark:text-white">
            </div>
          </div>

          <div class="space-y-3">
            <label class="text-xs font-black text-gray-400 uppercase ml-1 text-balance">Tipo de Turno</label>
            <div class="grid grid-cols-3 gap-3">
              <button v-for="t in ['Service', 'Garantía', 'Taller']" :key="t" 
                type="button"
                @click="tipoServicio = t"
                :class="[
                  'p-4 rounded-xl border-2 font-bold transition-all text-sm text-balance',
                  tipoServicio === t 
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'
                ]">
                {{ t }}
              </button>
            </div>
          </div>

          <div class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 min-h-[100px] flex flex-col justify-center">
            
            <p v-if="tipoServicio === 'Service'" class="text-gray-500 dark:text-gray-400 text-sm text-center italic text-balance">
              Mantenimiento programado según manual de fabricante.
            </p>

            <div v-if="tipoServicio === 'Garantía'" class="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <input type="text" placeholder="Número de Factura de Compra" class="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none dark:text-white">
              <textarea placeholder="Describa el inconveniente por garantía..." class="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none dark:text-white h-24"></textarea>
            </div>

            <div v-if="tipoServicio === 'Taller'" class="animate-in slide-in-from-top-2 duration-300">
              <textarea placeholder="Describa el problema o reparación a realizar..." class="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none dark:text-white h-32"></textarea>
            </div>
          </div>

          <button type="submit" class="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] uppercase tracking-wider">
            Confirmar Reserva
          </button>
        </form>
      </div>
    </div>
  </div>
</template>