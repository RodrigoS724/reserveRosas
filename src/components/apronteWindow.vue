<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api } from '../api'

const props = defineProps<{
  apronte: any | null
}>()

const emit = defineEmits(['cerrar', 'actualizar'])

const editable = ref<any | null>(null)
const horarios = ref<any[]>([])
const guardando = ref(false)
const status = ref('')
const statusOk = ref(true)

const cerrar = () => {
  emit('cerrar')
}

const cargarHorarios = async (fecha: string) => {
  if (!fecha) {
    horarios.value = []
    return
  }
  try {
    const data = await api.obtenerHorariosAprontesDisponibles(fecha)
    horarios.value = data || []
  } catch (error) {
    console.error('[ApronteWindow] Error cargando horarios:', error)
    horarios.value = []
  }
}

watch(
  () => props.apronte,
  (nueva) => {
    if (!nueva) {
      editable.value = null
      return
    }
    editable.value = {
      id: nueva.id,
      nombre: String(nueva.nombre || ''),
      fecha: String(nueva.fecha || ''),
      hora: String(nueva.hora || ''),
      telefono: String(nueva.telefono || ''),
      localidad: String(nueva.localidad || ''),
      observaciones: String(nueva.observaciones || ''),
      marca: String(nueva.marca || ''),
      modelo: String(nueva.modelo || ''),
      factura: String(nueva.factura || ''),
      created_at: String(nueva.created_at || '')
    }
    status.value = ''
    statusOk.value = true
    cargarHorarios(editable.value.fecha)
  },
  { immediate: true }
)

watch(
  () => editable.value?.fecha,
  (fecha) => {
    if (fecha) cargarHorarios(fecha)
  }
)

const horariosSelect = computed(() => {
  const current = String(editable.value?.hora || '')
  const list = (horarios.value || []).map((h) => ({
    ...h,
    disabled: h.disponibles <= 0 && h.hora !== current
  }))
  if (current && !list.some((h) => h.hora === current)) {
    list.unshift({ id: -1, hora: current, cupo: 0, usados: 0, disponibles: 1, disabled: false })
  }
  return list
})

const validarForm = () => {
  const required = ['nombre', 'fecha', 'hora', 'telefono', 'localidad', 'marca', 'modelo', 'factura']
  for (const key of required) {
    const value = String(editable.value?.[key] || '').trim()
    if (!value) {
      throw new Error(`Campo requerido: ${key}`)
    }
  }
}

const guardar = async () => {
  if (!editable.value) return
  guardando.value = true
  status.value = 'Guardando...'
  statusOk.value = true
  try {
    validarForm()
    const payload = {
      id: editable.value.id,
      nombre: String(editable.value.nombre || '').trim(),
      fecha: String(editable.value.fecha || '').trim(),
      hora: String(editable.value.hora || '').trim(),
      telefono: String(editable.value.telefono || '').trim(),
      localidad: String(editable.value.localidad || '').trim(),
      observaciones: String(editable.value.observaciones || '').trim(),
      marca: String(editable.value.marca || '').trim(),
      modelo: String(editable.value.modelo || '').trim(),
      factura: String(editable.value.factura || '').trim()
    }
    await api.actualizarApronte(payload)
    status.value = 'Apronte actualizado.'
    statusOk.value = true
    emit('actualizar')
    cerrar()
  } catch (error: any) {
    status.value = error?.message || 'Error al guardar'
    statusOk.value = false
  } finally {
    guardando.value = false
  }
}

const eliminar = async () => {
  if (!editable.value?.id) return
  const ok = window.confirm('Eliminar este apronte?')
  if (!ok) return
  guardando.value = true
  status.value = 'Eliminando...'
  statusOk.value = true
  try {
    await api.borrarApronte(editable.value.id)
    status.value = 'Apronte eliminado.'
    statusOk.value = true
    emit('actualizar')
    cerrar()
  } catch (error: any) {
    status.value = error?.message || 'Error al eliminar'
    statusOk.value = false
  } finally {
    guardando.value = false
  }
}

