<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type TrabajoRow = {
  cantidad: string
  descripcion: string
  costo: string
  importe: string
}

type Checklist = Record<string, boolean>

type Vehiculo = {
  id?: number | string
  matricula?: string
  marca?: string
  modelo?: string
  color?: string
  motor?: string
  numero_motor?: string
  codigo_marca?: string
  codigo_modelo?: string
}

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

const props = withDefaults(defineProps<{
  open: boolean
  cliente: any | null
  vehiculos: Vehiculo[]
  ingreso: any | null
  form: any
  checklistIngreso: Checklist
  checklistEgreso: Checklist
  trabajos: TrabajoRow[]
  allowPrint?: boolean
}>(), {
  vehiculos: () => [],
  ingreso: null,
  allowPrint: false
})

const emit = defineEmits<{
  close: []
  save: []
  'save-and-print': []
}>()

const activeSection = ref<'ingreso' | 'egreso'>('ingreso')

watch(
  () => props.open,
  (open) => {
    if (open) {
      activeSection.value = props.ingreso?.fecha_egreso ? 'egreso' : 'ingreso'
    }
  }
)

const mostrarIngreso = computed(() => activeSection.value === 'ingreso')
const mostrarEgreso = computed(() => activeSection.value === 'egreso')

const totalTrabajo = computed(() => {
  return props.trabajos.reduce((total, row) => {
    const importe = Number(String(row.importe || '').replace(',', '.'))
    const cantidad = Number(String(row.cantidad || '').replace(',', '.'))
    const costo = Number(String(row.costo || '').replace(',', '.'))
    if (Number.isFinite(importe) && importe > 0) return total + importe
    if (Number.isFinite(cantidad) && Number.isFinite(costo)) return total + cantidad * costo
    return total
  }, 0)
})

const resumenChecks = (checks: Checklist) => {
  return CHECKS.filter((item) => checks?.[item.key]).map((item) => item.label).join(', ') || 'Sin marcar'
}

const formatearTextoVehiculo = (vehiculo: Vehiculo) => {
  return `${vehiculo.matricula || 'Sin matrícula'} · ${vehiculo.marca || vehiculo.codigo_marca || ''} ${vehiculo.modelo || vehiculo.codigo_modelo || ''}`.trim()
}

const onVehiculoChange = (value: string) => {
  const vehiculoId = value ? Number(value) : null
  props.form.vehiculo_id = vehiculoId
  if (!vehiculoId) return
  const vehiculo = props.vehiculos.find((item) => Number(item.id) === vehiculoId)
  if (!vehiculo) return
  props.form.marca = String(vehiculo.marca || vehiculo.codigo_marca || '')
  props.form.modelo = String(vehiculo.modelo || vehiculo.codigo_modelo || '')
  props.form.color = String(vehiculo.color || '')
  props.form.matricula = String(vehiculo.matricula || '')
  props.form.numero_motor = String(vehiculo.motor || vehiculo.numero_motor || '')
}

const setTrabajoRowImporte = (row: TrabajoRow) => {
  const cantidad = Number(String(row.cantidad || '').replace(',', '.'))
  const costo = Number(String(row.costo || '').replace(',', '.'))
  if (Number.isFinite(cantidad) && Number.isFinite(costo)) {
    row.importe = String(Math.round((cantidad * costo) * 100) / 100)
  }
}

const buildSummary = () => {
  const lines = [
    `Ingreso: ${props.form.fecha_ingreso || ''}`,
    `Cliente: ${props.cliente?.nombre || ''} - CI ${props.cliente?.cedula || ''}`,
    `Moto: ${props.form.marca} ${props.form.modelo} ${props.form.color ? `- ${props.form.color}` : ''}`.trim(),
    `Matrícula: ${props.form.matricula || ''}`,
    `Motor: ${props.form.numero_motor || ''}`,
    `Servicios: ${props.form.numero_servicios || ''}`,
    `Checklist ingreso: ${resumenChecks(props.checklistIngreso)}`,
    `Comentarios: ${props.form.comentarios || ''}`,
    'Trabajos:'
  ]

  props.trabajos.forEach((row, index) => {
    const contenido = [row.cantidad, row.descripcion, row.costo, row.importe].map((part) => String(part || '').trim()).join(' | ')
    lines.push(`${index + 1}. ${contenido}`)
  })

  lines.push(`Observaciones: ${props.form.observaciones || ''}`)
  lines.push(`Entrega / salida: ${props.form.fecha_salida || ''}`)
  lines.push(`Checklist egreso: ${resumenChecks(props.checklistEgreso)}`)
  return lines.join('\n')
}

const onSave = () => {
  if (!String(props.form.trabajo_realizado || '').trim()) {
    props.form.trabajo_realizado = buildSummary()
  }
  emit('save')
}

