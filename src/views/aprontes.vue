<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../api'
import { getSession, isTallerRole } from '../auth'
import ApronteWindow from '../components/apronteWindow.vue'
import ApronteSchedulePicker from '../components/ApronteSchedulePicker.vue'

type Apronte = {
  id: number
  nombre: string
  fecha: string
  hora: string
  telefono: string
  localidad: string
  observaciones: string
  marca: string
  modelo: string
  numero_motor?: string
  factura: string
  estado?: string
  repuestos_garantia?: string
  correo_alerta_garantia?: string
  dias_alerta_garantia?: number
  fecha_alerta_garantia?: string
  mecanico_id?: number | null
  created_by_username?: string
  created_by_role?: string
  caja_aprobado?: number | boolean
  caja_aprobado_por?: string
  created_at?: string
}

type MechanicUser = {
  id: number
  nombre: string
  username: string
  role: string
  es_mecanico_default?: number
}

type ClienteDetalle = {
  cliente: {
    id: number
    cedula: string
    nombre: string
    telefono: string | null
    localidad: string | null
  } | null
  vehiculos: {
    id: number
    matricula?: string | null
    marca?: string | null
    modelo?: string | null
    numero_motor?: string | null
    nombre?: string | null
    telefono?: string | null
  }[]
}

const session = getSession()
const esTaller = isTallerRole(session)
const esMecanico = session?.role === 'mecanico'

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const todayIso = formatLocalDate(new Date())

const normalizarMensajeError = (error: any, fallback: string) => {
  const msg = String(error?.message || fallback)
  if (msg.toLowerCase().includes('fechas de aprontes posteriores a hoy')) {
    return 'No se puede agendar con esa fecha/hora. Revisa las reglas de agenda de aprontes.'
  }
  return msg
}

const aprontes = ref<Apronte[]>([])
const fechaFiltro = ref(todayIso)
const busqueda = ref('')
const cargando = ref(false)
const guardandoNuevo = ref(false)
const mostrarDetalle = ref(false)
const mostrarModalNuevo = ref(false)
const mostrarModalAlertas = ref(false)
const apronteActivo = ref<Apronte | null>(null)
const modalKey = ref(0)
const marcas = ref<string[]>([])
const modelos = ref<string[]>([])
const usuarios = ref<MechanicUser[]>([])
const cedula = ref('')
const clienteEncontrado = ref(false)
const cargandoCliente = ref(false)
const vehiculosCliente = ref<ClienteDetalle['vehiculos']>([])
const vehiculoSeleccionadoId = ref<number | null>(null)
const mecanicoSeleccionadoId = ref<number | null>(null)

const ESTADOS_APRONTE = [
  'APRONTE',
  'LISTA PARA ENTREGAR',
  'ENTREGADA',
  'ENTREGADA ESPERA DE GARANTIA'
]

const guardandoAlertas = ref(false)
const configAlertas = ref({
  default_email: '',
  default_dias_alerta: 7
})

const newForm = ref({
  cedula: '',
  nombre: '',
  fecha: todayIso,
  hora: '',
  telefono: '',
  localidad: '',
  observaciones: '',
  marca: '',
  modelo: '',
  numero_motor: '',
  factura: '',
  estado: 'APRONTE',
  repuestos_garantia: '',
  correo_alerta_garantia: '',
  dias_alerta_garantia: 7,
  fecha_alerta_garantia: '',
  created_by_role: ''
})

const mecanicos = computed(() => usuarios.value.filter((usuario) => usuario.role === 'mecanico'))

const mecanicoPorDefecto = computed(() => {
  const marcado = mecanicos.value.find((usuario) => Number(usuario.es_mecanico_default || 0) === 1)
  return marcado ? Number(marcado.id) : null
})

const normalizarCedula = (value: string) => value.replace(/\D/g, '')

