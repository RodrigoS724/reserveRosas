<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import IngresoModal from '../components/IngresoModal.vue'

const CHECKS = [
  { key: 'espejos', label: 'Espejos' },
  { key: 'faro_delantero', label: 'Faro delantero' },
  { key: 'tapon_gasolina', label: 'Tapón de gasolina' },
  { key: 'luz_stop_trasero', label: 'Luz de stop trasero' },
  { key: 'cubiertas_completas', label: 'Cubiertas completas' },
  { key: 'tapon_radiadores', label: 'Tapón de radiadores' },
  { key: 'filtro_aire', label: 'Filtro de aire' },
  { key: 'bateria', label: 'Batería' },
  { key: 'llaves', label: 'Llaves' },
  { key: 'pedales', label: 'Pedales' }
]

type TrabajoRow = {
  cantidad: string
  descripcion: string
  costo: string
  importe: string
}

type Checklist = Record<string, boolean>

const route = useRoute()
const clientes = ref<any[]>([])
const clienteActivo = ref<any | null>(null)
const detalle = ref<{ cliente: any | null; vehiculos: any[]; reservas: any[]; aprontes: any[] }>({
  cliente: null,
  vehiculos: [],
  reservas: [],
  aprontes: []
})
const ingresos = ref<any[]>([])
const busqueda = ref('')
const cargando = ref(false)
const cargandoDetalle = ref(false)
const cargandoIngresos = ref(false)
const error = ref('')
const mostrarFormulario = ref(false)
const guardandoCliente = ref(false)
const clienteEditando = ref<any | null>(null)
const formCliente = ref({ id: null as number | null, cedula: '', nombre: '', telefono: '', localidad: '' })
const mostrarFormularioIngreso = ref(false)
const guardandoIngreso = ref(false)
const ingresoEditando = ref<any | null>(null)
const formIngreso = ref({
  monto: '',
  trabajo_realizado: '',
  fecha_ingreso: '',
  fecha_salida: '',
  vehiculo_id: null as number | null,
  marca: '',
  modelo: '',
  color: '',
  matricula: '',
  numero_motor: '',
  numero_servicios: '',
  comentarios: '',
  observaciones: ''
})
const checklistIngreso = ref<Checklist>(Object.fromEntries(CHECKS.map((item) => [item.key, false])))
const checklistEgreso = ref<Checklist>(Object.fromEntries(CHECKS.map((item) => [item.key, false])))
const trabajos = ref<TrabajoRow[]>([
  { cantidad: '', descripcion: '', costo: '', importe: '' },
  { cantidad: '', descripcion: '', costo: '', importe: '' },
  { cantidad: '', descripcion: '', costo: '', importe: '' },
  { cantidad: '', descripcion: '', costo: '', importe: '' }
])

const clonarPlano = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const mostrarFormularioVehiculo = ref(false)
const guardandoVehiculo = ref(false)
const vehiculoEditando = ref<any | null>(null)
const formVehiculo = ref({ id: null as number | null, matricula: '', motor: '', chasis: '', color: '', fecha_compra: '' })
let searchTimer: number | null = null

const totalEventos = (cliente: any) => {
  return Number(cliente?.total_reservas || 0) + Number(cliente?.total_aprontes || 0)
}

const clientesFiltrados = computed(() => clientes.value)

const normalizarCedula = (value: string) => String(value || '').replace(/\D/g, '')

const poblarFormularioCliente = (cliente: any) => {
  clienteEditando.value = cliente || null
  formCliente.value = {
    id: cliente?.id ?? null,
    cedula: String(cliente?.cedula || ''),
    nombre: String(cliente?.nombre || ''),
    telefono: String(cliente?.telefono || ''),
    localidad: String(cliente?.localidad || '')
  }
  mostrarFormulario.value = true
}

const limpiarFormularioCliente = () => {
  clienteEditando.value = null
  formCliente.value = { id: null, cedula: '', nombre: '', telefono: '', localidad: '' }
  mostrarFormulario.value = false
}