const escapeHtml = (value: any) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const buildPrintHtml = (data: any) => {
  const rows = [
    ['Nombre', data.nombre],
    ['Fecha', data.fecha],
    ['Hora', data.hora],
    ['Telefono', data.telefono],
    ['Localidad', data.localidad],
    ['Marca', data.marca],
    ['Modelo', data.modelo],
    ['Factura', data.factura],
    ['Observaciones', data.observaciones]
  ]
  const rowsHtml = rows
    .map(([label, value]) => {
      const safeValue = escapeHtml(value)
      return `<tr><td class="label">${label}</td><td class="value">${safeValue || '-'}</td></tr>`
    })
    .join('')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Apronte</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
      .sheet { border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; }
      .title { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
      .subtitle { font-size: 12px; color: #64748b; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
      td.label { width: 160px; font-weight: 700; text-transform: uppercase; font-size: 11px; color: #64748b; }
      td.value { font-size: 13px; }
      @media print {
        body { margin: 0; }
        .sheet { border: none; }
      }
    </style>
  </head>
  <body onload="window.focus();window.print();">
    <div class="sheet">
      <div class="title">Apronte</div>
      <div class="subtitle">Reserva de apronte - imprimible</div>
      <table>
        ${rowsHtml}
      </table>
    </div>
  </body>
</html>`
}

const imprimirPdf = () => {
  if (!editable.value) return
  const html = buildPrintHtml(editable.value)
  const win = window.open('', '_blank', 'width=900,height=1100')
  if (!win) {
    alert('No se pudo abrir la ventana de impresion.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}
</script>

<template>
  <div v-if="editable" class="overlay" @click.self="cerrar">
    <div class="window">
      <div class="window-header">
        <div>
          <span class="titulo">Apronte #{{ editable.id }}</span>
          <div class="read-only">Detalle completo</div>
        </div>
        <button class="close-btn" @click="cerrar">x</button>
      </div>

      <div class="window-body">
        <div class="campo">
          <label>Nombre</label>
          <input v-model="editable.nombre" />
        </div>

        <div class="campo">
          <label>Fecha</label>
          <input v-model="editable.fecha" type="date" />
        </div>

        <div class="campo">
          <label>Horario</label>
          <select v-model="editable.hora">
            <option value="">Seleccionar horario...</option>
            <option v-for="h in horariosSelect" :key="h.id" :value="h.hora" :disabled="h.disabled">
              {{ h.hora }} hs ({{ h.disponibles }}/{{ h.cupo }})
            </option>
          </select>
        </div>

        <div class="campo">
          <label>Telefono</label>
          <input v-model="editable.telefono" type="tel" />
        </div>

        <div class="campo">
          <label>Localidad</label>
          <input v-model="editable.localidad" />
        </div>

        <div class="campo">
          <label>Marca</label>
          <input v-model="editable.marca" />
        </div>

        <div class="campo">
          <label>Modelo</label>
          <input v-model="editable.modelo" />
        </div>

        <div class="campo">
          <label>Factura</label>
          <input v-model="editable.factura" />
        </div>

        <div class="campo full">
          <label>Observaciones</label>
          <textarea v-model="editable.observaciones"></textarea>
        </div>
      </div>

      <div class="window-footer">
        <div :class="statusOk ? 'text-emerald-500 text-xs' : 'text-rose-500 text-xs'">{{ status }}</div>
        <div class="footer-actions">
          <button class="btn-sec" @click="imprimirPdf">Imprimir PDF</button>
          <button class="btn-eliminar" @click="eliminar">Eliminar</button>
          <button class="btn-guardar" :disabled="guardando" @click="guardar">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.64);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 110;
  padding: 18px;
}

.window {
  width: min(920px, 96vw);
  background: #020617;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  max-height: 88vh;
  overflow: hidden;
}

.window-header,
.window-footer {
  padding: 14px 18px;
  border-bottom: 1px solid #1e293b;
}

.window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.titulo {
  color: #e2e8f0;
  font-weight: 800;
}

.read-only {
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid #64748b;
  color: #cbd5e1;
  font-size: 0.72rem;
  font-weight: 700;
}

.close-btn {
  border: 1px solid #334155;
  background: #0f172a;
  color: #94a3b8;
  padding: 3px 9px;
  border-radius: 8px;
  cursor: pointer;
}

.window-footer {
  border-top: 1px solid #1e293b;
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.window-body {
  padding: 18px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 14px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.campo.full {
  grid-column: 1 / -1;
}

.campo label {
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.8rem;
}

.campo input,
.campo textarea,
.campo select {
  background: #0f172a;
  border: 1px solid #1e293b;
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.campo textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.footer-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-sec {
  border: 1px solid #475569;
  background: transparent;
  color: #94a3b8;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
  font-weight: 700;
}

.btn-sec:hover {
  background: #1e293b;
  border-color: #64748b;
}

.btn-guardar {
  background: #3b82f6;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
  border: none;
}

.btn-guardar:hover {
  background: #2563eb;
}

.btn-eliminar {
  background: #ef4444;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
  border: none;
}

.btn-eliminar:hover {
  background: #dc2626;
}

@media (max-width: 760px) {
  .window {
    width: 96vw;
  }

  .window-body {
    grid-template-columns: 1fr;
  }
}
</style>
