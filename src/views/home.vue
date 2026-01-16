<script setup lang="ts">
import { ref, onMounted } from 'vue'
// Estado
const fechaSeleccionada = ref(new Date().toISOString().split('T')[0])
const horarios = ref<string[]>([])
const horaSeleccionada = ref<string | null>(null)

// Simulación de carga
const cargarHorarios = () => {
  // Simulamos que el backend nos da intervalos de 1 hora
  const base = ["08:00 am", "09:00 am", "10:00 am", "11:00 am", "12:00 pm", "01:00 pm", "02:00 pm"]
  horarios.value = base
}

onMounted(cargarHorarios)

const seleccionar = (h: string) => {
  horaSeleccionada.value = h
}
</script>

<template>
  <div class="layout">
    <div class="card">
      <header class="card-header">
        <h2>Enero <span class="year">2026</span></h2>
      </header>

      <div class="calendar-section">
        <input type="date" v-model="fechaSeleccionada" @change="cargarHorarios" class="input-date" />
      </div>

      <div class="timezone-info">
        <span>Zona horaria</span>
        <strong>Montevideo (-3:00)</strong>
      </div>

      <div class="slots-container">
        <button 
          v-for="hora in horarios" 
          :key="hora"
          :class="['slot-btn', { active: horaSeleccionada === hora }]"
          @click="seleccionar(hora)"
        >
          {{ hora }}
        </button>
      </div>
      
      <footer v-if="horaSeleccionada" class="footer">
        <button class="confirm-btn">Confirmar {{ horaSeleccionada }}</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Estilos específicos para la vista Home */
@import url('../assets/styles/home.css');
</style>