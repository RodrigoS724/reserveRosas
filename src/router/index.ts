import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/home.vue'
import Confirmacion from '../views/confirmation.vue'

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
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router