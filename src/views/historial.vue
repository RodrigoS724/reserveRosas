<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'

/* =========================
 * ESTADO
 * ========================= */
const reservas = ref<any[]>([])
const reservasFiltradas = computed(() => {
  return reservas.value.filter(r => {
    // Filtro por búsqueda CI/Nombre
    if (filtroTexto.value) {
      const search = filtroTexto.value.toLowerCase()
      const nombre = r.nombre?.toLowerCase() || ''
      const cedula = r.cedula?.toLowerCase() || ''
      if (!nombre.includes(search) && !cedula.includes(search)) {
        return false
      }
    }

    // Filtro por fecha desde
    if (fechaDesde.value) {
      if (r.fecha < fechaDesde.value) return false
    }

    // Filtro por fecha hasta
    if (fechaHasta.value) {
      if (r.fecha > fechaHasta.value) return false
    }

    return true
  })
})

const filtroTexto = ref('')
const fechaDesde = ref('')
const fechaHasta = ref('')
const cargando = ref(false)

// Modal de notas
const mostrarModalNotas = ref(false)
const reservaActual = ref<any>(null)
const notasActuales = ref('')
const modoEdicion = ref(false)

// Intervalo para auto-refresh
let intervaloRefresco: number | null = null
const cargarReservas = async () => {
  cargando.value = true
  try {
    console.log('[Historial] Cargando todas las reservas...')
    const result = await window.api.obtenerTodasLasReservas()
    console.log('[Historial] Reservas recibidas:', result)
    
    // Ordenar por fecha descendente (más recientes primero)
    reservas.value = (result || []).sort((a: any, b: any) => {
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    })
    
    console.log('[Historial] Total de reservas:', reservas.value.length)
  } catch (error: any) {
    console.error('[Historial] Error cargando reservas:', error)
    alert('Error cargando reservas')
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  console.log('[Historial] Inicializando vista...')
  cargarReservas()
  
  console.log('[Historial] Iniciando auto-refresh cada 5 segundos...')
  intervaloRefresco = window.setInterval(async () => {
    console.log('[Historial] Auto-refresh: Recargando reservas...')
    await cargarReservas()
  }, 5000) // Recargar cada 5 segundos
})

onBeforeUnmount(() => {
  console.log('[Historial] Deteniendo auto-refresh...')
  if (intervaloRefresco) {
    clearInterval(intervaloRefresco)
    intervaloRefresco = null
  }
})

/* =========================
 * ACCIONES DE NOTAS
 * ========================= */
const abrirModalNotas = (reserva: any) => {
  reservaActual.value = { ...reserva }
  notasActuales.value = reserva.notas || ''
  modoEdicion.value = false
  mostrarModalNotas.value = true
}

const guardarNotas = async () => {
  if (!reservaActual.value) return

  try {
    console.log('[Historial] Guardando notas para reserva:', reservaActual.value.id)
    await window.api.actualizarNotasReserva(reservaActual.value.id, notasActuales.value)
    console.log('[Historial] Notas guardadas exitosamente')

    // Actualizar en la lista local
    const index = reservas.value.findIndex(r => r.id === reservaActual.value.id)
    if (index !== -1) {
      reservas.value[index].notas = notasActuales.value
    }

    mostrarModalNotas.value = false
    alert('Notas guardadas exitosamente')
  } catch (error: any) {
    console.error('[Historial] Error guardando notas:', error)
    alert('Error guardando notas')
  }
}

const cerrarModalNotas = () => {
  mostrarModalNotas.value = false
  reservaActual.value = null
  notasActuales.value = ''
  modoEdicion.value = false
}

const habilitarEdicion = () => {
  modoEdicion.value = true
}

/* =========================
 * UTILIDADES
 * ========================= */
