<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import ReservaWindow from '../components/reservaWindow.vue'

const semanaOffset = ref(0)
const busquedaCedula = ref('')

// Horarios: se cargarán dinámicamente desde la BD
const horariosDisponibles = ref<string[]>([])

// Intervalo para auto-refresh
let intervaloRefresco: number | null = null

// Estructura de semana
const diasSemana = ref([
  { id: 0, nombre: 'Lunes' },
  { id: 1, nombre: 'Martes' },
  { id: 2, nombre: 'Miércoles' },
  { id: 3, nombre: 'Jueves' },
  { id: 4, nombre: 'Viernes' },
  { id: 5, nombre: 'Sábado' }
])

// Matriz de reservas: [dia][hora] => []
const matrizReservas = ref<Record<string, Record<string, any[]>>>({})

/* =========================
 * CARGAR HORARIOS BASE ACTIVOS
 * ========================= */
const cargarHorariosBase = async () => {
  try {
    console.log('[Reserve] Cargando horarios base...')
    const result = await window.api.obtenerHorariosBase()
    console.log('[Reserve] Horarios recibidos:', result)
    
    // Filtrar solo los horarios activos y ordenarlos
    const horariosActivos = result
      .filter((h: any) => h.activo === 1)
      .map((h: any) => h.hora)
      .sort()
    
    horariosDisponibles.value = horariosActivos
    console.log('[Reserve] Horarios activos cargados:', horariosActivos)
  } catch (error: any) {
    console.error('[Reserve] Error cargando horarios:', error)
    // Fallback a horarios por defecto si falla
    horariosDisponibles.value = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
  }
}

// Obtener la fecha del lunes de la semana actual
const obtenerLunesDeWeek = () => {
  const hoy = new Date()
  const lunesActual = new Date(hoy)
  const diaSemana = hoy.getDay()
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana
  lunesActual.setDate(hoy.getDate() + diff + (semanaOffset.value * 7))
  return lunesActual
}

// Calcular fechas de la semana
const fechasWeek = computed(() => {
  const lunes = obtenerLunesDeWeek()
  return diasSemana.value.map((dia, index) => {
    const fecha = new Date(lunes)
    fecha.setDate(fecha.getDate() + index)
    const fechaISO = fecha.toISOString().split('T')[0]
    return {
      ...dia,
      fecha: fechaISO,
      fechaFormato: fecha.toLocaleDateString('es-UY', { day: '2-digit', month: 'short' })
    }
  })
})

// Cargar reservas
const cargarReservas = async () => {
  try {
    const lunes = obtenerLunesDeWeek()
    const sabado = new Date(lunes)
    sabado.setDate(sabado.getDate() + 5)

    const desdeStr = lunes.toISOString().split('T')[0]
    const hastaStr = sabado.toISOString().split('T')[0]

    console.log('[Reserve] Cargando reservas desde', desdeStr, 'hasta', hastaStr)

    const nuevasReservas = await window.api.obtenerReservasSemana({ desde: desdeStr, hasta: hastaStr })
    console.log('[Reserve] Reservas recibidas:', nuevasReservas)

    // Inicializar matriz vacía
    const nuevaMatriz: Record<string, Record<string, any[]>> = {}
    
    fechasWeek.value.forEach(dia => {
      nuevaMatriz[dia.fecha] = {}
      horariosDisponibles.value.forEach(hora => {
        nuevaMatriz[dia.fecha][hora] = []
      })
    })

    // Llenar la matriz con reservas
    nuevasReservas.forEach((reserva: any) => {
      if (nuevaMatriz[reserva.fecha] && nuevaMatriz[reserva.fecha][reserva.hora]) {
        nuevaMatriz[reserva.fecha][reserva.hora].push({
          ...reserva,
          estado: reserva.estado || 'Pendiente'
        })
      }
    })

    matrizReservas.value = nuevaMatriz
    console.log('[Reserve] Matriz actualizada')

  } catch (error: any) {
    console.error('[Reserve] Error cargando reservas:', error)
  }
}

