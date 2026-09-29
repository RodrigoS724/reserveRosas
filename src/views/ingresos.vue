<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import IngresoModal from '../components/IngresoModal.vue'
import { CHECK_ITEMS } from '../utils/ordenServicio'

const route = useRoute()
const isDarkTheme = ref(true)

type TrabajoRow = {
  cantidad: string
  descripcion: string
  costo: string
  importe: string
}

type Checklist = Record<string, boolean>

const normalizarCedula = (value: string) => String(value || '').replace(/\D/g, '')
const normalizarTexto = (value: string) => String(value || '').trim().toLowerCase()

const hoyIso = () => new Date().toISOString().slice(0, 10)
const formatFechaHora = (fecha?: string | null) => {
  if (!fecha) return 'Sin dato'
  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) return String(fecha)
  return `${date.toLocaleDateString('es-UY', { year: 'numeric', month: '2-digit', day: '2-digit' })} · ${date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}`
}

const cedula = ref('')
const clienteEncontrado = ref(false)
const cargandoCliente = ref(false)
const cargandoListado = ref(false)
const guardandoIngreso = ref(false)
const mostrarModal = ref(false)
const error = ref('')
const cliente = ref<any | null>(null)
const vehiculosCliente = ref<any[]>([])
const vehiculoSeleccionadoId = ref<number | null>(null)
const ingresos = ref<any[]>([])
const ingresoEnEdicionId = ref<number | null>(null)
const ingresoSeleccionado = ref<any | null>(null)
const reservaOrigen = ref<any | null>(null)
const modalInitialSection = ref<'ingreso' | 'egreso'>('ingreso')
const filtroIngresos = ref('')

const form = ref({
  fecha_ingreso: hoyIso(),
  fecha_salida: '',
  nombre: '',
  telefono: '',
  email: '',
  localidad: '',
  vehiculo_id: null as number | null,
  marca: '',
  modelo: '',
  color: '',
  kilometraje: '',
  matricula: '',
  numero_motor: '',
  numero_servicios: '',
  comentarios: '',
  observaciones: '',
  monto: '',
  trabajo_realizado: ''
})

let themeObserver: MutationObserver | null = null

const syncTheme = () => {
  isDarkTheme.value = document.documentElement.classList.contains('dark')
}

const cargarClientePorReferencia = async (referencia: string) => {
  const value = String(referencia || '').trim()
  if (!value) return false

  if (/^\d+$/.test(value)) {
    try {
      const detalle = await api.obtenerClienteDetalle(Number(value))
      if (detalle?.cliente) {
        aplicarCliente(detalle.cliente)
        vehiculosCliente.value = Array.isArray(detalle?.vehiculos) ? detalle.vehiculos : []
        if (vehiculosCliente.value.length === 1) {
          aplicarVehiculo(vehiculosCliente.value[0])
        }
        cedula.value = normalizarCedula(String(detalle.cliente.cedula || value))
        return true
      }
    } catch {}
  }

  cedula.value = normalizarCedula(value)
  await buscarCliente()
  return Boolean(cliente.value)
}

const checklistIngreso = ref<Checklist>({
  espejos: false,
  faro_delantero: false,
  tapon_gasolina: false,
  luz_stop_trasero: false,
  cubiertas_completas: false,
  tapon_radiadores: false,
  filtro_aire: false,
  bateria: false,
  llaves: false,
  pedales: false
})

const checklistEgreso = ref<Checklist>({
  espejos: false,
  faro_delantero: false,
  tapon_gasolina: false,
  luz_stop_trasero: false,
  cubiertas_completas: false,
  tapon_radiadores: false,
  filtro_aire: false,
  bateria: false,
  llaves: false,
  pedales: false
})

const trabajos = ref<TrabajoRow[]>([
  { cantidad: '', descripcion: '', costo: '', importe: '' },
  { cantidad: '', descripcion: '', costo: '', importe: '' },
  { cantidad: '', descripcion: '', costo: '', importe: '' },
  { cantidad: '', descripcion: '', costo: '', importe: '' }
])

const totalTrabajo = computed(() => {
  return trabajos.value.reduce((total, row) => {
    const importe = Number(String(row.importe || '').replace(',', '.'))
    const cantidad = Number(String(row.cantidad || '').replace(',', '.'))
    const costo = Number(String(row.costo || '').replace(',', '.'))
    if (Number.isFinite(importe) && importe > 0) {
      return total + importe
    }
    if (Number.isFinite(cantidad) && Number.isFinite(costo)) {
      return total + cantidad * costo
    }
    return total
  }, 0)
})

const formatearMonto = (value: any) => {
  const monto = Number(value || 0)
  return Number.isFinite(monto) ? monto.toFixed(2) : '0.00'
}

const ingresosOrdenados = computed(() => {
  return [...ingresos.value].sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0))
})

const ingresosSeguro = computed<any[]>(() => (Array.isArray(ingresos.value) ? ingresos.value : []))

const ingresosPendientes = computed(() => ingresosSeguro.value.filter((item: any) => !item.fecha_egreso).length)

