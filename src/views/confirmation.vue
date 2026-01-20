<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Datos que vienen del Home
const fecha = route.query.fecha || '2026-01-19'
const hora = route.query.hora || '11:00'

// Estado del Formulario - UNIFICADO A 'tipoTurno'
const nombre = ref('')
const cedula = ref('')
const telefono = ref('')
const marca = ref('')
const modelo = ref('')
const km = ref('')
const matricula = ref('')
const tipoTurno = ref('Service') // Esta es la variable clave
const detalles = ref('') // Para los comentarios de garantía/taller

const descargarTicket = () => {
  const ticketHTML = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: sans-serif; display: flex; justify-content: center; padding: 20px; color: #333; }
        .ticket { width: 350px; border: 2px solid #3b82f6; border-radius: 15px; padding: 20px; }
        .header { text-align: center; border-bottom: 2px dashed #ddd; margin-bottom: 15px; padding-bottom: 10px; }
        .title { font-weight: bold; font-size: 18px; color: #1e293b; }
        .section-title { font-size: 10px; font-weight: bold; color: #3b82f6; margin-top: 15px; text-transform: uppercase; }
        .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
        .val { font-weight: bold; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="header">
          <div class="title">TALLER ROSAS</div>
          <p style="font-size: 11px">Comprobante de Reserva</p>
        </div>
        <div class="section-title">Cita</div>
        <div class="row"><span>Fecha:</span> <span class="val">${fecha}</span></div>
        <div class="row"><span>Horario:</span> <span class="val">${hora} hs</span></div>
        <div class="section-title">Cliente</div>
        <div class="row"><span>Nombre:</span> <span class="val">${nombre.value}</span></div>
        <div class="section-title">Vehículo</div>
        <div class="row"><span>Moto:</span> <span class="val">${marca.value} ${modelo.value}</span></div>
        <div class="row"><span>Matrícula:</span> <span class="val">${matricula.value}</span></div>
        <div class="row"><span>Tipo:</span> <span class="val">${tipoTurno.value}</span></div>
        <div class="footer"><p>Rodo y Oribe, Mercedes, Soriano</p></div>
      </div>
      <script>window.print();<\/script>
    </body>
    </html>
  `;
  const blob = new Blob([ticketHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

const confirmarReserva = async () => {
  if (!nombre.value || !cedula.value) return; // Validación básica

  const datos = {
    nombre: nombre.value,
    cedula: cedula.value,
    telefono: telefono.value,
    marca: marca.value,
    modelo: modelo.value,
    km: km.value,
    matricula: matricula.value,
    tipo_turno: tipoTurno.value,
    fecha: fecha, // El que viene del query param
    hora: hora, // El que viene del query param
    detalles: detalles.value
  };

  try {
    // LLAMADA A ELECTRON
    const resultado = await window.api.guardarReserva(datos);
    if (resultado.success) {
      descargarTicket(); // Tu función de HTML
      alert("¡Reserva guardada en la base de datos!");
    } else {
      alert("Error: " + resultado.error);
    }
    router.push('/reservas');
  } catch (error) {
    console.error("Error al guardar:", error);
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto animate-in fade-in duration-500">
    <button @click="router.back()"
      class="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-6 font-medium group">
      <span class="group-hover:-translate-x-1 transition-transform">←</span> Volver a la agenda
    </button>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="space-y-6">
        <div class="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
          <h3 class="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Resumen de Cita</h3>
          <div class="space-y-4">
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-2xl">📅
              </div>
              <div>
                <p class="text-xs text-gray-500 font-bold uppercase">Fecha</p>
                <p class="text-gray-800 dark:text-white font-bold">{{ fecha }}</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-2xl">
                🕒</div>
              <div>
                <p class="text-xs text-gray-500 font-bold uppercase">Horario</p>
                <p class="text-gray-800 dark:text-white font-bold">{{ hora }} hs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="lg:col-span-2 bg-white dark:bg-[#1e293b] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-8">Datos de la Reserva</h2>

        <form class="space-y-6" @submit.prevent="descargarTicket">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-xs font-black text-gray-400 uppercase ml-1">Nombre Completo</label>
              <input v-model="nombre" type="text" placeholder="Ej: Rodrigo Rosas"
                class="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase ml-1">Cédula</label>
                <input v-model="cedula" type="text" placeholder="1.234.567-8" class="...">
              </div>

              <div class="space-y-2">
                <label class="text-xs font-black text-gray-400 uppercase ml-1">Teléfono de Contacto</label>
                <input v-model="telefono" type="tel" placeholder="099 123 456"
                  class="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all">
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="space-y-2">
              <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Marca</label>
              <input v-model="marca" type="text"
                class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white">
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Modelo</label>
              <input v-model="modelo" type="text"
                class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white">
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-black text-gray-400 uppercase ml-1">KM</label>
              <input v-model="km" type="number"
                class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white">
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Matrícula</label>
              <input v-model="matricula" type="text"
                class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white">
            </div>
          </div>

          <div class="space-y-3">
            <label class="text-xs font-black text-gray-400 uppercase ml-1">Tipo de Turno</label>
            <div class="grid grid-cols-3 gap-3">
              <button v-for="t in ['Service', 'Garantía', 'Taller']" :key="t" type="button" @click="tipoTurno = t"
                :class="[
                  'p-4 rounded-xl border-2 font-bold transition-all text-sm',
                  tipoTurno === t
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400'
                    : 'border-gray-100 dark:border-gray-800 text-gray-400'
                ]">
                {{ t }}
              </button>
            </div>
          </div>

          <div
            class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 min-h-[100px]">
            <p v-if="tipoTurno === 'Service'" class="text-gray-500 dark:text-gray-400 text-sm text-center italic">
              Mantenimiento programado según manual de fabricante.
            </p>
            <div v-else class="space-y-4">
              <textarea v-model="detalles"
                :placeholder="tipoTurno === 'Garantía' ? 'Describa el inconveniente por garantía...' : 'Describa el problema...'"
                class="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none dark:text-white h-24"></textarea>
            </div>
          </div>

          <button @click="confirmarReserva" :disabled="!nombre || !cedula || !matricula" :class="[
            'mt-8 w-full font-black py-5 rounded-2xl transition-all uppercase tracking-widest shadow-xl active:scale-95',
            (!nombre || !cedula || !matricula)
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
          ]">
            Confirmar y Descargar Ticket
          </button>
        </form>
      </div>
    </div>
  </div>
</template>