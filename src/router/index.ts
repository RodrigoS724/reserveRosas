import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/home.vue'
import Confirmacion from '../views/confirmation.vue'
import Historial from '../views/historial.vue'
import Vehiculos from '../views/vehiculos.vue'
import Config from '../views/config.vue'
import Users from '../views/users.vue'

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
    path: '/vehiculos',
    name: 'Vehiculos',
    component: Vehiculos
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
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
