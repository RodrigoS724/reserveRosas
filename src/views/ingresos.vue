<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import IngresoModal from '../components/IngresoModal.vue'

const route = useRoute()

type TrabajoRow = {
  cantidad: string
  descripcion: string
  costo: string
  importe: string
}

type Checklist = Record<string, boolean>

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

const normalizarCedula = (value: string) => String(value || '').replace(/\D/g, '')
const normalizarTexto = (value: string) => String(value || '').trim().toLowerCase()

const hoyIso = () => new Date().toISOString().slice(0, 10)
const ahoraIso = () => new Date().toISOString().slice(0, 16)

const formatFechaHora = (fecha?: string | null) => {
  if (!fecha) return 'Sin dato'
  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) return String(fecha)
  return `${date.toLocaleDateString('es-UY', { year: 'numeric', month: '2-digit', day: '2-digit' })} · ${date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}`
}

const escapeHtml = (value: any) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const cedula = ref('')
const clienteEncontrado = ref(false)
const cargandoCliente = ref(false)
const cargandoIngresos = ref(false)
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
const filtroIngresos = ref('')

const form = ref({
  fecha_ingreso: hoyIso(),
  fecha_salida: '',
  nombre: '',
  telefono: '',
  email: '',
  localidad: '',
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

const resumenChecks = (checks: Checklist) => {
  return CHECKS.filter((item) => checks[item.key]).map((item) => item.label).join(', ') || 'Sin marcar'
}

const formatearMonto = (value: any) => {
  const monto = Number(value || 0)
  return Number.isFinite(monto) ? monto.toFixed(2) : '0.00'
}

const ingresosOrdenados = computed(() => {
  return [...ingresos.value].sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0))
})

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
  const maxId = ingresos.value.reduce((maximo, ingreso) => Math.max(maximo, Number(ingreso?.id || 0)), 0)
  return maxId + 1
})

const ingresoEnEdicion = computed(() => {
  if (!ingresoEnEdicionId.value) return null
  return ingresos.value.find((item) => Number(item.id) === Number(ingresoEnEdicionId.value)) || null
})

const cargarIngresos = async (clienteId: number) => {
  cargandoIngresos.value = true
  try {
    ingresos.value = await api.obtenerIngresosPorCliente(clienteId)
  } catch (err: any) {
    error.value = err?.message || 'No se pudo cargar el historial de ingresos'
    ingresos.value = []
  } finally {
    cargandoIngresos.value = false
  }
}

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