const validarCedulaUy = (value: string) => {
  const digitsRaw = normalizarCedula(value)
  if (digitsRaw.length < 7 || digitsRaw.length > 8) return false
  const digits = digitsRaw.padStart(8, '0').split('').map((digit) => parseInt(digit, 10))
  const weights = [2, 9, 8, 7, 6, 3, 4]
  let sum = 0
  for (let index = 0; index < 7; index++) sum += digits[index] * weights[index]
  const check = (10 - (sum % 10)) % 10
  return check === digits[7]
}

const formatearCedula = (value: string) => {
  let limpio = normalizarCedula(value)
  if (limpio.length > 8) limpio = limpio.slice(0, 8)
  if (limpio.length > 7) return limpio.replace(/^(\d)(\d{3})(\d{3})(\d{1})$/, '$1.$2.$3-$4')
  if (limpio.length > 6) return limpio.replace(/^(\d{1,2})(\d{3})(\d{3})(\d{1})$/, '$1.$2.$3-$4')
  return limpio
}

const cargarUsuarios = async () => {
  try {
    const data = await api.listarUsuarios()
    usuarios.value = Array.isArray(data) ? data : []
    if (!mecanicoSeleccionadoId.value) {
      mecanicoSeleccionadoId.value = mecanicoPorDefecto.value ?? mecanicos.value[0]?.id ?? null
    }
  } catch (error) {
    console.warn('[Aprontes] Error cargando usuarios:', error)
    usuarios.value = []
  }
}

const cargarClientePorCedula = async () => {
  const cedulaNormalizada = normalizarCedula(cedula.value)
  if (cedulaNormalizada.length < 7) {
    clienteEncontrado.value = false
    vehiculosCliente.value = []
    vehiculoSeleccionadoId.value = null
    newForm.value.nombre = ''
    newForm.value.telefono = ''
    newForm.value.localidad = ''
    return
  }

  cargandoCliente.value = true
  try {
    const data = (await api.obtenerClienteDetalle(cedulaNormalizada)) as ClienteDetalle
    const cliente = data?.cliente || null
    const vehiculos = Array.isArray(data?.vehiculos) ? data.vehiculos : []
    clienteEncontrado.value = Boolean(cliente)
    vehiculosCliente.value = vehiculos
    newForm.value.cedula = cedulaNormalizada
    if (cliente?.nombre) newForm.value.nombre = String(cliente.nombre || '')
    if (cliente?.telefono) newForm.value.telefono = String(cliente.telefono || '')
    if (cliente?.localidad) newForm.value.localidad = String(cliente.localidad || '')
    if (vehiculos.length === 1 && vehiculos[0]) {
      seleccionarVehiculoExistente(vehiculos[0])
    } else if (vehiculoSeleccionadoId.value && !vehiculos.some((vehiculo) => Number(vehiculo.id) === Number(vehiculoSeleccionadoId.value))) {
      vehiculoSeleccionadoId.value = null
    }
  } catch (error) {
    console.warn('[Aprontes] Error cargando cliente por cedula:', error)
    clienteEncontrado.value = false
    vehiculosCliente.value = []
    vehiculoSeleccionadoId.value = null
  } finally {
    cargandoCliente.value = false
  }
}

const seleccionarVehiculoExistente = (vehiculo: ClienteDetalle['vehiculos'][number]) => {
  if (!vehiculo) return
  vehiculoSeleccionadoId.value = Number(vehiculo.id || 0) || null
  newForm.value.marca = String(vehiculo.marca || newForm.value.marca || '')
  newForm.value.modelo = String(vehiculo.modelo || newForm.value.modelo || '')
  newForm.value.numero_motor = String(vehiculo.numero_motor || newForm.value.numero_motor || '')
  if (vehiculo.matricula) {
    newForm.value.factura = String(newForm.value.factura || '')
  }
}

const onVehiculoChange = (value: string) => {
  const id = value ? Number(value) : null
  vehiculoSeleccionadoId.value = id
  if (!id) return
  const vehiculo = vehiculosCliente.value.find((item) => Number(item.id) === id)
  if (!vehiculo) return
  seleccionarVehiculoExistente(vehiculo)
}

