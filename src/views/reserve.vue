<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ReservaWindow from '../components/reservaWindow.vue'
const semanaOffset = ref(0)
const busquedaCedula = ref('')

// Estructura base de los días
const diasSemana = ref([
  { id: 0, nombre: 'Lunes', fecha: '', reservas: [] as any[] },
  { id: 1, nombre: 'Martes', fecha: '', reservas: [] },
  { id: 2, nombre: 'Miércoles', fecha: '', reservas: [] },
  { id: 3, nombre: 'Jueves', fecha: '', reservas: [] },
  { id: 4, nombre: 'Viernes', fecha: '', reservas: [] },
  { id: 5, nombre: 'Sábado', fecha: '', reservas: [] }
])

// Cargar reservas desde SQLite

const cargarReservas = async () => {
  const hoy = new Date()
  const lunesActual = new Date(hoy)
  const diaSemana = hoy.getDay()
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana
  lunesActual.setDate(hoy.getDate() + diff)

  const inicioSemana = new Date(lunesActual)
  inicioSemana.setDate(lunesActual.getDate() + (semanaOffset.value * 7))

  const finSemana = new Date(inicioSemana)
  finSemana.setDate(inicioSemana.getDate() + 5)

  const desdeStr = inicioSemana.toISOString().split('T')[0]
  const hastaStr = finSemana.toISOString().split('T')[0]

  // 1. Obtenemos datos
  const nuevasReservas = await window.api.obtenerReservasSemana({ desde: desdeStr, hasta: hastaStr })

  // 2. Mapeamos y limpiamos en un solo paso para evitar parpadeos
  const nuevosDias = diasSemana.value.map((d, index) => {
    const f = new Date(inicioSemana)
    f.setDate(inicioSemana.getDate() + index)

    // Filtramos las reservas que pertenecen a este día específico
    const reservasDelDia = nuevasReservas.filter((r: any) => {
      return r.fecha === f.toISOString().split('T')[0]
    }).map((r: any) => ({
      ...r,
      estado: r.estado || 'Pendiente'
    }))

    return {
      ...d,
      fecha: f.toLocaleDateString('es-UY', { day: '2-digit', month: 'short' }),
      reservas: reservasDelDia
    }
  })

  // 3. Sobrescribimos el valor completo para disparar la reactividad de Vue
  diasSemana.value = nuevosDias
  console.log(nuevosDias);

}
onMounted(cargarReservas)

// Filtrado por cédula
const reservasFiltradas = computed(() => {
  if (!busquedaCedula.value) return diasSemana.value
  return diasSemana.value.map(d => ({
    ...d,
    reservas: d.reservas.filter(r => r.cedula?.includes(busquedaCedula.value))
  }))
})

const cambiarSemana = (delta: number) => {
  semanaOffset.value += delta
  cargarReservas()
}

// DRAG AND DROP LOGIC
const iniciarArrastre = (event: DragEvent, reserva: any) => {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/json', JSON.stringify({ reservaId: reserva.id }))

  // Opcional: añade una clase visual al elemento arrastrado
  const target = event.target as HTMLElement
  target.style.opacity = '0.5'
}

// Función para restaurar opacidad al terminar arrastre
// const terminarArrastre = (event: DragEvent) => {
//   const target = event.target as HTMLElement
//   target.style.opacity = '1'
// }

const soltarEnDia = async (event: DragEvent, diaDestinoId: number) => {
  event.preventDefault()
  if (!event.dataTransfer) return

  const jsonData = event.dataTransfer.getData('application/json')
  if (!jsonData) return
  const { reservaId } = JSON.parse(jsonData)

  // Calcular la nueva fecha basada en el lunes de la semana que vemos
  const hoy = new Date()
  const lunesActual = new Date(hoy)
  const diff = hoy.getDay() === 0 ? -6 : 1 - hoy.getDay()
  lunesActual.setDate(hoy.getDate() + diff)

  const nuevaFecha = new Date(lunesActual)
  nuevaFecha.setDate(lunesActual.getDate() + (semanaOffset.value * 7) + diaDestinoId)

  await window.api.moverReserva({
    id: reservaId,
    nuevaFecha: nuevaFecha.toISOString().split('T')[0]
  })

  cargarReservas()
}

// VENTANA DE DETALLES
const mostrarVentana = ref(false)
const reservaActiva = ref<any>(null)

const abrirVentana = (reserva: any) => {
  // Pasamos una copia para evitar conflictos de referencia
  reservaActiva.value = { ...reserva }
  mostrarVentana.value = true
}

const manejarCierre = async () => {
  mostrarVentana.value = false
  setTimeout(() => {
    cargarReservas()
  }, 150) // ⏳ da tiempo real a SQLite
}

</script>