const cargarIngresoEnEditor = (ingreso: any) => {
  if (!ingreso) return
  ingresoSeleccionado.value = ingreso
  ingresoEnEdicionId.value = Number(ingreso.id || 0) || null
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

const setTrabajoRowImporte = (row: TrabajoRow) => {
  const cantidad = Number(String(row.cantidad || '').replace(',', '.'))
  const costo = Number(String(row.costo || '').replace(',', '.'))
  if (Number.isFinite(cantidad) && Number.isFinite(costo)) {
    const importe = cantidad * costo
    row.importe = String(Math.round(importe * 100) / 100)
  }
}

const clonarPlano = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

const buildTrabajoRealizado = () => {
  const lines = [
    `Ingreso: ${form.value.fecha_ingreso || ''}`,
    `Cliente: ${form.value.nombre} - CI ${cedula.value || ''}`,
    `Moto: ${form.value.marca} ${form.value.modelo} ${form.value.color ? `- ${form.value.color}` : ''}`.trim(),
    `Matricula: ${form.value.matricula || ''}`,
    `Motor: ${form.value.numero_motor || ''}`,
    `Kilometraje: ${form.value.kilometraje || ''}`,
    `Numero de servicios: ${form.value.numero_servicios || ''}`,
    `Checklist ingreso: ${resumenChecks(checklistIngreso.value)}`,
    `Comentarios: ${form.value.comentarios || ''}`,
    'Trabajos:'
  ]

  trabajos.value.forEach((row, index) => {
    const contenido = [row.cantidad, row.descripcion, row.costo, row.importe].map((part) => String(part || '').trim()).join(' | ')
    lines.push(`${index + 1}. ${contenido}`)
  })

  lines.push(`Observaciones: ${form.value.observaciones || ''}`)
  lines.push(`Entrega / salida: ${form.value.fecha_salida || ''}`)
  lines.push(`Checklist egreso: ${resumenChecks(checklistEgreso.value)}`)
  return lines.join('\n')
}

const limpiarFormulario = () => {
  const clienteActual = cliente.value
  const vehiculoActual = vehiculoSeleccionadoId.value
  ingresoSeleccionado.value = null
  form.value = {
    fecha_ingreso: hoyIso(),
    fecha_salida: '',
    nombre: '',
    telefono: '',
    email: '',
    localidad: '',
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
  checklistIngreso.value = Object.fromEntries(CHECKS.map((item) => [item.key, false]))
  checklistEgreso.value = Object.fromEntries(CHECKS.map((item) => [item.key, false]))
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

const guardarIngreso = async () => {
  if (!cliente.value?.id) return
  guardandoIngreso.value = true
  error.value = ''
  try {
    if (vehiculoSeleccionadoId.value) {
      const vehiculoActual = vehiculosCliente.value.find((item) => Number(item.id) === Number(vehiculoSeleccionadoId.value)) || {}
      await api.actualizarVehiculoCliente({
        id: vehiculoSeleccionadoId.value,
        matricula: form.value.matricula || vehiculoActual.matricula || '',
        motor: form.value.numero_motor || vehiculoActual.motor || vehiculoActual.numero_motor || '',
        chasis: '',
        color: form.value.color || vehiculoActual.color || '',
        fecha_compra: vehiculoActual.fecha_compra || ''
      })
    }

    const trabajoRealizado = String(form.value.trabajo_realizado || '').trim() || buildTrabajoRealizado()
    const monto = Number(String(form.value.monto || '').replace(',', '.'))
    const checklistIngresoPayload = clonarPlano(checklistIngreso.value)
    const checklistEgresoPayload = clonarPlano(checklistEgreso.value)
    const trabajosPayload = clonarPlano(trabajos.value)
    const payload = {
      cliente_id: cliente.value.id,
      reserva_id: null,
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

    let guardado: any = null
    if (ingresoEnEdicionId.value) {
      guardado = await api.actualizarIngreso({ id: ingresoEnEdicionId.value, ...payload })
    } else {
      guardado = await api.crearIngreso(payload)
    }
    form.value.trabajo_realizado = trabajoRealizado
    await cargarIngresosGenerales()
    limpiarFormulario()
    if (guardado?.id) {
      ingresoSeleccionado.value = guardado
      ingresoEnEdicionId.value = Number(guardado.id) || ingresoEnEdicionId.value
    }
    return guardado
  } catch (err: any) {
    error.value = err?.message || 'No se pudo registrar el ingreso'
    return null
  } finally {
    guardandoIngreso.value = false
  }
}

const registrarEgreso = async (ingreso: any) => {
  error.value = ''
  try {
    await api.registrarEgreso({
      id: ingreso.id,
      monto: ingreso.monto,
      trabajo_realizado: ingreso.trabajo_realizado
    })
    await cargarIngresosGenerales()
  } catch (err: any) {
    error.value = err?.message || 'No se pudo registrar el egreso'
  }
}

const buildPrintHtml = () => {
  const folio = ingresoSeleccionado.value?.id || siguienteFolio.value
  const workRows = trabajos.value.map((row) => {
    return `
      <tr>
        <td>${escapeHtml(row.cantidad)}</td>
        <td>${escapeHtml(row.descripcion)}</td>
        <td>${escapeHtml(row.costo)}</td>
        <td>${escapeHtml(row.importe)}</td>
      </tr>`
  }).join('')

  const checkboxHtml = (checks: Checklist) => CHECKS.map((item) => `
    <div class="check-item">
      <span class="box">${checks[item.key] ? '✓' : ''}</span>
      <span>${escapeHtml(item.label)}</span>
    </div>`).join('')

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Orden de Servicio</title>
      <style>
        @page { size: A4; margin: 6mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #333; background: #fff; }
        .sheet { width: 100%; min-height: 285mm; padding: 5mm; }
        .topbar {
          display: grid;
          grid-template-columns: 1fr 1.4fr 0.7fr;
          gap: 10px;
          align-items: center;
          background: #efefef;
          border: 1px solid #8c8c8c;
          padding: 10px 12px;
          margin-bottom: 10px;
        }
        .brand { font-size: 13px; font-weight: 800; color: #666; line-height: 1.1; }
        .title { text-align: center; font-size: 28px; font-weight: 800; color: #4a4a4a; line-height: 1; }
        .title small { display: block; font-size: 13px; margin-top: 4px; }
        .folio { text-align: right; font-weight: 800; color: #666; }
        .folio .value { display: inline-block; margin-top: 4px; background: #fff; border: 1px solid #bbb; padding: 4px 12px; min-width: 84px; text-align: center; font-size: 18px; color: #b55; }
        .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px; }
        .box-title { text-align: center; font-size: 12px; font-weight: 800; color: #555; margin: 2px 0 6px; }
        .field-line { display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 6px; }
        .field-line .label { min-width: 90px; font-weight: 700; }
        .field-line .line { flex: 1; border-bottom: 1px solid #555; min-height: 16px; }
        .section-header { background: #9a9a9a; color: #fff; font-size: 12px; font-weight: 800; text-align: center; padding: 4px 8px; margin: 10px 0 8px; }
        .grid-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
        .grid-fields .field-line .label { min-width: 80px; }
        .checklist { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px 12px; align-items: start; margin-top: 6px; }
        .check-item { display: flex; align-items: center; gap: 6px; font-size: 11px; }
        .box { width: 13px; height: 13px; border: 1px solid #444; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; line-height: 1; }
        .table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
        .table th, .table td { border: 1px solid #777; padding: 5px 6px; vertical-align: top; }
        .table th { background: #d8d8d8; color: #444; font-size: 11px; }
        .observations, .signature-lines { margin-top: 8px; }
        .long-line { border-bottom: 1px solid #666; min-height: 18px; margin-top: 2px; }
        .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
        .signature { border-top: 1px solid #444; padding-top: 20px; text-align: center; font-size: 10px; }
        .small { font-size: 10px; color: #555; }
        .footer-gap { height: 4px; }
      </style>
    </head>
    <body onload="window.focus();window.print();">
      <div class="sheet">
        <div class="topbar">
          <div class="brand">
            ROSAS<br>
            AUTOCENTRO<br>
            DEPORTIVA
          </div>
          <div class="title">
            Orden de Servicio
            <small>Mantenimiento y reparación de motos</small>
          </div>
          <div class="folio">
            NUMERO DE FOLIO
            <div class="value">${escapeHtml(String(folio || '')) || '---'}</div>
          </div>
        </div>

        <div class="two-cols">
          <div>
            <div class="box-title">DATOS DE LA MOTO</div>
            <div class="field-line"><span class="label">Marca:</span><span class="line">${escapeHtml(form.value.marca)}</span></div>
            <div class="field-line"><span class="label">Modelo:</span><span class="line">${escapeHtml(form.value.modelo)}</span></div>
            <div class="field-line"><span class="label">Color:</span><span class="line">${escapeHtml(form.value.color)}</span></div>
            <div class="field-line"><span class="label">Kilometraje:</span><span class="line">${escapeHtml(form.value.kilometraje)}</span></div>
            <div class="field-line"><span class="label">Matrícula:</span><span class="line">${escapeHtml(form.value.matricula)}</span></div>
            <div class="field-line"><span class="label">Número de motor:</span><span class="line">${escapeHtml(form.value.numero_motor)}</span></div>
          </div>
          <div>
            <div class="box-title">DATOS DEL CLIENTE</div>
            <div class="field-line"><span class="label">Ingreso:</span><span class="line">${escapeHtml(form.value.fecha_ingreso)}</span></div>
            <div class="field-line"><span class="label">Nombre:</span><span class="line">${escapeHtml(form.value.nombre)}</span></div>
            <div class="field-line"><span class="label">Teléfono:</span><span class="line">${escapeHtml(form.value.telefono)}</span></div>
            <div class="field-line"><span class="label">Email:</span><span class="line">${escapeHtml(form.value.email)}</span></div>
            <div class="field-line"><span class="label">Localidad:</span><span class="line">${escapeHtml(form.value.localidad)}</span></div>
          </div>
        </div>

        <div class="section-header">CHECK LIST INGRESO</div>
        <div class="checklist">
          <div>${checkboxHtml(checklistIngreso.value)}</div>
          <div>
            <div class="box-title" style="margin-top:0">N° Servicios</div>
            <div class="field-line"><span class="label">Servicios:</span><span class="line">${escapeHtml(form.value.numero_servicios)}</span></div>
            <div class="field-line"><span class="label">Comentarios:</span><span class="line">${escapeHtml(form.value.comentarios)}</span></div>
          </div>
          <div class="small" style="grid-column: 1 / -1; margin-top: 4px;">Revisión general al ingreso, sin símbolos decorativos.</div>
        </div>

        <div class="section-header">DESCRIPCIÓN DEL TRABAJO</div>
        <table class="table">
          <thead>
            <tr>
              <th style="width: 8%">CANT</th>
              <th>DESCRIPCIÓN DEL TRABAJO</th>
              <th style="width: 14%">COSTO</th>
              <th style="width: 14%">IMPORTE</th>
            </tr>
          </thead>
          <tbody>
            ${workRows}
            <tr>
              <td colspan="3" style="text-align:right;font-weight:800">TOTAL:</td>
              <td style="font-weight:800">${escapeHtml(totalTrabajo.value.toFixed(2))}</td>
            </tr>
          </tbody>
        </table>

        <div class="observations">
          <div class="section-header" style="margin-top:10px">OBSERVACIONES</div>
          <div class="small">${escapeHtml(form.value.observaciones)}</div>
          <div class="long-line"></div>
          <div class="long-line"></div>
          <div class="long-line"></div>
        </div>

        <div class="field-line" style="margin-top:10px"><span class="label">Entrega / Salida:</span><span class="line">${escapeHtml(form.value.fecha_salida)}</span></div>

        <div class="section-header">CHECK LIST EGRESO</div>
        <div class="checklist">
          <div>${checkboxHtml(checklistEgreso.value)}</div>
          <div>
            <div class="field-line"><span class="label">Comentarios:</span><span class="line">${escapeHtml(form.value.comentarios)}</span></div>
          </div>
          <div class="small" style="grid-column: 1 / -1; margin-top: 4px;">Revisión general al egreso, sin símbolos decorativos.</div>
        </div>

        <div class="signature-row">
          <div class="signature">FIRMA DEL PRESTADOR DEL SERVICIO</div>
          <div class="signature">FIRMA DEL CONSUMIDOR ACEPTANDO EL PRESUPUESTO</div>
        </div>
      </div>
    </body>
  </html>`
}

const imprimirHoja = () => {
  const win = window.open('', '_blank', 'width=980,height=1200')
  if (!win) {
    alert('No se pudo abrir la ventana de impresión')
    return
  }
  win.document.open()
  win.document.write(buildPrintHtml())
  win.document.close()
}

const guardarYImprimir = async () => {
  const guardado = await guardarIngreso()
  if (guardado?.id) {
    ingresoSeleccionado.value = guardado
  }
  imprimirHoja()
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

onMounted(() => {
  cargarIngresosGenerales()
  const queryClienteId = String(route.query.cliente_id || '').trim()
  const queryIngresoId = Number(route.query.ingreso_id || 0)
  if (queryIngresoId) {
    api.obtenerIngreso(queryIngresoId).then((ingreso) => {
      if (ingreso) {
        cargarIngresoEnEditor(ingreso)
      }
    }).catch(() => {})
  }
  if (queryClienteId) {
    cargarClientePorReferencia(queryClienteId)
  }

  const queryCedula = String(route.query.cedula || '').trim()
  if (queryCedula) {
    cargarClientePorReferencia(queryCedula)
  }
})
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,#0f766e_0%,#0f172a_40%,#020617_100%)] text-slate-100">
    <div class="mx-auto flex min-h-screen max-w-[1700px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <header class="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-8">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <div class="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200">
              Ingresos y egresos
            </div>
            <h1 class="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Orden de servicio con hoja imprimible
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Cargá los datos de la foto, completá el checklist de ingreso y egreso, y imprimí una hoja A4 lista para firma.
            </p>
          </div>

          <div class="flex gap-2">
            <button @click="imprimirHoja" class="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-100 transition hover:bg-slate-950/60">
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
              class="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/40 focus:bg-white/8"
            />
          </div>

          <div class="flex-1 overflow-auto p-4 sm:p-5 space-y-4">
            <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Estado</div>
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
          </div>
        </aside>

        <section class="min-h-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/95 text-slate-900 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
          <div class="border-b border-slate-200 px-5 py-5 sm:px-6">
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
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Ingresos</div>
                <div class="mt-1 text-2xl font-black text-slate-950">{{ ingresos.length }}</div>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Pendientes</div>
                <div class="mt-1 text-2xl font-black text-slate-950">{{ ingresos.filter((item) => !item.fecha_egreso).length }}</div>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Monto total</div>
                <div class="mt-1 text-2xl font-black text-slate-950">{{ ingresos.reduce((total, item) => total + Number(item.monto || 0), 0).toFixed(2) }}</div>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Siguiente folio</div>
                <div class="mt-1 text-2xl font-black text-slate-950">#{{ siguienteFolio }}</div>
              </div>
            </div>
          </div>

          <div class="min-h-0 overflow-auto p-5 sm:p-6">
            <div v-if="cargandoListado" class="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">Cargando ingresos...</div>
            <div v-else-if="ingresosFiltrados.length === 0" class="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">No hay ingresos para mostrar.</div>

            <div v-else class="grid gap-3">
              <button
                v-for="ingreso in ingresosFiltrados"
                :key="ingreso.id"
                @click="cargarIngresoEnEditor(ingreso)"
                class="w-full rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <div class="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">#{{ ingreso.id }}</div>
                      <div class="text-sm font-black text-slate-950">{{ ingreso.cliente_nombre || 'Sin cliente' }}</div>
                    </div>
                    <div class="mt-1 text-sm text-slate-600">CI {{ ingreso.cliente_cedula || '---' }} · {{ formatFechaHora(ingreso.fecha_actual) }}</div>
                    <div class="mt-1 text-xs text-slate-500">Monto: ${{ formatearMonto(ingreso.monto) }} · {{ ingreso.fecha_egreso ? `Egreso: ${formatFechaHora(ingreso.fecha_egreso)}` : 'Pendiente de egreso' }}</div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <div class="rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em]" :class="ingreso.fecha_egreso ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'">
                      {{ ingreso.fecha_egreso ? 'Egresado' : 'Abierto' }}
                    </div>
                    <span class="rounded-2xl bg-slate-950 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-white">Abrir modal</span>
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