const onVehiculoChangeEvent = (event: Event) => {
  const target = event.target as HTMLSelectElement | null
  onVehiculoChange(String(target?.value || ''))
}

const onMecanicoChange = (value: string) => {
  mecanicoSeleccionadoId.value = value ? Number(value) : null
}

const onMecanicoChangeEvent = (event: Event) => {
  const target = event.target as HTMLSelectElement | null
  onMecanicoChange(String(target?.value || ''))
}

watch(cedula, (value) => {
  const formatted = formatearCedula(value)
  if (formatted !== value) cedula.value = formatted
})

watch(cedula, async () => {
  await cargarClientePorCedula()
})

watch(() => newForm.value.marca, (marca) => {
  cargarModelos(marca)
})

watch(mecanicoPorDefecto, (value) => {
  if (!mecanicoSeleccionadoId.value) {
    mecanicoSeleccionadoId.value = value ?? mecanicos.value[0]?.id ?? null
  }
})

const cargarAprontes = async () => {
  cargando.value = true
  try {
    const data = fechaFiltro.value
      ? await api.obtenerAprontesFecha(fechaFiltro.value)
      : await api.obtenerAprontes()
    aprontes.value = data || []
  } catch (error: any) {
    console.error('[Aprontes] Error cargando aprontes:', error)
    aprontes.value = []
  } finally {
    cargando.value = false
  }
}

const resetNewForm = () => {
  cedula.value = ''
  clienteEncontrado.value = false
  vehiculosCliente.value = []
  vehiculoSeleccionadoId.value = null
  newForm.value = {
    cedula: '',
    nombre: '',
    fecha: fechaFiltro.value || todayIso,
    hora: '',
    telefono: '',
    localidad: '',
    observaciones: '',
    marca: '',
    modelo: '',
    numero_motor: '',
    factura: '',
    estado: 'APRONTE',
    repuestos_garantia: '',
    correo_alerta_garantia: '',
    dias_alerta_garantia: 7,
    fecha_alerta_garantia: '',
    created_by_role: ''
  }
  mecanicoSeleccionadoId.value = mecanicoPorDefecto.value ?? mecanicos.value[0]?.id ?? null
}

const abrirModalNuevo = async () => {
  resetNewForm()
  mostrarModalNuevo.value = true
}

const cerrarModalNuevo = () => {
  mostrarModalNuevo.value = false
}

const cargarMarcas = async () => {
  try {
    const data = await api.obtenerMarcasMoto()
    marcas.value = Array.isArray(data) ? data : []
  } catch (error: any) {
    console.error('[Aprontes] Error cargando marcas:', error)
    marcas.value = []
  }
}

const cargarModelos = async (marca: string) => {
  try {
    const data = await api.obtenerModelosMoto(marca)
    modelos.value = Array.isArray(data) ? data : []
  } catch (error: any) {
    console.error('[Aprontes] Error cargando modelos:', error)
    modelos.value = []
  }
}

const cargarConfigAlertas = async () => {
  try {
    const cfg = await api.obtenerConfigAlertasAprontes()
    if (cfg && typeof cfg === 'object') {
      configAlertas.value = {
        default_email: String(cfg.default_email || ''),
        default_dias_alerta: Number(cfg.default_dias_alerta || 7)
      }
    }
  } catch (error) {
    console.error('[Aprontes] Error cargando config de alertas:', error)
  }
}

const guardarConfigAlertas = async () => {
  guardandoAlertas.value = true
  try {
    const payload = {
      default_email: String(configAlertas.value.default_email || '').trim(),
      default_dias_alerta: Number(configAlertas.value.default_dias_alerta || 7)
    }
    const saved = await api.guardarConfigAlertasAprontes(payload)
    if (saved && typeof saved === 'object') {
      configAlertas.value = {
        default_email: String(saved.default_email || payload.default_email || ''),
        default_dias_alerta: Number(saved.default_dias_alerta || payload.default_dias_alerta || 7)
      }
    }
    mostrarModalAlertas.value = false
  } catch (error: any) {
    alert(error?.message || 'No se pudo guardar la configuracion de alertas')
  } finally {
    guardandoAlertas.value = false
  }
}

