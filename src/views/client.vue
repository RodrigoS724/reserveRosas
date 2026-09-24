<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import IngresoModal from '../components/IngresoModal.vue'
import CedulaAutocomplete from '../components/CedulaAutocomplete.vue'
import { CHECK_ITEMS, buildOrdenServicioPrintHtml, buildTrabajoRealizadoTexto } from '../utils/ordenServicio'

type TrabajoRow = {
  cantidad: string
  descripcion: string
  costo: string
  importe: string
}

type Checklist = Record<string, boolean>
type HistorialEvento = {
  tipo: 'reserva' | 'apronte' | 'ingreso'
  id: number
  fecha: string
  hora?: string | null
  titulo: string
  detalle: string
  estado?: string | null
}

const route = useRoute()
const isDarkTheme = ref(true)
const clientes = ref<any[]>([])
const clienteActivo = ref<any | null>(null)
const detalle = ref<{ cliente: any | null; vehiculos: any[]; reservas: any[]; aprontes: any[]; ingresos: any[] }>({
  cliente: null,
  vehiculos: [],
  reservas: [],
    aprontes: [],
    ingresos: []
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
const checklistIngreso = ref<Checklist>(Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false])))
const checklistEgreso = ref<Checklist>(Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false])))
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
let themeObserver: MutationObserver | null = null

const syncTheme = () => {
  isDarkTheme.value = document.documentElement.classList.contains('dark')
}

const totalEventos = (cliente: any) => {
  return Number(cliente?.total_reservas || 0) + Number(cliente?.total_aprontes || 0) + Number(ingresos.value.length || 0)
}
const historialCliente = computed<HistorialEvento[]>(() => {
  const reservasEventos = (detalle.value.reservas || []).map((item: any) => ({
    tipo: 'reserva' as const,
    id: Number(item.id),
    fecha: String(item.fecha || item.created_at || ''),
    hora: item.hora || null,
    titulo: 'Reserva',
    detalle: obtenerEtiquetaDetalle('reserva', item),
    estado: item.estado || null
  }))
  const aprontesEventos = (detalle.value.aprontes || []).map((item: any) => ({
    tipo: 'apronte' as const,
    id: Number(item.id),
    fecha: String(item.fecha || item.created_at || ''),
    hora: item.hora || null,
    titulo: 'Apronte',
    detalle: obtenerEtiquetaDetalle('apronte', item),
    estado: item.estado || null
  }))
  const ingresosEventos = (ingresos.value || []).map((item: any) => ({
    tipo: 'ingreso' as const,
    id: Number(item.id),
    fecha: String(item.fecha_actual || item.created_at || ''),
    hora: item.fecha_actual ? new Date(item.fecha_actual).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) : null,
    titulo: item.fecha_egreso ? 'Ingreso / egreso' : 'Ingreso',
    detalle: item.trabajo_realizado || item.observaciones || 'Sin detalle',
    estado: item.fecha_egreso ? 'Egresado' : 'Activo'
  }))

  return [...reservasEventos, ...aprontesEventos, ...ingresosEventos].sort((a, b) => {
    const fechaA = new Date(`${a.fecha}${a.hora ? `T${a.hora}` : ''}`).getTime()
    const fechaB = new Date(`${b.fecha}${b.hora ? `T${b.hora}` : ''}`).getTime()
    return fechaB - fechaA
  })
})

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

const onCedulaSeleccionada = async (cliente: { id?: number; cedula?: string | null; nombre?: string | null; telefono?: string | null; localidad?: string | null }) => {
  if (!cliente) return
  if (cliente.id) {
    const encontrado = clientes.value.find((item) => Number(item.id) === Number(cliente.id)) || null
    if (encontrado) {
      clienteEditando.value = encontrado
    }
  }
  formCliente.value = {
    id: cliente.id ?? formCliente.value.id,
    cedula: String(cliente.cedula || formCliente.value.cedula || ''),
    nombre: String(cliente.nombre || formCliente.value.nombre || ''),
    telefono: String(cliente.telefono || formCliente.value.telefono || ''),
    localidad: String(cliente.localidad || formCliente.value.localidad || '')
  }
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
  checklistIngreso.value = Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false]))
  checklistEgreso.value = Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false]))
  trabajos.value = [
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' },
    { cantidad: '', descripcion: '', costo: '', importe: '' }
  ]
}

