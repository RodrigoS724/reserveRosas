<script setup lang="ts">
import { ref, watch } from 'vue'
import { canApproveApronte, canEditApronteCompleto, getSession, isTallerRole } from '../auth'
import { api } from '../api'
import ApronteSchedulePicker from './ApronteSchedulePicker.vue'

const printLogoUrl = new URL('../assets/logo.png', import.meta.url).href

const props = defineProps<{
  apronte: any | null
}>()

const emit = defineEmits(['cerrar', 'actualizar'])

const editable = ref<any | null>(null)
const marcas = ref<string[]>([])
const guardando = ref(false)
const status = ref('')
const statusOk = ref(true)
const session = getSession()
const puedeEditarTodo = canEditApronteCompleto(session)
const puedeAprobarCaja = canApproveApronte(session)
const esTaller = isTallerRole(session)
const puedeEditarEstado = Boolean(session)

const normalizarMensajeError = (error: any, fallback: string) => {
  const msg = String(error?.message || fallback)
  if (msg.toLowerCase().includes('fechas de aprontes posteriores a hoy')) {
    return 'No se puede agendar con esa fecha/hora. Revisa las reglas de agenda de aprontes.'
  }
  return msg
}

const normalizarCatalogoTexto = (value: string) => {
  return String(value || '').trim().toLowerCase()
}

const cerrar = () => {
  emit('cerrar')
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
      numero_motor: String(nueva.numero_motor || ''),
      factura: String(nueva.factura || ''),
      estado: String(nueva.estado || 'APRONTE'),
      caja_aprobado: Boolean(Number(nueva.caja_aprobado ?? 1)),
      caja_aprobado_por: String(nueva.caja_aprobado_por || ''),
      created_by_username: String(nueva.created_by_username || ''),
      created_by_role: String(nueva.created_by_role || ''),
      created_at: String(nueva.created_at || '')
    }
    status.value = ''
    statusOk.value = true
    cargarMarcas()
  },
  { immediate: true }
)

