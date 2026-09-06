<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '../api'
import { getSession, isMecanicoRole } from '../auth'

type UserItem = {
  id: number
  nombre: string
  username: string
  role: string
}

type TaskItem = {
  id: number
  fecha: string
  hora: string
  nombre: string
  telefono?: string
  cedula?: string
  localidad?: string
  marca?: string
  modelo?: string
  factura?: string
  estado?: string
  observaciones?: string
  detalles?: string
  repuestos_garantia?: string
  tipo_turno?: string
  mecanico_id?: number | null
}

const session = getSession()
const esMecanico = isMecanicoRole(session)

const hoyIso = (() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})()

const tabActiva = ref<'reservas' | 'aprontes'>('reservas')
const fechaDesde = ref(hoyIso)
const cargando = ref(false)
const guardandoId = ref<number | null>(null)
const usuarios = ref<UserItem[]>([])
const reservas = ref<TaskItem[]>([])
const aprontes = ref<TaskItem[]>([])

const asignacionesReservas = ref<Record<number, number | null>>({})
const asignacionesAprontes = ref<Record<number, number | null>>({})

const mecanicos = computed(() => usuarios.value.filter((u) => u.role === 'mecanico'))

const normalizarFecha = (value: any) => String(value || '').trim().slice(0, 10)

const normalizarHora = (value: any) => {
  const raw = String(value || '').trim()
  const match = raw.match(/(\d{1,2}:\d{2})/)
  return match ? match[1] : raw
}

const esDesdeFecha = (itemFecha: string) => {
  const fechaItem = normalizarFecha(itemFecha)
  const fechaFiltro = normalizarFecha(fechaDesde.value)
  if (!fechaItem || !fechaFiltro) return true
  return fechaItem >= fechaFiltro
}

const cargarUsuarios = async () => {
  try {
    const data = await api.listarUsuarios()
    usuarios.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.warn('[Mecanicos] Error cargando usuarios:', error)
    usuarios.value = []
  }
}

const cargarDatos = async () => {
  cargando.value = true
  try {
    const [reservasData, aprontesData] = await Promise.all([
      api.obtenerTodasLasReservas(),
      api.obtenerAprontes()
    ])

    const listaReservas = Array.isArray(reservasData) ? reservasData : []
    const listaAprontes = Array.isArray(aprontesData) ? aprontesData : []

    if (esMecanico && session?.id) {
      const sessionId = Number(session.id)
      reservas.value = listaReservas.filter((item: any) => {
        return Number(item?.mecanico_id || 0) === sessionId && esDesdeFecha(item?.fecha)
      })
      aprontes.value = listaAprontes.filter((item: any) => {
        return Number(item?.mecanico_id || 0) === sessionId && esDesdeFecha(item?.fecha)
      })
    } else {
      reservas.value = listaReservas.filter((item: any) => esDesdeFecha(item?.fecha))
      aprontes.value = listaAprontes.filter((item: any) => esDesdeFecha(item?.fecha))
    }

    asignacionesReservas.value = Object.fromEntries(
      reservas.value.map((item) => [item.id, item.mecanico_id == null ? null : Number(item.mecanico_id)])
    )
    asignacionesAprontes.value = Object.fromEntries(
      aprontes.value.map((item) => [item.id, item.mecanico_id == null ? null : Number(item.mecanico_id)])
    )
  } catch (error) {
    console.error('[Mecanicos] Error cargando datos:', error)
    reservas.value = []
    aprontes.value = []
  } finally {
    cargando.value = false
  }
}

const nombreMecanico = (id: number | null | undefined) => {
  const match = mecanicos.value.find((u) => Number(u.id) === Number(id || 0))
  return match?.nombre || match?.username || 'Sin asignar'
}

const obtenerAsignacionActual = (itemId: number) => {
  return tabActiva.value === 'reservas'
    ? asignacionesReservas.value[itemId] ?? null
    : asignacionesAprontes.value[itemId] ?? null
}

const actualizarAsignacion = (itemId: number, value: string) => {
  const nextValue = value === '' ? null : Number(value)
  if (tabActiva.value === 'reservas') {
    asignacionesReservas.value[itemId] = nextValue
    return
  }
  asignacionesAprontes.value[itemId] = nextValue
}

const onAsignacionChange = (itemId: number, event: Event) => {
  const target = event.target as HTMLSelectElement | null
  actualizarAsignacion(itemId, String(target?.value ?? ''))
}

const guardarReserva = async (item: TaskItem) => {
  if (esMecanico) return
  guardandoId.value = item.id
  try {
    await api.actualizarReserva({ ...item, mecanico_id: asignacionesReservas.value[item.id] ?? null })
    await cargarDatos()
  } catch (error: any) {
    alert(error?.message || 'No se pudo guardar la asignacion de la reserva')
  } finally {
    guardandoId.value = null
  }
}

const guardarApronte = async (item: TaskItem) => {
  if (esMecanico) return
  guardandoId.value = item.id
  try {
    await api.actualizarApronte({ ...item, mecanico_id: asignacionesAprontes.value[item.id] ?? null })
    await cargarDatos()
  } catch (error: any) {
    alert(error?.message || 'No se pudo guardar la asignacion del apronte')
  } finally {
    guardandoId.value = null
  }
}