onMounted(async () => {
  console.log('[Reserve] Inicializando vista...')
  await cargarHorariosBase()
  await cargarReservas()
  
  console.log('[Reserve] Iniciando auto-refresh cada 5 segundos...')
  intervaloRefresco = window.setInterval(async () => {
    console.log('[Reserve] Auto-refresh: Recargando reservas...')
    await cargarReservas()
  }, 5000) // Recargar cada 5 segundos
})

onBeforeUnmount(() => {
  console.log('[Reserve] Deteniendo auto-refresh...')
  if (intervaloRefresco) {
    clearInterval(intervaloRefresco)
    intervaloRefresco = null
  }
})

// Filtrado por cédula
const obtenerReservasEnCelda = (fecha: string, hora: string) => {
  const reservas = matrizReservas.value[fecha]?.[hora] || []
  if (!busquedaCedula.value) return reservas
  return reservas.filter(r => r.cedula?.includes(busquedaCedula.value))
}

// Verificar si el horario debe mostrarse para la fecha (sábados solo hasta 12:00)
const debeRechazoHora = (fecha: string, hora: string) => {
  const date = new Date(fecha)
  const esSabado = date.getDay() === 6  // 6 es sábado
  if (esSabado && hora >= '12:00') {
    return true  // Rechazar horarios >= 12:00 en sábados
  }
  return false
}

const cambiarSemana = (delta: number) => {
  semanaOffset.value += delta
  cargarReservas()
}

// VENTANA DE DETALLES
const mostrarVentana = ref(false)
const reservaActiva = ref<any>(null)

const abrirVentana = (reserva: any) => {
  reservaActiva.value = { ...reserva }
  mostrarVentana.value = true
}

const manejarCierre = async () => {
  mostrarVentana.value = false
  setTimeout(() => {
    cargarReservas()
  }, 150)
}

// DRAG & DROP
let arrastreDatos: any = null

const iniciarArrastre = (evento: DragEvent, reserva: any) => {
  arrastreDatos = reserva
  evento.dataTransfer!.effectAllowed = 'move'
  if (evento.dataTransfer) {
    evento.dataTransfer.setData('application/json', JSON.stringify(reserva))
  }
}

const soltarEnCelda = async (evento: DragEvent, fechaDestino: string, horaDestino: string) => {
  evento.preventDefault()
  
  if (!arrastreDatos) return

  try {
    const fechaOrigen = arrastreDatos.fecha
    const horaOrigen = arrastreDatos.hora

    // Evitar soltar en el mismo lugar
    if (fechaOrigen === fechaDestino && horaOrigen === horaDestino) {
      arrastreDatos = null
      return
    }

    console.log('[Reserve] Moviendo reserva de', horaOrigen, 'en', fechaOrigen, 'a', horaDestino, 'en', fechaDestino)

    // Actualizar la reserva en el backend con todos los campos necesarios
    await window.api.actualizarReserva({
      ...arrastreDatos,
      fecha: fechaDestino,
      hora: horaDestino
    })

    console.log('[Reserve] Reserva actualizada correctamente')
    cargarReservas()
    arrastreDatos = null
  } catch (error: any) {
    console.error('[Reserve] Error moviendo reserva:', error)
    arrastreDatos = null
  }
}

</script>