const limpiarFormularioIngreso = () => {
  ingresoEditando.value = null
  formIngreso.value = {
    monto: '',
    trabajo_realizado: '',
    fecha_ingreso: new Date().toISOString().slice(0, 10),
    fecha_salida: '',
    vehiculo_id: null,
    marca: '',
    modelo: '',
    color: '',
    matricula: '',
    numero_motor: '',
    numero_servicios: '',
    comentarios: '',
    observaciones: ''
  }
  checklistIngreso.value = Object.fromEntries(CHECKS.map((item) => [item.key, false]))
  checklistEgreso.value = Object.fromEntries(CHECKS.map((item) => [item.key, false]))
  trabajos.value = [
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' }
  ]
  mostrarFormularioIngreso.value = false
}

const poblarFormularioIngreso = (ingreso?: any) => {
  ingresoEditando.value = ingreso || null
  const vehiculoInicial = detalle.value.vehiculos.find((vehiculo) => Number(vehiculo.id) === Number(ingreso?.vehiculo_id || 0)) || detalle.value.vehiculos[0] || null
  let checklistIngresoData: Checklist = Object.fromEntries(CHECKS.map((item) => [item.key, false]))
  let checklistEgresoData: Checklist = Object.fromEntries(CHECKS.map((item) => [item.key, false]))
  let trabajosData: TrabajoRow[] = [
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' }
  ]
  try {
    if (ingreso?.checklist_ingreso_json) checklistIngresoData = { ...checklistIngresoData, ...JSON.parse(ingreso.checklist_ingreso_json) }
    if (ingreso?.checklist_egreso_json) checklistEgresoData = { ...checklistEgresoData, ...JSON.parse(ingreso.checklist_egreso_json) }
    if (ingreso?.trabajos_json) {
      const parsedTrabajos = JSON.parse(ingreso.trabajos_json)
      if (Array.isArray(parsedTrabajos) && parsedTrabajos.length) {
        trabajosData = parsedTrabajos.slice(0, 4).map((item: any) => ({
          cantidad: String(item?.cantidad ?? ''),
          descripcion: String(item?.descripcion ?? ''),
          costo: String(item?.costo ?? ''),
          importe: String(item?.importe ?? '')
        }))
        while (trabajosData.length < 4) {
          trabajosData.push({ cantidad: '', descripcion: '', costo: '', importe: '' })
        }
      }
    }
  } catch {}
  formIngreso.value = {
    monto: String(ingreso?.monto ?? ''),
    trabajo_realizado: String(ingreso?.trabajo_realizado || ''),
    fecha_ingreso: String(ingreso?.fecha_actual || '').slice(0, 10),
    fecha_salida: String(ingreso?.fecha_salida || ingreso?.fecha_egreso || '').slice(0, 10),
    vehiculo_id: vehiculoInicial?.id ? Number(vehiculoInicial.id) : null,
    marca: String(vehiculoInicial?.marca || vehiculoInicial?.codigo_marca || ingreso?.marca || ''),
    modelo: String(vehiculoInicial?.modelo || vehiculoInicial?.codigo_modelo || ingreso?.modelo || ''),
    color: String(vehiculoInicial?.color || ingreso?.color || ''),
    matricula: String(vehiculoInicial?.matricula || ingreso?.matricula || ''),
    numero_motor: String(vehiculoInicial?.motor || vehiculoInicial?.numero_motor || ingreso?.numero_motor || ''),
    numero_servicios: String(ingreso?.numero_servicios || ''),
    comentarios: String(ingreso?.comentarios || ''),
    observaciones: String(ingreso?.observaciones || '')
  }
  checklistIngreso.value = checklistIngresoData
  checklistEgreso.value = checklistEgresoData
  trabajos.value = trabajosData
  mostrarFormularioIngreso.value = true
}

const poblarFormularioVehiculo = (vehiculo: any) => {
  vehiculoEditando.value = vehiculo || null
  formVehiculo.value = {
    id: vehiculo?.id ?? null,
    matricula: String(vehiculo?.matricula || ''),
    motor: String(vehiculo?.motor || vehiculo?.numero_motor || ''),
    chasis: String(vehiculo?.chasis || ''),
    color: String(vehiculo?.color || ''),
    fecha_compra: String(vehiculo?.fecha_compra || '')
  }
  mostrarFormularioVehiculo.value = true
}

