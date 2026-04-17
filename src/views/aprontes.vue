<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../api'
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
  created_at?: string
}

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
const guardando = ref(false)
const guardandoNuevo = ref(false)
const status = ref('')
const statusOk = ref(true)
const mostrarDetalle = ref(false)
const mostrarModalNuevo = ref(false)
const mostrarModalAlertas = ref(false)
const apronteActivo = ref<Apronte | null>(null)
const modalKey = ref(0)
const marcas = ref<string[]>([])
const modelos = ref<string[]>([])

const ESTADOS_APRONTE = [
  'APRONTE',
  'ENTREGADA',
  'ENTREGADA ESPERA DE GARANTIA'
]

const mostrarGestionGarantia = ref(false)
const guardandoAlertas = ref(false)
const configAlertas = ref({
  default_email: '',
  default_dias_alerta: 7
})

const form = ref({
  id: null as number | null,
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
  fecha_alerta_garantia: ''
})

const newForm = ref({
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
  fecha_alerta_garantia: ''
})

const isEdit = computed(() => Boolean(form.value.id))

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

const resetForm = () => {
  form.value = {
    id: null,
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
    fecha_alerta_garantia: ''
  }
  status.value = ''
  statusOk.value = true
  mostrarGestionGarantia.value = false
}

const resetNewForm = () => {
  newForm.value = {
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
    fecha_alerta_garantia: ''
  }
}

const abrirModalNuevo = async () => {
  resetNewForm()
  mostrarModalNuevo.value = true
}

const cerrarModalNuevo = () => {
  mostrarModalNuevo.value = false
}