const tareasActuales = computed(() => {
  const source = tabActiva.value === 'reservas' ? reservas.value : aprontes.value
  return [...source].sort((a, b) => {
    const fechaCmp = String(a.fecha || '').localeCompare(String(b.fecha || ''))
    if (fechaCmp !== 0) return fechaCmp
    return String(a.hora || '').localeCompare(String(b.hora || ''))
  })
})

watch(fechaDesde, () => {
  cargarDatos()
})

onMounted(async () => {
  await Promise.all([cargarUsuarios(), cargarDatos()])
})
</script>

<template>
  <div class="h-screen flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 bg-gray-50 dark:bg-[#0f172a] gap-6 overflow-y-auto overflow-x-hidden">
    <header class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 dark:text-gray-100 tracking-tight">MECANICOS</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ esMecanico ? 'Ves solo lo que tienes asignado desde hoy en adelante.' : 'Asignacion y control de reservas y aprontes por mecanico.' }}
        </p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <div class="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] px-3 py-2">
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Desde</span>
          <input v-model="fechaDesde" type="date" class="bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none" />
        </div>
        <button @click="tabActiva = 'reservas'" :class="['px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all', tabActiva === 'reservas' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300']">Reservas</button>
        <button @click="tabActiva = 'aprontes'" :class="['px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all', tabActiva === 'aprontes' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300']">Aprontes</button>
      </div>
    </header>

    <div v-if="!esMecanico" class="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-500/10 px-4 py-3 text-sm text-blue-800 dark:text-blue-100">
      Los mecanicos solo ven las tareas asignadas a su usuario y desde la fecha seleccionada hacia adelante.
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6 flex-1 min-h-0">
      <aside class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-0">
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span class="text-xs font-black uppercase tracking-widest text-gray-400">Mecanicos</span>
          <span class="text-[10px] font-black uppercase tracking-widest text-blue-500">{{ mecanicos.length }}</span>
        </div>
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div v-if="mecanicos.length === 0" class="p-4 text-sm text-gray-500 dark:text-gray-400">No hay usuarios con rol mecanico.</div>
          <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
            <div v-for="m in mecanicos" :key="m.id" class="p-4">
              <div class="text-sm font-bold text-gray-800 dark:text-gray-100">{{ m.nombre }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">@{{ m.username }}</div>
            </div>
          </div>
        </div>
      </aside>

      <main class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-0">
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <div>
            <div class="text-[10px] uppercase tracking-widest text-gray-400 font-black">{{ tabActiva === 'reservas' ? 'Reservas' : 'Aprontes' }}</div>
            <div class="text-sm font-bold text-gray-700 dark:text-gray-200">{{ tareasActuales.length }} elementos visibles</div>
          </div>
          <div v-if="cargando" class="text-xs font-black uppercase tracking-widest text-blue-500">Cargando...</div>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
          <div v-if="tareasActuales.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
            No hay elementos para mostrar con ese filtro.
          </div>

          <div v-else class="grid grid-cols-1 gap-4">
            <article v-for="item in tareasActuales" :key="`${tabActiva}-${item.id}`" class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#0f172a]/35 p-4">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0">
                  <div class="text-[10px] font-black uppercase tracking-widest text-blue-500">{{ normalizarFecha(item.fecha) }} · {{ normalizarHora(item.hora) }}</div>
                  <div class="mt-1 text-lg font-black text-gray-800 dark:text-gray-100 break-words">{{ item.nombre }}</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300">{{ item.marca }} {{ item.modelo }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 break-words">{{ item.telefono || '-' }} · CI {{ item.cedula || '-' }}</div>
                  <div v-if="item.observaciones || item.detalles || item.repuestos_garantia" class="mt-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {{ item.observaciones || item.detalles || item.repuestos_garantia }}
                  </div>
                </div>

                <div class="w-full lg:w-[280px] shrink-0 space-y-3">
                  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] px-3 py-2">
                    <div class="text-[10px] font-black uppercase tracking-widest text-gray-400">Asignado a</div>
                    <div class="text-sm font-bold text-gray-800 dark:text-gray-100">{{ nombreMecanico(item.mecanico_id) }}</div>
                  </div>

                  <div v-if="!esMecanico" class="space-y-2">
                    <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Cambiar mecanico</label>
                    <select :value="obtenerAsignacionActual(item.id) ?? ''" @change="onAsignacionChange(item.id, $event)" class="w-full rounded-xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200">
                      <option value="">Sin asignar</option>
                      <option v-for="m in mecanicos" :key="m.id" :value="Number(m.id)">{{ m.nombre }}</option>
                    </select>
                    <button
                      @click="tabActiva === 'reservas' ? guardarReserva(item) : guardarApronte(item)"
                      :disabled="guardandoId === item.id"
                      class="w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {{ guardandoId === item.id ? 'Guardando...' : 'Guardar asignacion' }}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