const abrirDetalle = (a: Apronte) => {
  apronteActivo.value = { ...a }
  modalKey.value += 1
  mostrarDetalle.value = true
}

const cerrarDetalle = () => {
  mostrarDetalle.value = false
  apronteActivo.value = null
}

const refrescarAprontes = async () => {
  await cargarAprontes()
}

const validarNewForm = () => {
  const required = ['cedula', 'nombre', 'fecha', 'hora', 'telefono', 'localidad', 'marca', 'modelo', 'factura'] as const
  for (const key of required) {
    const value = String(newForm.value[key] || '').trim()
    if (!value) {
      throw new Error(`Campo requerido: ${key}`)
    }
    if (key === 'cedula' && !validarCedulaUy(value)) {
      throw new Error('Campo requerido: cedula')
    }
  }
}

const crearApronteDesdeModal = async () => {
  if (esTaller) {
    alert('El taller no puede crear aprontes')
    return
  }
  guardandoNuevo.value = true
  try {
    const cedulaNormalizada = normalizarCedula(newForm.value.cedula)
    newForm.value.cedula = cedulaNormalizada
    validarNewForm()
    const cliente = {
      cedula: cedulaNormalizada,
      nombre: String(newForm.value.nombre || '').trim(),
      telefono: String(newForm.value.telefono || '').trim(),
      localidad: String(newForm.value.localidad || '').trim()
    }
    const vehiculo = {
      marca: String(newForm.value.marca || '').trim(),
      modelo: String(newForm.value.modelo || '').trim(),
      numero_motor: String(newForm.value.numero_motor || '').trim()
    }
    const apronte = {
      observaciones: String(newForm.value.observaciones || '').trim(),
      factura: String(newForm.value.factura || '').trim(),
      estado: String(newForm.value.estado || 'APRONTE').trim().toUpperCase(),
      numero_motor: vehiculo.numero_motor,
      mecanico_id: mecanicoSeleccionadoId.value
    }
    const payload = {
      ...cliente,
      ...vehiculo,
      ...apronte,
      cedula: cedulaNormalizada,
      vehiculo_id: vehiculoSeleccionadoId.value,
      mecanico_id: mecanicoSeleccionadoId.value,
      fecha: String(newForm.value.fecha || '').trim(),
      hora: String(newForm.value.hora || '').trim()
    }
    await api.crearApronte(payload)
    cerrarModalNuevo()
    await cargarAprontes()
  } catch (error: any) {
    alert(normalizarMensajeError(error, 'No se pudo crear el apronte'))
  } finally {
    guardandoNuevo.value = false
  }
}

const aprontesFiltrados = computed(() => {
  let resultado = aprontes.value
  const sessionId = Number(session?.id || 0)

  if (esMecanico) {
    resultado = resultado.filter((a) => Number(a?.mecanico_id || 0) === sessionId)
  }

  // Aplicar búsqueda
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return resultado

  return resultado.filter((a) => {
    return [
      a.nombre,
      a.telefono,
      a.factura,
      a.localidad,
      a.observaciones,
      a.marca,
      a.modelo
    ].some((value) => String(value || '').toLowerCase().includes(q))
  })
})

watch(fechaFiltro, () => {
  cargarAprontes()
})

onMounted(async () => {
  await cargarConfigAlertas()
  await cargarUsuarios()
  await cargarAprontes()
  await cargarMarcas()
  await cargarModelos(newForm.value.marca)
})
</script>