<template>
  <div class="panel-container custom-scroll">
    <header class="panel-header">
      <div class="header-left">
        <h2 class="main-title">PLANIFICACIÓN <span class="text-sky">SEMANAL</span></h2>
        <div class="search-wrapper">
          <input v-model="busquedaCedula" placeholder="🔍 Buscar por CI..." class="search-input" />
        </div>
      </div>

      <div class="nav-group">
        <button class="nav-btn" @click="cambiarSemana(-1)">ANTERIOR</button>
        <button class="nav-btn hoy-btn" @click="semanaOffset = 0; cargarReservas()">ESTA SEMANA</button>
        <button class="nav-btn" @click="cambiarSemana(1)">SIGUIENTE</button>
      </div>
    </header>

    <div class="planning-grid">
      <div v-for="dia in reservasFiltradas" :key="dia.id" class="day-column" @dragover.prevent
        @drop="soltarEnDia($event, dia.id)">
        <div class="day-info">
          <span class="day-name">{{ dia.nombre }}</span>
          <span class="day-date">{{ dia.fecha }}</span>
        </div>

        <div class="cards-stack">
          <div v-for="r in dia.reservas" :key="`${r.id}`" class="moto-card" draggable="true"
            @dragstart="iniciarArrastre($event, r)" @click.self="abrirVentana(r)">
            <div class="card-inner">
              <div class="card-top">
                <span class="reserva-time">{{ r.hora }}</span>
                <span class="status-pill" :class="r.estado.toLowerCase()">
                  {{ r.estado }}
                </span>
              </div>

              <div class="card-body">
                <h4 class="client-name">{{ r.nombre }}</h4>
                <div class="moto-info">
                  <span class="moto-label">{{ r.marca }} {{ r.modelo }}</span>
                  <span class="km-label">{{ r.km }} KM</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="footer-item">
                  <span class="label">CI:</span> {{ r.cedula }}
                </div>
                <div class="footer-item plate">
                  {{ r.matricula }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="dia.reservas.length === 0" class="empty-card">
            <span class="empty-icon">📅</span>
            <p>SIN TURNOS</p>
          </div>
        </div>
      </div>
    </div>

    <ReservaWindow v-if="mostrarVentana" :reserva="reservaActiva" @cerrar="manejarCierre" />

  </div>
</template>

<style scoped>
/* CONTENEDOR PRINCIPAL */
.panel-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 30px;
  background-color: #020617;
  /* Slate 950 */
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
  /* Más grande para 2K */
  font-weight: 900;
  letter-spacing: -1px;
}

.text-sky {
  color: #38bdf8;
}

.search-input {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 12px 20px;
  color: white;
  width: 350px;
  margin-top: 10px;
}

.nav-group {
  display: flex;
  gap: 10px;
  background: #0f172a;
  padding: 6px;
  border-radius: 15px;
  border: 1px solid #1e293b;
}

.nav-btn {
  padding: 10px 20px;
  border-radius: 10px;
  color: #94a3b8;
  font-weight: 700;
  font-size: 0.8rem;
  transition: 0.2s;
}

.nav-btn:hover {
  background: #1e293b;
  color: white;
}

.hoy-btn {
  background: #38bdf8;
  color: #020617;
}

/* GRID SYSTEM */
.planning-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 25px;
  align-items: start;
}

/* COLUMNAS DE DÍAS */
.day-column {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 25px;
  border: 1px solid #1e293b;
  min-height: 400px;
}

.day-info {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #1e293b;
  align-items: center;
}

.day-name {
  font-weight: 900;
  color: #64748b;
  text-transform: uppercase;
  font-size: 0.8rem;
}

.day-date {
  color: #38bdf8;
  font-weight: 800;
  font-size: 1.1rem;
}

/* TARJETAS DE MOTO */
.cards-stack {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.moto-card {
  background: #020617;
  border-radius: 20px;
  border: 1px solid #1e293b;
  cursor: grab;
  transition: all 0.3s ease;
}

.moto-card:hover {
  border-color: #38bdf8;
  transform: scale(1.02);
  box-shadow: 0 10px 30px -10px rgba(56, 189, 248, 0.3);
}

.card-inner {
  padding: 20px;
  pointer-events: none;
}

.card-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.reserva-time {
  color: #38bdf8;
  font-weight: 900;
  font-size: 1.2rem;
}

/* BADGES DE ESTADO */
.status-pill {
  font-size: 0.65rem;
  padding: 4px 12px;
  border-radius: 50px;
  font-weight: 900;
  text-transform: uppercase;
}

.status-pill.pendiente {
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.status-pill.pronto {
  background: rgba(34, 197, 94, 0.1);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.status-pill.cancelado {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.status-pill.en-proceso {
  background: rgba(147, 197, 253, 0.1);
  color: #93c5fd;
  border: 1px solid rgba(147, 197, 253, 0.2);
}

.client-name {
  color: white;
  font-size: 1.3rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.moto-info {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.moto-label {
  background: #1e293b;
  color: white;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
}

.km-label {
  color: #64748b;
  font-size: 0.75rem;
  align-self: center;
}

.card-footer {
  border-top: 1px solid #1e293b;
  padding-top: 12px;
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #475569;
}

.plate {
  color: #94a3b8;
  font-weight: 800;
}

/* ESTADO VACÍO */
.empty-card {
  padding: 40px;
  text-align: center;
  border: 2px dashed #1e293b;
  border-radius: 20px;
}

.empty-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 10px;
  filter: grayscale(1);
  opacity: 0.3;
}

.empty-card p {
  color: #334155;
  font-weight: 800;
  font-size: 0.8rem;
}
</style>