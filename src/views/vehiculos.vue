<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const vehiculos = ref<any[]>([])
const historial = ref<any[]>([])
const vehiculoActivo = ref<any | null>(null)
const filtro = ref('')
const cargando = ref(false)

const vehiculosFiltrados = computed(() => {
  if (!filtro.value) return vehiculos.value
  const q = filtro.value.toLowerCase()
  return vehiculos.value.filter(v =>
    (v.matricula || '').toLowerCase().includes(q) ||
    (v.marca || '').toLowerCase().includes(q) ||
    (v.modelo || '').toLowerCase().includes(q) ||
    (v.nombre || '').toLowerCase().includes(q)
  )
})

const cargarVehiculos = async () => {
  cargando.value = true
  try {
    const result = await window.api.obtenerVehiculos()
    vehiculos.value = result || []
    if (!vehiculoActivo.value && vehiculos.value.length > 0) {
      seleccionarVehiculo(vehiculos.value[0])
    }
  } catch (error: any) {
    console.error('[Vehiculos] Error cargando vehiculos:', error)
    alert('Error cargando vehiculos')
  } finally {
    cargando.value = false
  }
}

const cargarHistorial = async (vehiculoId: number) => {
  try {
    const result = await window.api.obtenerHistorialVehiculo(vehiculoId)
    historial.value = result || []
  } catch (error: any) {
    console.error('[Vehiculos] Error cargando historial:', error)
    historial.value = []
  }
}

const seleccionarVehiculo = async (vehiculo: any) => {
  vehiculoActivo.value = vehiculo
  await cargarHistorial(vehiculo.id)
}

const obtenerTipoResumen = (row: any) => {
  if (row?.tipo_turno === 'Garantía') {
    return `Garantía${row.garantia_tipo ? ` - ${row.garantia_tipo}` : ''}`
  }
  if (row?.tipo_turno === 'Particular') {
    return `Particular${row.particular_tipo ? ` - ${row.particular_tipo}` : ''}`
  }
  return row?.tipo_turno || ''
}

const obtenerDetalleResumen = (row: any) => {
  if (row?.tipo_turno === 'Garantía') {
    if (row.garantia_tipo === 'Service') {
      return row.garantia_numero_service ? `Service: ${row.garantia_numero_service}` : ''
    }
    if (row.garantia_tipo === 'Reparación') {
      return row.garantia_problema || ''
    }
  }
  if (row?.tipo_turno === 'Particular') {
    if (row.particular_tipo === 'Taller') {
      return row.detalles || ''
    }
    return 'Mantenimiento programado'
  }
  return row?.detalles || ''
}

const formatearFecha = (fecha: string) => {
  const date = new Date(fecha)
  return date.toLocaleDateString('es-UY', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

onMounted(() => {
  cargarVehiculos()
})
</script>

<template>
  <div class="h-screen flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 bg-gray-50 dark:bg-[#0f172a] gap-4 sm:gap-5 md:gap-6 lg:gap-7 overflow-hidden">
    <header class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-black text-gray-800 dark:text-white tracking-tighter">Historial Base de Datos Gestor</h1>
        <p class="text-gray-500 dark:text-gray-400 font-medium">Registro de motos y servicios por tiempo y KM</p>
      </div>
      <button @click="cargarVehiculos" class="bg-white dark:bg-[#1e293b] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 transition-all font-bold text-sm md:text-base shadow-sm">
        {{ cargando ? 'Cargando...' : 'Actualizar' }}
      </button>
    </header>

    <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 overflow-hidden">
      <div class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col overflow-hidden">
        <div class="p-4 sm:p-5 md:p-6 border-b border-gray-100 dark:border-gray-800">
          <input v-model="filtro" type="text" placeholder="Buscar por matrícula, marca, modelo o cliente..."
            class="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-4 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
        </div>
        <div class="flex-1 overflow-auto custom-scrollbar">
          <div v-for="v in vehiculosFiltrados" :key="v.id"
            @click="seleccionarVehiculo(v)"
            :class="[
              'px-4 sm:px-5 md:px-6 py-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors',
              vehiculoActivo?.id === v.id ? 'bg-cyan-50 dark:bg-cyan-600/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
            ]">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-black text-gray-800 dark:text-gray-100">{{ v.matricula }}</div>
                <div class="text-[11px] text-gray-500 dark:text-gray-400 font-bold">{{ v.marca }} {{ v.modelo }}</div>
                <div class="text-[10px] text-gray-400 dark:text-gray-500">{{ v.nombre }} · {{ v.telefono }}</div>
              </div>
              <div class="text-right text-[10px] text-gray-400 dark:text-gray-500">
                <div>Último</div>
                <div class="font-bold">{{ v.ultima_fecha ? formatearFecha(v.ultima_fecha) : 'Sin registros' }}</div>
                <div>{{ v.ultimo_km ? `${v.ultimo_km} km` : '' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div class="p-4 sm:p-5 md:p-6 border-b border-gray-100 dark:border-gray-800">
          <div class="text-lg font-black text-gray-800 dark:text-white">Detalle del vehículo</div>
          <div v-if="vehiculoActivo" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ vehiculoActivo.matricula }} · {{ vehiculoActivo.marca }} {{ vehiculoActivo.modelo }}
          </div>
        </div>

        <div v-if="!vehiculoActivo" class="flex-1 flex items-center justify-center text-gray-500">
          Selecciona un vehículo para ver su historial
        </div>

        <div v-else class="flex-1 overflow-auto custom-scrollbar">
          <table class="w-full text-left border-separate border-spacing-0">
            <thead class="sticky top-0 z-10 bg-gray-50 dark:bg-[#1e293b] border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th class="p-3 sm:p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                <th class="p-3 sm:p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">KM</th>
                <th class="p-3 sm:p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</th>
                <th class="p-3 sm:p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Detalle</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-for="h in historial" :key="h.id" class="hover:bg-gray-50 dark:hover:bg-white/5">
                <td class="p-3 sm:p-4 text-sm font-bold text-gray-700 dark:text-gray-300">{{ formatearFecha(h.fecha) }}</td>
                <td class="p-3 sm:p-4 text-sm text-gray-600 dark:text-gray-400">{{ h.km || '-' }}</td>
                <td class="p-3 sm:p-4 text-sm text-gray-700 dark:text-gray-300">{{ obtenerTipoResumen(h) }}</td>
                <td class="p-3 sm:p-4 text-sm text-gray-500 dark:text-gray-400">{{ obtenerDetalleResumen(h) }}</td>
              </tr>
              <tr v-if="historial.length === 0">
                <td class="p-4 text-sm text-gray-500" colspan="4">Sin historial para este vehículo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
