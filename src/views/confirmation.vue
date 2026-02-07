<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Datos que vienen del Home
const fecha = route.query.fecha as string || '2026-01-19'
const hora = route.query.hora as string || '11:00'

// Estado del Formulario
const nombre = ref('')
const cedula = ref('')
const telefono = ref('')
const marca = ref('')
const modelo = ref('')
const km = ref('')
const matricula = ref('')
const tipoTurno = ref<'Garantía' | 'Particular'>('Particular')
const particularTipo = ref<'Service' | 'Taller'>('Service')
const detalles = ref('')
const garantiaTipo = ref<'Reparación' | 'Service'>('Reparación')
const garantiaFechaCompra = ref('')
const garantiaNumeroService = ref('')
const garantiaProblema = ref('')
const guardando = ref(false)

// CLASES UTILITARIAS
const baseInputClass = "w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none transition-all dark:text-white"
const smallInputClass = "w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none transition-all dark:text-white"
const successClass = "border-blue-500/50 ring-2 ring-blue-500/10 bg-blue-50/30 dark:bg-blue-900/10"
const errorClass = "border-red-500/50 ring-2 ring-red-500/10 bg-red-50/30 dark:bg-red-900/10"

onMounted(() => {
  console.log(" API disponible:", !!window.api)
})

// --- LÓGICA DE FORMATEO AUTOMÁTICO DE CÉDULA ---
watch(cedula, (nuevoValor) => {
  let limpio = nuevoValor.replace(/\D/g, '')
  if (limpio.length > 8) limpio = limpio.slice(0, 8)
  if (limpio.length > 7) {
    limpio = limpio.replace(/^(\d)(\d{3})(\d{3})(\d{1})$/, '$1.$2.$3-$4')
  } else if (limpio.length > 6) {
    limpio = limpio.replace(/^(\d{1,2})(\d{3})(\d{3})(\d{1})$/, '$1.$2.$3-$4')
  }
  if (limpio !== nuevoValor) {
    cedula.value = limpio
  }
})

const descargarTicket = () => {
  const garantiaSection = tipoTurno.value === 'Garantía'
    ? `
        <div class="section-title">Garantía</div>
        <div class="row"><span>Tipo:</span> <span class="val">${garantiaTipo.value} en garantía</span></div>
        <div class="row"><span>Fecha de compra:</span> <span class="val">${garantiaFechaCompra.value}</span></div>
        ${garantiaTipo.value === 'Service' ? `<div class="row"><span>Número de service:</span> <span class="val">${garantiaNumeroService.value}</span></div>`
          : `<div class="row"><span>Problema:</span> <span class="val">${garantiaProblema.value}</span></div>`
        }
      `
    : ''

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
        <div class="row"><span>Tipo:</span> <span class="val">${tipoTurno.value}${tipoTurno.value === 'Particular' ? ` - ${particularTipo.value}` : ''}</span></div>
        ${garantiaSection}
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
  console.log('[Confirmation] Validando formulario...')
  if (!esValido.value) {
    console.log('[Confirmation] Validación fallida')
    alert('Por favor completa los campos requeridos correctamente.')
    return
  }

  // Validar que el horario siga disponible
  console.log('[Confirmation] Verificando disponibilidad de horario:', fecha, hora)
  try {
    const horariosDisponibles = await window.api.obtenerHorariosDisponibles(fecha)
    const horaDisponible = horariosDisponibles.some((h: any) => h.hora === hora)

    if (!horaDisponible) {
      console.warn('[Confirmation] Horario ya no está disponible:', hora)
      alert('Este horario ya no está disponible. Por favor selecciona otro.')
      return
    }
    console.log('[Confirmation] Horario validado correctamente')
  } catch (error) {
    console.error('[Confirmation] Error verificando disponibilidad:', error)
    alert('Error al verificar disponibilidad. Intenta de nuevo.')
    return
  }

  console.log('[Confirmation] Validación exitosa, iniciando guardado...')
  guardando.value = true

  const datos = {
    nombre: nombre.value.trim(),
    cedula: cedula.value.trim().replace(/[\.\-]/g, ''),
    telefono: telefono.value.trim(),
    marca: marca.value.trim(),
    modelo: modelo.value.trim(),
    km: String(km.value),
    matricula: matricula.value.trim(),
    tipo_turno: tipoTurno.value,
    particular_tipo: tipoTurno.value === 'Particular' ? particularTipo.value : null,
    garantia_tipo: tipoTurno.value === 'Garantía' ? garantiaTipo.value : null,
    garantia_fecha_compra: tipoTurno.value === 'Garantía' ? garantiaFechaCompra.value.trim() : null,
    garantia_numero_service: tipoTurno.value === 'Garantía' && garantiaTipo.value === 'Service'
      ? garantiaNumeroService.value.trim()
      : null,
    garantia_problema: tipoTurno.value === 'Garantía' && garantiaTipo.value === 'Reparación'
      ? garantiaProblema.value.trim()
      : null,
    fecha,
    hora,
    detalles: detalles.value.trim()
  };

  console.log('[Confirmation] Enviando datos a IPC:', datos)

  try {
    console.log('[Confirmation] Esperando respuesta de crearReserva...')
    const resultado = await window.api.crearReserva(datos);
    console.log('[Confirmation] Resultado recibido:', resultado, typeof resultado);
    if (resultado && typeof resultado === 'number' && resultado > 0) {
      console.log('[Confirmation] Reserva guardada con éxito, ID:', resultado)
      descargarTicket();
      alert("Reserva guardada exitosamente!");
      router.push('/reservas');
    } else {
      console.log('[Confirmation] Resultado inválido:', resultado)
      alert("Error: No se pudo guardar la reserva.");
    }
  } catch (error) {
    console.error("[Confirmation] Error al guardar:", error);
    alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  } finally {
    console.log('[Confirmation] Reseteando estado guardando...')
    guardando.value = false
  }
}