const montoTotalIngresos = computed(() => ingresosSeguro.value.reduce((total: number, item: any) => total + Number(item?.monto || 0), 0))

const ingresosFiltrados = computed(() => {
  const filtro = normalizarTexto(filtroIngresos.value)
  if (!filtro) return ingresosOrdenados.value
  return ingresosOrdenados.value.filter((ingreso) => {
    const texto = [
      ingreso?.id,
      ingreso?.cliente_nombre,
      ingreso?.cliente_cedula,
      ingreso?.trabajo_realizado,
      ingreso?.monto
    ].map((value) => String(value || '').toLowerCase()).join(' ')
    return texto.includes(filtro)
  })
})

const siguienteFolio = computed(() => {
  const maxId = ingresosSeguro.value.reduce((maximo, ingreso) => Math.max(maximo, Number(ingreso?.id || 0)), 0)
  return maxId + 1
})

const cargarIngresosGenerales = async () => {
  cargandoListado.value = true
  error.value = ''
  try {
    ingresos.value = await api.listarIngresos()
  } catch (err: any) {
    error.value = err?.message || 'No se pudo cargar el listado general de ingresos'
    ingresos.value = []
  } finally {
    cargandoListado.value = false
  }
}

const aplicarCliente = (detalleCliente: any) => {
  cliente.value = detalleCliente || null
  clienteEncontrado.value = Boolean(detalleCliente)
  if (detalleCliente) {
    form.value.nombre = String(detalleCliente.nombre || form.value.nombre || '')
    form.value.telefono = String(detalleCliente.telefono || form.value.telefono || '')
    form.value.localidad = String(detalleCliente.localidad || form.value.localidad || '')
  }
}

const aplicarVehiculo = (vehiculo: any) => {
  if (!vehiculo) return
  vehiculoSeleccionadoId.value = Number(vehiculo.id || 0) || null
  form.value.marca = String(vehiculo.marca || vehiculo.codigo_marca || form.value.marca || '')
  form.value.modelo = String(vehiculo.modelo || vehiculo.codigo_modelo || form.value.modelo || '')
  form.value.color = String(vehiculo.color || form.value.color || '')
  form.value.matricula = String(vehiculo.matricula || form.value.matricula || '')
  form.value.numero_motor = String(vehiculo.motor || vehiculo.numero_motor || form.value.numero_motor || '')
}

const cargarIngresoEnEditor = (ingreso: any, seccion: 'ingreso' | 'egreso' = 'ingreso') => {
  if (!ingreso) return
  ingresoSeleccionado.value = ingreso
  ingresoEnEdicionId.value = Number(ingreso.id || 0) || null
  reservaOrigen.value = ingreso?.reserva_id ? { id: Number(ingreso.reserva_id) } : null
  modalInitialSection.value = seccion
  form.value.fecha_ingreso = String(ingreso.fecha_actual || '').slice(0, 10) || hoyIso()
  form.value.fecha_salida = String(ingreso.fecha_egreso || '').slice(0, 10)
  form.value.monto = String(ingreso.monto ?? '')
  form.value.trabajo_realizado = String(ingreso.trabajo_realizado || '')
  clienteEncontrado.value = true
  cliente.value = {
    id: ingreso.cliente_id,
    cedula: ingreso.cliente_cedula,
    nombre: ingreso.cliente_nombre,
    telefono: ingreso.cliente_telefono,
    localidad: ingreso.localidad || ''
  }
  cedula.value = normalizarCedula(String(ingreso.cliente_cedula || ''))
  mostrarModal.value = true
}

