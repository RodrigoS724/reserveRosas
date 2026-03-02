<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const fecha = (route.query.fecha as string) || '2026-01-19'
const hora = (route.query.hora as string) || '11:00'

const nombre = ref('')
const cedula = ref('')
const telefono = ref('')
const matricula = ref('')
const marca = ref('')
const modelo = ref('')
const km = ref('')
const detalles = ref('')

const tipoTurno = ref<'Garantia' | 'Particular'>('Particular')
const particularTipo = ref<'Service' | 'Taller'>('Service')
const garantiaTipo = ref<'Service' | 'Reparacion'>('Service')
const garantiaFechaCompra = ref('')
const garantiaNumeroService = ref('')
const garantiaProblema = ref('')

const guardando = ref(false)
const validandoMysql = ref(false)
const existeMotoMysql = ref<boolean | null>(null)

const baseInputClass = 'w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none transition-all dark:text-white'
const smallInputClass = 'w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none transition-all dark:text-white'
const successClass = 'border-blue-500/50 ring-2 ring-blue-500/10 bg-blue-50/30 dark:bg-blue-900/10'
const errorClass = 'border-red-500/50 ring-2 ring-red-500/10 bg-red-50/30 dark:bg-red-900/10'

const normalizarMatricula = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')
const matriculaValidaUy = (value: string) => /^[A-Z]{3}\d{3,4}$/.test(normalizarMatricula(value))
const normalizarCedula = (value: string) => value.replace(/\D/g, '')

const validarCedulaUy = (value: string) => {
  const digitsRaw = normalizarCedula(value)
  if (digitsRaw.length < 7 || digitsRaw.length > 8) return false
  const digits = digitsRaw.padStart(8, '0').split('').map((d) => parseInt(d, 10))
  const weights = [2, 9, 8, 7, 6, 3, 4]
  let sum = 0
  for (let i = 0; i < 7; i++) sum += digits[i] * weights[i]
  const check = (10 - (sum % 10)) % 10
  return check === digits[7]
}

const formatCedula = (value: string) => {
  let limpio = normalizarCedula(value)
  if (limpio.length > 8) limpio = limpio.slice(0, 8)
  if (limpio.length > 7) return limpio.replace(/^(\d)(\d{3})(\d{3})(\d{1})$/, '$1.$2.$3-$4')
  if (limpio.length > 6) return limpio.replace(/^(\d{1,2})(\d{3})(\d{3})(\d{1})$/, '$1.$2.$3-$4')
  return limpio
}

const normalizarTelefonoUy = (value: string) => {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('598')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.startsWith('9')) digits = digits.slice(1)
  return `09${digits}`.slice(0, 9)
}

const telefonoValidoUy = (value: string) => /^0\d{8}$/.test(value)

const isParticular = computed(() => tipoTurno.value === 'Particular')
const isGarantia = computed(() => tipoTurno.value === 'Garantia')
const isParticularService = computed(() => isParticular.value && particularTipo.value === 'Service')
const isParticularTaller = computed(() => isParticular.value && particularTipo.value === 'Taller')
const isGarantiaService = computed(() => isGarantia.value && garantiaTipo.value === 'Service')
const isGarantiaReparacion = computed(() => isGarantia.value && garantiaTipo.value === 'Reparacion')

const nombreValido = computed(() => nombre.value.trim().split(/\s+/).length >= 2)
const cedulaValida = computed(() => validarCedulaUy(cedula.value))
const telefonoValido = computed(() => telefonoValidoUy(telefono.value))
const matriculaValida = computed(() => matriculaValidaUy(matricula.value))
const marcaValida = computed(() => marca.value.trim().length > 0)
const modeloValido = computed(() => modelo.value.trim().length > 0)
const kmValido = computed(() => /^\d+$/.test(km.value.trim()))
const garantiaFechaCompraValida = computed(() => garantiaFechaCompra.value.trim().length > 0)
const garantiaNumeroServiceValida = computed(() => /^\d+$/.test(garantiaNumeroService.value.trim()))
const garantiaProblemaValido = computed(() => garantiaProblema.value.trim().length > 0)
const detallesTallerValidos = computed(() => detalles.value.trim().length > 0)

