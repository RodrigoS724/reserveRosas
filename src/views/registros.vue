<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '../api'

type RegistroStats = {
  reservas: {
    total: number
    garantia: number
    particular: number
    otros: number
    garantia_service: number
    garantia_reparacion: number
    particular_service: number
    particular_taller: number
  }
  aprontes: {
    total: number
    estados: Record<string, number>
  }
  porDia: Array<{ fecha: string; reservas: number; aprontes: number }>
}

type RegistroMensual = {
  mes: string
  rango: { desde: string; hasta: string }
  reservas: any[]
  aprontes: any[]
  stats: RegistroStats
}

const today = new Date()
const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

const mes = ref(defaultMonth)
const cargando = ref(false)
const error = ref('')
const datos = ref<RegistroMensual | null>(null)

const emptyStats: RegistroStats = {
  reservas: {
    total: 0,
    garantia: 0,
    particular: 0,
    otros: 0,
    garantia_service: 0,
    garantia_reparacion: 0,
    particular_service: 0,
    particular_taller: 0
  },
  aprontes: { total: 0, estados: {} },
  porDia: []
}

const formatNumber = (n: number) => new Intl.NumberFormat('es-UY').format(n || 0)
const formatPercent = (value: number, total: number) => {
  if (!total) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

const monthLabel = computed(() => {
  const [y, m] = mes.value.split('-').map(Number)
  const d = new Date(Number.isFinite(y) ? y : today.getFullYear(), (Number.isFinite(m) ? m - 1 : today.getMonth()), 1)
  return d.toLocaleDateString('es-UY', { month: 'long', year: 'numeric' })
})

const stats = computed(() => datos.value?.stats || emptyStats)
const statsReservas = computed(() => stats.value.reservas)
const statsAprontes = computed(() => stats.value.aprontes)
const diario = computed(() => stats.value.porDia || [])
const totalReservas = computed(() => statsReservas.value.total || 0)
const totalAprontes = computed(() => statsAprontes.value.total || 0)
const totalMovimientos = computed(() => totalReservas.value + totalAprontes.value)
const diasMes = computed(() => Math.max(diario.value.length, 1))
const promedioDiario = computed(() => Math.round(totalMovimientos.value / diasMes.value))
const maxDiario = computed(() => {
  const max = Math.max(...diario.value.map((d) => (d.reservas || 0) + (d.aprontes || 0)), 1)
  return max
})
const picoDia = computed(() => {
  if (!diario.value.length) return null
  return diario.value.reduce((acc, d) => {
    const total = (d.reservas || 0) + (d.aprontes || 0)
    if (!acc || total > acc.total) return { ...d, total }
    return acc
  }, null as any)
})

const distribucionTipos = computed(() => {
  const s = statsReservas.value
  const total = Math.max(s.total, 1)
  return [
    { label: 'Particular (total)', valor: s.particular, percent: Math.round((s.particular * 100) / total), color: 'from-emerald-600 to-emerald-400' },
    { label: '• Particular Service', valor: s.particular_service, percent: Math.round((s.particular_service * 100) / total), color: 'from-green-500 to-emerald-300' },
    { label: '• Particular Taller', valor: s.particular_taller, percent: Math.round((s.particular_taller * 100) / total), color: 'from-sky-500 to-cyan-300' },
    { label: 'Garantia (total)', valor: s.garantia, percent: Math.round((s.garantia * 100) / total), color: 'from-amber-500 to-orange-400' },
    { label: '• Garantia Service', valor: s.garantia_service, percent: Math.round((s.garantia_service * 100) / total), color: 'from-amber-400 to-amber-200' },
    { label: '• Garantia Reparacion', valor: s.garantia_reparacion, percent: Math.round((s.garantia_reparacion * 100) / total), color: 'from-red-500 to-rose-300' },
    { label: 'Otros', valor: s.otros, percent: Math.round((s.otros * 100) / total), color: 'from-slate-500 to-slate-400' }
  ].filter((item) => item.valor > 0 || total === 0)
})

const estadosApronteLista = computed(() => {
  const est = statsAprontes.value.estados || {}
  const entries = Object.entries(est).map(([estado, valor]) => ({ estado, valor }))
  entries.sort((a, b) => b.valor - a.valor)
  return entries
})

const reservasPreview = computed(() => (datos.value?.reservas || []).slice(0, 60))
const aprontesPreview = computed(() => (datos.value?.aprontes || []).slice(0, 60))

const tipoReservaClase = (r: any) => {
  const tipo = String(r?.tipo_turno || '').toLowerCase()
  if (tipo === 'garantia') return 'bg-amber-500/15 text-amber-700 dark:text-amber-200'
  if (tipo === 'particular') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
  return 'bg-blue-500/15 text-blue-700 dark:text-blue-200'
}

const estadoApronteClase = (estado: string) => {
  const key = String(estado || '').toUpperCase()
  if (key.includes('ENTREGADA')) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
  if (key.includes('GARANTIA')) return 'bg-amber-500/15 text-amber-700 dark:text-amber-200'
  return 'bg-blue-500/15 text-blue-700 dark:text-blue-200'
}

const formatFechaCorta = (iso: string) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' })
}