const onSaveAndPrint = () => {
  if (!String(props.form.trabajo_realizado || '').trim()) {
    props.form.trabajo_realizado = buildSummary()
  }
  emit('save-and-print')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4">
      <div class="mx-auto flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none border border-white/10 bg-[#0f172a]/96 text-white shadow-2xl shadow-slate-950/60 sm:h-[95dvh] sm:rounded-[2rem]">
        <div class="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              Ingreso de servicio
            </div>
            <h2 class="mt-3 text-2xl font-black text-white sm:text-3xl">
              {{ ingreso ? `Editar ingreso #${ingreso.id}` : 'Nuevo ingreso' }}
            </h2>
            <p class="mt-1 text-sm text-slate-400">Formato único de orden de servicio, listo para móvil y escritorio.</p>
          </div>
          <button @click="emit('close')" class="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 hover:bg-white/5">Cerrar</button>
        </div>

        <div class="flex gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
          <button
            @click="activeSection = 'ingreso'"
            class="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition"
            :class="activeSection === 'ingreso' ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
          >
            Ingreso
          </button>
          <button
            @click="activeSection = 'egreso'"
            class="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition"
            :class="activeSection === 'egreso' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
          >
            Egreso
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div class="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <section v-show="mostrarIngreso" class="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4 sm:p-5">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Vehículo</div>
              <select
                :value="form.vehiculo_id ?? ''"
                @change="onVehiculoChange(($event.target as HTMLSelectElement).value)"
                class="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="">Seleccionar moto</option>
                <option v-for="vehiculo in vehiculos" :key="vehiculo.id" :value="vehiculo.id">
                  {{ formatearTextoVehiculo(vehiculo) }}
                </option>
              </select>

              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Marca</span><input v-model="form.marca" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Modelo</span><input v-model="form.modelo" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Color</span><input v-model="form.color" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Matrícula</span><input v-model="form.matricula" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                <label class="space-y-2 sm:col-span-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Número de motor</span><input v-model="form.numero_motor" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
              </div>

              <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Checklist ingreso</div>
                <div class="mt-3 grid gap-2 sm:grid-cols-2">
                  <label v-for="item in CHECKS" :key="item.key" class="flex items-center gap-3 rounded-xl bg-slate-900/60 px-3 py-2">
                    <input v-model="checklistIngreso[item.key]" type="checkbox" class="h-4 w-4 rounded border-slate-500 text-cyan-500" />
                    <span class="text-sm text-slate-200">{{ item.label }}</span>
                  </label>
                </div>
              </div>
            </section>

            <section v-show="mostrarEgreso" class="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4 sm:p-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="space-y-2 sm:col-span-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Ingreso</span><input v-model="form.fecha_ingreso" type="date" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Salida</span><input v-model="form.fecha_salida" type="date" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Servicios</span><input v-model="form.numero_servicios" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                <label class="space-y-2 sm:col-span-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Comentarios</span><textarea v-model="form.comentarios" rows="2" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"></textarea></label>
                <label class="space-y-2 sm:col-span-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Observaciones</span><textarea v-model="form.observaciones" rows="3" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"></textarea></label>
                <label class="space-y-2 sm:col-span-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Trabajo realizado</span><textarea v-model="form.trabajo_realizado" rows="5" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Si queda vacío, se arma a partir de los trabajos y checks"></textarea></label>
                <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Monto</span><input v-model="form.monto" type="number" min="0" step="0.01" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="0.00" /></label>
              </div>

              <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Trabajos</div>
                <div class="mt-3 overflow-x-auto rounded-xl border border-white/10">
                  <table class="w-full min-w-[560px] border-collapse text-sm">
                    <thead class="bg-slate-900/70 text-slate-300">
                      <tr>
                        <th class="border border-white/10 px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.22em]">Cant</th>
                        <th class="border border-white/10 px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.22em]">Descripción</th>
                        <th class="border border-white/10 px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.22em]">Costo</th>
                        <th class="border border-white/10 px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.22em]">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, index) in trabajos" :key="index">
                        <td class="border border-white/10 p-2"><input v-model="row.cantidad" @input="setTrabajoRowImporte(row)" class="w-full rounded-lg border border-white/10 bg-slate-900/60 px-2 py-2 outline-none text-white" /></td>
                        <td class="border border-white/10 p-2"><input v-model="row.descripcion" class="w-full rounded-lg border border-white/10 bg-slate-900/60 px-2 py-2 outline-none text-white" /></td>
                        <td class="border border-white/10 p-2"><input v-model="row.costo" @input="setTrabajoRowImporte(row)" class="w-full rounded-lg border border-white/10 bg-slate-900/60 px-2 py-2 outline-none text-white" /></td>
                        <td class="border border-white/10 p-2"><input v-model="row.importe" class="w-full rounded-lg border border-white/10 bg-slate-900/60 px-2 py-2 outline-none text-white" /></td>
                      </tr>
                      <tr class="bg-slate-900/70">
                        <td colspan="3" class="border border-white/10 px-3 py-2 text-right text-xs font-black uppercase tracking-[0.22em] text-slate-300">Total</td>
                        <td class="border border-white/10 px-3 py-2 text-sm font-black text-white">{{ totalTrabajo.toFixed(2) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Checklist egreso</div>
                <div class="mt-3 grid gap-2 sm:grid-cols-2">
                  <label v-for="item in CHECKS" :key="item.key" class="flex items-center gap-3 rounded-xl bg-slate-900/60 px-3 py-2">
                    <input v-model="checklistEgreso[item.key]" type="checkbox" class="h-4 w-4 rounded border-slate-500 text-emerald-500" />
                    <span class="text-sm text-slate-200">{{ item.label }}</span>
                  </label>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="border-t border-white/10 bg-slate-950/95 px-4 py-4 sm:px-6">
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button @click="emit('close')" class="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-300 hover:bg-white/5">Cancelar</button>
            <button v-if="allowPrint && activeSection === 'ingreso'" @click="onSaveAndPrint" class="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-cyan-100 hover:bg-cyan-400/15">Guardar e imprimir</button>
            <button @click="onSave" class="rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-500/20">
              {{ activeSection === 'egreso' ? 'Registrar egreso' : 'Guardar ingreso' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>