const limpiarFormularioVehiculo = () => {
  vehiculoEditando.value = null
  formVehiculo.value = { id: null, matricula: '', motor: '', chasis: '', color: '', fecha_compra: '' }
  mostrarFormularioVehiculo.value = false
}

const guardarCliente = async () => {
  guardandoCliente.value = true
  error.value = ''
  try {
    await api.guardarCliente({
      id: formCliente.value.id,
      cedula: normalizarCedula(formCliente.value.cedula),
      nombre: formCliente.value.nombre,
      telefono: formCliente.value.telefono,
      localidad: formCliente.value.localidad
    })
    limpiarFormularioCliente()
    await cargarClientes()
  } catch (err: any) {
    error.value = err?.message || 'No se pudo guardar el cliente'
  } finally {
    guardandoCliente.value = false
  }
}

const cargarIngresos = async (cliente: any) => {
  cargandoIngresos.value = true
  try {
    ingresos.value = await api.obtenerIngresosPorCliente(cliente.id)
  } catch (err: any) {
    error.value = err?.message || 'No se pudo cargar el historial de ingresos'
    ingresos.value = []
  } finally {
    cargandoIngresos.value = false
  }
}

const abrirFormularioIngreso = () => {
  poblarFormularioIngreso()
}

const abrirIngresoEnPanel = (ingreso: any) => {
  poblarFormularioIngreso(ingreso)
}

const resumenChecks = (checks: Checklist) => {
  return CHECKS.filter((item) => checks[item.key]).map((item) => item.label).join(', ') || 'Sin marcar'
}

const buildTrabajoRealizado = () => {
  const lines = [
    `Ingreso: ${formIngreso.value.fecha_ingreso || ''}`,
    `Cliente: ${clienteActivo.value?.nombre || ''} - CI ${clienteActivo.value?.cedula || ''}`,
    `Moto: ${formIngreso.value.marca} ${formIngreso.value.modelo} ${formIngreso.value.color ? `- ${formIngreso.value.color}` : ''}`.trim(),
    `Matrícula: ${formIngreso.value.matricula || ''}`,
    `Motor: ${formIngreso.value.numero_motor || ''}`,
    `Servicios: ${formIngreso.value.numero_servicios || ''}`,
    `Checklist ingreso: ${resumenChecks(checklistIngreso.value)}`,
    `Comentarios: ${formIngreso.value.comentarios || ''}`,
    'Trabajos:'
  ]

  trabajos.value.forEach((row, index) => {
    const contenido = [row.cantidad, row.descripcion, row.costo, row.importe].map((part) => String(part || '').trim()).join(' | ')
    lines.push(`${index + 1}. ${contenido}`)
  })

  lines.push(`Observaciones: ${formIngreso.value.observaciones || ''}`)
  lines.push(`Entrega / salida: ${formIngreso.value.fecha_salida || ''}`)
  lines.push(`Checklist egreso: ${resumenChecks(checklistEgreso.value)}`)
  return lines.join('\n')
}

const guardarIngreso = async () => {
  if (!clienteActivo.value) return
  guardandoIngreso.value = true
  error.value = ''
  try {
    const trabajoRealizado = String(formIngreso.value.trabajo_realizado || '').trim() || buildTrabajoRealizado()
    const checklistIngresoPayload = clonarPlano(checklistIngreso.value)
    const checklistEgresoPayload = clonarPlano(checklistEgreso.value)
    const trabajosPayload = clonarPlano(trabajos.value)
    const payload = {
      cliente_id: clienteActivo.value.id,
      monto: formIngreso.value.monto,
      trabajo_realizado: trabajoRealizado,
      fecha_actual: formIngreso.value.fecha_ingreso ? `${formIngreso.value.fecha_ingreso}T${new Date().toISOString().slice(11, 16)}:00` : undefined,
      fecha_salida: formIngreso.value.fecha_salida ? `${formIngreso.value.fecha_salida}T${new Date().toISOString().slice(11, 16)}:00` : null,
      vehiculo_id: formIngreso.value.vehiculo_id,
      marca: formIngreso.value.marca,
      modelo: formIngreso.value.modelo,
      color: formIngreso.value.color,
      matricula: formIngreso.value.matricula,
      numero_motor: formIngreso.value.numero_motor,
      numero_servicios: formIngreso.value.numero_servicios,
      comentarios: formIngreso.value.comentarios,
      observaciones: formIngreso.value.observaciones,
      checklist_ingreso: checklistIngresoPayload,
      checklist_egreso: checklistEgresoPayload,
      trabajos: trabajosPayload
    }

    let guardado: any = null
    if (ingresoEditando.value?.id) {
      guardado = await api.actualizarIngreso({ id: ingresoEditando.value.id, ...payload })
    } else {
      guardado = await api.crearIngreso(payload)
    }
    limpiarFormularioIngreso()
    await cargarIngresos(clienteActivo.value)
    return guardado
  } catch (err: any) {
    error.value = err?.message || 'No se pudo registrar el ingreso'
    return null
  } finally {
    guardandoIngreso.value = false
  }
}

