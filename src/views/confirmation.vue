<template>
  <div class="layout-confirmacion">
    <div class="ticket">
      <div class="icon-check">✓</div>
      <h1>¡Turno Reservado!</h1>
      <p class="subtitle">Se ha agendado tu cita correctamente.</p>
      
      <div class="detalles">
        <div class="dato">
          <span>Fecha:</span>
          <strong>15 de Enero, 2026</strong>
        </div>
        <div class="dato">
          <span>Hora:</span>
          <strong>10:00 am</strong>
        </div>
      </div>

      <button @click="$router.push('/')" class="btn-volver">
        Volver al inicio
      </button>
    </div>
  </div>
</template>

<style scoped>
.layout-confirmacion {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.ticket {
  background: white;
  padding: 40px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  max-width: 350px;
}

.icon-check {
  background: #28a745;
  color: white;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 30px;
  margin: 0 auto 20px;
}

.detalles {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 10px;
  margin: 20px 0;
}

.dato {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.btn-volver {
  background: #444;
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
}
</style>