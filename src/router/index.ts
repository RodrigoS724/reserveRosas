import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/home.vue'
import Confirmacion from '../views/confirmation.vue'
import Historial from '../views/historial.vue'

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
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router