watch(
  () => [editable.value?.fecha, editable.value?.hora],
  () => {
    status.value = ''
  }
)

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
    if (!esTaller) {
      validarForm()
    }
    const payload = esTaller
      ? {
          id: editable.value.id,
          estado: String(editable.value.estado || 'APRONTE').trim().toUpperCase()
        }
      : {
          id: editable.value.id,
          nombre: String(editable.value.nombre || '').trim(),
          fecha: String(editable.value.fecha || '').trim(),
          hora: String(editable.value.hora || '').trim(),
          telefono: String(editable.value.telefono || '').trim(),
          localidad: String(editable.value.localidad || '').trim(),
          observaciones: String(editable.value.observaciones || '').trim(),
          marca: normalizarCatalogoTexto(String(editable.value.marca || '')),
          modelo: normalizarCatalogoTexto(String(editable.value.modelo || '')),
          numero_motor: String(editable.value.numero_motor || '').trim(),
          factura: String(editable.value.factura || '').trim(),
          estado: String(editable.value.estado || 'APRONTE').trim().toUpperCase(),
          ...(puedeAprobarCaja ? { caja_aprobado: Boolean(editable.value.caja_aprobado) } : {})
        }
    await api.actualizarApronte(payload)
    status.value = 'Apronte actualizado.'
    statusOk.value = true
    emit('actualizar')
    cerrar()
  } catch (error: any) {
    status.value = normalizarMensajeError(error, 'Error al guardar')
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
    await api.borrarApronte(Number(editable.value.id))
    status.value = 'Apronte eliminado.'
    statusOk.value = true
    emit('actualizar')
    cerrar()
  } catch (error: any) {
    status.value = normalizarMensajeError(error, 'Error al eliminar')
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
  const nroConstancia = Number(data?.id || 0)
  const nroConstanciaFmt = nroConstancia > 0 ? String(nroConstancia).padStart(5, '0') : '00000'

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>CONSTANCIA DE ENTREGA DE MOTOS</title>
    <style>
      @page { size: A4; margin: 6mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #000; line-height: 1.28; background: white; }
      .page { width: 100%; min-height: 285mm; padding: 4mm 5mm 5mm; margin: 0 auto; background: white; }
      .header { text-align: center; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
      .logo-box { width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
      .logo-box img { width: 100%; height: 100%; object-fit: contain; }
      .header-content { flex: 1; }
      .header-title {
        font-size: 16px;
        font-weight: 700;
        border: 2px solid #000;
        padding: 10px 12px;
        letter-spacing: 0.02em;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .header-title-text { flex: 1; text-align: center; }
      .constancia-id { font-size: 14px; font-weight: 800; min-width: 64px; text-align: right; }
      .section { margin-bottom: 9px; }
      .section-title { font-size: 11px; font-weight: 700; border: 1px solid #000; padding: 5px 7px; background: #f0f0f0; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      td { border: 1px solid #000; padding: 7px 8px; }
      .label { font-weight: bold; width: 35%; background: #f9f9f9; }
      .value { vertical-align: top; word-break: break-word; }
      .description-table td { height: 22px; text-align: center; font-size: 10px; padding: 6px; }
      .signature-section { margin-top: 12px; display: flex; justify-content: space-around; gap: 14px; }
      .signature-box { text-align: center; border-top: 1px solid #000; width: 32%; font-size: 10px; padding-top: 24px; }
      .observaciones { border: 1px solid #000; padding: 8px; min-height: 74px; font-size: 11px; white-space: pre-wrap; word-wrap: break-word; }
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
          <div class="header-title">
            <span class="header-title-text">CONSTANCIA DE ENTREGA DE MOTOS</span>
            <span class="constancia-id">N° ${escapeText(nroConstanciaFmt)}</span>
          </div>
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
            <td class="label">N° MOTOR</td>
            <td class="value">${escapeText(data.numero_motor)}</td>
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
          <div class="read-only">{{ esTaller ? 'Taller: solo puede modificar estado' : 'Detalle completo' }}</div>
        </div>
        <button class="close-btn" @click="cerrar">x</button>
      </div>

      <div class="window-body">
        <div class="campo">
          <label>Nombre</label>
          <input v-model="editable.nombre" :disabled="esTaller" />
        </div>

        <ApronteSchedulePicker
          v-model:fecha="editable.fecha"
          v-model:hora="editable.hora"
          label="Agenda de apronte"
          :disabled="esTaller"
        />

        <div class="campo">
          <label>Telefono</label>
          <input v-model="editable.telefono" type="tel" :disabled="esTaller" />
        </div>

        <div class="campo">
          <label>Localidad</label>
          <input v-model="editable.localidad" :disabled="esTaller" />
        </div>

        <div class="campo">
          <label>Marca</label>
          <input v-model="editable.marca" list="apronte-marcas" :disabled="esTaller" />
          <datalist id="apronte-marcas">
            <option v-for="m in marcas" :key="m" :value="m"></option>
          </datalist>
        </div>

        <div class="campo">
          <label>Modelo</label>
          <input v-model="editable.modelo" readonly class="read-only-input" />
        </div>

        <div class="campo">
          <label>Numero de motor</label>
          <input v-model="editable.numero_motor" :disabled="esTaller" />
        </div>

        <div class="campo">
          <label>Factura</label>
          <input v-model="editable.factura" readonly class="read-only-input" />
        </div>

        <div class="campo full">
          <label>Observaciones</label>
          <textarea v-model="editable.observaciones" :disabled="esTaller"></textarea>
        </div>

        <div class="campo">
          <label>Estado</label>
          <select v-model="editable.estado">
            <option value="APRONTE">APRONTE</option>
            <option value="ENTREGADA">ENTREGADA</option>
            <option value="ENTREGADA ESPERA DE GARANTIA">ENTREGADA ESPERA DE GARANTIA</option>
          </select>
        </div>

        <div class="campo full">
          <label>Habilitado por caja</label>
          <div class="read-only" style="width: fit-content;">
            Creado por: {{ editable.created_by_username || '-' }}
          </div>
          <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <input v-model="editable.caja_aprobado" type="checkbox" :disabled="!puedeAprobarCaja" />
            <span>{{ editable.caja_aprobado ? 'Aprobado' : 'Pendiente de caja' }}</span>
          </label>
        </div>
      </div>

      <div class="window-footer">
        <div :class="statusOk ? 'text-emerald-500 text-xs' : 'text-rose-500 text-xs'">{{ status }}</div>
        <div class="footer-actions">
          <button class="btn-sec" @click="imprimirPdf">Imprimir PDF</button>
          <button v-if="puedeEditarTodo && !esTaller" class="btn-eliminar" @click="eliminar">Eliminar</button>
          <button v-if="puedeEditarEstado" class="btn-guardar" :disabled="guardando" @click="guardar">
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
