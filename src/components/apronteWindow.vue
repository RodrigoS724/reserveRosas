<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api } from '../api'

const printLogoUrl = new URL('../assets/logo.png', import.meta.url).href

const props = defineProps<{
  apronte: any | null
}>()

const emit = defineEmits(['cerrar', 'actualizar'])

const editable = ref<any | null>(null)
const horarios = ref<any[]>([])
const marcas = ref<string[]>([])
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

const cargarMarcas = async () => {
  try {
    const data = await api.obtenerMarcasMoto()
    marcas.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[ApronteWindow] Error cargando marcas:', error)
    marcas.value = []
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
    cargarMarcas()
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
  const escapeText = (v: any) => escapeHtml(v || '')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>CONSTANCIA DE ENTREGA DE MOTOS</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #000; line-height: 1.4; }
      .page { width: 210mm; height: 297mm; padding: 15mm; margin: 0 auto; background: white; }
      .header { text-align: center; margin-bottom: 20px; display: flex; align-items: center; gap: 15px; }
      .logo-box { width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
      .logo-box img { width: 100%; height: 100%; object-fit: contain; }
      .header-content { flex: 1; }
      .header-title { font-size: 14px; font-weight: bold; border: 2px solid #000; padding: 8px; }
      .section { margin-bottom: 15px; }
      .section-title { font-size: 10px; font-weight: bold; border: 1px solid #000; padding: 4px 6px; background: #f0f0f0; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      td { border: 1px solid #000; padding: 6px; }
      .label { font-weight: bold; width: 35%; background: #f9f9f9; }
      .value { vertical-align: top; word-break: break-word; }
      .row { display: table; width: 100%; margin-bottom: 8px; }
      .col { display: table-cell; border: 1px solid #000; padding: 6px; vertical-align: top; }
      .col-label { background: #f9f9f9; font-weight: bold; width: 50%; font-size: 10px; }
      .col-value { width: 50%; font-size: 10px; }
      .description-table td { height: 20px; text-align: center; font-size: 9px; }
      .signature-section { margin-top: 20px; display: flex; justify-content: space-around; }
      .signature-box { text-align: center; border-top: 1px solid #000; width: 28%; font-size: 9px; padding-top: 30px; }
      .observaciones { border: 1px solid #000; padding: 8px; min-height: 80px; font-size: 10px; white-space: pre-wrap; word-wrap: break-word; }
      @media print {
        body { margin: 0; padding: 0; }
        .page { margin: 0; box-shadow: none; }
      }
    </style>
  </head>
  <body onload="window.focus();window.print();">
    <div class="page">
      <!-- HEADER -->
      <div class="header">
        <div class="logo-box"><img src="${printLogoUrl}" alt="Logo" /></div>
        <div class="header-content">
          <div class="header-title">CONSTANCIA DE ENTREGA DE MOTOS</div>
        </div>
      </div>

      <!-- DATOS DEL TITULAR -->
      <div class="section">
        <div class="section-title">DATOS DEL TITULAR DE LA MOTO</div>
        <table>
          <tr>
            <td class="label">NOMBRE</td>
            <td class="value">${escapeText(data.nombre)}</td>
          </tr>
          <tr>
            <td class="label">TELEFONO</td>
            <td class="value">${escapeText(data.telefono)}</td>
          </tr>
                    <tr>
            <td class="label">LOCALIDAD</td>
            <td class="value">${escapeText(data.localidad)}</td>
          </tr>
        </table>
      </div>

      <!-- DATOS DE LA MOTO -->
      <div class="section">
        <div class="section-title">DATOS DE LA MOTO</div>
        <table>
          <tr>
            <td class="label">MARCA</td>
            <td class="value">${escapeText(data.marca)}</td>
          </tr>
          <tr>
            <td class="label">MODELO</td>
            <td class="value">${escapeText(data.modelo)}</td>
          </tr>
          <tr>
            <td class="label">N° FACTURA DE COMPRA</td>
            <td class="value">${escapeText(data.factura)}</td>
          </tr>
          <tr>
            <td class="label">FECHA DE APRONTE</td>
            <td class="value">${escapeText(data.fecha)} : ${escapeText(data.hora)}</td>
          </tr>
        </table>
      </div>

      <!-- DESCRIPCION -->
      <div class="section">
        <div class="section-title">DESCRIPCIÓN DEL ESTADO DE LA MOTO</div>
        <table class="description-table">
          <tr>
            <td style="width: 40%; text-align: left; font-weight: bold;">CONCEPTO</td>
            <td style="width: 15%; font-weight: bold;">SI</td>
            <td style="width: 15%; font-weight: bold;">NO</td>
            <td style="width: 30%; text-align: left; font-weight: bold;">OBSERVACIONES</td>
          </tr>
          <tr>
            <td style="text-align: left;">HERRAMIENTAS</td>
            <td>☐</td>
            <td>☐</td>
            <td></td>
          </tr>
          <tr>
            <td style="text-align: left;">MANUAL DEL PRODUCTO</td>
            <td>☐</td>
            <td>☐</td>
            <td></td>
          </tr>
          <tr>
            <td style="text-align: left;">LUCES</td>
            <td>☐</td>
            <td>☐</td>
            <td></td>
          </tr>
          <tr>
            <td style="text-align: left;">SEÑALEROS</td>
            <td>☐</td>
            <td>☐</td>
            <td></td>
          </tr>
          <tr>
            <td style="text-align: left;">RAYAS</td>
            <td>☐</td>
            <td>☐</td>
            <td></td>
          </tr>
                    <tr>
            <td style="text-align: left;">ROTURAS DE PARTES</td>
            <td>☐</td>
            <td>☐</td>
            <td></td>
          </tr>
                              <tr>
            <td style="text-align: left;">CONDICION DE GARANTIA</td>
            <td>☐</td>
            <td>☐</td>
            <td></td>
          </tr>
                                        <tr>
            <td style="text-align: left;">FICHA DE SERVICE</td>
            <td>☐</td>
            <td>☐</td>
            <td></td>
          </tr>
                                        <tr>
            <td style="text-align: left;">CORRECTO USO DE BATERIAS</td>
            <td>☐</td>
            <td>☐</td>
            <td></td>
          </tr>
        </table>
      </div>

      <!-- OBSERVACIONES -->
      <div class="section">
        <div class="section-title">OBSERVACIONES ADICIONALES</div>
        <div class="observaciones">${escapeText(data.observaciones)}</div>
      </div>

      <!-- DATOS DE RECEPCION -->
      <div class="section">
        <div class="section-title">PERSONA QUE RECIBE LA MOTO</div>
        <table>
          <tr>
            <td class="label">NOMBRE</td>
            <td class="value">________________</td>
          </tr>
          <tr>
            <td class="label">TELEFONO</td>
            <td class="value">________________</td>
          </tr>
          <tr>
            <td class="label">FECHA</td>
            <td class="value">________________</td>
          </tr>
        </table>
      </div>

      <!-- FIRMAS -->
      <div class="signature-section">
        <div class="signature-box">
          ___________________<br>Firma Quien Retira
        </div>
        <div class="signature-box">
          ___________________<br>Firma Por Rosas UV
        </div>
      </div>
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
          <input v-model="editable.marca" list="apronte-marcas" />
          <datalist id="apronte-marcas">
            <option v-for="m in marcas" :key="m" :value="m"></option>
          </datalist>
        </div>

        <div class="campo">
          <label>Modelo</label>
          <input v-model="editable.modelo" readonly class="read-only-input" />
        </div>

        <div class="campo">
          <label>Factura</label>
          <input v-model="editable.factura" readonly class="read-only-input" />
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

.read-only-input {
  opacity: 0.7;
  cursor: not-allowed;
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