<template>
  <div class="panel-container custom-scroll">
    <!-- HEADER CON BÚSQUEDA Y NAVEGACIÓN -->
    <header class="panel-header">
      <div class="header-left">
        <h2 class="main-title">CALENDARIO <span class="text-sky">SEMANAL</span></h2>
        <div class="search-wrapper">
          <input v-model="busquedaCedula" placeholder="Buscar por CI..." class="search-input" />
        </div>
      </div>

      <div class="nav-group">
        <button class="nav-btn" @click="cambiarSemana(-1)">ANTERIOR</button>
        <button class="nav-btn hoy-btn" @click="semanaOffset = 0; cargarReservas()">HOY</button>
        <button class="nav-btn" @click="cambiarSemana(1)">SIGUIENTE</button>
      </div>
    </header>

    <!-- TABLA CALENDARIO -->
    <div class="calendar-wrapper">
      <table class="calendar-table">
        <!-- ENCABEZADO CON DÍAS DE LA SEMANA -->
        <thead>
          <tr>
            <th class="hora-header">HORA</th>
            <th v-for="dia in fechasWeek" :key="dia.fecha" class="dia-header">
              <div class="dia-header-content">
                <span class="dia-nombre">{{ dia.nombre }}</span>
                <span class="dia-fecha">{{ dia.fecha }}</span>
              </div>
            </th>
          </tr>
        </thead>

        <!-- FILAS POR HORARIO -->
        <tbody>
          <tr v-for="hora in horariosDisponibles" :key="hora" class="hora-row"
            :style="{ display: fechasWeek.some(d => !debeRechazoHora(d.fecha, hora)) ? '' : 'none' }">
            <!-- CELDA DE HORA -->
            <td class="hora-cell">
              <span class="hora-label">{{ hora }}</span>
            </td>

            <!-- CELDAS CON RESERVAS POR DÍA -->
            <td v-for="dia in fechasWeek" :key="`${dia.fecha}-${hora}`" class="reserva-cell"
              :style="{ display: debeRechazoHora(dia.fecha, hora) ? 'none' : '' }"
              @dragover.prevent @drop="soltarEnCelda($event, dia.fecha, hora)">
              
              <div class="reservas-container">
                <div v-if="obtenerReservasEnCelda(dia.fecha, hora).length > 0" class="reservas-stack">
                  <div v-for="r in obtenerReservasEnCelda(dia.fecha, hora)" :key="r.id"
                    class="mini-card" draggable="true" @dragstart="iniciarArrastre($event, r)"
                    @click="abrirVentana(r)" :class="`estado-${r.estado.toLowerCase()}`">
                    
                    <div class="mini-card-content">
                      <div class="mini-nombre">{{ r.nombre }}</div>
                      <div class="mini-cedula">{{ r.cedula }}</div>
                      <div class="mini-moto">{{ r.marca }} {{ r.modelo }}</div>
                      <div class="mini-status">{{ r.estado }}</div>
                    </div>
                  </div>
                </div>

                <div v-else class="empty-slot">
                  <span class="slot-empty">-</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ReservaWindow v-if="mostrarVentana" :reserva="reservaActiva" @cerrar="manejarCierre" />
  </div>
</template>

<style scoped>
.panel-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 30px;
  background-color: #020617;
  gap: 25px;
  overflow-y: auto;
}

/* HEADER */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.main-title {
  color: white;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -1px;
}

.text-sky {
  color: #0ea5e9;
}

.search-wrapper {
  margin-top: 10px;
}

.search-input {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 15px;
  padding: 12px 20px;
  color: white;
  width: 350px;
  font-weight: 600;
}

.search-input::placeholder {
  color: #64748b;
}

.search-input:focus {
  border-color: #0ea5e9;
  outline: none;
}

.nav-group {
  display: flex;
  gap: 10px;
  background: #0f172a;
  padding: 8px;
  border-radius: 18px;
  border: 1px solid #1e293b;
}

.nav-btn {
  padding: 10px 24px;
  border-radius: 12px;
  color: #94a3b8;
  font-weight: 700;
  font-size: 0.8rem;
  transition: all 0.2s;
  background: transparent;
  border: none;
  cursor: pointer;
}

.nav-btn:hover {
  background: #1e293b;
  color: white;
}

.hoy-btn {
  background: #0ea5e9;
  color: #020617;
}

.hoy-btn:hover {
  background: #06b6d4;
}