<template>
  <div class="h-screen flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 bg-gray-50 dark:bg-[#0f172a] gap-6 overflow-y-auto overflow-x-hidden">
    <header class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 dark:text-gray-100 tracking-tight">APRONTES</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Registro y agenda de aprontes.</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="mostrarModalAlertas = true"
          class="px-4 py-2 rounded-xl bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          Gestionar alertas
        </button>
        <button v-if="!esTaller" @click="abrirModalNuevo"
          class="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-cyan-700 transition-all">
          Nuevo apronte
        </button>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-6 flex-1 min-h-0">
      <div class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-0">
        <div class="p-4 border-b border-gray-100 dark:border-gray-800">
          <div class="flex flex-wrap items-end gap-3">
            <div>
              <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Fecha</label>
              <input v-model="fechaFiltro" type="date"
                class="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-gray-800 dark:text-gray-100 text-xs" />
            </div>
            <button @click="fechaFiltro = todayIso"
              class="px-3 py-2 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest shadow">
              Hoy
            </button>
            <button @click="fechaFiltro = ''"
              class="px-3 py-2 rounded-xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 font-black text-[10px] uppercase tracking-widest">
              Ver todos
            </button>
            <div class="flex-1 min-w-[200px]">
              <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Buscar</label>
              <input v-model="busqueda" placeholder="Nombre, factura, tel..."
                class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-gray-800 dark:text-gray-100 text-xs" />
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div v-if="cargando" class="p-6 text-sm text-gray-400">Cargando...</div>
          <div v-else-if="aprontesFiltrados.length === 0" class="p-6 text-sm text-gray-400">Sin aprontes para mostrar.</div>
          <div v-else>
            <table class="w-full text-xs">
              <thead class="sticky top-0 bg-white dark:bg-[#1e293b]">
                <tr class="text-[10px] uppercase tracking-widest text-gray-400">
                  <th class="px-4 py-3 text-left">Fecha</th>
                  <th class="px-4 py-3 text-left">Hora</th>
                  <th class="px-4 py-3 text-left">Nombre</th>
                  <th class="px-4 py-3 text-left">Telefono</th>
                  <th class="px-4 py-3 text-left">Localidad</th>
                  <th class="px-4 py-3 text-left">Observaciones</th>
                  <th class="px-4 py-3 text-left">Marca</th>
                  <th class="px-4 py-3 text-left">Modelo</th>
                  <th class="px-4 py-3 text-left">Factura</th>
                  <th class="px-4 py-3 text-left">Estado</th>
                  <th class="px-4 py-3 text-left">Creado por</th>
                  <th class="px-4 py-3 text-left">Repuestos garantia</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in aprontesFiltrados" :key="a.id"
                  @click="abrirDetalle(a)"
                  :class="['border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-500/10']">
                  <td class="px-4 py-3 font-bold text-gray-700 dark:text-gray-200">{{ a.fecha }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ a.hora }}</td>
                  <td class="px-4 py-3 font-bold text-gray-800 dark:text-gray-100">{{ a.nombre }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ a.telefono }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ a.localidad }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ a.observaciones }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ a.marca }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ a.modelo }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ a.factura }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ a.estado || 'APRONTE' }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ a.created_by_username || '-' }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[220px] truncate">{{ a.repuestos_garantia || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <ApronteWindow
      v-if="mostrarDetalle"
      :key="modalKey"
      :apronte="apronteActivo"
      @cerrar="cerrarDetalle"
      @actualizar="refrescarAprontes"
    />

    <div v-if="mostrarModalNuevo" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="cerrarModalNuevo">
      <div class="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-xl font-black text-gray-800 dark:text-gray-100">Nuevo apronte</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Completa los datos y define estado/repuestos de garantia.</p>
          </div>
          <button @click="cerrarModalNuevo" class="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-black text-gray-500 dark:text-gray-300">Cerrar</button>
        </div>

        <form class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="crearApronteDesdeModal">
          <div class="md:col-span-2 rounded-2xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50/70 dark:bg-cyan-500/10 p-4 space-y-4">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div class="text-[10px] uppercase tracking-widest text-cyan-500 font-black">Cliente</div>
                <div class="text-sm font-bold text-gray-800 dark:text-gray-100">Buscar o crear cliente antes de registrar la moto</div>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" @click="cargarClientePorCedula" class="px-3 py-2 rounded-xl border border-cyan-200 dark:border-cyan-900 text-cyan-700 dark:text-cyan-100 text-[10px] font-black uppercase tracking-widest">
                  Buscar cliente
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Cedula</label>
                <input v-model="cedula" type="text" autocomplete="off" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Nombre</label>
                <input v-model="newForm.nombre" type="text" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Telefono</label>
                <input v-model="newForm.telefono" type="text" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Localidad</label>
                <input v-model="newForm.localidad" type="text" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div :class="clienteEncontrado ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'" class="text-xs font-black uppercase tracking-widest">
                {{ cargandoCliente ? 'Buscando cliente...' : (clienteEncontrado ? 'Cliente existente' : 'Nuevo cliente') }}
              </div>
              <div v-if="vehiculosCliente.length > 0" class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {{ vehiculosCliente.length }} moto(s) registradas
              </div>
            </div>
          </div>

          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Moto del cliente</label>
            <select :value="vehiculoSeleccionadoId ?? ''" @change="onVehiculoChangeEvent" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100">
              <option value="">Crear una moto nueva</option>
              <option v-for="vehiculo in vehiculosCliente" :key="vehiculo.id" :value="vehiculo.id">
                {{ vehiculo.matricula ? `${vehiculo.matricula} · ` : '' }}{{ vehiculo.marca || 'Moto' }} {{ vehiculo.modelo || '' }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Marca</label>
            <input v-model="newForm.marca" list="aprontes-marcas" type="text" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Modelo</label>
            <input v-model="newForm.modelo" list="aprontes-modelos" type="text" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Numero de motor</label>
            <input v-model="newForm.numero_motor" type="text" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Factura</label>
            <input v-model="newForm.factura" type="text" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Estado</label>
            <select v-model="newForm.estado" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100">
              <option v-for="estado in ESTADOS_APRONTE" :key="`nuevo-${estado}`" :value="estado">{{ estado }}</option>
            </select>
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Mecanico asignado</label>
            <select :value="mecanicoSeleccionadoId ?? ''" @change="onMecanicoChangeEvent" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100">
              <option value="">Sin asignar</option>
              <option v-for="mecanico in mecanicos" :key="mecanico.id" :value="mecanico.id">
                {{ mecanico.nombre }}{{ Number(mecanico.es_mecanico_default || 0) === 1 ? ' · default' : '' }}
              </option>
            </select>
          </div>
          <ApronteSchedulePicker
            v-model:fecha="newForm.fecha"
            v-model:hora="newForm.hora"
            label="Agenda de apronte"
          />
          <div class="md:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" @click="cerrarModalNuevo" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-black uppercase tracking-widest">Cancelar</button>
            <button type="submit" :disabled="guardandoNuevo" class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed">
              {{ guardandoNuevo ? 'Guardando...' : 'Crear apronte' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="mostrarModalAlertas" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="mostrarModalAlertas = false">
      <div class="w-full max-w-xl bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-xl font-black text-gray-800 dark:text-gray-100">Gestion de alertas de garantia</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Define correo por defecto y dias para alertar automaticamente.</p>
          </div>
          <button @click="mostrarModalAlertas = false" class="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-black text-gray-500 dark:text-gray-300">Cerrar</button>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-4">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Correo por defecto</label>
            <input v-model="configAlertas.default_email" type="email" placeholder="alertas@dominio.com"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Dias por defecto para alerta</label>
            <input v-model.number="configAlertas.default_dias_alerta" type="number" min="1" max="90"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">
            El sistema enviara correo automatico cuando el apronte este en estado ENTREGADA ESPERA DE GARANTIA y la fecha actual supere la fecha pactada de alerta. Si no hay fecha pactada, usa dias por defecto desde la fecha de espera.
          </p>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button @click="mostrarModalAlertas = false" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-black uppercase tracking-widest">Cancelar</button>
          <button @click="guardarConfigAlertas" :disabled="guardandoAlertas" class="px-5 py-2 rounded-xl bg-cyan-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed">
            {{ guardandoAlertas ? 'Guardando...' : 'Guardar configuracion' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
