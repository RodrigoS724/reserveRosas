<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { api } from '../api'

type ClienteSugerido = {
  id: number
  cedula?: string | null
  nombre?: string | null
  telefono?: string | null
  localidad?: string | null
}

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  disabled?: boolean
  minDigits?: number
  inputClass?: string
}>(), {
  label: 'Cedula',
  placeholder: 'Ingrese CI...',
  disabled: false,
  minDigits: 3,
  inputClass: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [cliente: ClienteSugerido]
}>()

const sugerencias = ref<ClienteSugerido[]>([])
const cargando = ref(false)
const mostrarLista = ref(false)
let debounceTimer: number | null = null

const normalizarCedula = (value: string) => String(value || '').replace(/\D/g, '')
const formatearCedula = (value: string) => {
  let limpio = normalizarCedula(value)
  if (limpio.length > 8) limpio = limpio.slice(0, 8)
  if (limpio.length > 7) return limpio.replace(/^(\d)(\d{3})(\d{3})(\d{1})$/, '$1.$2.$3-$4')
  if (limpio.length > 6) return limpio.replace(/^(\d{1,2})(\d{3})(\d{3})(\d{1})$/, '$1.$2.$3-$4')
  return limpio
}

const query = computed(() => normalizarCedula(props.modelValue))

const limpiarTimer = () => {
  if (debounceTimer) {
    window.clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

const cargarSugerencias = async (value: string) => {
  const filtro = normalizarCedula(value)
  if (filtro.length < props.minDigits || props.disabled) {
    sugerencias.value = []
    return
  }

  cargando.value = true
  try {
    const data = await api.obtenerClientes(filtro)
    const lista = Array.isArray(data) ? data : []
    sugerencias.value = lista.slice(0, 6)
  } catch {
    sugerencias.value = []
  } finally {
    cargando.value = false
  }
}

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const limpio = normalizarCedula(target?.value || '')
  emit('update:modelValue', limpio)
  mostrarLista.value = true
}

const seleccionar = (cliente: ClienteSugerido) => {
  const cedula = normalizarCedula(String(cliente.cedula || ''))
  emit('update:modelValue', cedula)
  emit('select', cliente)
  sugerencias.value = []
  mostrarLista.value = false
}

const cerrarListaConDelay = () => {
  setTimeout(() => {
    mostrarLista.value = false
  }, 150)
}

watch(query, (value) => {
  limpiarTimer()
  debounceTimer = window.setTimeout(() => {
    void cargarSugerencias(value)
  }, 220)
}, { immediate: true })

watch(() => props.modelValue, () => {
  if (!props.modelValue) {
    sugerencias.value = []
    mostrarLista.value = false
  }
})

onBeforeUnmount(() => {
  limpiarTimer()
})
</script>

<template>
  <div class="relative">
    <label class="space-y-2 block">
      <span v-if="label" class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{{ label }}</span>
      <input
        :value="props.modelValue"
        @input="onInput"
        @focus="mostrarLista = true"
        @blur="cerrarListaConDelay"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="['w-full rounded-2xl border px-4 py-3 outline-none transition', inputClass || 'border-white/10 bg-white/5 text-white focus:border-cyan-400/40']"
      />
    </label>

    <div v-if="mostrarLista && (cargando || sugerencias.length > 0)" class="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-slate-950/50">
      <div v-if="cargando" class="px-4 py-3 text-sm text-slate-400">Buscando clientes...</div>
      <button
        v-for="cliente in sugerencias"
        :key="cliente.id"
        type="button"
        @mousedown.prevent="seleccionar(cliente)"
        class="flex w-full flex-col gap-1 border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-white/5"
      >
        <div class="text-sm font-semibold text-white">{{ cliente.nombre || 'Sin nombre' }}</div>
        <div class="text-xs text-slate-400">CI {{ formatearCedula(String(cliente.cedula || '')) }}<span v-if="cliente.telefono"> · {{ cliente.telefono }}</span></div>
      </button>
    </div>
  </div>
</template>