const cargarRegistros = async () => {
  cargando.value = true
  error.value = ''
  try {
    const data = await api.obtenerRegistroMensual({ mes: mes.value })
    datos.value = data
  } catch (err: any) {
    console.error('[Registros] Error cargando:', err)
    error.value = err?.message || 'No se pudo cargar el registro mensual'
    datos.value = null
  } finally {
    cargando.value = false
  }
}

const downloadCsv = () => {
  if (!datos.value) return
  const rows: string[][] = []
  rows.push(['Categoria', 'ID', 'Nombre', 'Fecha', 'Hora', 'Tipo', 'Subtipo/Estado', 'Marca', 'Modelo', 'Matricula/Factura', 'Telefono/Localidad'])

  for (const r of datos.value.reservas || []) {
    rows.push([
      'Reserva',
      String(r.id ?? ''),
      r.nombre || '',
      r.fecha || '',
      r.hora || '',
      r.tipo_turno || '',
      r.garantia_tipo || r.particular_tipo || '',
      r.marca || '',
      r.modelo || '',
      r.matricula || '',
      r.telefono || ''
    ])
  }

  for (const a of datos.value.aprontes || []) {
    rows.push([
      'Apronte',
      String(a.id ?? ''),
      a.nombre || '',
      a.fecha || '',
      a.hora || '',
      a.estado || '',
      a.observaciones || '',
      a.marca || '',
      a.modelo || '',
      a.factura || '',
      a.localidad || a.telefono || ''
    ])
  }

  const escapeCell = (value: any) => {
    const cell = value == null ? '' : String(value)
    if (/[";\n]/.test(cell)) {
      return '"' + cell.replace(/"/g, '""') + '"'
    }
    return cell
  }

  const csv = rows.map((row) => row.map(escapeCell).join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `registros-${mes.value || 'mes'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

watch(mes, () => {
  cargarRegistros()
})

onMounted(() => {
  cargarRegistros()
})
</script>

<template>
  <div class="h-screen w-full overflow-auto bg-gray-50 dark:bg-[#0f172a] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8">
    <div class="max-w-7xl mx-auto space-y-6">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-gray-50">
            Registros mensuales
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Aprontes + reservas con breakdown por tipo y exportacion Excel (CSV)
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <label class="text-[10px] uppercase tracking-widest font-black text-gray-400">Mes</label>
          <input v-model="mes" type="month" class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold" />
          <button @click="cargarRegistros" :disabled="cargando" class="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 disabled:opacity-60">
            {{ cargando ? 'Actualizando...' : 'Refrescar' }}
          </button>
          <button @click="downloadCsv" :disabled="!datos" class="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 disabled:opacity-60">
            Exportar Excel
          </button>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b]/70 p-4 shadow-sm">
          <p class="text-[11px] font-black uppercase tracking-widest text-gray-400">Reservas del mes</p>
          <h3 class="text-3xl font-black text-gray-900 dark:text-gray-50 mt-2">{{ formatNumber(totalReservas) }}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Garantia {{ formatNumber(statsReservas.garantia) }} / Particular {{ formatNumber(statsReservas.particular) }}</p>
        </div>
        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b]/70 p-4 shadow-sm">
          <p class="text-[11px] font-black uppercase tracking-widest text-gray-400">Aprontes</p>
          <h3 class="text-3xl font-black text-gray-900 dark:text-gray-50 mt-2">{{ formatNumber(totalAprontes) }}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Estados registrados: {{ Object.keys(statsAprontes.estados || {}).length }}</p>
        </div>
        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b]/70 p-4 shadow-sm">
          <p class="text-[11px] font-black uppercase tracking-widest text-gray-400">Promedio diario</p>
          <h3 class="text-3xl font-black text-gray-900 dark:text-gray-50 mt-2">{{ formatNumber(promedioDiario) }}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ diasMes }} dias en el rango</p>
        </div>
        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b]/70 p-4 shadow-sm">
          <p class="text-[11px] font-black uppercase tracking-widest text-gray-400">Mes</p>
          <h3 class="text-2xl font-black text-gray-900 dark:text-gray-50 mt-2 capitalize">{{ monthLabel }}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1" v-if="picoDia">Pico: {{ formatFechaCorta(picoDia.fecha) }} ({{ picoDia.total }} movimientos)</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1" v-else>Sin datos cargados</p>
        </div>
      </div>

      <div v-if="error" class="rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 px-4 py-3 text-sm font-bold">
        {{ error }}
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f172a]/70 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-black text-gray-900 dark:text-gray-50">Movimientos por dia</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">Reservas (azul) vs Aprontes (verde)</p>
            </div>
            <div class="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-gray-400">
              <span class="flex items-center gap-1"><span class="h-3 w-3 rounded-full bg-blue-500"></span>Reservas</span>
              <span class="flex items-center gap-1"><span class="h-3 w-3 rounded-full bg-emerald-500"></span>Aprontes</span>
            </div>
          </div>
          <div class="h-64 flex items-end gap-1">
            <div v-for="d in diario" :key="d.fecha" class="flex-1 flex flex-col items-center">
              <div class="w-full flex items-end gap-1 h-52">
                <div
                  class="flex-1 rounded-md bg-gradient-to-t from-blue-500 to-sky-400"
                  :style="{ height: (((d.reservas || 0) / maxDiario) * 100).toFixed(1) + '%' }"
                ></div>
                <div
                  class="flex-1 rounded-md bg-gradient-to-t from-emerald-500 to-lime-400"
                  :style="{ height: (((d.aprontes || 0) / maxDiario) * 100).toFixed(1) + '%' }"
                ></div>
              </div>
              <span class="text-[10px] text-gray-500 mt-1">{{ formatFechaCorta(d.fecha) }}</span>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f172a]/70 p-5 shadow-sm space-y-4">
          <div>
            <h3 class="text-lg font-black text-gray-900 dark:text-gray-50">Tipos de reservas</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Detalle por subtipo</p>
          </div>
          <div class="space-y-3">
            <div v-for="item in distribucionTipos" :key="item.label" class="space-y-1">
              <div class="flex items-center justify-between text-sm font-bold text-gray-800 dark:text-gray-100">
                <span>{{ item.label }}</span>
                <span>{{ formatNumber(item.valor) }} ({{ item.percent }}%)</span>
              </div>
              <div class="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r"
                  :class="item.color"
                  :style="{ width: Math.min(100, item.percent) + '%' }"
                ></div>
              </div>
            </div>
          </div>
          <div class="pt-2 border-t border-gray-200 dark:border-gray-800">
            <h4 class="text-sm font-black text-gray-800 dark:text-gray-100 mb-2">Estados de aprontes</h4>
            <div class="space-y-2 max-h-44 overflow-auto custom-scrollbar pr-1">
              <div v-for="item in estadosApronteLista" :key="item.estado" class="flex items-center justify-between text-sm font-bold text-gray-800 dark:text-gray-100">
                <span>{{ item.estado }}</span>
                <span>{{ formatNumber(item.valor) }} ({{ formatPercent(item.valor, statsAprontes.total) }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f172a]/70 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-lg font-black text-gray-900 dark:text-gray-50">Reservas del mes</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">Primeras {{ reservasPreview.length }} filas</p>
            </div>
          </div>
          <div class="overflow-auto custom-scrollbar max-h-[420px] pr-2">
            <table class="w-full text-left text-sm">
              <thead class="text-[11px] uppercase tracking-widest text-gray-400">
                <tr>
                  <th class="py-2">Fecha</th>
                  <th>Hora</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Vehiculo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr v-for="r in reservasPreview" :key="r.id" class="hover:bg-gray-50/80 dark:hover:bg-gray-800/60">
                  <td class="py-2 text-xs font-bold text-gray-700 dark:text-gray-200">{{ formatFechaCorta(r.fecha) }}</td>
                  <td class="text-xs text-gray-500 dark:text-gray-400">{{ r.hora }}</td>
                  <td class="font-bold text-gray-800 dark:text-gray-100">{{ r.nombre }}</td>
                  <td>
                    <span class="px-2 py-1 rounded-full text-[11px] font-black" :class="tipoReservaClase(r)">
                      {{ r.tipo_turno }}
                    </span>
                  </td>
                  <td class="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{{ r.marca }} {{ r.modelo }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f172a]/70 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-lg font-black text-gray-900 dark:text-gray-50">Aprontes del mes</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">Primeras {{ aprontesPreview.length }} filas</p>
            </div>
          </div>
          <div class="overflow-auto custom-scrollbar max-h-[420px] pr-2">
            <table class="w-full text-left text-sm">
              <thead class="text-[11px] uppercase tracking-widest text-gray-400">
                <tr>
                  <th class="py-2">Fecha</th>
                  <th>Hora</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Factura</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr v-for="a in aprontesPreview" :key="a.id" class="hover:bg-gray-50/80 dark:hover:bg-gray-800/60">
                  <td class="py-2 text-xs font-bold text-gray-700 dark:text-gray-200">{{ formatFechaCorta(a.fecha) }}</td>
                  <td class="text-xs text-gray-500 dark:text-gray-400">{{ a.hora }}</td>
                  <td class="font-bold text-gray-800 dark:text-gray-100">{{ a.nombre }}</td>
                  <td>
                    <span class="px-2 py-1 rounded-full text-[11px] font-black" :class="estadoApronteClase(a.estado)">
                      {{ a.estado || 'APRONTE' }}
                    </span>
                  </td>
                  <td class="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{{ a.factura }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