const guardarVehiculo = async () => {
  if (!vehiculoEditando.value) return
  guardandoVehiculo.value = true
  error.value = ''
  try {
    await api.actualizarVehiculoCliente({
      id: formVehiculo.value.id,
      matricula: formVehiculo.value.matricula,
      motor: formVehiculo.value.motor,
      chasis: formVehiculo.value.chasis,
      color: formVehiculo.value.color,
      fecha_compra: formVehiculo.value.fecha_compra
    })
    limpiarFormularioVehiculo()
    if (clienteActivo.value) {
      await cargarDetalle(clienteActivo.value)
    }
  } catch (err: any) {
    error.value = err?.message || 'No se pudo guardar el vehiculo'
  } finally {
    guardandoVehiculo.value = false
  }
}

const registrarEgreso = async (ingreso: any) => {
  error.value = ''
  try {
    await api.registrarEgreso({
      id: ingreso.id,
      monto: ingreso.monto,
      trabajo_realizado: ingreso.trabajo_realizado,
      checklist_egreso: checklistEgreso.value,
      observaciones: formIngreso.value.observaciones,
      trabajos: trabajos.value
    })
    if (clienteActivo.value) {
      await cargarIngresos(clienteActivo.value)
    }
  } catch (err: any) {
    error.value = err?.message || 'No se pudo registrar el egreso'
  }
}

const formatearFecha = (fecha?: string | null) => {
  if (!fecha) return 'Sin dato'
  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) return String(fecha)
  return date.toLocaleDateString('es-UY', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const formatearFechaHora = (fecha?: string | null, hora?: string | null) => {
  const partes = [formatearFecha(fecha)]
  if (hora) partes.push(hora)
  return partes.filter(Boolean).join(' · ')
}

const formatearFechaHoraCompleta = (fecha?: string | null) => {
  if (!fecha) return 'Sin dato'
  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) return String(fecha)
  return `${date.toLocaleDateString('es-UY', { year: 'numeric', month: '2-digit', day: '2-digit' })} · ${date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}`
}

const obtenerEtiquetaDetalle = (tipo: string, item: any) => {
  if (tipo === 'reserva') {
    if (item.tipo_turno === 'Garantía') {
      return `Garantía${item.garantia_tipo ? ` - ${item.garantia_tipo}` : ''}`
    }
    if (item.tipo_turno === 'Particular') {
      return `Particular${item.particular_tipo ? ` - ${item.particular_tipo}` : ''}`
    }
    return item.tipo_turno || 'Reserva'
  }
  return item.factura ? `Apronte · ${item.factura}` : 'Apronte'
}

const obtenerDetalleResumen = (tipo: string, item: any) => {
  if (tipo === 'reserva') {
    return item.detalles || item.garantia_problema || 'Sin observaciones'
  }
  return item.repuestos_garantia || item.marca || item.modelo || 'Sin observaciones'
}

const cargarClientes = async () => {
  cargando.value = true
  error.value = ''
  try {
    clientes.value = await api.obtenerClientes(busqueda.value)
    const activoId = clienteActivo.value?.id
    const candidato = clientes.value.find((cliente) => cliente.id === activoId) || clientes.value[0] || null
    if (candidato && candidato.id !== activoId) {
      await seleccionarCliente(candidato)
    } else if (!clienteActivo.value && candidato) {
      await seleccionarCliente(candidato)
    }
  } catch (err: any) {
    error.value = err?.message || 'No se pudo cargar la lista de clientes'
    clientes.value = []
  } finally {
    cargando.value = false
  }
}

