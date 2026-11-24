<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { api } from '../api'

type EstadoPedido = 'pendiente' | 'consultado' | 'encargado' | 'avisado'

type ItemPedido = {
  descripcion: string
  disponibilidad: string
  precio_proveedor: number | null
  precio_publico: number | null
  estado: string
}

type Pedido = {
  id: number
  cliente: string
  proveedor: string
  telefono_cliente: string
  fecha_consulta: string
  fecha_aviso: string
  fecha_pedido: string
  estado: EstadoPedido
  notas: string
  items: ItemPedido[]
}

const estados: Array<{ key: EstadoPedido; label: string; tone: string }> = [
  { key: 'pendiente', label: 'Pendientes', tone: 'border-amber-400/40 bg-amber-400/10 text-amber-200' },
  { key: 'consultado', label: 'Consultados', tone: 'border-sky-400/40 bg-sky-400/10 text-sky-200' },
  { key: 'encargado', label: 'Encargados', tone: 'border-violet-400/40 bg-violet-400/10 text-violet-200' },
  { key: 'avisado', label: 'Avisados', tone: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' }
]

const pedidos = ref<Pedido[]>([])
const cargando = ref(false)
const guardando = ref(false)
const error = ref('')
const servidorDesactualizado = ref(false)
const filtro = ref<'todos' | EstadoPedido>('todos')
const modalAbierto = ref(false)
const editandoId = ref<number | null>(null)

const nuevoItem = (): ItemPedido => ({
  descripcion: '',
  disponibilidad: '',
  precio_proveedor: null,
  precio_publico: null,
  estado: 'en espera'
})

const formulario = ref<Omit<Pedido, 'id'>>({
  cliente: '',
  proveedor: '',
  telefono_cliente: '',
  fecha_consulta: '',
  fecha_aviso: '',
  fecha_pedido: new Date().toISOString().slice(0, 10),
  estado: 'pendiente',
  notas: '',
  items: [nuevoItem()]
})

const pedidosFiltrados = computed(() => filtro.value === 'todos'
  ? pedidos.value
  : pedidos.value.filter((pedido) => pedido.estado === filtro.value))

const pedidosPorEstado = (estado: EstadoPedido) =>
  pedidosFiltrados.value.filter((pedido) => pedido.estado === estado)

const notificar = (message: string, variant: 'success' | 'info' = 'success') => {
  window.dispatchEvent(new CustomEvent('ui:notify', { detail: { message, variant } }))
}

const cargarPedidos = async (silencioso = false) => {
  if (!silencioso) cargando.value = true
  error.value = ''
  servidorDesactualizado.value = false
  try {
    const data = await api.listarPedidosRepuestos()
    pedidos.value = Array.isArray(data) ? data : []
  } catch (cause: any) {
    console.error('[PedidosRepuestos] Error cargando pedidos:', cause)
    const message = String(cause?.message || '')
    if (message.includes('Canal no soportado')) {
      servidorDesactualizado.value = true
    } else if (!silencioso) {
      error.value = message || 'No se pudieron cargar los pedidos de repuestos.'
    }
  } finally {
    cargando.value = false
  }
}

const reiniciarFormulario = () => {
  editandoId.value = null
  formulario.value = {
    cliente: '',
    proveedor: '',
    telefono_cliente: '',
    fecha_consulta: '',
    fecha_aviso: '',
    fecha_pedido: new Date().toISOString().slice(0, 10),
    estado: 'pendiente',
    notas: '',
    items: [nuevoItem()]
  }
}

const abrirNuevo = () => {
  reiniciarFormulario()
  modalAbierto.value = true
}

const abrirEdicion = (pedido: Pedido) => {
  editandoId.value = pedido.id
  formulario.value = {
    cliente: pedido.cliente,
    proveedor: pedido.proveedor,
    telefono_cliente: pedido.telefono_cliente,
    fecha_consulta: pedido.fecha_consulta,
    fecha_aviso: pedido.fecha_aviso,
    fecha_pedido: pedido.fecha_pedido,
    estado: pedido.estado,
    notas: pedido.notas,
    items: pedido.items.map((item) => ({ ...item }))
  }
  modalAbierto.value = true
}

const guardarPedido = async () => {
  if (guardando.value) return
  guardando.value = true
  error.value = ''
  try {
    // Los proxies reactivos de Vue no se pueden clonar por IPC
    const datos = JSON.parse(JSON.stringify(formulario.value))
    if (editandoId.value) {
      await api.actualizarPedidoRepuestos({ id: editandoId.value, ...datos })
      notificar('Pedido de repuestos actualizado')
    } else {
      await api.crearPedidoRepuestos(datos)
      notificar('Pedido de repuestos creado')
    }
    modalAbierto.value = false
    await cargarPedidos(true)
  } catch (cause: any) {
    console.error('[PedidosRepuestos] Error guardando pedido:', cause)
    error.value = cause?.message || 'No se pudo guardar el pedido.'
  } finally {
    guardando.value = false
  }
}

const moverPedido = async (pedido: Pedido, estado: EstadoPedido) => {
  if (pedido.estado === estado) return
  const estadoAnterior = pedido.estado
  const avisoAnterior = pedido.fecha_aviso
  pedido.estado = estado
  if (estado === 'avisado' && !pedido.fecha_aviso) {
    pedido.fecha_aviso = new Date().toISOString().slice(0, 10)
  }
  error.value = ''
  try {
    await api.actualizarEstadoPedidoRepuestos({ id: pedido.id, estado })
    notificar(`Pedido marcado como ${estados.find((item) => item.key === estado)?.label.toLowerCase()}`)
  } catch (cause: any) {
    console.error('[PedidosRepuestos] Error actualizando estado:', cause)
    pedido.estado = estadoAnterior
    pedido.fecha_aviso = avisoAnterior
    error.value = cause?.message || 'No se pudo actualizar el estado.'
  } finally {
    await cargarPedidos(true)
  }
}

const eliminarPedido = async (pedido: Pedido) => {
  if (!window.confirm(`Eliminar el pedido #${pedido.id}?`)) return
  try {
    await api.borrarPedidoRepuestos(pedido.id)
    pedidos.value = pedidos.value.filter((item) => item.id !== pedido.id)
    notificar('Pedido eliminado')
  } catch (cause: any) {
    console.error('[PedidosRepuestos] Error eliminando pedido:', cause)
    error.value = cause?.message || 'No se pudo eliminar el pedido.'
    await cargarPedidos(true)
  }
}

const formatMonto = (monto: number | null) => monto == null
  ? '-'
  : new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(monto)

let temporizador: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  cargarPedidos()
  temporizador = setInterval(() => {
    if (!modalAbierto.value && !guardando.value && !servidorDesactualizado.value) {
      cargarPedidos(true)
    }
  }, 30000)
})