const esValido = computed(() => {
  if (
    !nombreValido.value ||
    !cedulaValida.value ||
    !telefonoValido.value ||
    !matriculaValida.value ||
    !marcaValida.value ||
    !modeloValido.value
  ) return false

  if (existeMotoMysql.value !== true) return false

  if (isParticularService.value) return kmValido.value
  if (isParticularTaller.value) return detallesTallerValidos.value
  if (isGarantiaService.value) return garantiaFechaCompraValida.value && kmValido.value && garantiaNumeroServiceValida.value
  if (isGarantiaReparacion.value) return garantiaProblemaValido.value
  return false
})

const validarMotoEnMysql = async (mat: string) => {
  validandoMysql.value = true
  try {
    const vehiculo = await window.api.obtenerVehiculoMysqlPorMatricula(mat)
    if (!vehiculo) {
      existeMotoMysql.value = false
      return
    }
    existeMotoMysql.value = true
    if (vehiculo.marca) marca.value = vehiculo.marca
    if (vehiculo.modelo) modelo.value = vehiculo.modelo
  } catch (error) {
    console.error('[Confirmation] Error validando matricula en MySQL:', error)
    existeMotoMysql.value = null
  } finally {
    validandoMysql.value = false
  }
}

watch(cedula, (value) => {
  const formatted = formatCedula(value)
  if (formatted !== value) cedula.value = formatted
})

watch(telefono, (value) => {
  const formatted = normalizarTelefonoUy(value)
  if (formatted !== value) telefono.value = formatted
})

watch(matricula, async (value) => {
  const normalized = normalizarMatricula(value).slice(0, 7)
  if (normalized !== value) matricula.value = normalized

  if (!matriculaValidaUy(normalized)) {
    existeMotoMysql.value = null
    return
  }

  await validarMotoEnMysql(normalized)
})

watch(tipoTurno, (tipo) => {
  km.value = ''
  detalles.value = ''
  garantiaFechaCompra.value = ''
  garantiaNumeroService.value = ''
  garantiaProblema.value = ''
  if (tipo === 'Particular') particularTipo.value = 'Service'
  else garantiaTipo.value = 'Service'
})

watch(particularTipo, () => {
  km.value = ''
  detalles.value = ''
})

watch(garantiaTipo, () => {
  km.value = ''
  garantiaFechaCompra.value = ''
  garantiaNumeroService.value = ''
  garantiaProblema.value = ''
})