const seleccionarApronte = (a: Apronte) => {
  form.value = {
    id: a.id,
    nombre: a.nombre || '',
    fecha: a.fecha || todayIso,
    hora: a.hora || '',
    telefono: a.telefono || '',
    localidad: a.localidad || '',
    observaciones: a.observaciones || '',
    marca: a.marca || '',
    modelo: a.modelo || '',
    numero_motor: String(a.numero_motor || ''),
    factura: a.factura || '',
    estado: String(a.estado || 'APRONTE'),
    repuestos_garantia: String(a.repuestos_garantia || ''),
    correo_alerta_garantia: String(a.correo_alerta_garantia || configAlertas.value.default_email || ''),
    dias_alerta_garantia: Number(a.dias_alerta_garantia || configAlertas.value.default_dias_alerta || 7),
    fecha_alerta_garantia: String((a as any).fecha_alerta_garantia || '')
  }
  status.value = ''
  statusOk.value = true
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
  seleccionarApronte(a)
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

const validarForm = () => {
  const required = ['nombre', 'fecha', 'hora', 'telefono', 'localidad', 'marca', 'modelo', 'factura'] as const
  for (const key of required) {
    const value = String(form.value[key] || '').trim()
    if (!value) {
      throw new Error(`Campo requerido: ${key}`)
    }
  }
}

const validarNewForm = () => {
  const required = ['nombre', 'fecha', 'hora', 'telefono', 'localidad', 'marca', 'modelo', 'factura'] as const
  for (const key of required) {
    const value = String(newForm.value[key] || '').trim()
    if (!value) {
      throw new Error(`Campo requerido: ${key}`)
    }
  }
}

const guardarApronte = async () => {
  if (!isEdit.value || !form.value.id) {
    status.value = 'Selecciona un apronte del listado para editar.'
    statusOk.value = false
    return
  }

  guardando.value = true
  status.value = 'Guardando...'
  statusOk.value = true

  try {
    validarForm()
    const basePayload = {
      nombre: String(form.value.nombre || '').trim(),
      fecha: String(form.value.fecha || '').trim(),
      hora: String(form.value.hora || '').trim(),
      telefono: String(form.value.telefono || '').trim(),
      localidad: String(form.value.localidad || '').trim(),
      observaciones: String(form.value.observaciones || '').trim(),
      marca: String(form.value.marca || '').trim(),
      modelo: String(form.value.modelo || '').trim(),
      numero_motor: String(form.value.numero_motor || '').trim(),
      factura: String(form.value.factura || '').trim(),
      estado: String(form.value.estado || 'APRONTE').trim().toUpperCase(),
      repuestos_garantia: String(form.value.repuestos_garantia || '').trim(),
      correo_alerta_garantia: String(form.value.correo_alerta_garantia || configAlertas.value.default_email || '').trim(),
      dias_alerta_garantia: Number(form.value.dias_alerta_garantia || configAlertas.value.default_dias_alerta || 7),
      fecha_alerta_garantia: String(form.value.fecha_alerta_garantia || '').trim()
    }

    const payload = { id: Number(form.value.id), ...basePayload }
    await api.actualizarApronte(payload)
    status.value = 'Apronte actualizado.'
    statusOk.value = true
    await cargarAprontes()
  } catch (error: any) {
    status.value = normalizarMensajeError(error, 'Error al guardar')
    statusOk.value = false
  } finally {
    guardando.value = false
  }
}

const crearApronteDesdeModal = async () => {
  guardandoNuevo.value = true
  try {
    validarNewForm()
    const payload = {
      nombre: String(newForm.value.nombre || '').trim(),
      fecha: String(newForm.value.fecha || '').trim(),
      hora: String(newForm.value.hora || '').trim(),
      telefono: String(newForm.value.telefono || '').trim(),
      localidad: String(newForm.value.localidad || '').trim(),
      observaciones: String(newForm.value.observaciones || '').trim(),
      marca: String(newForm.value.marca || '').trim(),
      modelo: String(newForm.value.modelo || '').trim(),
      numero_motor: String(newForm.value.numero_motor || '').trim(),
      factura: String(newForm.value.factura || '').trim(),
      estado: String(newForm.value.estado || 'APRONTE').trim().toUpperCase()
    }
    await api.crearApronte(payload)
    cerrarModalNuevo()
    await cargarAprontes()
    resetForm()
  } catch (error: any) {
    alert(normalizarMensajeError(error, 'No se pudo crear el apronte'))
  } finally {
    guardandoNuevo.value = false
  }
}

const borrarApronte = async () => {
  if (!form.value.id) return
  const ok = window.confirm('Eliminar este apronte?')
  if (!ok) return
  guardando.value = true
  status.value = 'Eliminando...'
  statusOk.value = true
  try {
    await api.borrarApronte(form.value.id)
    status.value = 'Apronte eliminado.'
    statusOk.value = true
    resetForm()
    await cargarAprontes()
  } catch (error: any) {
    status.value = normalizarMensajeError(error, 'Error al eliminar')
    statusOk.value = false
  } finally {
    guardando.value = false
  }
}

const aprontesFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return aprontes.value
  return aprontes.value.filter((a) => {
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

watch(() => form.value.marca, (marca) => {
  cargarModelos(marca)
})

watch(() => newForm.value.marca, (marca) => {
  cargarModelos(marca)
})

watch([() => form.value.fecha, () => form.value.hora], () => {
  status.value = ''
})

watch(fechaFiltro, () => {
  cargarAprontes()
  if (!isEdit.value) {
    form.value.fecha = fechaFiltro.value || todayIso
    form.value.hora = ''
  }
})

onMounted(async () => {
  await cargarConfigAlertas()
  await cargarAprontes()
  await cargarMarcas()
  await cargarModelos(form.value.marca)
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
        <button @click="abrirModalNuevo"
          class="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-cyan-700 transition-all">
          Nuevo apronte
        </button>
      </div>
    </header>

    <div class="grid grid-cols-1 2xl:grid-cols-3 gap-6 flex-1 min-h-0">
      <div class="xl:col-span-2 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-0">
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
                  <th class="px-4 py-3 text-left">Repuestos garantia</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in aprontesFiltrados" :key="a.id"
                  @click="abrirDetalle(a)"
                  :class="['border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-500/10', a.id === form.id ? 'bg-emerald-50/70 dark:bg-emerald-500/20' : '']">
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
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[220px] truncate">{{ a.repuestos_garantia || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 overflow-y-auto custom-scrollbar">
        <h3 class="text-lg font-black text-gray-800 dark:text-gray-100">Editar apronte</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Selecciona un apronte del listado para editar datos y garantia.</p>

        <div v-if="!isEdit" class="mt-5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-5 text-xs text-gray-500 dark:text-gray-400">
          No hay apronte seleccionado. Haz click en una fila del listado para editarlo.
        </div>

        <form v-else class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="guardarApronte">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Nombre</label>
            <input v-model="form.nombre" type="text"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Telefono</label>
            <input v-model="form.telefono" type="text"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Localidad</label>
            <input v-model="form.localidad" type="text"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Observaciones</label>
            <textarea v-model="form.observaciones" rows="2"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100 resize-none"></textarea>
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Marca</label>
            <input v-model="form.marca" type="text" list="aprontes-marcas"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
            <datalist id="aprontes-marcas">
              <option v-for="m in marcas" :key="m" :value="m"></option>
            </datalist>
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Modelo</label>
            <input v-model="form.modelo" type="text" list="aprontes-modelos"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
            <datalist id="aprontes-modelos">
              <option v-for="m in modelos" :key="m" :value="m"></option>
            </datalist>
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Numero de motor</label>
            <input v-model="form.numero_motor" type="text"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Factura</label>
            <input v-model="form.factura" type="text"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Estado</label>
            <select v-model="form.estado"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100">
              <option v-for="estado in ESTADOS_APRONTE" :key="estado" :value="estado">{{ estado }}</option>
            </select>
          </div>
          <ApronteSchedulePicker
            v-model:fecha="form.fecha"
            v-model:hora="form.hora"
            label="Agenda de apronte"
          />

          <template v-if="isEdit">
            <div class="md:col-span-2 mt-1">
              <button
                type="button"
                @click="mostrarGestionGarantia = !mostrarGestionGarantia"
                class="w-full flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 px-4 py-2.5 text-left"
              >
                <span class="text-[11px] uppercase tracking-widest font-black text-amber-700 dark:text-amber-300">Gestion de garantia</span>
                <span class="text-xs font-black text-amber-700 dark:text-amber-300">{{ mostrarGestionGarantia ? 'Ocultar' : 'Mostrar' }}</span>
              </button>
            </div>

            <template v-if="mostrarGestionGarantia">
              <div>
                <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Dias para alerta garantia</label>
                <input v-model.number="form.dias_alerta_garantia" type="number" min="1" max="90"
                  class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
              </div>
              <div class="md:col-span-2">
                <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Correo alerta garantia</label>
                <input v-model="form.correo_alerta_garantia" type="email" placeholder="correo@dominio.com"
                  class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Fecha pactada alerta</label>
                <input v-model="form.fecha_alerta_garantia" type="date"
                  class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
              </div>
              <div class="md:col-span-2">
                <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Repuestos garantia</label>
                <textarea v-model="form.repuestos_garantia" rows="3" placeholder="Describe los repuestos pendientes"
                  class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100 resize-none"></textarea>
              </div>
            </template>
          </template>

          <div class="md:col-span-2 flex items-center justify-between mt-2">
            <div :class="statusOk ? 'text-emerald-500 text-xs' : 'text-rose-500 text-xs'">{{ status }}</div>
            <div class="flex items-center gap-2">
              <button v-if="isEdit" type="button" @click="borrarApronte"
                class="px-4 py-3 rounded-xl bg-rose-600 text-white font-black uppercase tracking-widest text-xs shadow-lg">
                Eliminar
              </button>
              <button type="submit" :disabled="guardando"
                class="px-6 py-3 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                {{ guardando ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear apronte') }}
              </button>
            </div>
          </div>
        </form>
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
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Observaciones</label>
            <textarea v-model="newForm.observaciones" rows="2" class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100 resize-none"></textarea>
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
