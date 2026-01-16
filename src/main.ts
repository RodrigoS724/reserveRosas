import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import Confirmacion from './views/confirmation.vue'
import Home from './views/home.vue'

const router = createRouter({
  history: createWebHashHistory(), // Usamos Hash para compatibilidad con Electron
  routes: [
    { path: '/', component: Home },
    { path: '/confirmacion', component: Confirmacion }
  ]
})

createApp(App).use(router).mount('#app')
/*
createApp(App).mount('#app').$nextTick(() => {
  // Use contextBridge
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
})
*/