// VALIDACIONES
const cedulaValida = computed(() => cedula.value.length >= 9)
const telefonoValido = computed(() => telefono.value.replace(/\s/g, '').length >= 8)
const nombreValido = computed(() => nombre.value.trim().split(' ').length >= 2)
const matriculaValida = computed(() => matricula.value.trim().length >= 6)
const garantiaFechaCompraValida = computed(() => garantiaFechaCompra.value.trim().length > 0)
const garantiaNumeroServiceValida = computed(() => garantiaNumeroService.value.trim().length > 0)
const garantiaProblemaValido = computed(() => garantiaProblema.value.trim().length > 0)
const garantiaValida = computed(() => {
  if (tipoTurno.value !== 'Garantía') return true
  if (!garantiaFechaCompraValida.value) return false
  if (garantiaTipo.value === 'Service') return garantiaNumeroServiceValida.value
  return garantiaProblemaValido.value
})

const esValido = computed(() => {
  return nombreValido.value && cedulaValida.value && telefonoValido.value &&
    marca.value && modelo.value && matriculaValida.value && garantiaValida.value
})
</script>


<template>

<div class="w-full h-full min-h-0 flex flex-col items-center justify-center">
  <button
    @click="router.back()"
    class="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-4 sm:mb-5 md:mb-6 font-medium group text-sm md:text-base">
    <span class="group-hover:-translate-x-1 transition-transform">←</span> Volver a la agenda
  </button>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 w-full max-w-6xl flex-1 min-h-0">
    <div class="space-y-6 min-h-0 flex-1">
      <div
        class="bg-white dark:bg-[#1e293b] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 class="text-xs sm:text-sm font-black text-gray-400 uppercase tracking-widest mb-3 sm:mb-4">Resumen de Cita
        </h3>
        <div class="space-y-3 sm:space-y-4">
          <div class="flex items-center gap-3 sm:gap-4">
            <div
              class="w-10 sm:w-12 h-10 sm:h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl">
              </div>
            <div>
              <p class="text-[10px] sm:text-xs text-gray-500 font-bold uppercase">Fecha</p>
              <p class="text-sm sm:text-base text-gray-800 dark:text-white font-bold">{{ fecha }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 sm:gap-4">
            <div
              class="w-10 sm:w-12 h-10 sm:h-12 bg-purple-50 dark:bg-purple-900/30 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl">
              </div>
            <div>
              <p class="text-[10px] sm:text-xs text-gray-500 font-bold uppercase">Horario</p>
              <p class="text-sm sm:text-base text-gray-800 dark:text-white font-bold">{{ hora }} hs</p>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-blue-600 p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-lg text-white">
        <p class="text-xs sm:text-sm opacity-80 mb-1 font-medium">Ubicación</p>
        <p class="text-sm sm:text-base font-bold flex items-center gap-2"> Taller Central Rosas</p>
      </div>
    </div>
    <div
      class="lg:col-span-2 bg-white dark:bg-[#1e293b] p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 min-h-0 flex flex-col">
      <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-6 sm:mb-7 md:mb-8">Datos
        de la Reserva</h2>
      <form class="space-y-4 sm:space-y-5 md:space-y-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar" @submit.prevent="confirmarReserva">
        <div class="flex flex-col gap-3 sm:gap-4">
          <div class="space-y-2">
            <label class="text-[10px] sm:text-xs font-black text-gray-400 uppercase ml-1">Nombre Completo</label>
            <input v-model="nombre" type="text" placeholder="Ej: Rodrigo Rosas"
              :class="[baseInputClass, nombre && !nombreValido ? errorClass : (nombreValido ? successClass : '')]">
          </div>
          <div class="space-y-2">
            <label class="text-[10px] sm:text-xs font-black text-gray-400 uppercase ml-1">Cédula</label>
            <input v-model="cedula" type="text" placeholder="1.234.567-8"
              :class="[baseInputClass, cedula && !cedulaValida ? errorClass : (cedulaValida ? successClass : '')]">
          </div>
          <div class="space-y-2">
            <label class="text-[10px] sm:text-xs font-black text-gray-400 uppercase ml-1">Teléfono de Contacto</label>
            <input v-model="telefono" type="tel" placeholder="099 123 456"
              :class="[baseInputClass, telefono && !telefonoValido ? errorClass : (telefonoValido ? successClass : '')]">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
          <div class="space-y-2">
            <label
              class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Marca</label>
            <input v-model="marca" type="text" :class="smallInputClass">
          </div>
          <div class="space-y-2">
            <label
              class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Modelo</label>
            <input v-model="modelo" type="text" :class="smallInputClass">
          </div>
          <div class="space-y-2">
            <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">KM</label>
            <input v-model="km" type="number" :class="smallInputClass">
          </div>
          <div class="space-y-2">
            <label
              class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Matrícula</label>
            <input v-model="matricula" type="text" placeholder="ABC 1234"
              :class="[smallInputClass, matricula && !matriculaValida ? errorClass : (matriculaValida ? successClass : '')]">
          </div>
        </div>
        <div class="space-y-2 sm:space-y-3">
          <label class="text-[10px] sm:text-xs font-black text-gray-400 uppercase ml-1 text-balance">Tipo de
            Turno</label>
          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <button v-for="t in ['Garantía', 'Particular'] as const" :key="t" type="button" @click="tipoTurno = t"
              :class="['p-4 rounded-xl border-2 font-bold transition-all text-sm',
                tipoTurno === t ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-600' : 'border-gray-100 dark:border-gray-800 text-gray-400']">
              {{ t }}
            </button>
          </div>
        </div>
        <div v-if="tipoTurno === 'Garantía'" class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <div class="space-y-2">
              <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Fecha de compra</label>
              <input v-model="garantiaFechaCompra" type="date"
                :class="[smallInputClass, garantiaFechaCompra && !garantiaFechaCompraValida ? errorClass : (garantiaFechaCompraValida ? successClass : '')]">
            </div>
            <div class="space-y-2">
              <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Tipo de garantía</label>
              <select v-model="garantiaTipo" :class="smallInputClass">
                <option value="Reparación">Reparación en garantía</option>
                <option value="Service">Service en garantía</option>
              </select>
            </div>
          </div>
          <div v-if="garantiaTipo === 'Service'" class="space-y-2">
            <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Número de service</label>
            <input v-model="garantiaNumeroService" type="text" placeholder="Ej: SVC-1234"
              :class="[smallInputClass, garantiaNumeroService && !garantiaNumeroServiceValida ? errorClass : (garantiaNumeroServiceValida ? successClass : '')]">
          </div>
          <div v-else class="space-y-2">
            <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Descripción del problema</label>
            <textarea v-model="garantiaProblema"
              class="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white h-24"
              placeholder="Describe el problema..."></textarea>
          </div>
        </div>
        <div v-else class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
          <div class="space-y-2">
            <label class="text-[10px] sm:text-xs font-black text-gray-400 uppercase ml-1 text-balance">Tipo Particular</label>
            <div class="grid grid-cols-2 gap-2 sm:gap-3">
              <button v-for="t in ['Service', 'Taller'] as const" :key="t" type="button" @click="particularTipo = t"
                :class="['p-4 rounded-xl border-2 font-bold transition-all text-sm',
                  particularTipo === t ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-600' : 'border-gray-100 dark:border-gray-800 text-gray-400']">
                {{ t }}
              </button>
            </div>
          </div>
          <div>
            <textarea v-if="particularTipo === 'Taller'" v-model="detalles"
              class="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white h-24"
              placeholder="Detalles..."></textarea>
            <p v-else class="text-gray-500 text-center italic text-sm">Mantenimiento programado.</p>
          </div>
        </div>
        <button type="submit" :disabled="!esValido || guardando"
          :class="['mt-8 w-full font-black py-5 rounded-2xl transition-all uppercase tracking-widest shadow-xl',
            !esValido ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20']">
          {{ guardando ? '⏳ Guardando...' : 'Confirmar y Descargar Ticket' }}
        </button>
      </form>
    </div>
  </div>
</div>
</template>