const cargarFichaDesdeReserva = async (reserva: any, seccion: 'ingreso' | 'egreso' = 'ingreso') => {
  if (!reserva) return
  reservaOrigen.value = reserva
  ingresoSeleccionado.value = {
    id: null,
    reserva_id: reserva.id,
    cliente_id: reserva.cliente_id,
    cliente_cedula: reserva.cedula,
    cliente_nombre: reserva.nombre,
    cliente_telefono: reserva.telefono,
    fecha_actual: new Date().toISOString()
  }
  ingresoEnEdicionId.value = null
  modalInitialSection.value = seccion

  let detalleCliente: any = null
  try {
    detalleCliente = await api.obtenerClienteDetalle(reserva.cliente_id || reserva.cedula || '')
  } catch {}

  const clienteBase = detalleCliente?.cliente || {
    id: reserva.cliente_id ?? null,
    cedula: reserva.cedula || '',
    nombre: reserva.nombre || '',
    telefono: reserva.telefono || '',
    localidad: reserva.localidad || ''
  }

  aplicarCliente(clienteBase)
  vehiculosCliente.value = Array.isArray(detalleCliente?.vehiculos) ? detalleCliente.vehiculos : []

  const vehiculoInicial = vehiculosCliente.value.find((vehiculo) => Number(vehiculo.id) === Number(reserva.vehiculo_id || 0)) || vehiculosCliente.value[0] || null
  if (vehiculoInicial) {
    aplicarVehiculo(vehiculoInicial)
  } else {
    vehiculoSeleccionadoId.value = Number(reserva.vehiculo_id || 0) || null
    form.value.marca = String(reserva.marca || '')
    form.value.modelo = String(reserva.modelo || '')
    form.value.color = String(reserva.color || '')
    form.value.matricula = String(reserva.matricula || '')
    form.value.numero_motor = String(reserva.numero_motor || '')
  }

  cedula.value = normalizarCedula(String(reserva.cedula || clienteBase.cedula || ''))
  form.value = {
    fecha_ingreso: hoyIso(),
    fecha_salida: '',
    nombre: String(clienteBase.nombre || reserva.nombre || ''),
    telefono: String(clienteBase.telefono || reserva.telefono || ''),
    email: String(clienteBase.correo || clienteBase.email || ''),
    localidad: String(clienteBase.localidad || reserva.localidad || ''),
    vehiculo_id: vehiculoInicial?.id ? Number(vehiculoInicial.id) : Number(reserva.vehiculo_id || 0) || null,
    marca: String(vehiculoInicial?.marca || vehiculoInicial?.codigo_marca || reserva.marca || ''),
    modelo: String(vehiculoInicial?.modelo || vehiculoInicial?.codigo_modelo || reserva.modelo || ''),
    color: String(vehiculoInicial?.color || reserva.color || ''),
    kilometraje: String(reserva.km || ''),
    matricula: String(vehiculoInicial?.matricula || reserva.matricula || ''),
    numero_motor: String(vehiculoInicial?.motor || vehiculoInicial?.numero_motor || reserva.numero_motor || ''),
    numero_servicios: String(reserva.garantia_numero_service || ''),
    comentarios: String(reserva.detalles || reserva.garantia_problema || ''),
    observaciones: String(reserva.detalles || reserva.garantia_problema || ''),
    monto: '',
    trabajo_realizado: ''
  }

  checklistIngreso.value = Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false]))
  checklistEgreso.value = Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false]))
  trabajos.value = [
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' }
  ]
  mostrarModal.value = true
}

const abrirModalNuevo = () => {
  limpiarFormulario()
  mostrarModal.value = true
}

const cerrarModal = () => {
  mostrarModal.value = false
}

const buscarCliente = async () => {
  const valor = normalizarCedula(cedula.value)
  if (valor.length < 7) {
    clienteEncontrado.value = false
    cliente.value = null
    vehiculosCliente.value = []
    vehiculoSeleccionadoId.value = null
    ingresos.value = []
    return
  }

  cargandoCliente.value = true
  error.value = ''
  try {
    const detalle = await api.obtenerClienteDetalle(valor)
    aplicarCliente(detalle?.cliente || null)
    vehiculosCliente.value = Array.isArray(detalle?.vehiculos) ? detalle.vehiculos : []
    if (vehiculosCliente.value.length === 1) {
      aplicarVehiculo(vehiculosCliente.value[0])
    }
  } catch (err: any) {
    error.value = err?.message || 'No se pudo cargar el cliente'
    clienteEncontrado.value = false
    cliente.value = null
    vehiculosCliente.value = []
    vehiculoSeleccionadoId.value = null
    ingresos.value = []
  } finally {
    cargandoCliente.value = false
  }
}

const onVehiculoChange = (value: string) => {
  const id = value ? Number(value) : null
  vehiculoSeleccionadoId.value = id
  if (!id) return
  const vehiculo = vehiculosCliente.value.find((item) => Number(item.id) === id)
  if (vehiculo) aplicarVehiculo(vehiculo)
}

const onVehiculoChangeEvent = (event: Event) => {
  const target = event.target as HTMLSelectElement | null
  onVehiculoChange(String(target?.value || ''))
}

const sincronizarVehiculoIngreso = async () => {
  const vehiculoId = Number(form.value.vehiculo_id || 0)
  if (!vehiculoId) return
  const vehiculoActual = vehiculosCliente.value.find((item) => Number(item.id) === vehiculoId) || null
  try {
    await api.actualizarVehiculoCliente({
      id: vehiculoId,
      matricula: form.value.matricula || vehiculoActual?.matricula || '',
      motor: form.value.numero_motor || vehiculoActual?.motor || vehiculoActual?.numero_motor || '',
      chasis: vehiculoActual?.chasis || '',
      color: form.value.color || vehiculoActual?.color || '',
      marca: form.value.marca || vehiculoActual?.marca || vehiculoActual?.codigo_marca || '',
      modelo: form.value.modelo || vehiculoActual?.modelo || vehiculoActual?.codigo_modelo || '',
      fecha_compra: vehiculoActual?.fecha_compra || ''
    })
  } catch (err) {
    console.warn('[Ingresos] No se pudo sincronizar la moto del ingreso:', err)
  }
}

const clonarPlano = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

