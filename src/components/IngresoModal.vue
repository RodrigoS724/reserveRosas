<script setup lang="ts">
import { computed, ref, watch } from 'vue'

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

const props = withDefaults(defineProps<{
  open: boolean
  cliente: any | null
  vehiculos: Vehiculo[]
  ingreso: any | null
  initialSection?: 'ingreso' | 'egreso'
  form: any
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
const hoyIso = () => new Date().toISOString().slice(0, 10)

watch(
  () => props.open,
  (open) => {
    if (open) {
      activeSection.value = props.initialSection || (props.ingreso?.fecha_egreso ? 'egreso' : 'ingreso')
      if (activeSection.value === 'egreso' && !String(props.form.fecha_salida || '').trim()) {
        props.form.fecha_salida = hoyIso()
      }
    }
  }
)

watch(
  () => activeSection.value,
  (section) => {
    if (section === 'egreso' && !String(props.form.fecha_salida || '').trim()) {
      props.form.fecha_salida = hoyIso()
    }
  }
)

const vehiculoSeleccionado = computed(() => {
  const vehiculoId = Number(props.form.vehiculo_id || 0)
  if (!vehiculoId) return null
  return props.vehiculos.find((item) => Number(item.id) === vehiculoId) || null
})

const resumenCliente = computed(() => String(props.cliente?.nombre || props.cliente?.cedula || 'Sin cliente'))
const resumenVehiculo = computed(() => vehiculoSeleccionado.value
  ? formatearTextoVehiculo(vehiculoSeleccionado.value)
  : `${props.form.matricula || 'Sin matrícula'} · ${props.form.marca || ''} ${props.form.modelo || ''}`.trim())
const resumenEstado = computed(() => props.ingreso?.fecha_egreso ? 'Egreso registrado' : 'Ingreso activo')

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

const onSave = () => {
  emit('save')
}

const onSaveAndPrint = () => {
  emit('save-and-print')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4">
      <div class="mx-auto flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-none border border-white/10 bg-[#0f172a]/96 text-white shadow-2xl shadow-slate-950/60 sm:h-[95dvh] sm:rounded-[2rem]">
        <div class="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              Ficha de trabajo
            </div>
            <h2 class="mt-3 text-2xl font-black text-white sm:text-3xl">
              {{ ingreso ? `Editar ficha #${ingreso.id}` : 'Nueva ficha' }}
            </h2>
            <p class="mt-1 text-sm text-slate-400">Formulario simple, cargado desde la reserva y listo para imprimir.</p>
          </div>
          <button @click="emit('close')" class="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 hover:bg-white/5">Cerrar</button>
        </div>

        <div class="border-b border-white/10 px-4 py-4 sm:px-6">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Cliente</div>
              <div class="mt-1 text-sm font-semibold text-white">{{ resumenCliente }}</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Moto</div>
              <div class="mt-1 text-sm font-semibold text-white">{{ resumenVehiculo }}</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Estado</div>
              <div class="mt-1 text-sm font-semibold text-white">{{ resumenEstado }}</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Sección</div>
              <div class="mt-1 text-sm font-semibold text-white">{{ activeSection === 'egreso' ? 'Egreso' : 'Ingreso' }}</div>
            </div>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <section class="space-y-5 rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-4 sm:p-5">
            <div class="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div class="space-y-5">
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Datos básicos</div>
                  <div class="mt-3 grid gap-4 sm:grid-cols-2">
                    <label class="space-y-2 sm:col-span-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Ingreso</span><input v-model="form.fecha_ingreso" type="date" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                    <label class="space-y-2 sm:col-span-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Salida / egreso</span><input v-model="form.fecha_salida" type="date" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                    <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Cliente</span><input :value="props.cliente?.nombre || ''" type="text" readonly class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200 outline-none" /></label>
                    <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Cédula</span><input :value="props.cliente?.cedula || ''" type="text" readonly class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200 outline-none" /></label>
                    <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Teléfono</span><input :value="props.cliente?.telefono || ''" type="text" readonly class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200 outline-none" /></label>
                    <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Localidad</span><input :value="props.cliente?.localidad || ''" type="text" readonly class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200 outline-none" /></label>
                  </div>
                </div>

                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Moto</div>
                  <div class="mt-3 space-y-4">
                    <select
                      :value="form.vehiculo_id ?? ''"
                      @change="onVehiculoChange(($event.target as HTMLSelectElement).value)"
                      class="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="">Seleccionar moto</option>
                      <option v-for="vehiculo in vehiculos" :key="vehiculo.id" :value="vehiculo.id">
                        {{ formatearTextoVehiculo(vehiculo) }}
                      </option>
                    </select>

                    <div class="grid gap-4 sm:grid-cols-2">
                      <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Marca</span><input v-model="form.marca" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                      <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Modelo</span><input v-model="form.modelo" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                      <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Color</span><input v-model="form.color" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                      <label class="space-y-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Matrícula</span><input v-model="form.matricula" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                      <label class="space-y-2 sm:col-span-2"><span class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Número de motor</span><input v-model="form.numero_motor" type="text" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
                    </div>
                  </div>
                </div>

                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Historia</div>
                  <textarea
                    v-model="form.historia"
                    rows="4"
                    class="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
                    placeholder="Se completa automáticamente desde la reserva"
                  ></textarea>
                </div>
              </div>

              <div class="space-y-5">
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Observaciones</div>
                  <div class="mt-3 grid gap-4">
                    <textarea v-model="form.comentarios" rows="7" class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Espacio libre para observaciones"></textarea>
                    <textarea v-model="form.observaciones" rows="7" class="w-full rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-4 py-3 text-white outline-none" placeholder="Espacio libre para imprimir"></textarea>
                  </div>
                </div>

                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Firmas</div>
                  <div class="mt-3 grid gap-4 sm:grid-cols-2">
                    <div class="rounded-2xl border border-dashed border-white/20 bg-slate-900/40 px-4 py-10 text-center text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                      Firma del prestador
                    </div>
                    <div class="rounded-2xl border border-dashed border-white/20 bg-slate-900/40 px-4 py-10 text-center text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                      Firma del cliente
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="border-t border-white/10 bg-slate-950/95 px-4 py-4 sm:px-6">
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button @click="emit('close')" class="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-300 hover:bg-white/5">Cancelar</button>
            <button v-if="allowPrint" @click="onSaveAndPrint" class="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-cyan-100 hover:bg-cyan-400/15">Guardar e imprimir</button>
            <button @click="onSave" class="rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-500/20">
              {{ activeSection === 'egreso' ? 'Registrar egreso' : 'Guardar ingreso' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>