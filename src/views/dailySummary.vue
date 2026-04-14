<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ReservaWindow from '../components/reservaWindow.vue'
import { api } from '../api'

const fecha = ref(new Date().toISOString().split('T')[0])
const cargando = ref(false)
const reservas = ref<any[]>([])
const mostrarVentana = ref(false)
const reservaActiva = ref<any>(null)

const resumenGuardando = ref(false)
const resumenEnviando = ref(false)
let onRealtimeSyncRef: ((event: Event) => void) | null = null
const resumenConfig = ref({
  enabled: false,
  sendTime: '07:30',
  recipientsText: '',
  lastSentDate: ''
})

const normalizarEstadoKey = (estado: any) => {
  return String(estado || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
}

const cargarResumen = async () => {
  if (!fecha.value) return
  cargando.value = true
  try {
    const data = await api.obtenerReservasDia({ fecha: fecha.value })
    const lista = Array.isArray(data) ? data : []
    reservas.value = lista.filter((r: any) => {
      const estado = normalizarEstadoKey(r?.estado)
      return estado !== 'cancelada' && estado !== 'cancelado'
    })
  } catch (error) {
    console.error('[ResumenDiario] Error cargando reservas:', error)
    reservas.value = []
  } finally {
    cargando.value = false
  }
}

const cargarConfigResumenDiario = async () => {
  try {
    const cfg = await api.obtenerConfigResumenDiario()
    resumenConfig.value = {
      enabled: Boolean(cfg?.enabled),
      sendTime: cfg?.sendTime || '07:30',
      recipientsText: Array.isArray(cfg?.recipients) ? cfg.recipients.join(', ') : '',
      lastSentDate: cfg?.lastSentDate || ''
    }
  } catch (error) {
    console.error('[ResumenDiario] Error cargando config:', error)
  }
}

const parseRecipientsText = (text: string) => {
  return String(text || '')
    .split(/[,\n;]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

const guardarConfigResumenDiario = async () => {
  resumenGuardando.value = true
  try {
    const recipients = parseRecipientsText(resumenConfig.value.recipientsText)
    const cfg = await api.guardarConfigResumenDiario({
      enabled: resumenConfig.value.enabled,
      sendTime: resumenConfig.value.sendTime,
      recipients
    })
    resumenConfig.value = {
      enabled: Boolean(cfg?.enabled),
      sendTime: cfg?.sendTime || '07:30',
      recipientsText: Array.isArray(cfg?.recipients) ? cfg.recipients.join(', ') : '',
      lastSentDate: cfg?.lastSentDate || ''
    }
    window.dispatchEvent(new CustomEvent('ui:notify', {
      detail: { message: 'Configuracion de resumen diario guardada', variant: 'success' }
    }))
  } catch (error: any) {
    console.error('[ResumenDiario] Error guardando config:', error)
    window.dispatchEvent(new CustomEvent('ui:notify', {
      detail: { message: `No se pudo guardar la configuracion: ${error?.message || 'Error'}`, variant: 'info' }
    }))
  } finally {
    resumenGuardando.value = false
  }
}

const enviarResumenDiarioAhora = async () => {
  resumenEnviando.value = true
  try {
    const result = await api.enviarResumenDiario({ fecha: fecha.value })
    if (!result?.ok) {
      throw new Error(result?.reason || 'No se pudo enviar')
    }
    await cargarConfigResumenDiario()
    window.dispatchEvent(new CustomEvent('ui:notify', {
      detail: { message: `Resumen enviado (${result.count || 0} reservas)`, variant: 'success' }
    }))
  } catch (error: any) {
    console.error('[ResumenDiario] Error enviando resumen:', error)
    window.dispatchEvent(new CustomEvent('ui:notify', {
      detail: { message: `Fallo envio de resumen: ${error?.message || 'Error'}`, variant: 'info' }
    }))
  } finally {
    resumenEnviando.value = false
  }
}

const abrirDetalle = (reserva: any) => {
  reservaActiva.value = { ...reserva }
  mostrarVentana.value = true
}

const cerrarDetalle = async () => {
  mostrarVentana.value = false
  await cargarResumen()
}

const obtenerTipoResumen = (reserva: any) => {
  if (reserva.tipo_turno === 'Garantía') {
    return `Garantía${reserva.garantia_tipo ? ` - ${reserva.garantia_tipo}` : ''}`
  }
  if (reserva.tipo_turno === 'Particular') {
    return `Particular${reserva.particular_tipo ? ` - ${reserva.particular_tipo}` : ''}`
  }
  return reserva.tipo_turno || ''
}

watch(fecha, () => {
  cargarResumen()
})

onMounted(async () => {
  await cargarResumen()
  await cargarConfigResumenDiario()

  onRealtimeSyncRef = (event: Event) => {
    const detail = (event as CustomEvent).detail || {}
    const scope = String(detail?.scope || '')
    if (scope !== 'reservas') return
    void cargarResumen()
  }
  window.addEventListener('rr:sync', onRealtimeSyncRef as EventListener)
})

onBeforeUnmount(() => {
  if (onRealtimeSyncRef) {
    window.removeEventListener('rr:sync', onRealtimeSyncRef as EventListener)
    onRealtimeSyncRef = null
  }
})
</script>

<template>
  <div class="h-screen w-full overflow-auto bg-gray-50 dark:bg-[#0f172a] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8">
    <div class="max-w-7xl mx-auto">
      <header class="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-gray-800 dark:text-gray-100">
            Resumen diario
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Click en una reserva para ver todos los detalles
          </p>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400">Fecha</label>
          <input
            v-model="fecha"
            type="date"
            class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold"
          />
        </div>
      </header>

      <section class="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-6">
        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b]/60 p-4 sm:p-5 md:p-6 shadow-sm">
          <h3 class="text-sm sm:text-base md:text-lg font-black tracking-tight text-gray-800 dark:text-gray-100 mb-4">
            Envio automatico por correo
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <label class="flex items-center gap-2 text-xs font-bold">
              <input v-model="resumenConfig.enabled" type="checkbox" />
              Activar envio diario
            </label>
            <label class="text-xs font-bold">
              Hora de envio
              <input
                v-model="resumenConfig.sendTime"
                type="time"
                class="mt-1 w-full bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs"
              />
            </label>
          </div>

          <label class="block text-xs font-bold mb-1">Correos (separados por coma, punto y coma o salto de linea)</label>
          <textarea
            v-model="resumenConfig.recipientsText"
            rows="3"
            placeholder="correo1@dominio.com, correo2@dominio.com"
            class="w-full bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs"
          ></textarea>

          <div class="text-[10px] sm:text-xs text-gray-500 mt-2">
            Ultimo envio automatico: {{ resumenConfig.lastSentDate || 'Sin envios' }}
          </div>

          <div class="flex flex-wrap gap-2 mt-4">
            <button
              @click="guardarConfigResumenDiario"
              :disabled="resumenGuardando"
              class="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60"
            >
              {{ resumenGuardando ? 'Guardando...' : 'Guardar config' }}
            </button>
            <button
              @click="enviarResumenDiarioAhora"
              :disabled="resumenEnviando"
              class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60"
            >
              {{ resumenEnviando ? 'Enviando...' : 'Enviar ahora' }}
            </button>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b]/60 shadow-sm overflow-hidden">
        <div class="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div class="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300">
            Total: {{ reservas.length }} reservas
          </div>
          <div v-if="cargando" class="text-xs text-gray-500">Cargando...</div>
        </div>

        <div v-if="!cargando && reservas.length === 0" class="px-6 py-10 text-center text-sm text-gray-500">
          No hay reservas para esta fecha.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[900px]">
            <thead class="bg-gray-50 dark:bg-[#0f172a]/40">
              <tr>
                <th class="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-black">Hora</th>
                <th class="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-black">Cliente</th>
                <th class="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-black">Teléfono</th>
                <th class="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-black">Matrícula</th>
                <th class="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-black">Tipo</th>
                <th class="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-500 font-black">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="r in reservas"
                :key="r.id"
                @click="abrirDetalle(r)"
                class="cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-colors"
              >
                <td class="px-4 py-3 text-sm font-black text-cyan-700 dark:text-cyan-300">{{ r.hora }}</td>
                <td class="px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-100">{{ r.nombre }}</td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{{ r.telefono }}</td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{{ r.matricula }}</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ obtenerTipoResumen(r) }}</td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ r.estado || 'pendiente' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <ReservaWindow v-if="mostrarVentana" :reserva="reservaActiva" @cerrar="cerrarDetalle" @actualizar="cargarResumen" />
  </div>
</template>