const cargarDetalle = async (cliente: any) => {
  cargandoDetalle.value = true
  try {
    detalle.value = await api.obtenerClienteDetalle(cliente.id)
    await cargarIngresos(cliente)
  } catch (err: any) {
    error.value = err?.message || 'No se pudo cargar el detalle del cliente'
    detalle.value = { cliente, vehiculos: [], reservas: [], aprontes: [] }
  } finally {
    cargandoDetalle.value = false
  }
}

const seleccionarCliente = async (cliente: any) => {
  clienteActivo.value = cliente
  await cargarDetalle(cliente)
}

const abrirClienteDesdeQuery = async () => {
  const cedulaQuery = String(route.query.cedula || route.query.id || '').trim()
  if (!cedulaQuery) return
  const cedulaNormalizada = normalizarCedula(cedulaQuery)
  const encontrado = clientes.value.find((cliente) => normalizarCedula(cliente.cedula) === cedulaNormalizada || String(cliente.id) === cedulaQuery)
  if (encontrado) {
    await seleccionarCliente(encontrado)
    return
  }
  try {
    const detalleCliente = await api.obtenerClienteDetalle(cedulaQuery)
    if (detalleCliente?.cliente) {
      clienteActivo.value = detalleCliente.cliente
      detalle.value = detalleCliente
      await cargarIngresos(detalleCliente.cliente)
    }
  } catch {}
}

watch(busqueda, () => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
  }
  searchTimer = window.setTimeout(() => {
    cargarClientes()
  }, 250)
})

onMounted(() => {
  cargarClientes().then(() => abrirClienteDesdeQuery())
})

