import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/home.vue'
import Confirmacion from '../views/confirmation.vue'
import Historial from '../views/historial.vue'
import Clientes from '../views/client.vue'
import Vehiculos from '../views/vehiculos.vue'
import Mecanicos from '../views/mecanicos.vue'
import Ingresos from '../views/ingresos.vue'
import Config from '../views/config.vue'
import Users from '../views/users.vue'
import Auditoria from '../views/auditoria.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/confirmacion',
    name: 'Confirmacion',
    component: Confirmacion
  },
  {
    path: '/historial',
    name: 'Historial',
    component: Historial
  },
  {
    path: '/clientes',
    name: 'Clientes',
    component: Clientes
  },
  {
    path: '/vehiculos',
    name: 'Vehiculos',
    component: Vehiculos
  },
  {
    path: '/ingresos',
    name: 'Ingresos',
    component: Ingresos
  },
  {
    path: '/mecanicos',
    name: 'Mecanicos',
    component: Mecanicos
  },
  {
    path: '/config',
    name: 'Config',
    component: Config
  },
  {
    path: '/usuarios',
    name: 'Usuarios',
    component: Users
  },
  {
    path: '/auditoria',
    name: 'Auditoria',
    component: Auditoria
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