const limpiarFormulario = () => {
  const clienteActual = cliente.value
  const vehiculoActual = vehiculoSeleccionadoId.value
  ingresoSeleccionado.value = null
  reservaOrigen.value = null
  form.value = {
    fecha_ingreso: hoyIso(),
    fecha_salida: '',
    nombre: '',
    telefono: '',
    email: '',
    localidad: '',
    vehiculo_id: null,
    marca: '',
    modelo: '',
    color: '',
    kilometraje: '',
    matricula: '',
    numero_motor: '',
    numero_servicios: '',
    comentarios: '',
    observaciones: '',
    monto: '',
    trabajo_realizado: ''
  }
  ingresoEnEdicionId.value = null
  checklistIngreso.value = Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false]))
  checklistEgreso.value = Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false]))
  trabajos.value = [
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' }
  ]
  if (clienteActual) {
    aplicarCliente(clienteActual)
  }
  if (vehiculoActual) {
    const vehiculo = vehiculosCliente.value.find((item) => Number(item.id) === Number(vehiculoActual))
    if (vehiculo) {
      aplicarVehiculo(vehiculo)
    }
  }
}

const cargarContextoDesdeQuery = async () => {
  const queryIngresoId = Number(route.query.ingreso_id || 0)
  const queryReservaId = Number(route.query.reserva_id || 0)
  const queryAction = String(route.query.action || '').toLowerCase()
  const seccion = queryAction === 'egreso' ? 'egreso' : 'ingreso'

  if (queryIngresoId) {
    try {
      const ingreso = await api.obtenerIngreso(queryIngresoId)
      if (ingreso) {
        cargarIngresoEnEditor(ingreso, seccion)
      }
    } catch {}
    return
  }

  if (queryReservaId) {
    try {
      const reserva = await api.obtenerReserva(queryReservaId)
      if (reserva) {
        await cargarFichaDesdeReserva(reserva, seccion)
      }
    } catch {}
  }
}

const guardarIngreso = async () => {
  if (!cliente.value?.id) return
  guardandoIngreso.value = true
  error.value = ''
  try {
    console.debug('[Ingresos][Ingreso] guardarIngreso:start', {
      clienteId: cliente.value?.id,
      ingresoEnEdicionId: ingresoEnEdicionId.value,
      vehiculoId: form.value.vehiculo_id,
      monto: form.value.monto,
      fechaIngreso: form.value.fecha_ingreso,
      fechaSalida: form.value.fecha_salida
    })
    await sincronizarVehiculoIngreso()
    if (vehiculoSeleccionadoId.value) {
      const vehiculoActual = vehiculosCliente.value.find((item) => Number(item.id) === Number(vehiculoSeleccionadoId.value)) || {}
      await api.actualizarVehiculoCliente({
        id: vehiculoSeleccionadoId.value,
        matricula: form.value.matricula || vehiculoActual.matricula || '',
        motor: form.value.numero_motor || vehiculoActual.motor || vehiculoActual.numero_motor || '',
        chasis: '',
        color: form.value.color || vehiculoActual.color || '',
        marca: form.value.marca || vehiculoActual.marca || vehiculoActual.codigo_marca || '',
        modelo: form.value.modelo || vehiculoActual.modelo || vehiculoActual.codigo_modelo || '',
        fecha_compra: vehiculoActual.fecha_compra || ''
      })
    }

    const trabajoRealizado = String(form.value.trabajo_realizado || '').trim()
    const monto = Number(String(form.value.monto || '').replace(',', '.'))
    const checklistIngresoPayload = clonarPlano(checklistIngreso.value)
    const checklistEgresoPayload = clonarPlano(checklistEgreso.value)
    const trabajosPayload = clonarPlano(trabajos.value)
    const payload = {
      cliente_id: cliente.value.id,
      reserva_id: reservaOrigen.value?.id || ingresoSeleccionado.value?.reserva_id || null,
      fecha_actual: `${form.value.fecha_ingreso}T${new Date().toISOString().slice(11, 16)}:00`,
      fecha_egreso: form.value.fecha_salida ? `${form.value.fecha_salida}T${new Date().toISOString().slice(11, 16)}:00` : null,
      monto: Number.isFinite(monto) && monto > 0 ? monto : totalTrabajo.value,
      trabajo_realizado: trabajoRealizado,
      vehiculo_id: form.value.vehiculo_id,
      marca: form.value.marca,
      modelo: form.value.modelo,
      color: form.value.color,
      matricula: form.value.matricula,
      numero_motor: form.value.numero_motor,
      numero_servicios: form.value.numero_servicios,
      comentarios: form.value.comentarios,
      observaciones: form.value.observaciones,
      checklist_ingreso: checklistIngresoPayload,
      checklist_egreso: checklistEgresoPayload,
      trabajos: trabajosPayload
    }

    console.debug('[Ingresos][Ingreso] payload:', {
      cliente_id: payload.cliente_id,
      vehiculo_id: payload.vehiculo_id,
      fecha_actual: payload.fecha_actual,
      fecha_egreso: payload.fecha_egreso,
      monto: payload.monto,
      marca: payload.marca,
      modelo: payload.modelo,
      color: payload.color,
      matricula: payload.matricula,
      numero_motor: payload.numero_motor,
      numero_servicios: payload.numero_servicios
    })

    let guardado: any = null
    if (ingresoEnEdicionId.value) {
      console.debug('[Ingresos][Ingreso] calling actualizarIngreso', { id: ingresoEnEdicionId.value })
      guardado = await api.actualizarIngreso({ id: ingresoEnEdicionId.value, ...payload })
    } else {
      console.debug('[Ingresos][Ingreso] calling crearIngreso')
      guardado = await api.crearIngreso(payload)
    }
    console.debug('[Ingresos][Ingreso] raw save result:', guardado)
    if (!guardado || typeof guardado !== 'object' || !('id' in guardado) || !guardado.id) {
      throw new Error(`Respuesta de ingreso invalida: ${JSON.stringify(guardado)}`)
    }
    await cargarIngresosGenerales()
    if (guardado?.id) {
      ingresoSeleccionado.value = guardado
      ingresoEnEdicionId.value = Number(guardado.id) || ingresoEnEdicionId.value
    }
    console.debug('[Ingresos][Ingreso] guardarIngreso:ok', { ingresoId: guardado?.id ?? null })
    return guardado
  } catch (err: any) {
    error.value = err?.message || 'No se pudo registrar el ingreso'
    console.error('[Ingresos][Ingreso] guardarIngreso:error', err)
    throw err
  } finally {
    guardandoIngreso.value = false
  }
}