const formatearFecha = (fecha: string) => {
  const date = new Date(fecha)
  return date.toLocaleDateString('es-UY', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const exportarACSV = () => {
  if (reservasFiltradas.value.length === 0) {
    alert('No hay reservas para exportar')
    return
  }

  // Crear encabezados
  const headers = ['ID', 'Nombre', 'CI', 'Teléfono', 'Marca', 'Modelo', 'Km', 'Matrícula', 'Tipo', 'Fecha', 'Hora', 'Estado', 'Notas']
  
  // Crear filas
  const rows = reservasFiltradas.value.map(r => [
    r.id,
    r.nombre,
    r.cedula,
    r.telefono,
    r.marca,
    r.modelo,
    r.km,
    r.matricula,
    r.tipo_turno,
    r.fecha,
    r.hora,
    r.estado,
    r.notas || ''
  ])

  // Combinar
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

  // Descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `historial-reservas-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="historial-container">
    <!-- HEADER -->
    <header class="historial-header">
      <h1 class="title">Historial de Reservas</h1>
      <button @click="cargarReservas" class="btn-recargar" :disabled="cargando">
        {{ cargando ? 'Cargando...' : 'Recargar' }}
      </button>
    </header>

    <!-- FILTROS -->
    <div class="filtros-section">
      <div class="filtro-group">
        <label>Buscar (CI o Nombre)</label>
        <input v-model="filtroTexto" type="text" placeholder="Ej: 12345678 o Juan Pérez" class="input-search" />
      </div>

      <div class="filtro-group">
        <label>Desde</label>
        <input v-model="fechaDesde" type="date" class="input-date" />
      </div>

      <div class="filtro-group">
        <label>Hasta</label>
        <input v-model="fechaHasta" type="date" class="input-date" />
      </div>

      <button @click="exportarACSV" class="btn-exportar">Exportar CSV</button>
    </div>

    <!-- TABLA -->
    <div class="tabla-wrapper">
      <div v-if="cargando" class="loading">Cargando reservas...</div>
      <div v-else-if="reservasFiltradas.length === 0" class="empty">
        No hay reservas que coincidan con los filtros
      </div>
      <table v-else class="tabla-reservas">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>CI</th>
            <th>Teléfono</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Km</th>
            <th>Matrícula</th>
            <th>Tipo</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Estado</th>
            <th>Notas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reservasFiltradas" :key="r.id" class="fila" :class="`estado-${r.estado?.toLowerCase() || 'pendiente'}`">
            <td class="cell-id">{{ r.id }}</td>
            <td class="cell-nombre">{{ r.nombre }}</td>
            <td class="cell-ci">{{ r.cedula }}</td>
            <td class="cell-tel">{{ r.telefono }}</td>
            <td class="cell-marca">{{ r.marca }}</td>
            <td class="cell-modelo">{{ r.modelo }}</td>
            <td class="cell-km">{{ r.km }}</td>
            <td class="cell-matricula">{{ r.matricula }}</td>
            <td class="cell-tipo">{{ r.tipo_turno }}</td>
            <td class="cell-fecha">{{ formatearFecha(r.fecha) }}</td>
            <td class="cell-hora">{{ r.hora }}</td>
            <td class="cell-estado">
              <span class="estado-badge" :class="`estado-${r.estado?.toLowerCase() || 'pendiente'}`">
                {{ r.estado || 'Pendiente' }}
              </span>
            </td>
            <td class="cell-notas">{{ r.notas ? r.notas.substring(0, 30) + '...' : '-' }}</td>
            <td class="cell-acciones">
              <button @click="abrirModalNotas(r)" class="btn-notas">Notas</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL DE NOTAS -->
    <div v-if="mostrarModalNotas" class="modal-overlay" @click.self="cerrarModalNotas">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Notas - Reserva #{{ reservaActual?.id }}</h2>
          <span class="cliente-info">{{ reservaActual?.nombre }} ({{ reservaActual?.cedula }})</span>
          <button class="btn-close" @click="cerrarModalNotas">✕</button>
        </div>

        <div class="modal-body">
          <textarea v-model="notasActuales" :readonly="!modoEdicion && reservaActual?.notas" placeholder="Agrega notas sobre esta reserva..." class="textarea-notas" :class="{ 'readonly': !modoEdicion && reservaActual?.notas }"></textarea>
        </div>

        <div class="modal-footer">
          <button @click="cerrarModalNotas" class="btn-cancelar">Cancelar</button>
          <button v-if="!modoEdicion && reservaActual?.notas" @click="habilitarEdicion" class="btn-editar">Editar Nota</button>
          <button @click="guardarNotas" class="btn-guardar">{{ modoEdicion ? 'Guardar Cambios' : 'Guardar Notas' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.historial-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #020617;
  color: white;
  padding: 20px;
  gap: 20px;
}

/* HEADER */
.historial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.title {
  font-size: 2rem;
  font-weight: 900;
  color: white;
  margin: 0;
}

.btn-recargar {
  padding: 10px 20px;
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-recargar:hover:not(:disabled) {
  background: #06b6d4;
}

.btn-recargar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* FILTROS */
.filtros-section {
  display: flex;
  gap: 15px;
  align-items: flex-end;
  background: rgba(30, 41, 59, 0.5);
  padding: 15px;
  border-radius: 15px;
  flex-wrap: wrap;
}

.filtro-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filtro-group label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}

.input-search,
.input-date {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 10px 12px;
  color: white;
  font-size: 0.9rem;
  min-width: 200px;
}

.input-search:focus,
.input-date:focus {
  outline: none;
  border-color: #0ea5e9;
}

.btn-exportar {
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-exportar:hover {
  background: #059669;
}

/* TABLA */
.tabla-wrapper {
  flex: 1;
  overflow: auto;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 15px;
  border: 1px solid #1e293b;
}

.loading,
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  font-size: 1.1rem;
}

.tabla-reservas {
  width: 100%;
  border-collapse: collapse;
}

.tabla-reservas thead {
  position: sticky;
  top: 0;
  background: #0f172a;
  z-index: 10;
}

.tabla-reservas th {
  padding: 12px;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 700;
  color: #94a3b8;
  border-bottom: 2px solid #1e293b;
  text-transform: uppercase;
  white-space: nowrap;
}

.tabla-reservas td {
  padding: 12px;
  border-bottom: 1px solid #1e293b;
  font-size: 0.9rem;
}

.fila:hover {
  background: rgba(14, 165, 233, 0.05);
}

.fila.estado-pendiente {
  border-left: 3px solid #f59e0b;
}

.fila.estado-pronto {
  border-left: 3px solid #22c55e;
}

.fila.estado-cancelado {
  border-left: 3px solid #ef4444;
}

.fila.estado-en-proceso {
  border-left: 3px solid #3b82f6;
}

.estado-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.estado-badge.estado-pendiente {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.estado-badge.estado-pronto {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.estado-badge.estado-cancelado {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.estado-badge.estado-en-proceso {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.cell-notas {
  color: #94a3b8;
  font-size: 0.85rem;
}

.btn-notas {
  padding: 6px 12px;
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-notas:hover {
  background: #06b6d4;
}

/* MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1e293b;
  border-radius: 15px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 600px;
  width: 90%;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #0f172a;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: white;
}

.cliente-info {
  font-size: 0.85rem;
  color: #94a3b8;
}

.btn-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s;
}

.btn-close:hover {
  color: white;
}

.modal-body {
  padding: 20px;
  flex: 1;
}

.textarea-notas {
  width: 100%;
  height: 200px;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 12px;
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
}

.textarea-notas:focus {
  outline: none;
  border-color: #0ea5e9;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #0f172a;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancelar,
.btn-guardar {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancelar {
  background: #475569;
  color: white;
}

.btn-cancelar:hover {
  background: #64748b;
}

.btn-editar {
  padding: 10px 20px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-editar:hover {
  background: #d97706;
}

.btn-guardar {
  background: #0ea5e9;
  color: white;
}

.btn-guardar:hover {
  background: #06b6d4;
}

.textarea-notas {
  width: 100%;
  height: 200px;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 12px;
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
}

.textarea-notas:focus {
  outline: none;
  border-color: #0ea5e9;
}

.textarea-notas.readonly {
  background: #0a0f1a;
  cursor: default;
  opacity: 0.8;
}

.textarea-notas.readonly:focus {
  border-color: #1e293b;
}

/* Scrollbar personalizado */
.tabla-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.tabla-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.tabla-wrapper::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 4px;
}

.tabla-wrapper::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
</style>
