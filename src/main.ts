import { createApp } from 'vue'
import './main.css' // <--- Esta línea es la que conecta el CSS con el programa
import App from './App.vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import Confirmacion from './views/confirmation.vue'
import Home from './views/home.vue'
import Reservas from './views/reserve.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/confirmacion', component: Confirmacion },
    { path: '/clientes', component: () => import('./views/client.vue') },
    { path: '/motos', component: () => import('./views/motos.vue') },
    { path: '/ajustes', component: () => import('./views/preferences.vue') },
    { path: '/reservas', component: Reservas },
  ]
})



createApp(App).use(router).mount('#app')