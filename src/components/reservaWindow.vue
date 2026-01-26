<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
    reserva: any | null
}>()

const emit = defineEmits(['cerrar', 'actualizar'])

const editable = ref<any | null>(null)
const mostrandoConfirmacion = ref(false)

watch(
    () => props.reserva,
    (nueva) => {
        editable.value = nueva ? { ...nueva } : null
    },
    { immediate: true }
)

const guardar = async () => {
    if (!editable.value) return

    try {
        const reservaPlana = JSON.parse(JSON.stringify(editable.value))
        await window.api.actualizarReserva(reservaPlana)

        emit('actualizar')
        emit('cerrar')
    } catch (e) {
        console.error('Error al guardar reserva', e)
        alert('No se pudo guardar la reserva')
    }
}

const cancelarReserva = async () => {
    if (!editable.value) return

    try {
        await window.api.borrarReserva(editable.value.id)
        alert('Reserva cancelada exitosamente')
        emit('actualizar')
        emit('cerrar')
    } catch (e) {
        console.error('Error al cancelar reserva', e)
        alert('No se pudo cancelar la reserva')
    }
}


</script>

<template>
    <div v-if="editable" class="overlay" @click.self="$emit('cerrar')">
        <div class="window">

            <!-- HEADER -->
            <div class="window-header">
                <span>Reserva #{{ editable.id }}</span>
                <button @click="$emit('cerrar')">✕</button>
            </div>

            <!-- BODY -->
            <div class="window-body">

                <div class="campo">
                    <label>Nombre</label>
                    <input v-model="editable.nombre" />
                </div>

                <div class="campo">
                    <label>Cédula</label>
                    <input v-model="editable.cedula" disabled />
                </div>

                <div class="campo">
                    <label>Fecha</label>
                    <input v-model="editable.fecha" type="date" />
                </div>

                <div class="campo">
                    <label>Hora</label>
                    <input v-model="editable.hora" type="time" />
                </div>

                <div class="campo">
                    <label>Estado</label>
                    <select v-model="editable.estado" class="select-estado" :class="editable.estado">
                        <option value="pendiente">Pendiente</option>
                        <option value="revision">En revisión</option>
                        <option value="pronto">Pronto</option>
                        <option value="cancelada">Cancelada</option>
                    </select>
                </div>

                <div class="campo">
                    <label>Observaciones</label>
                    <textarea v-model="editable.detalles" />
                </div>

            </div>

            <!-- FOOTER -->
            <div v-if="!mostrandoConfirmacion" class="window-footer">
                <button class="btn-cancelar" @click="$emit('cerrar')">Cerrar</button>
                <button class="btn-eliminar" @click="mostrandoConfirmacion = true">Cancelar Reserva</button>
                <button class="btn-guardar" @click="guardar">Guardar</button>
            </div>

            <!-- CONFIRMACIÓN DE CANCELACIÓN -->
            <div v-else class="window-footer confirmation-footer">
                <div class="confirmation-message">
                    ¿Estás seguro de cancelar esta reserva?
                </div>
                <div class="confirmation-buttons">
                    <button class="btn-cancelar" @click="mostrandoConfirmacion = false">No, volver</button>
                    <button class="btn-confirmar-eliminar" @click="cancelarReserva">Sí, cancelar</button>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}

.window {
    width: 460px;
    background: #020617;
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 30px 80px rgba(0, 0, 0, .6);
    max-height: 80vh;
    overflow-y: auto;
}

.window-header,
.window-footer {
    padding: 14px 18px;
    border-bottom: 1px solid #1e293b;
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
    font-weight: bold;
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
    flex: 1;
    overflow-y: auto;
}

.campo {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 14px;
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
    color: white;
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
    min-height: 60px;
    font-family: inherit;
}

.campo input:disabled {
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
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: 0.2s;
    border: none;
}

.btn-guardar:hover {
    background: #2563eb;
}

.btn-eliminar {
    background: #ef4444;
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: 0.2s;
    border: none;
}

.btn-eliminar:hover {
    background: #dc2626;
}

.btn-confirmar-eliminar {
    background: #dc2626;
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: 0.2s;
    border: none;
}

.btn-confirmar-eliminar:hover {
    background: #b91c1c;
}

.select-estado {
    background-color: #0f172a;
    border: 1px solid #1e293b;
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-weight: 600;
    appearance: none;
    cursor: pointer;
}

/* Flecha custom */
.select-estado {
    background-image:
        linear-gradient(45deg, transparent 50%, #94a3b8 50%),
        linear-gradient(135deg, #94a3b8 50%, transparent 50%);
    background-position:
        calc(100% - 18px) calc(50% - 3px),
        calc(100% - 12px) calc(50% - 3px);
    background-size: 6px 6px, 6px 6px;
    background-repeat: no-repeat;
}

/* Hover */
.select-estado:hover {
    border-color: #38bdf8;
}

/* Focus */
.select-estado:focus {
    outline: none;
    border-color: #38bdf8;
    box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.5);
}

/* Opciones */
.select-estado option {
    background: #020617;
    color: white;
}

.select-estado.pendiente {
    border-color: #fbbf24;
}

.select-estado.pronto {
    border-color: #4ade80;
}

.select-estado.revision {
    border-color: #93c5fd;
}

.select-estado.cancelada {
    border-color: #f87171;
}
</style>