const cerrarFormularioIngreso = () => {
  limpiarFormularioIngreso()
  mostrarFormularioIngreso.value = false
}

const poblarFormularioIngreso = (ingreso?: any) => {
  ingresoEditando.value = ingreso || null
  const vehiculoInicial = detalle.value.vehiculos.find((vehiculo) => Number(vehiculo.id) === Number(ingreso?.vehiculo_id || 0)) || detalle.value.vehiculos[0] || null
  let checklistIngresoData: Checklist = Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false]))
  let checklistEgresoData: Checklist = Object.fromEntries(CHECK_ITEMS.map((item) => [item.key, false]))
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
    detalle.value = {
      ...detalle.value,
      ingresos: ingresos.value
    }
  } catch (err: any) {
    error.value = err?.message || 'No se pudo cargar el historial de ingresos'
    ingresos.value = []
    detalle.value = {
      ...detalle.value,
      ingresos: []
    }
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

const buildTrabajoRealizado = () => {
  return buildTrabajoRealizadoTexto({
    fechaIngreso: formIngreso.value.fecha_ingreso || '',
    nombre: clienteActivo.value?.nombre || '',
    cedula: clienteActivo.value?.cedula || '',
    correo: clienteActivo.value?.correo || clienteActivo.value?.email || '',
    marca: formIngreso.value.marca || '',
    modelo: formIngreso.value.modelo || '',
    color: formIngreso.value.color || '',
    matricula: formIngreso.value.matricula || '',
    numeroMotor: formIngreso.value.numero_motor || '',
    numeroServicios: formIngreso.value.numero_servicios || '',
    comentarios: formIngreso.value.comentarios || '',
    observaciones: formIngreso.value.observaciones || '',
    fechaSalida: formIngreso.value.fecha_salida || '',
    checklistIngreso: checklistIngreso.value,
    checklistEgreso: checklistEgreso.value,
    trabajos: trabajos.value
  })
}

const sincronizarVehiculoIngreso = async () => {
  const vehiculoId = Number(formIngreso.value.vehiculo_id || 0)
  if (!vehiculoId) return
  const vehiculoActual = detalle.value.vehiculos.find((vehiculo) => Number(vehiculo.id) === vehiculoId) || null
  try {
    await api.actualizarVehiculoCliente({
      id: vehiculoId,
      matricula: formIngreso.value.matricula || vehiculoActual?.matricula || '',
      motor: formIngreso.value.numero_motor || vehiculoActual?.motor || vehiculoActual?.numero_motor || '',
      chasis: vehiculoActual?.chasis || '',
      color: formIngreso.value.color || vehiculoActual?.color || '',
      marca: formIngreso.value.marca || vehiculoActual?.marca || vehiculoActual?.codigo_marca || '',
      modelo: formIngreso.value.modelo || vehiculoActual?.modelo || vehiculoActual?.codigo_modelo || '',
      fecha_compra: vehiculoActual?.fecha_compra || ''
    })
  } catch (err) {
    console.warn('[Client] No se pudo sincronizar la moto del ingreso:', err)
  }
}

const crearSnapshotImpresion = () => ({
  cliente: clienteActivo.value ? clonarPlano(clienteActivo.value) : null,
  form: clonarPlano(formIngreso.value),
  checklistIngreso: clonarPlano(checklistIngreso.value),
  checklistEgreso: clonarPlano(checklistEgreso.value),
  trabajos: clonarPlano(trabajos.value),
  ingresoId: ingresoEditando.value?.id ?? null
})

const guardarIngreso = async () => {
  if (!clienteActivo.value) return
  guardandoIngreso.value = true
  error.value = ''
  try {
    console.debug('[Client][Ingreso] guardarIngreso:start', {
      clienteId: clienteActivo.value?.id,
      ingresoEditandoId: ingresoEditando.value?.id ?? null,
      vehiculoId: formIngreso.value.vehiculo_id,
      monto: formIngreso.value.monto,
      fechaIngreso: formIngreso.value.fecha_ingreso,
      fechaSalida: formIngreso.value.fecha_salida
    })
    await sincronizarVehiculoIngreso()
    const trabajoRealizado = String(formIngreso.value.trabajo_realizado || '').trim() || buildTrabajoRealizado()
    const checklistIngresoPayload = clonarPlano(checklistIngreso.value)
    const checklistEgresoPayload = clonarPlano(checklistEgreso.value)
    const trabajosPayload = clonarPlano(trabajos.value)
    const payload = {
      cliente_id: clienteActivo.value.id,
      cliente_correo: clienteActivo.value?.correo || clienteActivo.value?.email || '',
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

    console.debug('[Client][Ingreso] payload:', {
      cliente_id: payload.cliente_id,
      vehiculo_id: payload.vehiculo_id,
      fecha_actual: payload.fecha_actual,
      fecha_salida: payload.fecha_salida,
      monto: payload.monto,
      marca: payload.marca,
      modelo: payload.modelo,
      color: payload.color,
      matricula: payload.matricula,
      numero_motor: payload.numero_motor,
      numero_servicios: payload.numero_servicios
    })

    let guardado: any = null
    if (ingresoEditando.value?.id) {
      console.debug('[Client][Ingreso] calling actualizarIngreso', { id: ingresoEditando.value.id })
      guardado = await api.actualizarIngreso({ id: ingresoEditando.value.id, ...payload })
    } else {
      console.debug('[Client][Ingreso] calling crearIngreso')
      guardado = await api.crearIngreso(payload)
    }
    console.debug('[Client][Ingreso] raw save result:', guardado)
    if (!guardado || typeof guardado !== 'object' || !('id' in guardado) || !guardado.id) {
      throw new Error(`Respuesta de ingreso invalida: ${JSON.stringify(guardado)}`)
    }
    if (guardado?.id) {
      ingresoEditando.value = guardado
    }
    await cargarDetalle(clienteActivo.value)
    console.debug('[Client][Ingreso] guardarIngreso:ok', { ingresoId: guardado?.id ?? null })
    return guardado
  } catch (err: any) {
    error.value = err?.message || 'No se pudo registrar el ingreso'
    console.error('[Client][Ingreso] guardarIngreso:error', err)
    throw err
  } finally {
    guardandoIngreso.value = false
  }
}

const buildPrintHtml = (snapshot: ReturnType<typeof crearSnapshotImpresion>, folio?: number | string | null) => {
  const clienteSnapshot = snapshot.cliente
  const formSnapshot = snapshot.form
  return buildOrdenServicioPrintHtml({
    folio: folio ?? snapshot.ingresoId ?? '',
    fechaIngreso: formSnapshot.fecha_ingreso || '',
    fechaSalida: formSnapshot.fecha_salida || '',
    nombre: clienteSnapshot?.nombre || '',
    cedula: clienteSnapshot?.cedula || '',
    correo: clienteSnapshot?.correo || clienteSnapshot?.email || '',
    telefono: clienteSnapshot?.telefono || '',
    localidad: clienteSnapshot?.localidad || '',
    marca: formSnapshot.marca || '',
    modelo: formSnapshot.modelo || '',
    color: formSnapshot.color || '',
    matricula: formSnapshot.matricula || '',
    numeroMotor: formSnapshot.numero_motor || '',
    numeroServicios: formSnapshot.numero_servicios || '',
    comentarios: formSnapshot.comentarios || '',
    observaciones: formSnapshot.observaciones || '',
    checklistIngreso: snapshot.checklistIngreso,
    checklistEgreso: snapshot.checklistEgreso,
    trabajos: snapshot.trabajos,
    trabajoRealizado: formSnapshot.trabajo_realizado || buildTrabajoRealizadoTexto({
      fechaIngreso: formSnapshot.fecha_ingreso || '',
      nombre: clienteSnapshot?.nombre || '',
      cedula: clienteSnapshot?.cedula || '',
      correo: clienteSnapshot?.correo || clienteSnapshot?.email || '',
      marca: formSnapshot.marca || '',
      modelo: formSnapshot.modelo || '',
      color: formSnapshot.color || '',
      matricula: formSnapshot.matricula || '',
      numeroMotor: formSnapshot.numero_motor || '',
      numeroServicios: formSnapshot.numero_servicios || '',
      comentarios: formSnapshot.comentarios || '',
      observaciones: formSnapshot.observaciones || '',
      fechaSalida: formSnapshot.fecha_salida || '',
      checklistIngreso: snapshot.checklistIngreso,
      checklistEgreso: snapshot.checklistEgreso,
      trabajos: snapshot.trabajos
    })
  })
}

const imprimirHoja = (snapshot: ReturnType<typeof crearSnapshotImpresion>, folio?: number | string | null, win: Window | null = null) => {
  const printWindow = win || window.open('', '_blank', 'width=980,height=1200')
  if (!printWindow) {
    error.value = 'No se pudo abrir la ventana de impresión'
    return
  }
  printWindow.document.open()
  printWindow.document.write(buildPrintHtml(snapshot, folio))
  printWindow.document.close()
}

const guardarYImprimir = async () => {
  const snapshot = crearSnapshotImpresion()
  const printWindow = window.open('', '_blank', 'width=980,height=1200')
  if (!printWindow) {
    error.value = 'No se pudo abrir la ventana de impresión'
    console.error('[Client][Ingreso] guardarYImprimir:popup-blocked', snapshot)
    return
  }
  try {
    console.debug('[Client][Ingreso] guardarYImprimir:start', snapshot)
    const guardado = await guardarIngreso()
    if (guardado?.id) {
      console.debug('[Client][Ingreso] guardarYImprimir:print', { ingresoId: guardado.id })
      imprimirHoja(snapshot, guardado.id, printWindow)
    } else {
      console.error('[Client][Ingreso] guardarYImprimir:sin-guardado', snapshot)
      printWindow.close()
    }
  } catch (err) {
    console.error('[Client][Ingreso] guardarYImprimir:error', { error: err, snapshot })
    error.value = err instanceof Error ? err.message : 'Error inesperado al guardar e imprimir'
    printWindow.close()
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
    detalle.value = {
      ...detalle.value,
      ingresos: ingresos.value
    }
  } catch (err: any) {
    error.value = err?.message || 'No se pudo cargar el detalle del cliente'
    detalle.value = { cliente, vehiculos: [], reservas: [], aprontes: [], ingresos: [] }
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
  syncTheme()
  themeObserver = new MutationObserver(syncTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  cargarClientes().then(() => abrirClienteDesdeQuery())
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = null
  if (searchTimer) {
    window.clearTimeout(searchTimer)
    searchTimer = null
  }
})
</script>

<template>
  <div :class="isDarkTheme ? 'theme-dark' : 'theme-light'" class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_28%),linear-gradient(135deg,#07111c_0%,#0f172a_45%,#08111f_100%)] text-slate-100">
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

        <section class="min-h-0 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 text-slate-100 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div class="border-b border-white/10 px-5 py-5 sm:px-6">
            <div v-if="clienteActivo">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                    {{ detalle.cliente?.cedula || clienteActivo.cedula }}
                  </div>
                  <h2 class="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">{{ detalle.cliente?.nombre || clienteActivo.nombre }}</h2>
                  <p class="mt-2 text-sm text-slate-400">
                    {{ detalle.cliente?.telefono || clienteActivo.telefono || 'Sin teléfono' }} · {{ detalle.cliente?.localidad || clienteActivo.localidad || 'Sin localidad' }}
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    @click="poblarFormularioCliente(clienteActivo)"
                    class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.24em] text-slate-100 transition hover:bg-white/10"
                  >
                    Editar cliente
                  </button>
                  <button
                    @click="cargarDetalle(clienteActivo)"
                    class="rounded-2xl bg-cyan-500 px-4 py-3 text-xs font-black uppercase tracking-[0.24em] text-white transition hover:bg-cyan-400"
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
                <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-white shadow-lg shadow-slate-950/20">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Desde</div>
                  <div class="mt-2 text-lg font-black">{{ formatearFecha(detalle.cliente?.created_at || clienteActivo.created_at) }}</div>
                </div>
                <div class="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-500/10 p-4 text-white shadow-lg shadow-cyan-950/10">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Vehículos</div>
                  <div class="mt-2 text-lg font-black">{{ detalle.vehiculos.length }}</div>
                </div>
                <div class="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-4 text-white shadow-lg shadow-amber-950/10">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">Actividad</div>
                  <div class="mt-2 text-lg font-black">{{ totalEventos(clienteActivo) }}</div>
                </div>
              </div>
              <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-xl">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-sm font-black uppercase tracking-[0.22em] text-slate-300">Historial general</h3>
                  <span class="text-xs font-semibold text-slate-400">{{ historialCliente.length }} movimientos</span>
                </div>
                <div class="mt-4 space-y-3">
                  <div v-for="evento in historialCliente" :key="`${evento.tipo}-${evento.id}`" class="rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/20">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div class="text-sm font-black text-white">{{ evento.titulo }}</div>
                        <div class="mt-1 text-xs text-slate-400">{{ formatearFechaHora(evento.fecha, evento.hora) }}</div>
                      </div>
                      <span v-if="evento.estado" class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-100">
                        {{ evento.estado }}
                      </span>
                    </div>
                    <div class="mt-2 text-sm text-slate-200">{{ evento.detalle }}</div>
                  </div>
                  <div v-if="historialCliente.length === 0" class="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-sm text-slate-400">
                    Todavía no hay movimientos para este cliente.
                  </div>
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-xl">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-sm font-black uppercase tracking-[0.22em] text-slate-300">Vehículos vinculados</h3>
                  <span class="text-xs font-semibold text-slate-400">{{ detalle.vehiculos.length }} registros</span>
                </div>
                <div class="mt-4 grid gap-3">
                  <div v-for="vehiculo in detalle.vehiculos" :key="vehiculo.id" class="rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/20">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div class="text-base font-black text-white">{{ vehiculo.matricula || 'Sin matrícula' }}</div>
                        <div class="mt-1 text-sm text-slate-300">{{ vehiculo.marca }} {{ vehiculo.modelo }}</div>
                        <div class="mt-2 text-xs text-slate-400">
                          {{ vehiculo.dt_vehiculo_codigo ? `${vehiculo.dt_vehiculo_codigo} · ` : '' }}{{ vehiculo.dt_vehiculo_modelo || '' }}
                        </div>
                      </div>
                      <div class="text-right text-xs text-slate-400">
                        <div class="font-semibold text-slate-300">Motor</div>
                        <div>{{ vehiculo.numero_motor || vehiculo.motor || 'Sin dato' }}</div>
                        <button @click="poblarFormularioVehiculo(vehiculo)" class="mt-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-100 transition hover:bg-white/10">
                          Editar moto
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-if="detalle.vehiculos.length === 0" class="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-sm text-slate-400">
                    No hay vehículos asociados a este cliente.
                  </div>
                </div>
              </div>

              <div class="grid gap-5 xl:grid-cols-2">
                <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-xl">
                  <h3 class="text-sm font-black uppercase tracking-[0.22em] text-slate-300">Reservas</h3>
                  <div class="mt-4 space-y-3">
                    <div v-for="reserva in detalle.reservas" :key="reserva.id" class="rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/20">
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-sm font-black text-white">{{ formatearFechaHora(reserva.fecha, reserva.hora) }}</div>
                        <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-100">{{ reserva.estado || 'pendiente' }}</span>
                      </div>
                      <div class="mt-2 text-sm font-semibold text-slate-200">{{ obtenerEtiquetaDetalle('reserva', reserva) }}</div>
                      <div class="mt-1 text-xs text-slate-500">{{ obtenerDetalleResumen('reserva', reserva) }}</div>
                    </div>
                    <div v-if="detalle.reservas.length === 0" class="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-sm text-slate-400">
                      Sin reservas registradas.
                    </div>
                  </div>
                </div>

                <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-xl">
                  <h3 class="text-sm font-black uppercase tracking-[0.22em] text-slate-300">Aprontes</h3>
                  <div class="mt-4 space-y-3">
                    <div v-for="apronte in detalle.aprontes" :key="apronte.id" class="rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/20">
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-sm font-black text-white">{{ formatearFechaHora(apronte.fecha, apronte.hora) }}</div>
                        <span class="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">{{ apronte.estado || 'apronte' }}</span>
                      </div>
                      <div class="mt-2 text-sm font-semibold text-slate-200">{{ obtenerEtiquetaDetalle('apronte', apronte) }}</div>
                      <div class="mt-1 text-xs text-slate-500">{{ obtenerDetalleResumen('apronte', apronte) }}</div>
                    </div>
                    <div v-if="detalle.aprontes.length === 0" class="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-sm text-slate-400">
                      Sin aprontes registrados.
                    </div>
                  </div>
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-xl">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <h3 class="text-sm font-black uppercase tracking-[0.22em] text-slate-300">Ingresos y egresos</h3>
                  <button @click="abrirFormularioIngreso" class="rounded-2xl bg-cyan-500 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-white transition hover:bg-cyan-400">
                    Abrir panel de ingresos
                  </button>
                </div>
                <div class="mt-4 space-y-3">
                  <div v-for="ingreso in ingresos" :key="ingreso.id" class="rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/20">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div class="text-sm font-black text-white">{{ formatearFechaHoraCompleta(ingreso.fecha_actual) }}</div>
                        <div class="mt-1 text-sm text-slate-300">Monto: ${{ Number(ingreso.monto || 0).toFixed(2) }}</div>
                        <div class="mt-1 text-xs text-slate-500">{{ ingreso.trabajo_realizado || 'Sin detalle de trabajo' }}</div>
                      </div>
                      <button @click="abrirIngresoEnPanel(ingreso)" class="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-100 transition hover:bg-white/10">
                        Ver / editar
                      </button>
                      <button
                        v-if="!ingreso.fecha_egreso"
                        @click="registrarEgreso(ingreso)"
                        class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-100 transition hover:bg-emerald-500/15"
                      >
                        Registrar egreso
                      </button>
                      <div v-else class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-200">
                        Egresado
                      </div>
                    </div>
                    <div v-if="ingreso.fecha_egreso" class="mt-3 text-xs text-slate-400">
                      Egreso: {{ formatearFechaHoraCompleta(ingreso.fecha_egreso) }}
                    </div>
                  </div>
                  <div v-if="cargandoIngresos" class="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-sm text-slate-400">
                    Cargando ingresos...
                  </div>
                  <div v-if="!cargandoIngresos && ingresos.length === 0" class="rounded-2xl border border-dashed border-white/15 px-4 py-5 text-sm text-slate-400">
                    No hay ingresos registrados para este cliente.
                  </div>
                </div>
              </div>
            </div>

            <div class="min-h-0 overflow-auto rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-xl">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-black uppercase tracking-[0.22em] text-slate-300">Características</h3>
                <span class="text-xs font-semibold text-slate-400">Perfil del cliente</span>
              </div>
              <div class="mt-4 space-y-3">
                <div class="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Cédula</div>
                  <div class="mt-1 text-sm font-semibold text-white">{{ detalle.cliente?.cedula || clienteActivo.cedula }}</div>
                </div>
                <div class="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Teléfono</div>
                  <div class="mt-1 text-sm font-semibold text-white">{{ detalle.cliente?.telefono || clienteActivo.telefono || 'Sin dato' }}</div>
                </div>
                <div class="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Localidad</div>
                  <div class="mt-1 text-sm font-semibold text-white">{{ detalle.cliente?.localidad || clienteActivo.localidad || 'Sin dato' }}</div>
                </div>
                <div class="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Última reserva</div>
                  <div class="mt-1 text-sm font-semibold text-white">{{ formatearFecha(detalle.cliente?.ultima_reserva_fecha || clienteActivo.ultima_reserva_fecha) }}</div>
                </div>
                <div class="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Último apronte</div>
                  <div class="mt-1 text-sm font-semibold text-white">{{ formatearFecha(detalle.cliente?.ultimo_apronte_fecha || clienteActivo.ultimo_apronte_fecha) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex h-full items-center justify-center p-10 text-sm text-slate-400">
            <div class="rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 px-6 py-8 text-center backdrop-blur-xl">
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
            <CedulaAutocomplete
              v-model="formCliente.cedula"
              placeholder="12345678"
              label=""
              @select="onCedulaSeleccionada"
              :input-class="'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40'"
            />
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
      :allow-print="true"
      @close="cerrarFormularioIngreso"
      @save="guardarIngreso"
      @save-and-print="guardarYImprimir"
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

<style scoped>
.theme-light {
  background: radial-gradient(circle at top, rgba(14, 165, 233, 0.12), transparent 34%), radial-gradient(circle at bottom right, rgba(6, 182, 212, 0.10), transparent 28%), linear-gradient(135deg, #f8fafc 0%, #e2e8f0 45%, #cbd5e1 100%);
  color: #0f172a;
}

.theme-light :deep([class*='bg-slate-950']),
.theme-light :deep([class*='bg-white/5']),
.theme-light :deep([class*='bg-white/10']),
.theme-light :deep([class*='bg-slate-900']),
.theme-light :deep([class*='bg-slate-800']) {
  background-color: rgba(255, 255, 255, 0.88) !important;
}

.theme-light :deep([class*='border-white/10']),
.theme-light :deep([class*='border-white/15']),
.theme-light :deep([class*='border-white/20']),
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