onUnmounted(() => {
  if (temporizador) clearInterval(temporizador)
})
</script>

<template>
  <div class="h-screen w-full overflow-auto bg-gray-50 px-4 py-6 dark:bg-[#0f172a] sm:px-6 lg:px-10">
    <div class="mx-auto max-w-[1600px]">
      <header class="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400">Tablas · Repuestos</p>
          <h1 class="mt-1 text-3xl font-black tracking-tight text-gray-800 dark:text-gray-100 sm:text-4xl">Pedidos de repuestos</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Organiza cada pedido por estado, proveedor, cliente y los repuestos solicitados.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <select v-model="filtro" class="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100">
            <option value="todos">Todos los estados</option>
            <option v-for="estado in estados" :key="estado.key" :value="estado.key">{{ estado.label }}</option>
          </select>
          <button type="button" class="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-slate-800" @click="cargarPedidos()">
            Actualizar
          </button>
          <button type="button" :disabled="servidorDesactualizado" class="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-cyan-600/25 transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50" @click="abrirNuevo">
            + Nuevo pedido
          </button>
        </div>
      </header>

      <p v-if="error" class="mb-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        {{ error }}
      </p>

      <div v-if="servidorDesactualizado" class="rounded-2xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-500/10">
        <h2 class="text-lg font-black text-amber-800 dark:text-amber-200">El servidor todavía no tiene habilitados los pedidos de repuestos</h2>
        <p class="mt-2 text-sm text-amber-700 dark:text-amber-100/80">
          La API remota está ejecutando una versión anterior. Despliega la última versión de <strong>reserveRosas-server</strong>
          (incluye <code>pedidos-repuestos.js</code>) y reinicia la aplicación del servidor. Luego presiona “Actualizar”.
        </p>
      </div>

      <div v-else-if="cargando" class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-400">
        Cargando pedidos de repuestos...
      </div>

      <section v-else class="grid gap-4 xl:grid-cols-4">
        <div v-for="estado in estados" :key="estado.key" class="min-w-0 rounded-2xl border border-gray-200 bg-gray-100/70 p-3 dark:border-gray-800 dark:bg-slate-900/50">
          <div class="mb-3 flex items-center justify-between px-1">
            <h2 class="text-sm font-black text-gray-700 dark:text-gray-100">{{ estado.label }}</h2>
            <span :class="['rounded-full border px-2 py-0.5 text-xs font-black', estado.tone]">{{ pedidosPorEstado(estado.key).length }}</span>
          </div>

          <div class="max-h-[53rem] space-y-3 overflow-y-auto pr-1">
            <article v-for="pedido in pedidosPorEstado(estado.key)" :key="pedido.id" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-slate-800">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-black text-cyan-600 dark:text-cyan-400">Pedido #{{ pedido.id }}</p>
                  <h3 class="mt-1 font-black text-gray-800 dark:text-gray-100">{{ pedido.cliente || 'Cliente sin asignar' }}</h3>
                  <p v-if="pedido.telefono_cliente" class="text-xs text-gray-500 dark:text-gray-400">{{ pedido.telefono_cliente }}</p>
                </div>
                <button type="button" class="text-xs font-bold text-gray-400 hover:text-rose-500" @click="eliminarPedido(pedido)">Eliminar</button>
              </div>

              <div class="mt-3 max-h-28 space-y-2 overflow-y-auto border-y border-gray-100 py-3 text-xs dark:border-gray-700">
                <div v-for="(item, itemIndex) in pedido.items" :key="`${pedido.id}-${itemIndex}`" class="rounded-lg bg-gray-50 p-2 dark:bg-slate-900/70">
                  <p class="font-bold text-gray-700 dark:text-gray-200">{{ item.descripcion }}</p>
                  <p class="mt-1 text-gray-500 dark:text-gray-400">
                    {{ item.disponibilidad || 'Sin disponibilidad' }} · Prov. {{ formatMonto(item.precio_proveedor) }} · Público {{ formatMonto(item.precio_publico) }}
                  </p>
                </div>
              </div>

              <div class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <p><span class="font-bold text-gray-600 dark:text-gray-300">Proveedor:</span> {{ pedido.proveedor || 'Sin asignar' }}</p>
                <p><span class="font-bold text-gray-600 dark:text-gray-300">Pedido:</span> {{ pedido.fecha_pedido || '-' }}</p>
                <p v-if="pedido.fecha_consulta"><span class="font-bold text-gray-600 dark:text-gray-300">Consulta:</span> {{ pedido.fecha_consulta }}</p>
                <p v-if="pedido.fecha_aviso"><span class="font-bold text-gray-600 dark:text-gray-300">Aviso:</span> {{ pedido.fecha_aviso }}</p>
              </div>

              <div class="mt-4 flex gap-2">
                <button type="button" class="rounded-lg border border-gray-200 px-3 py-2 text-xs font-black text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-slate-700" @click="abrirEdicion(pedido)">Editar</button>
                <select :value="pedido.estado" class="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-bold text-gray-700 dark:border-gray-600 dark:bg-slate-700 dark:text-gray-100" @change="moverPedido(pedido, ($event.target as HTMLSelectElement).value as EstadoPedido)">
                  <option v-for="destino in estados" :key="destino.key" :value="destino.key">{{ destino.label }}</option>
                </select>
              </div>
            </article>

            <p v-if="pedidosPorEstado(estado.key).length === 0" class="rounded-xl border border-dashed border-gray-300 px-3 py-8 text-center text-xs font-semibold text-gray-400 dark:border-gray-700">
              Sin pedidos
            </p>
          </div>
        </div>
      </section>
    </div>

    <div v-if="modalAbierto" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 sm:items-center">
      <form class="my-4 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800 sm:p-6" @submit.prevent="guardarPedido">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-black text-gray-800 dark:text-white">{{ editandoId ? 'Editar pedido' : 'Nuevo pedido de repuestos' }}</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Carga el cliente, proveedor y los repuestos que se deben pedir.</p>
          </div>
          <button type="button" class="text-xl text-gray-400 hover:text-gray-700 dark:hover:text-white" @click="modalAbierto = false">×</button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <label class="text-xs font-bold text-gray-600 dark:text-gray-300">Cliente<input v-model.trim="formulario.cliente" class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white" /></label>
          <label class="text-xs font-bold text-gray-600 dark:text-gray-300">Teléfono<input v-model.trim="formulario.telefono_cliente" class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white" /></label>
          <label class="text-xs font-bold text-gray-600 dark:text-gray-300">Proveedor<input v-model.trim="formulario.proveedor" class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white" /></label>
          <label class="text-xs font-bold text-gray-600 dark:text-gray-300">Estado<select v-model="formulario.estado" class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white"><option v-for="estado in estados" :key="estado.key" :value="estado.key">{{ estado.label }}</option></select></label>
          <label class="text-xs font-bold text-gray-600 dark:text-gray-300">Fecha de pedido<input v-model="formulario.fecha_pedido" type="date" class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white" /></label>
          <label class="text-xs font-bold text-gray-600 dark:text-gray-300">Fecha de consulta<input v-model="formulario.fecha_consulta" type="date" class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white" /></label>
          <label class="text-xs font-bold text-gray-600 dark:text-gray-300">Fecha de aviso<input v-model="formulario.fecha_aviso" type="date" class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white" /></label>
        </div>

        <div class="mt-5">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black text-gray-700 dark:text-gray-100">Lista de repuestos</h3>
            <button type="button" class="text-xs font-black text-cyan-600 dark:text-cyan-400" @click="formulario.items.push(nuevoItem())">+ Agregar repuesto</button>
          </div>
          <div v-for="(item, index) in formulario.items" :key="index" class="mt-2 grid gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,.7fr)_minmax(0,.7fr)_auto]">
            <input v-model.trim="item.descripcion" required placeholder="Descripción" class="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white" />
            <input v-model.trim="item.disponibilidad" placeholder="Disponibilidad" class="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white" />
            <input v-model.number="item.precio_proveedor" min="0" step="0.01" type="number" placeholder="Precio prov." class="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white" />
            <input v-model.number="item.precio_publico" min="0" step="0.01" type="number" placeholder="Precio público" class="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white" />
            <button v-if="formulario.items.length > 1" type="button" class="px-2 text-xs font-black text-rose-500" @click="formulario.items.splice(index, 1)">Quitar</button>
          </div>
        </div>

        <label class="mt-5 block text-xs font-bold text-gray-600 dark:text-gray-300">Notas<textarea v-model.trim="formulario.notas" rows="3" class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-700 dark:text-white"></textarea></label>
        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="rounded-xl px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700" @click="modalAbierto = false">Cancelar</button>
          <button :disabled="guardando" type="submit" class="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-black text-white disabled:opacity-60">{{ guardando ? 'Guardando...' : 'Guardar pedido' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>
