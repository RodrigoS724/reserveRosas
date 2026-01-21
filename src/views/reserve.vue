<script setup lang="ts">
import { ref, onMounted } from 'vue'

/* =======================
   ESTADO GENERAL
======================= */
const semanaOffset = ref(0)

const diasSemana = ref([
  { id: 0, nombre: 'Lunes', fecha: '', reservas: [] },
  { id: 1, nombre: 'Martes', fecha: '', reservas: [] },
  { id: 2, nombre: 'Miércoles', fecha: '', reservas: [] },
  { id: 3, nombre: 'Jueves', fecha: '', reservas: [] },
  { id: 4, nombre: 'Viernes', fecha: '', reservas: [] },
  { id: 5, nombre: 'Sábado', fecha: '', reservas: [] }
])

/* =======================
   CARGA DE DATOS
======================= */
const cargarReservas = async () => {
  const reservas = await window.api.obtenerReservasSemana(semanaOffset.value)

  diasSemana.value.forEach(d => {
    d.reservas = []
    d.fecha = ''
  })

  reservas.forEach((r: any) => {
    const fecha = new Date(r.fecha)
    const dia = fecha.getDay() - 1

    if (dia >= 0 && dia <= 5) {
      diasSemana.value[dia].fecha = fecha.toLocaleDateString('es-UY', {
        day: '2-digit',
        month: 'short'
      })

      diasSemana.value[dia].reservas.push({
        id: r.id,
        nombre: r.nombre,
        telefono: r.telefono,
        marca: r.marca,
        modelo: r.modelo,
        matricula: r.matricula,
        tipo: r.tipo_turno,
        hora: r.hora,
        observaciones: r.detalles,
        expandido: false
      })
    }
  })
}

onMounted(cargarReservas)

/* =======================
   SEMANAS
======================= */
const cambiarSemana = (delta: number) => {
  semanaOffset.value += delta
  cargarReservas()
}

/* =======================
   DRAG & DROP
======================= */
const reservaArrastrada = ref<any>(null)
const diaOrigen = ref<number | null>(null)

const iniciarArrastre = (reserva: any, diaId: number) => {
  reservaArrastrada.value = reserva
  diaOrigen.value = diaId
}

const soltarEnDia = async (diaDestino: number) => {
  if (!reservaArrastrada.value || diaOrigen.value === null) return

  const origen = diasSemana.value[diaOrigen.value]
  const destino = diasSemana.value[diaDestino]

  origen.reservas = origen.reservas.filter(r => r.id !== reservaArrastrada.value.id)
  destino.reservas.push(reservaArrastrada.value)

  const nuevaFecha = new Date()
  nuevaFecha.setDate(nuevaFecha.getDate() + diaDestino + semanaOffset.value * 7)

  await window.api.actualizarReserva({
    id: reservaArrastrada.value.id,
    fecha: nuevaFecha.toISOString().split('T')[0],
    hora: reservaArrastrada.value.hora,
    tipo: reservaArrastrada.value.tipo,
    observaciones: reservaArrastrada.value.observaciones
  })

  reservaArrastrada.value = null
  diaOrigen.value = null
}

/* =======================
   GUARDAR CAMBIOS
======================= */
const guardarReserva = async (reserva: any) => {
  await window.api.actualizarReserva({
    id: reserva.id,
    fecha: '',
    hora: reserva.hora,
    tipo: reserva.tipo,
    observaciones: reserva.observaciones
  })
}
</script>

<template>
  <div class="h-full flex flex-col p-4">

    <!-- HEADER -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-3xl font-black text-white">Planificación Semanal</h2>
      <div class="flex gap-3">
        <button class="btn" @click="cambiarSemana(-1)">←</button>
        <button class="btn" @click="cambiarSemana(1)">→</button>
      </div>
    </div>

    <!-- DIAS -->
    <div class="flex gap-4 overflow-x-auto pb-6 custom-scrollbar">
      <div
        v-for="dia in diasSemana"
        :key="dia.id"
        @dragover.prevent
        @drop="soltarEnDia(dia.id)"
        class="dia">

        <div class="dia-header">
          <span class="dia-nombre">{{ dia.nombre }}</span>
          <span class="dia-fecha">{{ dia.fecha }}</span>
        </div>

        <!-- RESERVAS -->
        <div class="space-y-3 p-3">
          <div
            v-for="r in dia.reservas"
            :key="r.id"
            class="reserva">

            <!-- DRAG HANDLE -->
            <div
              class="drag-handle"
              draggable="true"
              @dragstart="iniciarArrastre(r, dia.id)"
            />

            <!-- HEADER -->
            <div class="flex justify-between items-center cursor-pointer"
                 @click="r.expandido = !r.expandido">
              <div>
                <p class="hora">{{ r.hora }}</p>
                <h4 class="nombre">{{ r.nombre }}</h4>
                <p class="moto">🏍 {{ r.marca }} {{ r.modelo }}</p>
              </div>

              <span class="flecha" :class="{ abierta: r.expandido }">⌄</span>
            </div>

            <!-- DETALLE -->
            <div v-if="r.expandido" class="detalle">

              <label>Teléfono</label>
              <input :value="r.telefono" disabled />

              <label>Matrícula</label>
              <input :value="r.matricula" disabled />

              <label>Tipo de turno</label>
              <select v-model="r.tipo">
                <option>Service</option>
                <option>Taller</option>
                <option>Diagnóstico</option>
              </select>

              <label>Observaciones</label>
              <textarea v-model="r.observaciones" rows="3"></textarea>

              <button class="btn-guardar" @click="guardarReserva(r)">
                Guardar
              </button>
            </div>
          </div>

          <div v-if="dia.reservas.length === 0" class="vacio">
            Espacio libre
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CONTENEDORES */
.dia {
  width: 280px;
  background: rgba(30,41,59,.6);
  border-radius: 24px;
}
.dia-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
}
.dia-nombre {
  font-size: 10px;
  text-transform: uppercase;
  color: #94a3b8;
}
.dia-fecha {
  color: #38bdf8;
  font-weight: bold;
}

/* RESERVA */
.reserva {
  background: #020617;
  border-radius: 18px;
  padding: 14px;
  border: 1px solid #1e293b;
}

/* DRAG */
.drag-handle {
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg,#3b82f6,#06b6d4);
  margin-bottom: 10px;
  cursor: grab;
}

/* TEXTOS */
.hora { color:#38bdf8;font-size:11px }
.nombre { color:white;font-weight:700 }
.moto { color:#94a3b8;font-size:12px }

/* FLECHA */
.flecha {
  transition: transform .2s;
}
.flecha.abierta {
  transform: rotate(180deg);
}

/* DETALLE */
.detalle {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.detalle input,
.detalle textarea,
.detalle select {
  background:#020617;
  border:1px solid #1e293b;
  border-radius:10px;
  padding:6px;
  color:white;
}
.detalle input:disabled {
  color:#64748b;
}

/* BOTONES */
.btn {
  background:#1e293b;
  padding:8px 14px;
  border-radius:12px;
  color:white;
}
.btn-guardar {
  margin-top:10px;
  background:#3b82f6;
  padding:10px;
  border-radius:14px;
  font-weight:bold;
}

/* VACIO */
.vacio {
  border:2px dashed #1e293b;
  border-radius:18px;
  padding:20px;
  text-align:center;
  color:#475569;
}
</style>