onBeforeUnmount(() => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
    searchTimer = null
  }
})
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,#1d4ed8_0%,#0f172a_36%,#020617_100%)] text-slate-100">
    <div class="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <header class="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-8">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <div class="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">
              Panel de clientes
            </div>
            <h1 class="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Clientes, vehículos e historial en una sola vista
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Buscá por nombre o cédula, abrí un cliente y revisá sus motos, reservas y aprontes sin salir del panel.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Clientes</div>
              <div class="mt-1 text-2xl font-black text-white">{{ clientes.length }}</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Motos</div>
              <div class="mt-1 text-2xl font-black text-white">{{ detalle.vehiculos.length }}</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Reservas</div>
              <div class="mt-1 text-2xl font-black text-white">{{ detalle.reservas.length }}</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Aprontes</div>
              <div class="mt-1 text-2xl font-black text-white">{{ detalle.aprontes.length }}</div>
            </div>
          </div>
        </div>
      </header>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
          {{ clienteActivo ? 'Editando cliente seleccionado' : 'Listado de clientes' }}
        </div>
        <button
          @click="poblarFormularioCliente(null)"
          class="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100 transition hover:bg-cyan-400/15"
        >
          Nuevo cliente
        </button>
      </div>

      <div v-if="error" class="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
        {{ error }}
      </div>

      <div class="grid min-h-0 flex-1 gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside class="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
          <div class="border-b border-white/10 p-4 sm:p-5">
            <label class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Buscar cliente</label>
            <input
              v-model="busqueda"
              type="text"
              placeholder="Nombre, cédula, teléfono o localidad"
              class="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/40 focus:bg-white/8"
            />
          </div>

          <div class="flex-1 overflow-auto p-2 sm:p-3">
            <button
              v-for="cliente in clientesFiltrados"
              :key="cliente.id"
              @click="seleccionarCliente(cliente)"
              class="mb-2 w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-200"
              :class="clienteActivo?.id === cliente.id ? 'border-cyan-400/40 bg-cyan-400/10 shadow-lg shadow-cyan-500/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/7'"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-black text-white">{{ cliente.nombre }}</div>
                  <div class="mt-1 text-xs font-semibold text-slate-400">CI {{ cliente.cedula || 'sin cédula' }}</div>
                </div>
                <div class="rounded-full border border-white/10 bg-slate-900/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                  {{ totalEventos(cliente) }} eventos
                </div>
              </div>
              <div class="mt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-300">
                <div class="rounded-xl bg-slate-900/50 px-2 py-2">
                  <div class="text-slate-500">Vehículos</div>
                  <div class="mt-1 font-black text-white">{{ cliente.total_vehiculos || 0 }}</div>
                </div>
                <div class="rounded-xl bg-slate-900/50 px-2 py-2">
                  <div class="text-slate-500">Reservas</div>
                  <div class="mt-1 font-black text-white">{{ cliente.total_reservas || 0 }}</div>
                </div>
                <div class="rounded-xl bg-slate-900/50 px-2 py-2">
                  <div class="text-slate-500">Aprontes</div>
                  <div class="mt-1 font-black text-white">{{ cliente.total_aprontes || 0 }}</div>
                </div>
              </div>
            </button>

            <div v-if="!cargando && clientesFiltrados.length === 0" class="flex h-48 items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 text-sm text-slate-400">
              No se encontraron clientes
            </div>

            <div v-if="cargando" class="flex h-48 items-center justify-center text-sm text-slate-400">
              Cargando clientes...
            </div>
          </div>
        </aside>

        <section class="min-h-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/95 text-slate-900 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
          <div class="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div v-if="clienteActivo">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                    {{ detalle.cliente?.cedula || clienteActivo.cedula }}
                  </div>
                  <h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{{ detalle.cliente?.nombre || clienteActivo.nombre }}</h2>
                  <p class="mt-2 text-sm text-slate-500">
                    {{ detalle.cliente?.telefono || clienteActivo.telefono || 'Sin teléfono' }} · {{ detalle.cliente?.localidad || clienteActivo.localidad || 'Sin localidad' }}
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    @click="poblarFormularioCliente(clienteActivo)"
                    class="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.24em] text-slate-700 transition hover:bg-slate-100"
                  >
                    Editar cliente
                  </button>
                  <button
                    @click="cargarDetalle(clienteActivo)"
                    class="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.24em] text-white transition hover:bg-slate-800"
                  >
                    {{ cargandoDetalle ? 'Actualizando...' : 'Actualizar detalle' }}
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-slate-500">Seleccioná un cliente para ver su detalle.</div>
          </div>

          <div v-if="clienteActivo" class="grid min-h-0 gap-5 p-5 sm:p-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div class="min-h-0 space-y-5 overflow-auto pr-1">
              <div class="grid gap-4 sm:grid-cols-3">
                <div class="rounded-[1.5rem] bg-slate-950 p-4 text-white">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Desde</div>
                  <div class="mt-2 text-lg font-black">{{ formatearFecha(detalle.cliente?.created_at || clienteActivo.created_at) }}</div>
                </div>
                <div class="rounded-[1.5rem] bg-cyan-50 p-4 text-slate-900">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700">Vehículos</div>
                  <div class="mt-2 text-lg font-black">{{ detalle.vehiculos.length }}</div>
                </div>
                <div class="rounded-[1.5rem] bg-amber-50 p-4 text-slate-900">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Actividad</div>
                  <div class="mt-2 text-lg font-black">{{ totalEventos(clienteActivo) }}</div>
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Vehículos vinculados</h3>
                  <span class="text-xs font-semibold text-slate-400">{{ detalle.vehiculos.length }} registros</span>
                </div>
                <div class="mt-4 grid gap-3">
                  <div v-for="vehiculo in detalle.vehiculos" :key="vehiculo.id" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div class="text-base font-black text-slate-950">{{ vehiculo.matricula || 'Sin matrícula' }}</div>
                        <div class="mt-1 text-sm text-slate-600">{{ vehiculo.marca }} {{ vehiculo.modelo }}</div>
                        <div class="mt-2 text-xs text-slate-400">
                          {{ vehiculo.dt_vehiculo_codigo ? `${vehiculo.dt_vehiculo_codigo} · ` : '' }}{{ vehiculo.dt_vehiculo_modelo || '' }}
                        </div>
                      </div>
                      <div class="text-right text-xs text-slate-400">
                        <div class="font-semibold text-slate-500">Motor</div>
                        <div>{{ vehiculo.numero_motor || vehiculo.motor || 'Sin dato' }}</div>
                        <button @click="poblarFormularioVehiculo(vehiculo)" class="mt-3 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 transition hover:bg-slate-100">
                          Editar moto
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-if="detalle.vehiculos.length === 0" class="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                    No hay vehículos asociados a este cliente.
                  </div>
                </div>
              </div>

              <div class="grid gap-5 xl:grid-cols-2">
                <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <h3 class="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Reservas</h3>
                  <div class="mt-4 space-y-3">
                    <div v-for="reserva in detalle.reservas" :key="reserva.id" class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-sm font-black text-slate-950">{{ formatearFechaHora(reserva.fecha, reserva.hora) }}</div>
                        <span class="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">{{ reserva.estado || 'pendiente' }}</span>
                      </div>
                      <div class="mt-2 text-sm font-semibold text-slate-700">{{ obtenerEtiquetaDetalle('reserva', reserva) }}</div>
                      <div class="mt-1 text-xs text-slate-500">{{ obtenerDetalleResumen('reserva', reserva) }}</div>
                    </div>
                    <div v-if="detalle.reservas.length === 0" class="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                      Sin reservas registradas.
                    </div>
                  </div>
                </div>

                <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <h3 class="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Aprontes</h3>
                  <div class="mt-4 space-y-3">
                    <div v-for="apronte in detalle.aprontes" :key="apronte.id" class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-sm font-black text-slate-950">{{ formatearFechaHora(apronte.fecha, apronte.hora) }}</div>
                        <span class="rounded-full bg-cyan-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">{{ apronte.estado || 'apronte' }}</span>
                      </div>
                      <div class="mt-2 text-sm font-semibold text-slate-700">{{ obtenerEtiquetaDetalle('apronte', apronte) }}</div>
                      <div class="mt-1 text-xs text-slate-500">{{ obtenerDetalleResumen('apronte', apronte) }}</div>
                    </div>
                    <div v-if="detalle.aprontes.length === 0" class="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                      Sin aprontes registrados.
                    </div>
                  </div>
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <h3 class="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Ingresos y egresos</h3>
                  <button @click="abrirFormularioIngreso" class="rounded-2xl bg-slate-950 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-white transition hover:bg-slate-800">
                    Abrir panel de ingresos
                  </button>
                </div>
                <div class="mt-4 space-y-3">
                  <div v-for="ingreso in ingresos" :key="ingreso.id" class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div class="text-sm font-black text-slate-950">{{ formatearFechaHoraCompleta(ingreso.fecha_actual) }}</div>
                        <div class="mt-1 text-sm text-slate-600">Monto: ${{ Number(ingreso.monto || 0).toFixed(2) }}</div>
                        <div class="mt-1 text-xs text-slate-500">{{ ingreso.trabajo_realizado || 'Sin detalle de trabajo' }}</div>
                      </div>
                      <button @click="abrirIngresoEnPanel(ingreso)" class="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700 transition hover:bg-slate-100">
                        Ver / editar
                      </button>
                      <button
                        v-if="!ingreso.fecha_egreso"
                        @click="registrarEgreso(ingreso)"
                        class="rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Registrar egreso
                      </button>
                      <div v-else class="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">
                        Egresado
                      </div>
                    </div>
                    <div v-if="ingreso.fecha_egreso" class="mt-3 text-xs text-slate-500">
                      Egreso: {{ formatearFechaHoraCompleta(ingreso.fecha_egreso) }}
                    </div>
                  </div>
                  <div v-if="cargandoIngresos" class="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                    Cargando ingresos...
                  </div>
                  <div v-if="!cargandoIngresos && ingresos.length === 0" class="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                    No hay ingresos registrados para este cliente.
                  </div>
                </div>
              </div>
            </div>

            <div class="min-h-0 overflow-auto rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Características</h3>
                <span class="text-xs font-semibold text-slate-400">Perfil del cliente</span>
              </div>
              <div class="mt-4 space-y-3">
                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Cédula</div>
                  <div class="mt-1 text-sm font-semibold text-slate-900">{{ detalle.cliente?.cedula || clienteActivo.cedula }}</div>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Teléfono</div>
                  <div class="mt-1 text-sm font-semibold text-slate-900">{{ detalle.cliente?.telefono || clienteActivo.telefono || 'Sin dato' }}</div>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Localidad</div>
                  <div class="mt-1 text-sm font-semibold text-slate-900">{{ detalle.cliente?.localidad || clienteActivo.localidad || 'Sin dato' }}</div>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Última reserva</div>
                  <div class="mt-1 text-sm font-semibold text-slate-900">{{ formatearFecha(detalle.cliente?.ultima_reserva_fecha || clienteActivo.ultima_reserva_fecha) }}</div>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Último apronte</div>
                  <div class="mt-1 text-sm font-semibold text-slate-900">{{ formatearFecha(detalle.cliente?.ultimo_apronte_fecha || clienteActivo.ultimo_apronte_fecha) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex h-full items-center justify-center p-10 text-sm text-slate-500">
            <div class="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
              Seleccioná un cliente para ver su perfil, vehículos e historial.
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-if="mostrarFormulario" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div class="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-slate-950/60">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-2xl font-black text-white">{{ clienteEditando ? 'Editar cliente' : 'Nuevo cliente' }}</h2>
            <p class="mt-1 text-sm text-slate-400">Guardá el perfil básico y luego completá su historial desde reservas o aprontes.</p>
          </div>
          <button @click="limpiarFormularioCliente" class="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 hover:bg-white/5">Cerrar</button>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <label class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Cédula</span>
            <input v-model="formCliente.cedula" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40" placeholder="12345678" />
          </label>
          <label class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Nombre</span>
            <input v-model="formCliente.nombre" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40" placeholder="Nombre completo" />
          </label>
          <label class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Teléfono</span>
            <input v-model="formCliente.telefono" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40" placeholder="099123456" />
          </label>
          <label class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Localidad</span>
            <input v-model="formCliente.localidad" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40" placeholder="Ciudad / barrio" />
          </label>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button @click="limpiarFormularioCliente" class="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-300 hover:bg-white/5">Cancelar</button>
          <button @click="guardarCliente" :disabled="guardandoCliente" class="rounded-2xl bg-cyan-500 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60">
            {{ guardandoCliente ? 'Guardando...' : 'Guardar cliente' }}
          </button>
        </div>
      </div>
    </div>

    <IngresoModal
      :open="mostrarFormularioIngreso"
      :cliente="clienteActivo"
      :vehiculos="detalle.vehiculos"
      :ingreso="ingresoEditando"
      :form="formIngreso"
      :checklist-ingreso="checklistIngreso"
      :checklist-egreso="checklistEgreso"
      :trabajos="trabajos"
      @close="limpiarFormularioIngreso"
      @save="guardarIngreso"
    />

    <div v-if="mostrarFormularioVehiculo" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div class="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-slate-950/60">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-2xl font-black text-white">Editar moto vinculada</h2>
            <p class="mt-1 text-sm text-slate-400">Actualizá datos identificatorios sin cambiar el cliente asociado.</p>
          </div>
          <button @click="limpiarFormularioVehiculo" class="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 hover:bg-white/5">Cerrar</button>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <label class="space-y-2 sm:col-span-2">
            <span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Matrícula</span>
            <input v-model="formVehiculo.matricula" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40" placeholder="AAA1234" />
          </label>
          <label class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Motor</span>
            <input v-model="formVehiculo.motor" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40" placeholder="Número de motor" />
          </label>
          <label class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Chasis</span>
            <input v-model="formVehiculo.chasis" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40" placeholder="Número de chasis" />
          </label>
          <label class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Color</span>
            <input v-model="formVehiculo.color" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40" placeholder="Color" />
          </label>
          <label class="space-y-2">
            <span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Fecha compra</span>
            <input v-model="formVehiculo.fecha_compra" type="date" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40" />
          </label>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button @click="limpiarFormularioVehiculo" class="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-300 hover:bg-white/5">Cancelar</button>
          <button @click="guardarVehiculo" :disabled="guardandoVehiculo" class="rounded-2xl bg-cyan-500 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60">
            {{ guardandoVehiculo ? 'Guardando...' : 'Guardar moto' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
