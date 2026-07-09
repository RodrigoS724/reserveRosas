<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { canEditReservaCompleta, getSession, isTallerRole } from '../auth'
import { api } from '../api'

const props = defineProps<{
  reserva: any | null
}>()

const emit = defineEmits(['cerrar', 'actualizar'])

const editable = ref<any | null>(null)
const mostrandoConfirmacion = ref(false)
const session = getSession()
const marcas = ref<string[]>([])
const modelos = ref<string[]>([])
const puedeEditarTodo = computed(() => canEditReservaCompleta(session))
const puedeEditarEstado = computed(() => Boolean(session))
const esTaller = computed(() => isTallerRole(session))

const normalizarMatricula = (value: string) => {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const normalizarTexto = (value: string) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const normalizarTipoTurno = (value: string) => {
  const v = normalizarTexto(value)
  if (v === 'particular') return 'Particular'
  if (v === 'garantia') return 'Garantia'
  if (v === 'toma de moto' || v === 'toma moto') return 'Toma de moto'
  return ''
}

const normalizarTipoGarantia = (value: string) => {
  const v = normalizarTexto(value)
  if (v === 'service') return 'Service'
  if (v === 'reparacion') return 'Reparacion'
  return ''
}

const limpiarFecha = (value: string) => {
  const v = String(value || '').trim()
  if (!v) return ''
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? v : ''
}

const esGarantia = computed(() => normalizarTipoTurno(editable.value?.tipo_turno) === 'Garantia')
const esParticular = computed(() => normalizarTipoTurno(editable.value?.tipo_turno) === 'Particular')
const esService = computed(() => normalizarTipoGarantia(editable.value?.garantia_tipo) === 'Service')
const esReparacion = computed(() => normalizarTipoGarantia(editable.value?.garantia_tipo) === 'Reparacion')

const cerrar = () => {
  mostrandoConfirmacion.value = false
  emit('cerrar')
}

const cargarMarcas = async () => {
  try {
    const data = await api.obtenerMarcasMoto()
    marcas.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[ReservaWindow] Error cargando marcas:', error)
    marcas.value = []
  }
}

const cargarModelos = async (marcaValue: string) => {
  try {
    const data = await api.obtenerModelosMoto(marcaValue)
    modelos.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[ReservaWindow] Error cargando modelos:', error)
    modelos.value = []
  }
}

watch(
  () => props.reserva,
  (nueva) => {
    mostrandoConfirmacion.value = false
    if (!nueva) {
      editable.value = null
      return
    }

    const tipoTurnoNormalizado = normalizarTipoTurno(nueva.tipo_turno)
    const tipoGarantiaNormalizado = normalizarTipoGarantia(nueva.garantia_tipo)

    editable.value = {
      ...nueva,
      nombre: String(nueva.nombre || ''),
      cedula: String(nueva.cedula || ''),
      telefono: String(nueva.telefono || ''),
      marca: String(nueva.marca || ''),
      modelo: String(nueva.modelo || ''),
      km: String(nueva.km || ''),
      matricula: String(nueva.matricula || ''),
      tipo_turno: tipoTurnoNormalizado || String(nueva.tipo_turno || ''),
      particular_tipo: String(nueva.particular_tipo || ''),
      garantia_tipo: tipoGarantiaNormalizado || String(nueva.garantia_tipo || ''),
      garantia_fecha_compra: limpiarFecha(nueva.garantia_fecha_compra),
      garantia_numero_service: String(nueva.garantia_numero_service || ''),
      garantia_problema: String(nueva.garantia_problema || '')
    }
    cargarMarcas()
    cargarModelos(String(nueva.marca || ''))
  },
  { immediate: true }
)

watch(
  () => editable.value?.marca,
  (marcaValue) => {
    if (marcaValue !== undefined) {
      cargarModelos(String(marcaValue || ''))
    }
  }
)

watch(
  () => editable.value?.tipo_turno,
  (tipo) => {
    if (!editable.value) return
    const normalizado = normalizarTipoTurno(tipo)
    if (normalizado && editable.value.tipo_turno !== normalizado) {
      editable.value.tipo_turno = normalizado
    }
    if (normalizado !== 'Garantia') {
      editable.value.garantia_tipo = ''
      editable.value.garantia_fecha_compra = ''
      editable.value.garantia_numero_service = ''
      editable.value.garantia_problema = ''
    }
  }
)

watch(
  () => editable.value?.garantia_tipo,
  (tipo) => {
    if (!editable.value) return
    const normalizado = normalizarTipoGarantia(tipo)
    if (normalizado && editable.value.garantia_tipo !== normalizado) {
      editable.value.garantia_tipo = normalizado
    }
    if (normalizado === 'Service') {
      editable.value.garantia_problema = ''
    } else if (normalizado === 'Reparacion') {
      editable.value.garantia_numero_service = ''
    }
  }
)

const guardar = async () => {
  if (!editable.value || !puedeEditarEstado.value) return
  if (!editable.value) return

  try {
    if (esTaller.value) {
      await api.actualizarEstadoReserva(editable.value.id, editable.value.estado)
    } else {
      editable.value.matricula = normalizarMatricula(editable.value.matricula).slice(0, 7)
      editable.value.tipo_turno = normalizarTipoTurno(editable.value.tipo_turno) || editable.value.tipo_turno
      editable.value.garantia_tipo = normalizarTipoGarantia(editable.value.garantia_tipo) || editable.value.garantia_tipo
      editable.value.garantia_fecha_compra = limpiarFecha(editable.value.garantia_fecha_compra)
      const reservaPlana = JSON.parse(JSON.stringify(editable.value))
      await api.actualizarReserva(reservaPlana)
    }
    emit('actualizar')
    cerrar()
  } catch (e) {
    console.error('Error al guardar reserva', e)
    alert(`No se pudo guardar la reserva: ${e instanceof Error ? e.message : 'Error desconocido'}`)
  }
}

const cancelarReserva = async () => {
  if (!puedeEditarTodo.value) return
  if (!editable.value) return

  try {
    await api.borrarReserva(editable.value.id)
    alert('Reserva cancelada exitosamente')
    emit('actualizar')
    cerrar()
  } catch (e) {
    console.error('Error al cancelar reserva', e)
    alert(`No se pudo cancelar la reserva: ${e instanceof Error ? e.message : 'Error desconocido'}`)
  }
}
</script>

<template>
  <div v-if="editable" class="overlay" @click.self="cerrar">
    <div class="window">
      <div class="window-header">
        <div>
          <span class="titulo">Reserva #{{ editable.id }}</span>
          <div v-if="esTaller" class="read-only">Taller: solo puede modificar estado</div>
          <div v-else-if="!puedeEditarTodo" class="read-only">Solo lectura</div>
        </div>
        <button class="close-btn" @click="cerrar">x</button>
      </div>

      <div class="window-body">
        <div class="campo">
          <label>Nombre</label>
          <input v-model="editable.nombre" :disabled="!puedeEditarTodo" />
        </div>

        <div class="campo">
          <label>Cedula</label>
          <input v-model="editable.cedula" :disabled="!puedeEditarTodo" />
        </div>

        <div class="campo">
          <label>Telefono</label>
          <input v-model="editable.telefono" type="tel" :disabled="!puedeEditarTodo" />
        </div>

        <div class="campo">
          <label>Marca</label>
          <input v-model="editable.marca" list="motos-marcas-reserva" :disabled="!puedeEditarTodo" />
          <datalist id="motos-marcas-reserva">
            <option v-for="m in marcas" :key="m" :value="m"></option>
          </datalist>
        </div>

        <div class="campo">
          <label>Modelo</label>
          <input v-model="editable.modelo" list="motos-modelos-reserva" :disabled="!puedeEditarTodo" />
          <datalist id="motos-modelos-reserva">
            <option v-for="m in modelos" :key="m" :value="m"></option>
          </datalist>
        </div>

        <div class="campo">
          <label>KM</label>
          <input v-model="editable.km" inputmode="numeric" :disabled="!puedeEditarTodo" />
        </div>

        <div class="campo">
          <label>Matricula</label>
          <input
            v-model="editable.matricula"
            @input="editable.matricula = normalizarMatricula(editable.matricula).slice(0, 7)"
            maxlength="7"
            placeholder="ABC1234"
            :disabled="!puedeEditarTodo"
          />
        </div>

        <div class="campo">
          <label>Tipo de Turno</label>
          <select v-model="editable.tipo_turno" :disabled="!puedeEditarTodo">
            <option value="">Seleccionar</option>
            <option value="Particular">Particular</option>
            <option value="Garantia">Garantia</option>
            <option value="Toma de moto">Toma de moto</option>
          </select>
        </div>

        <div v-if="esParticular" class="campo">
          <label>Tipo Particular</label>
          <select v-model="editable.particular_tipo" :disabled="!puedeEditarTodo">
            <option value="">Seleccionar</option>
            <option value="Service">Service</option>
            <option value="Taller">Taller</option>
          </select>
        </div>

        <div v-if="esGarantia" class="campo">
          <label>Servicio</label>
          <select v-model="editable.garantia_tipo" :disabled="!puedeEditarTodo">
            <option value="">Seleccionar</option>
            <option value="Service">Service</option>
            <option value="Reparacion">Reparacion</option>
          </select>
        </div>

        <div v-if="esGarantia || editable.garantia_fecha_compra" class="campo">
          <label>Fecha de Compra</label>
          <input v-model="editable.garantia_fecha_compra" type="date" :disabled="!puedeEditarTodo" />
        </div>

        <div v-if="esGarantia && esService" class="campo">
          <label>Numero de Service</label>
          <input v-model="editable.garantia_numero_service" :disabled="!puedeEditarTodo" />
        </div>

        <div v-if="esGarantia && esReparacion" class="campo full">
          <label>Problema</label>
          <textarea v-model="editable.garantia_problema" :disabled="!puedeEditarTodo" />
        </div>

        <div class="campo">
          <label>Fecha</label>
          <input v-model="editable.fecha" type="date" :disabled="!puedeEditarTodo" />
        </div>

        <div class="campo">
          <label>Hora</label>
          <input v-model="editable.hora" type="time" :disabled="!puedeEditarTodo" />
        </div>

        <div class="campo">
          <label>Estado</label>
          <select v-model="editable.estado" class="select-estado" :class="editable.estado" :disabled="!puedeEditarEstado">
            <option value="pendiente">Pendiente</option>
            <option value="pendiente_repuestos">Pendiente de repuestos</option>
            <option value="revision">En revision</option>
            <option value="pronto">Pronto</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        <div class="campo full">
          <label>Observaciones</label>
          <textarea v-model="editable.detalles" :disabled="!puedeEditarTodo" />
        </div>
      </div>

      <div v-if="!mostrandoConfirmacion" class="window-footer">
        <button class="btn-cancelar" @click="cerrar">Cerrar</button>
        <button v-if="puedeEditarTodo && !esTaller" class="btn-eliminar" @click="mostrandoConfirmacion = true">Cancelar Reserva</button>
        <button v-if="puedeEditarEstado" class="btn-guardar" @click="guardar">Guardar</button>
      </div>

      <div v-else class="window-footer confirmation-footer">
        <div class="confirmation-message">
          Estas seguro de cancelar esta reserva?
        </div>
        <div class="confirmation-buttons">
          <button class="btn-cancelar" @click="mostrandoConfirmacion = false">No, volver</button>
          <button class="btn-confirmar-eliminar" @click="cancelarReserva">Si, cancelar</button>
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
  z-index: 100;
  padding: 18px;
}

