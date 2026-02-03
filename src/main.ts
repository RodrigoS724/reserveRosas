import { createApp } from 'vue'
import './main.css' // <--- Esta línea es la que conecta el CSS con el programa
import App from './App.vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import Confirmacion from './views/confirmation.vue'
import Home from './views/home.vue'
import Reservas from './views/reserve.vue'
import adminHorarios from './views/adminHorarios.vue'
import historial from './views/historial.vue'
import vehiculos from './views/vehiculos.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/confirmacion', component: Confirmacion },
    { path: '/clientes', component: () => import('./views/client.vue') },
    { path: '/historial', component: historial },
    { path: '/vehiculos', component: vehiculos },
    { path: '/ajustes', component: adminHorarios },
    { path: '/reservas', component: Reservas },
  ]
})



createApp(App).use(router).mount('#app')
