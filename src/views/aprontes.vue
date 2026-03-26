<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../api'
import ApronteWindow from '../components/apronteWindow.vue'

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
  factura: string
  created_at?: string
}

type HorarioApronte = {
  id: number
  hora: string
  cupo: number
  usados: number
  disponibles: number
}

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const todayIso = formatLocalDate(new Date())

const aprontes = ref<Apronte[]>([])
const horarios = ref<HorarioApronte[]>([])
const fechaFiltro = ref(todayIso)
const busqueda = ref('')
const cargando = ref(false)
const guardando = ref(false)
const status = ref('')
const statusOk = ref(true)
const mostrarDetalle = ref(false)
const apronteActivo = ref<Apronte | null>(null)
const modalKey = ref(0)
const marcas = ref<string[]>([])
const modelos = ref<string[]>([])

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
  factura: ''
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

const cargarHorarios = async () => {
  if (!form.value.fecha) {
    horarios.value = []
    return
  }
  try {
    const data = await api.obtenerHorariosAprontesDisponibles(form.value.fecha)
    horarios.value = data || []
  } catch (error: any) {
    console.error('[Aprontes] Error cargando horarios aprontes:', error)
    horarios.value = []
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
    factura: ''
  }
  status.value = ''
  statusOk.value = true
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
    factura: a.factura || ''
  }
  status.value = ''
  statusOk.value = true
  cargarHorarios()
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
  await cargarHorarios()
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

const guardarApronte = async () => {
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
      factura: String(form.value.factura || '').trim()
    }

    if (isEdit.value) {
      if (!form.value.id) {
        throw new Error('ID requerido para actualizar el apronte.')
      }
      const payload = { id: Number(form.value.id), ...basePayload }
      await api.actualizarApronte(payload)
      status.value = 'Apronte actualizado.'
    } else {
      await api.crearApronte(basePayload)
      status.value = 'Apronte creado.'
      resetForm()
    }
    statusOk.value = true
    await cargarAprontes()
    await cargarHorarios()
  } catch (error: any) {
    status.value = error?.message || 'Error al guardar'
    statusOk.value = false
  } finally {
    guardando.value = false
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
    await cargarHorarios()
  } catch (error: any) {
    status.value = error?.message || 'Error al eliminar'
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

const horariosSelect = computed(() => {
  const current = form.value.hora
  return (horarios.value || []).map((h) => ({
    ...h,
    disabled: h.disponibles <= 0 && h.hora !== current
  }))
})

watch(() => form.value.fecha, () => {
  cargarHorarios()
})

watch(() => form.value.marca, (marca) => {
  cargarModelos(marca)
})

watch(fechaFiltro, () => {
  cargarAprontes()
  if (!isEdit.value) {
    form.value.fecha = fechaFiltro.value || todayIso
    form.value.hora = ''
  }
})

onMounted(async () => {
  await cargarAprontes()
  await cargarHorarios()
  await cargarMarcas()
  await cargarModelos(form.value.marca)
})
</script>

<template>
  <div class="h-screen flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 bg-gray-50 dark:bg-[#0f172a] gap-6 overflow-hidden">
    <header class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 dark:text-gray-100 tracking-tight">APRONTES</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Registro y agenda de aprontes.</p>
      </div>
      <button @click="resetForm"
        class="px-4 py-2 rounded-xl bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
        Nuevo apronte
      </button>
    </header>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
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

        <div class="flex-1 overflow-auto custom-scrollbar">
          <div v-if="cargando" class="p-6 text-sm text-gray-400">Cargando...</div>
          <div v-else-if="aprontesFiltrados.length === 0" class="p-6 text-sm text-gray-400">Sin aprontes para mostrar.</div>
          <div v-else class="min-w-[920px]">
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
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 overflow-y-auto custom-scrollbar">
        <h3 class="text-lg font-black text-gray-800 dark:text-gray-100">{{ isEdit ? 'Editar apronte' : 'Nuevo apronte' }}</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Completa los datos y asigna un horario.</p>

        <form class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="guardarApronte">
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
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Factura</label>
            <input v-model="form.factura" type="text"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Fecha</label>
            <input v-model="form.fecha" type="date"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div class="md:col-span-2">
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Horario apronte</label>
            <select v-model="form.hora"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100">
              <option value="">Seleccionar horario...</option>
              <option v-for="h in horariosSelect" :key="h.id" :value="h.hora" :disabled="h.disabled">
                {{ h.hora }} hs ({{ h.disponibles }}/{{ h.cupo }})
              </option>
            </select>
            <p v-if="form.fecha && horariosSelect.length === 0" class="text-[10px] text-amber-500 mt-2">No hay horarios de aprontes activos.</p>
          </div>

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
  </div>
</template>
