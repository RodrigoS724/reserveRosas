<script setup lang="ts">
import { ref } from 'vue'

const diasSemana = ref([
  { id: 0, nombre: 'Lunes', fecha: '19 Ene', reservas: [
    { id: 1, cliente: 'Juan Pérez', moto: 'Honda CB500', tipo: 'Service', hora: '08:00' },
    { id: 2, cliente: 'Raúl Rossi', moto: 'Yamaha MT-07', tipo: 'Frenos', hora: '10:00' }
  ]},
  { id: 1, nombre: 'Martes', fecha: '20 Ene', reservas: [
    { id: 3, cliente: 'Ana López', moto: 'BMW G310', tipo: 'Cubiertas', hora: '09:00' }
  ]},
  { id: 2, nombre: 'Miércoles', fecha: '21 Ene', reservas: [] },
  { id: 3, nombre: 'Jueves', fecha: '22 Ene', reservas: [
    { id: 4, cliente: 'Carlos Meira', moto: 'Kawasaki Z400', tipo: 'Motor', hora: '14:00' }
  ]},
  { id: 4, nombre: 'Viernes', fecha: '23 Ene', reservas: [] },
])

// Lógica de Arrastrar
const reservaArrastrada = ref<any>(null)
const diaOrigenId = ref<number | null>(null)

const iniciarArrastre = (reserva: any, diaId: number) => {
  reservaArrastrada.value = reserva
  diaOrigenId.value = diaId
}

const soltarEnDia = (diaDestinoId: number) => {
  if (reservaArrastrada.value && diaOrigenId.value !== null) {
    // 1. Quitar del día de origen
    const origen = diasSemana.value.find(d => d.id === diaOrigenId.value)
    origen.reservas = origen.reservas.filter(r => r.id !== reservaArrastrada.value.id)

    // 2. Agregar al día de destino
    const destino = diasSemana.value.find(d => d.id === diaDestinoId)
    destino.reservas.push(reservaArrastrada.value)

    // Limpiar
    reservaArrastrada.value = null
    diaOrigenId.value = null
  }
}
</script>

<template>
  <div class="h-full flex flex-col p-2">
    <div class="mb-8">
      <h2 class="text-3xl font-black text-gray-800 dark:text-white">Planificación Semanal</h2>
      <p class="text-gray-500">Arrastrá los turnos para reprogramar</p>
    </div>

    <div class="flex-1 flex gap-4 overflow-x-auto pb-6 custom-scrollbar">
      <div v-for="dia in diasSemana" :key="dia.id" 
           @dragover.prevent 
           @drop="soltarEnDia(dia.id)"
           class="flex-shrink-0 w-72 flex flex-col bg-gray-100/50 dark:bg-gray-800/40 rounded-3xl border-2 border-transparent hover:border-blue-400/30 transition-all">
        
        <div class="p-5 flex justify-between items-center">
          <span class="font-black text-gray-400 uppercase text-[10px] tracking-tighter">{{ dia.nombre }}</span>
          <span class="text-xs font-bold text-blue-500">{{ dia.fecha }}</span>
        </div>

        <div class="p-3 flex-1 space-y-3">
          <div v-for="reserva in dia.reservas" :key="reserva.id"
               draggable="true"
               @dragstart="iniciarArrastre(reserva, dia.id)"
               class="bg-white dark:bg-[#1e293b] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:shadow-xl transition-all group">
            
            <div class="flex justify-between mb-2">
              <span class="text-[10px] font-bold text-blue-500">{{ reserva.hora }}</span>
              <div class="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <h5 class="font-bold text-gray-800 dark:text-white">{{ reserva.cliente }}</h5>
            <p class="text-xs text-gray-500 mt-1 italic">🏍️ {{ reserva.moto }}</p>
          </div>

          <div v-if="dia.reservas.length === 0" class="h-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-center">
             <span class="text-[10px] font-bold text-gray-300 uppercase">Espacio libre</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>