.window {
  width: min(900px, 94vw);
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
  justify-content: flex-end;
  gap: 12px;
}

.confirmation-footer {
  flex-direction: column;
  gap: 12px;
}

.confirmation-message {
  color: #f87171;
  font-weight: 700;
  text-align: center;
  padding: 8px 0;
}

.confirmation-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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

.campo input:focus,
.campo textarea:focus,
.campo select:focus {
  outline: none;
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.1);
}

.campo textarea {
  resize: vertical;
  min-height: 72px;
  font-family: inherit;
}

.campo input:disabled,
.campo textarea:disabled,
.campo select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancelar {
  border: 1px solid #475569;
  background: transparent;
  color: #94a3b8;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
}

.btn-cancelar:hover {
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

.btn-confirmar-eliminar {
  background: #dc2626;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
  border: none;
}

.btn-confirmar-eliminar:hover {
  background: #b91c1c;
}

.select-estado {
  cursor: pointer;
}

.select-estado.pendiente {
  border-color: #f59e0b;
  color: #fbbf24;
}

.select-estado.pendiente_repuestos {
  border-color: #f97316;
  color: #fb923c;
}

.select-estado.revision {
  border-color: #3b82f6;
  color: #60a5fa;
}

.select-estado.pronto {
  border-color: #10b981;
  color: #34d399;
}

.select-estado.cancelada {
  border-color: #ef4444;
  color: #f87171;
}

@media (max-width: 760px) {
  .window {
    width: 96vw;
  }

  .window-body {
    grid-template-columns: 1fr;
  }

  .confirmation-buttons,
  .window-footer {
    flex-wrap: wrap;
  }
}
</style>