/* CALENDARIO */
.calendar-wrapper {
  flex: 1;
  overflow: auto;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 20px;
  border: 1px solid #1e293b;
  padding: 20px;
}

.calendar-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

/* ENCABEZADO */
thead {
  position: sticky;
  top: 0;
  background: #020617;
  z-index: 10;
}

.hora-header {
  width: 100px;
  padding: 15px;
  text-align: center;
  color: #64748b;
  font-weight: 900;
  font-size: 0.75rem;
  border-bottom: 2px solid #1e293b;
  text-transform: uppercase;
}

.dia-header {
  padding: 15px;
  text-align: center;
  border-bottom: 2px solid #1e293b;
  border-right: 1px solid #1e293b;
}

.dia-header:last-child {
  border-right: none;
}

.dia-header-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.dia-nombre {
  color: #94a3b8;
  font-weight: 900;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dia-fecha {
  color: #0ea5e9;
  font-weight: 900;
  font-size: 1.1rem;
}

/* FILAS Y CELDAS */
.hora-row {
  border-bottom: 1px solid #1e293b;
}

.hora-row:hover {
  background: rgba(14, 165, 233, 0.05);
}

.hora-cell {
  width: 100px;
  padding: 15px;
  text-align: center;
  background: rgba(15, 23, 42, 0.8);
  border-right: 2px solid #1e293b;
  vertical-align: top;
}

.hora-label {
  color: #64748b;
  font-weight: 900;
  font-size: 0.95rem;
}

.reserva-cell {
  padding: 8px;
  border-right: 1px solid #1e293b;
  vertical-align: top;
  min-height: 120px;
  background: rgba(15, 23, 42, 0.3);
}

.reserva-cell:last-child {
  border-right: none;
}

.reserva-cell:hover {
  background: rgba(14, 165, 233, 0.08);
}

/* CONTENEDOR DE RESERVAS */
.reservas-container {
  width: 100%;
  min-height: 100%;
}

.reservas-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* MINI TARJETAS */
.mini-card {
  background: #0f172a;
  border: 1.5px solid #1e293b;
  border-radius: 10px;
  padding: 8px;
  cursor: grab;
  transition: all 0.2s ease;
  font-size: 0.7rem;
}

.mini-card:hover {
  border-color: #0ea5e9;
  transform: scale(1.05);
  box-shadow: 0 5px 15px -5px rgba(14, 165, 233, 0.3);
}

.mini-card:active {
  cursor: grabbing;
}

.mini-card-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: none;
}

.mini-nombre {
  color: white;
  font-weight: 800;
  line-height: 1.1;
}

.mini-cedula {
  color: #94a3b8;
  font-weight: 700;
  font-size: 0.65rem;
}

.mini-moto {
  color: #64748b;
  font-size: 0.65rem;
  font-weight: 600;
}

.mini-status {
  color: #0ea5e9;
  font-weight: 700;
  font-size: 0.6rem;
  text-transform: uppercase;
  margin-top: 2px;
}

/* ESTADOS DE RESERVA */
.mini-card.estado-pendiente {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

.mini-card.estado-pendiente .mini-status {
  color: #f59e0b;
}

.mini-card.estado-pronto {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.05);
}

.mini-card.estado-pronto .mini-status {
  color: #22c55e;
}

.mini-card.estado-cancelado {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.mini-card.estado-cancelado .mini-status {
  color: #ef4444;
}

.mini-card.estado-en-proceso {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.mini-card.estado-en-proceso .mini-status {
  color: #3b82f6;
}

/* CELDA VACÍA */
.empty-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  color: #334155;
  font-weight: 800;
  font-size: 1.5rem;
}

.slot-empty {
  opacity: 0.3;
}

/* SCROLL PERSONALIZADO */
.calendar-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.calendar-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.calendar-wrapper::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 4px;
}

.calendar-wrapper::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
</style>