const confirmarReserva = async () => {
  if (!esValido.value) {
    alert('Por favor completa los campos requeridos correctamente.')
    return
  }

  try {
    const horariosDisponibles = await window.api.obtenerHorariosDisponibles(fecha)
    const horaDisponible = horariosDisponibles.some((h: any) => h.hora === hora)
    if (!horaDisponible) {
      alert('Este horario ya no está disponible. Por favor selecciona otro.')
      return
    }
  } catch {
    alert('Error al verificar disponibilidad. Intenta de nuevo.')
    return
  }

  guardando.value = true
  const datos = {
    nombre: nombre.value.trim(),
    cedula: normalizarCedula(cedula.value),
    telefono: telefono.value.trim(),
    marca: marca.value.trim(),
    modelo: modelo.value.trim(),
    km: (isParticularService.value || isGarantiaService.value) ? km.value.trim() : '',
    matricula: normalizarMatricula(matricula.value),
    tipo_turno: tipoTurno.value === 'Garantia' ? 'GarantÃ­a' : 'Particular',
    particular_tipo: isParticular.value ? particularTipo.value : null,
    garantia_tipo: isGarantia.value
      ? (garantiaTipo.value === 'Reparacion' ? 'ReparaciÃ³n' : 'Service')
      : null,
    garantia_fecha_compra: isGarantiaService.value ? garantiaFechaCompra.value.trim() : null,
    garantia_numero_service: isGarantiaService.value ? garantiaNumeroService.value.trim() : null,
    garantia_problema: isGarantiaReparacion.value ? garantiaProblema.value.trim() : null,
    fecha,
    hora,
    detalles: isParticularTaller.value ? detalles.value.trim() : ''
  }

  try {
    const resultado = await window.api.crearReserva(datos as any)
    if (resultado && typeof resultado === 'number' && resultado > 0) {
      alert('Reserva guardada exitosamente!')
      router.push('/reservas')
    } else {
      alert('Error: No se pudo guardar la reserva.')
    }
  } catch (error) {
    alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="w-full h-full min-h-0 flex flex-col items-center justify-center">
    <button
      @click="router.back()"
      class="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-4 sm:mb-5 md:mb-6 font-medium group text-sm md:text-base"
    >
      <span class="group-hover:-translate-x-1 transition-transform">←</span> Volver a la agenda
    </button>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 w-full max-w-6xl flex-1 min-h-0">
      <div class="space-y-6 min-h-0 flex-1">
        <div class="bg-white dark:bg-[#1e293b] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800">
          <h3 class="text-xs sm:text-sm font-black text-gray-400 uppercase tracking-widest mb-3 sm:mb-4">Resumen de Cita</h3>
          <div class="space-y-3 sm:space-y-4">
            <div>
              <p class="text-[10px] sm:text-xs text-gray-500 font-bold uppercase">Fecha</p>
              <p class="text-sm sm:text-base text-gray-800 dark:text-white font-bold">{{ fecha }}</p>
            </div>
            <div>
              <p class="text-[10px] sm:text-xs text-gray-500 font-bold uppercase">Horario</p>
              <p class="text-sm sm:text-base text-gray-800 dark:text-white font-bold">{{ hora }} hs</p>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2 bg-white dark:bg-[#1e293b] p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 min-h-0 flex flex-col">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-6 sm:mb-7 md:mb-8">Datos de la Reserva</h2>
        <form class="space-y-4 sm:space-y-5 md:space-y-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar" @submit.prevent="confirmarReserva">
          <div class="space-y-2">
            <label class="text-[10px] sm:text-xs font-black text-gray-400 uppercase ml-1">Nombre completo</label>
            <input v-model="nombre" type="text" placeholder="Ej: Rodrigo Rosas" :class="[baseInputClass, nombre && !nombreValido ? errorClass : (nombreValido ? successClass : '')]">
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div class="space-y-2">
              <label class="text-[10px] sm:text-xs font-black text-gray-400 uppercase ml-1">Cédula</label>
              <input v-model="cedula" type="text" placeholder="1.234.567-8" :class="[baseInputClass, cedula && !cedulaValida ? errorClass : (cedulaValida ? successClass : '')]">
            </div>
            <div class="space-y-2">
              <label class="text-[10px] sm:text-xs font-black text-gray-400 uppercase ml-1">Teléfono</label>
              <input v-model="telefono" type="tel" placeholder="099111111" :class="[baseInputClass, telefono && !telefonoValido ? errorClass : (telefonoValido ? successClass : '')]">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <div class="space-y-2">
              <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Matrícula</label>
              <input v-model="matricula" type="text" placeholder="ABC1234" :class="[smallInputClass, matricula && !matriculaValida ? errorClass : (matriculaValida ? successClass : '')]">
              <p v-if="validandoMysql" class="text-[10px] text-gray-500">Validando en MySQL...</p>
              <p v-else-if="existeMotoMysql === true" class="text-[10px] text-emerald-600">Moto encontrada en MySQL</p>
              <p v-else-if="existeMotoMysql === false" class="text-[10px] text-rose-600">La matrícula no existe en MySQL</p>
              <p v-else-if="matriculaValida && existeMotoMysql === null" class="text-[10px] text-amber-600">No se pudo validar en MySQL</p>
            </div>
            <div class="space-y-2">
              <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Marca</label>
              <input v-model="marca" type="text" :class="[smallInputClass, marca && !marcaValida ? errorClass : (marcaValida ? successClass : '')]">
            </div>
            <div class="space-y-2">
              <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Modelo</label>
              <input v-model="modelo" type="text" :class="[smallInputClass, modelo && !modeloValido ? errorClass : (modeloValido ? successClass : '')]">
            </div>
          </div>

          <div class="space-y-2 sm:space-y-3">
            <label class="text-[10px] sm:text-xs font-black text-gray-400 uppercase ml-1">Tipo de turno</label>
            <div class="grid grid-cols-2 gap-2 sm:gap-3">
              <button type="button" @click="tipoTurno = 'Particular'" :class="['p-4 rounded-xl border-2 font-bold transition-all text-sm', tipoTurno === 'Particular' ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-600' : 'border-gray-100 dark:border-gray-800 text-gray-400']">Particular</button>
              <button type="button" @click="tipoTurno = 'Garantia'" :class="['p-4 rounded-xl border-2 font-bold transition-all text-sm', tipoTurno === 'Garantia' ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-600' : 'border-gray-100 dark:border-gray-800 text-gray-400']">Garantía</button>
            </div>
          </div>

          <div v-if="isParticular" class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
            <label class="text-[10px] sm:text-xs font-black text-gray-400 uppercase ml-1">Subtipo particular</label>
            <div class="grid grid-cols-2 gap-2 sm:gap-3">
              <button type="button" @click="particularTipo = 'Service'" :class="['p-4 rounded-xl border-2 font-bold transition-all text-sm', particularTipo === 'Service' ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-600' : 'border-gray-100 dark:border-gray-800 text-gray-400']">Service</button>
              <button type="button" @click="particularTipo = 'Taller'" :class="['p-4 rounded-xl border-2 font-bold transition-all text-sm', particularTipo === 'Taller' ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-600' : 'border-gray-100 dark:border-gray-800 text-gray-400']">Taller</button>
            </div>
            <div v-if="isParticularService" class="space-y-2">
              <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">KM</label>
              <input v-model="km" type="text" inputmode="numeric" :class="[smallInputClass, km && !kmValido ? errorClass : (kmValido ? successClass : '')]">
            </div>
            <div v-if="isParticularTaller" class="space-y-2">
              <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Reparación a realizar</label>
              <textarea v-model="detalles" class="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white h-24" placeholder="Describe la reparación..." />
            </div>
          </div>

          <div v-if="isGarantia" class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
            <label class="text-[10px] sm:text-xs font-black text-gray-400 uppercase ml-1">Subtipo garantía</label>
            <div class="grid grid-cols-2 gap-2 sm:gap-3">
              <button type="button" @click="garantiaTipo = 'Service'" :class="['p-4 rounded-xl border-2 font-bold transition-all text-sm', garantiaTipo === 'Service' ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-600' : 'border-gray-100 dark:border-gray-800 text-gray-400']">Service</button>
              <button type="button" @click="garantiaTipo = 'Reparacion'" :class="['p-4 rounded-xl border-2 font-bold transition-all text-sm', garantiaTipo === 'Reparacion' ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-600' : 'border-gray-100 dark:border-gray-800 text-gray-400']">Reparación</button>
            </div>
            <div v-if="isGarantiaService" class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="space-y-2">
                <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Fecha compra</label>
                <input v-model="garantiaFechaCompra" type="date" :class="[smallInputClass, garantiaFechaCompra && !garantiaFechaCompraValida ? errorClass : (garantiaFechaCompraValida ? successClass : '')]">
              </div>
              <div class="space-y-2">
                <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">KM</label>
                <input v-model="km" type="text" inputmode="numeric" :class="[smallInputClass, km && !kmValido ? errorClass : (kmValido ? successClass : '')]">
              </div>
              <div class="space-y-2">
                <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Nº service</label>
                <input v-model="garantiaNumeroService" type="text" inputmode="numeric" :class="[smallInputClass, garantiaNumeroService && !garantiaNumeroServiceValida ? errorClass : (garantiaNumeroServiceValida ? successClass : '')]">
              </div>
            </div>
            <div v-if="isGarantiaReparacion" class="space-y-2">
              <label class="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-400 uppercase ml-1">Descripción del problema</label>
              <textarea v-model="garantiaProblema" class="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white h-24" placeholder="Describe el problema..." />
            </div>
          </div>

          <button type="submit" :disabled="!esValido || guardando" :class="['mt-8 w-full font-black py-5 rounded-2xl transition-all uppercase tracking-widest shadow-xl', !esValido ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20']">
            {{ guardando ? 'Guardando...' : 'Confirmar Reserva' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