const buildPrintHtml = () => {
  const folio = ingresoSeleccionado.value?.id || siguienteFolio.value
  const clienteNombre = String(form.value.nombre || cliente.value?.nombre || '')
  const clienteCedula = String(cedula.value || cliente.value?.cedula || '')
  const telefono = String(form.value.telefono || cliente.value?.telefono || '')
  const localidad = String(form.value.localidad || cliente.value?.localidad || '')
  const marca = String(form.value.marca || '')
  const modelo = String(form.value.modelo || '')
  const color = String(form.value.color || '')
  const matricula = String(form.value.matricula || '')
  const motor = String(form.value.numero_motor || '')
  const comentario = String(form.value.comentarios || '')
  const observacion = String(form.value.observaciones || '')
  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Ficha de trabajo #${folio}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
        .sheet { border: 2px solid #0f172a; padding: 18px; min-height: 260mm; box-sizing: border-box; }
        .top { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; border-bottom: 1px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
        .brand { font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
        .title { font-size: 26px; font-weight: 900; margin: 6px 0 0; }
        .folio { font-size: 14px; font-weight: 800; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 14px; margin-bottom: 14px; }
        .box { border: 1px solid #0f172a; padding: 10px 12px; min-height: 30px; }
        .label { font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #475569; margin-bottom: 5px; }
        .value { font-size: 14px; font-weight: 700; }
        .block { border: 1px solid #0f172a; padding: 12px; min-height: 115px; margin-bottom: 14px; }
        .block-title { font-size: 10px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #475569; margin-bottom: 10px; }
        .lines { height: 82px; background: repeating-linear-gradient(to bottom, transparent 0, transparent 22px, rgba(15,23,42,.22) 22px, rgba(15,23,42,.22) 23px); }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 18px; }
        .sig { border: 1px dashed #0f172a; min-height: 88px; display: flex; align-items: end; justify-content: center; padding: 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; }
        .muted { color: #475569; }
      </style>
    </head>
    <body>
      <main class="sheet">
        <div class="top">
          <div>
            <div class="brand">ReserveRosas</div>
            <div class="title">Ficha de trabajo</div>
          </div>
          <div class="folio">N° ${folio}</div>
        </div>

        <div class="grid">
          <div class="box"><div class="label">Ingreso</div><div class="value">${form.value.fecha_ingreso || ''}</div></div>
          <div class="box"><div class="label">Egreso</div><div class="value">${form.value.fecha_salida || ''}</div></div>
          <div class="box"><div class="label">Cliente</div><div class="value">${clienteNombre}</div></div>
          <div class="box"><div class="label">Cédula</div><div class="value">${clienteCedula}</div></div>
          <div class="box"><div class="label">Teléfono</div><div class="value">${telefono}</div></div>
          <div class="box"><div class="label">Localidad</div><div class="value">${localidad}</div></div>
          <div class="box"><div class="label">Moto</div><div class="value">${marca} ${modelo}</div></div>
          <div class="box"><div class="label">Matrícula</div><div class="value">${matricula}</div></div>
          <div class="box"><div class="label">Color</div><div class="value">${color}</div></div>
          <div class="box"><div class="label">Motor</div><div class="value">${motor}</div></div>
        </div>

        <div class="block">
          <div class="block-title">Observaciones</div>
          <div class="lines"></div>
        </div>

        <div class="block">
          <div class="block-title">Notas de entrega</div>
          <div class="lines"></div>
        </div>

        <div class="signatures">
          <div class="sig">Firma del prestador</div>
          <div class="sig">Firma del cliente</div>
        </div>

        <div style="margin-top:14px;font-size:10px;color:#64748b;">
          Comentarios: ${comentario || '<span class="muted">&nbsp;</span>'}<br />
          Observaciones: ${observacion || '<span class="muted">&nbsp;</span>'}
        </div>
      </main>
    </body>
  </html>`
}

const imprimirHoja = (win: Window | null = null) => {
  const printWindow = win || window.open('', '_blank', 'width=980,height=1200')
  if (!printWindow) {
    alert('No se pudo abrir la ventana de impresión')
    return
  }
  printWindow.document.open()
  printWindow.document.write(buildPrintHtml())
  printWindow.document.close()
}

const guardarYImprimir = async () => {
  const printWindow = window.open('', '_blank', 'width=980,height=1200')
  if (!printWindow) {
    alert('No se pudo abrir la ventana de impresión')
    console.error('[Ingresos][Ingreso] guardarYImprimir:popup-blocked')
    return
  }
  try {
    console.debug('[Ingresos][Ingreso] guardarYImprimir:start', {
      ingresoEnEdicionId: ingresoEnEdicionId.value,
      clienteId: cliente.value?.id,
      vehiculoId: form.value.vehiculo_id
    })
    const guardado = await guardarIngreso()
    if (guardado?.id) {
      ingresoSeleccionado.value = guardado
      console.debug('[Ingresos][Ingreso] guardarYImprimir:print', { ingresoId: guardado.id })
      imprimirHoja(printWindow)
    } else {
      console.error('[Ingresos][Ingreso] guardarYImprimir:sin-guardado')
      printWindow.close()
    }
  } catch (err) {
    console.error('[Ingresos][Ingreso] guardarYImprimir:error', { error: err })
    error.value = err instanceof Error ? err.message : 'Error inesperado al guardar e imprimir'
    printWindow.close()
  }
}

watch(cedula, (value) => {
  const normalizada = normalizarCedula(value)
  if (normalizada !== value) cedula.value = normalizada
})

watch(cedula, () => {
  buscarCliente()
})

watch(() => form.value.marca, async (marca) => {
  if (!marca) return
  if (!cliente.value?.id) return
  try {
    const detalle = await api.obtenerClienteDetalle(cliente.value.id)
    const vehiculo = Array.isArray(detalle?.vehiculos)
      ? detalle.vehiculos.find((item: any) => String(item.marca || item.codigo_marca || '').toLowerCase() === String(marca || '').toLowerCase()) || detalle.vehiculos[0]
      : null
    if (vehiculo) {
      aplicarVehiculo(vehiculo)
    }
  } catch {}
})

watch(() => [route.query.ingreso_id, route.query.reserva_id, route.query.action], () => {
  void cargarContextoDesdeQuery()
})

onMounted(() => {
  syncTheme()
  themeObserver = new MutationObserver(syncTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  cargarIngresosGenerales()
  void cargarContextoDesdeQuery()

  const queryClienteId = String(route.query.cliente_id || '').trim()
  if (queryClienteId) {
    cargarClientePorReferencia(queryClienteId)
  }

  const queryCedula = String(route.query.cedula || '').trim()
  if (queryCedula) {
    cargarClientePorReferencia(queryCedula)
  }
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<template>
  <div :class="isDarkTheme ? 'theme-dark' : 'theme-light'" class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_28%),linear-gradient(135deg,#07111c_0%,#0f172a_45%,#08111f_100%)] text-slate-100">
    <div class="mx-auto flex min-h-screen max-w-[1700px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <header class="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-8">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <div class="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200">
              Ficha de trabajo
            </div>
            <h1 class="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Hoja imprimible vinculada a la reserva
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Abrila desde una reserva o desde un ingreso ya creado, completá los datos necesarios y imprimí una hoja A4 lista para firma.
            </p>
          </div>

          <div class="flex gap-2">
            <button @click="() => imprimirHoja()" class="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-100 transition hover:bg-slate-950/60">
              Imprimir hoja
            </button>
            <button @click="guardarYImprimir" :disabled="guardandoIngreso" class="rounded-2xl bg-emerald-600 px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
              {{ guardandoIngreso ? 'Guardando...' : 'Guardar e imprimir' }}
            </button>
          </div>
        </div>
      </header>

      <div v-if="error" class="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
        {{ error }}
      </div>

      <div class="grid min-h-0 flex-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside class="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
          <div class="border-b border-white/10 p-4 sm:p-5">
            <label class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Buscar por cédula</label>
            <input
              v-model="cedula"
              type="text"
              placeholder="12345678"
              class="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/40 focus:bg-white/8"
            />
          </div>

          <div class="flex-1 overflow-auto p-4 sm:p-5 space-y-4">
            <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Estado</div>

          const cargarFichaDesdeReserva = async (reserva: any, seccion: 'ingreso' | 'egreso' = 'ingreso') => {
            if (!reserva) return
            reservaOrigen.value = reserva
            ingresoSeleccionado.value = {
              id: null,
              reserva_id: reserva.id,
              cliente_id: reserva.cliente_id,
              cliente_cedula: reserva.cedula,
              cliente_nombre: reserva.nombre,
              cliente_telefono: reserva.telefono,
              fecha_actual: new Date().toISOString()
            }
            ingresoEnEdicionId.value = null
            modalInitialSection.value = seccion

            let detalleCliente: any = null
            try {
              detalleCliente = await api.obtenerClienteDetalle(reserva.cliente_id || reserva.cedula || '')
            } catch {}

            const clienteBase = detalleCliente?.cliente || {
              id: reserva.cliente_id ?? null,
              cedula: reserva.cedula || '',
              nombre: reserva.nombre || '',
              telefono: reserva.telefono || '',
              localidad: reserva.localidad || ''
            }

            aplicarCliente(clienteBase)
            vehiculosCliente.value = Array.isArray(detalleCliente?.vehiculos) ? detalleCliente.vehiculos : []

            const vehiculoInicial = vehiculosCliente.value.find((vehiculo) => Number(vehiculo.id) === Number(reserva.vehiculo_id || 0)) || vehiculosCliente.value[0] || null
            if (vehiculoInicial) {
              aplicarVehiculo(vehiculoInicial)
            } else {
              vehiculoSeleccionadoId.value = Number(reserva.vehiculo_id || 0) || null
              form.value.marca = String(reserva.marca || '')
              form.value.modelo = String(reserva.modelo || '')
              form.value.color = String(reserva.color || '')
              form.value.matricula = String(reserva.matricula || '')
              form.value.numero_motor = String(reserva.numero_motor || '')
            }

            cedula.value = normalizarCedula(String(reserva.cedula || clienteBase.cedula || ''))
            form.value = {
              fecha_ingreso: hoyIso(),
              fecha_salida: '',
              nombre: String(clienteBase.nombre || reserva.nombre || ''),
              telefono: String(clienteBase.telefono || reserva.telefono || ''),
              email: String(clienteBase.correo || clienteBase.email || ''),
              localidad: String(clienteBase.localidad || reserva.localidad || ''),
              vehiculo_id: vehiculoInicial?.id ? Number(vehiculoInicial.id) : Number(reserva.vehiculo_id || 0) || null,
              marca: String(vehiculoInicial?.marca || vehiculoInicial?.codigo_marca || reserva.marca || ''),
              modelo: String(vehiculoInicial?.modelo || vehiculoInicial?.codigo_modelo || reserva.modelo || ''),
              color: String(vehiculoInicial?.color || reserva.color || ''),
              kilometraje: String(reserva.km || ''),
              matricula: String(vehiculoInicial?.matricula || reserva.matricula || ''),
              numero_motor: String(vehiculoInicial?.motor || vehiculoInicial?.numero_motor || reserva.numero_motor || ''),
              numero_servicios: String(reserva.garantia_numero_service || ''),
              comentarios: String(reserva.detalles || reserva.garantia_problema || ''),
              observaciones: String(reserva.detalles || reserva.garantia_problema || ''),
              monto: '',
              trabajo_realizado: ''
            }

            checklistIngreso.value = Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false]))
            checklistEgreso.value = Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false]))
            trabajos.value = [
              { cantidad: '', descripcion: '', costo: '', importe: '' },
              { cantidad: '', descripcion: '', costo: '', importe: '' },
              { cantidad: '', descripcion: '', costo: '', importe: '' },
              { cantidad: '', descripcion: '', costo: '', importe: '' }
            ]
            mostrarModal.value = true
          }
              <div class="mt-2 text-sm font-semibold text-slate-200">
                {{ cargandoCliente ? 'Buscando cliente...' : clienteEncontrado ? 'Cliente encontrado' : 'Esperando selección' }}
              </div>
            </div>

            <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Ingreso seleccionado</div>
              <div class="mt-2 text-base font-black text-white">{{ ingresoSeleccionado ? `#${ingresoSeleccionado.id}` : 'Sin selección' }}</div>
              <div class="mt-1 text-sm text-slate-300">{{ ingresoSeleccionado?.cliente_nombre || cliente?.nombre || 'Sin datos' }}</div>
              <div class="mt-1 text-sm text-slate-300">CI {{ ingresoSeleccionado?.cliente_cedula || cliente?.cedula || '---' }}</div>
              <div class="mt-1 text-sm text-slate-300">{{ ingresoSeleccionado?.fecha_egreso ? 'Con egreso' : 'Pendiente de egreso' }}</div>
            </div>

            <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Vehículo</div>
              <select
                :value="vehiculoSeleccionadoId ?? ''"
                class="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
                @change="onVehiculoChangeEvent"
              >
                <option value="">Sin seleccionar</option>
                <option v-for="vehiculo in vehiculosCliente" :key="vehiculo.id" :value="vehiculo.id">
                  {{ vehiculo.matricula || 'Sin matrícula' }} · {{ vehiculo.marca || vehiculo.codigo_marca || '' }} {{ vehiculo.modelo || vehiculo.codigo_modelo || '' }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Ingresos</div>
                <div class="mt-1 text-2xl font-black text-white">{{ ingresosSeguro.length }}</div>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Pendientes</div>
                <div class="mt-1 text-2xl font-black text-white">{{ ingresosPendientes }}</div>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Monto total</div>
                <div class="mt-1 text-2xl font-black text-white">{{ montoTotalIngresos.toFixed(2) }}</div>
              </div>
            </div>
          </div>
        </aside>

        <section class="min-h-0 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 text-slate-100 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div class="border-b border-white/10 px-5 py-5 sm:px-6">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                  Listado global
                </div>
                <h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Ingresos creados</h2>
                <p class="mt-2 text-sm text-slate-500">Hacé click en un ingreso para abrir el modal, editarlo o darle egreso.</p>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <input v-model="filtroIngresos" type="text" placeholder="Buscar por cliente, CI, id o monto" class="min-w-[280px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400/50" />
                <button @click="abrirModalNuevo" class="rounded-2xl bg-slate-950 px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition hover:bg-slate-800">
                  Nuevo ingreso
                </button>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Ingresos</div>
                  <div class="mt-1 text-2xl font-black text-white">{{ ingresosSeguro.length }}</div>
              </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Pendientes</div>
                  <div class="mt-1 text-2xl font-black text-white">{{ ingresosSeguro.filter((item) => !item.fecha_egreso).length }}</div>
              </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Monto total</div>
                  <div class="mt-1 text-2xl font-black text-white">{{ ingresosSeguro.reduce((total, item) => total + Number(item.monto || 0), 0).toFixed(2) }}</div>
              </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Siguiente folio</div>
                  <div class="mt-1 text-2xl font-black text-white">#{{ siguienteFolio }}</div>
              </div>
            </div>
          </div>

          <div class="min-h-0 overflow-auto p-5 sm:p-6">
            <div v-if="cargandoListado" class="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-sm text-slate-400">Cargando ingresos...</div>
            <div v-else-if="ingresosFiltrados.length === 0" class="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-sm text-slate-400">No hay ingresos para mostrar.</div>

            <div v-else class="grid gap-3">
              <button
                v-for="ingreso in ingresosFiltrados"
                :key="ingreso.id"
                @click="cargarIngresoEnEditor(ingreso)"
                class="w-full rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4 text-left shadow-lg shadow-slate-950/20 transition hover:border-cyan-400/30 hover:bg-slate-900/70"
              >
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <div class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-100">#{{ ingreso.id }}</div>
                      <div class="text-sm font-black text-white">{{ ingreso.cliente_nombre || 'Sin cliente' }}</div>
                    </div>
                    <div class="mt-1 text-sm text-slate-300">CI {{ ingreso.cliente_cedula || '---' }} · {{ formatFechaHora(ingreso.fecha_actual) }}</div>
                    <div class="mt-1 text-xs text-slate-400">Monto: ${{ formatearMonto(ingreso.monto) }} · {{ ingreso.fecha_egreso ? `Egreso: ${formatFechaHora(ingreso.fecha_egreso)}` : 'Pendiente de egreso' }}</div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <div class="rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em]" :class="ingreso.fecha_egreso ? 'border border-white/10 bg-white/5 text-slate-100' : 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-100'">
                      {{ ingreso.fecha_egreso ? 'Egresado' : 'Abierto' }}
                    </div>
                    <span class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-slate-100">Abrir modal</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>
      </div>

      <IngresoModal
        :open="mostrarModal"
        :cliente="cliente"
        :vehiculos="vehiculosCliente"
        :ingreso="ingresoSeleccionado"
        :initial-section="modalInitialSection"
        :form="form"
        :checklist-ingreso="checklistIngreso"
        :checklist-egreso="checklistEgreso"
        :trabajos="trabajos"
        :allow-print="true"
        @close="cerrarModal"
        @save="guardarIngreso"
        @save-and-print="guardarYImprimir"
      />
    </div>
  </div>
</template>

<style scoped>
.theme-light {
  background: radial-gradient(circle at top, rgba(14, 165, 233, 0.12), transparent 34%), radial-gradient(circle at bottom right, rgba(6, 182, 212, 0.10), transparent 28%), linear-gradient(135deg, #f8fafc 0%, #e2e8f0 45%, #cbd5e1 100%);
  color: #0f172a;
}

.theme-light :deep([class*='bg-slate-950']),
.theme-light :deep([class*='bg-white/5']),
.theme-light :deep([class*='bg-white/10']),
.theme-light :deep([class*='bg-slate-900']) {
  background-color: rgba(255, 255, 255, 0.88) !important;
}

.theme-light :deep([class*='border-white/10']),
.theme-light :deep([class*='border-white/15']),
.theme-light :deep([class*='border-slate-200']),
.theme-light :deep([class*='border-slate-300']) {
  border-color: rgba(148, 163, 184, 0.35) !important;
}

.theme-light :deep([class*='text-white']),
.theme-light :deep([class*='text-slate-100']),
.theme-light :deep([class*='text-slate-200']),
.theme-light :deep([class*='text-slate-300']) {
  color: #0f172a !important;
}

.theme-light :deep([class*='text-slate-400']) {
  color: #475569 !important;
}
</style>
