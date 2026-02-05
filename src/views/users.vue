<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { PermissionsLabels, type SessionUser } from '../auth'

type UserForm = {
  id?: number
  nombre: string
  username: string
  password?: string
  role: 'super' | 'admin' | 'user'
  permissions: string[]
  activo: number
}

const usuarios = ref<UserForm[]>([])
const seleccion = ref<UserForm | null>(null)
const status = ref('')
const statusOk = ref(true)
const guardando = ref(false)

const roles = [
  { value: 'super', label: 'Nivel 3', desc: 'Control total' },
  { value: 'admin', label: 'Nivel 2', desc: 'Acceso amplio sin configuración' },
  { value: 'user', label: 'Nivel 1', desc: 'Solo reservas e historial' }
]

const permisosCatalogo = Object.entries(PermissionsLabels).map(([key, label]) => ({
  key,
  label
}))

const form = ref<UserForm>({
  nombre: '',
  username: '',
  password: '',
  role: 'user',
  permissions: ['reservas', 'historial'],
  activo: 1
})

const isEdit = computed(() => Boolean(form.value.id))
const isSuper = computed(() => form.value.role === 'super')

const cargarUsuarios = async () => {
  usuarios.value = await window.api.listarUsuarios()
}

const resetForm = () => {
  form.value = {
    nombre: '',
    username: '',
    password: '',
    role: 'user',
    permissions: ['reservas', 'historial'],
    activo: 1
  }
  seleccion.value = null
}

const seleccionarUsuario = (u: any) => {
  seleccion.value = u
  form.value = {
    id: u.id,
    nombre: u.nombre,
    username: u.username,
    role: u.role,
    permissions: Array.isArray(u.permissions) ? [...u.permissions] : [],
    activo: u.activo ?? 1
  }
}

const togglePermiso = (perm: string) => {
  if (isSuper.value) return
  const set = new Set(form.value.permissions || [])
  if (set.has(perm)) {
    set.delete(perm)
  } else {
    set.add(perm)
  }
  form.value.permissions = Array.from(set)
}

const aplicarPermisosPorRol = () => {
  if (form.value.role === 'super') {
    form.value.permissions = permisosCatalogo.map(p => p.key)
  }
  if (form.value.role === 'admin') {
    form.value.permissions = ['agenda', 'reservas', 'historial', 'ajustes', 'vehiculos']
  }
  if (form.value.role === 'user') {
    form.value.permissions = ['reservas', 'historial']
  }
}

const guardarUsuario = async () => {
  guardando.value = true
  status.value = 'Guardando...'
  statusOk.value = true
  try {
    const payload = {
      id: form.value.id,
      nombre: form.value.nombre.trim(),
      username: form.value.username.trim(),
      role: form.value.role,
      permissions: form.value.permissions,
      activo: form.value.activo
    }
    if (isEdit.value) {
      await window.api.actualizarUsuario(payload)
      if (form.value.password && form.value.id) {
        await window.api.actualizarPasswordUsuario(form.value.id, form.value.password)
      }
    } else {
      if (!form.value.password) {
        throw new Error('La contraseña es obligatoria para crear usuario')
      }
      await window.api.crearUsuario({
        ...payload,
        password: form.value.password
      })
    }
    status.value = 'Usuario guardado.'
    statusOk.value = true
    await cargarUsuarios()
    if (!isEdit.value) resetForm()
  } catch (error: any) {
    status.value = error?.message || 'Error al guardar'
    statusOk.value = false
  } finally {
    guardando.value = false
  }
}

const borrarUsuario = async () => {
  if (!form.value.id) return
  guardando.value = true
  status.value = 'Eliminando...'
  statusOk.value = true
  try {
    await window.api.borrarUsuario(form.value.id)
    status.value = 'Usuario eliminado.'
    statusOk.value = true
    await cargarUsuarios()
    resetForm()
  } catch (error: any) {
    status.value = error?.message || 'Error al eliminar'
    statusOk.value = false
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarUsuarios()
})
</script>

<template>
  <div class="h-screen flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 bg-gray-50 dark:bg-[#0f172a] gap-6 overflow-hidden">
    <header class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 dark:text-gray-100 tracking-tight">USUARIOS</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestión de accesos y permisos.</p>
      </div>
      <button @click="resetForm"
        class="px-4 py-2 rounded-xl bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
        Nuevo usuario
      </button>
    </header>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
      <div class="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-0">
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 text-xs font-black uppercase tracking-widest text-gray-400">Listado</div>
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <button
            v-for="u in usuarios"
            :key="u.id"
            @click="seleccionarUsuario(u)"
            class="w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-bold text-gray-800 dark:text-gray-100">{{ u.nombre }}</div>
                <div class="text-xs text-gray-400">@{{ u.username }}</div>
              </div>
              <span class="text-[10px] uppercase tracking-widest font-black text-blue-500">
                {{ roles.find(r => r.value === u.role)?.label || 'Nivel' }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <div class="xl:col-span-2 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 overflow-y-auto custom-scrollbar">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Nombre</label>
            <input v-model="form.nombre" type="text"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Usuario</label>
            <input v-model="form.username" type="text"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Contraseña</label>
            <input v-model="form.password" type="password" placeholder="Nueva contraseña"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-2 block">Estado</label>
            <select v-model="form.activo"
              class="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-800 dark:text-gray-100">
              <option :value="1">Activo</option>
              <option :value="0">Inactivo</option>
            </select>
          </div>
        </div>

        <div class="mt-6">
          <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-3 block">Nivel de acceso</label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              v-for="r in roles"
              :key="r.value"
              type="button"
              @click="form.role = r.value as any; aplicarPermisosPorRol()"
              :class="[
                'p-4 rounded-xl border-2 text-left transition-all',
                form.role === r.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/20' : 'border-gray-200 dark:border-gray-800'
              ]"
            >
              <div class="text-sm font-black text-gray-800 dark:text-gray-100">{{ r.label }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ r.desc }}</div>
            </button>
          </div>
        </div>

        <div class="mt-6">
          <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-3 block">Permisos</label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              v-for="p in permisosCatalogo"
              :key="p.key"
              type="button"
              @click="togglePermiso(p.key)"
              :disabled="isSuper"
              :class="[
                'px-4 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all',
                form.permissions.includes(p.key) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600' : 'border-gray-200 dark:border-gray-800 text-gray-400',
                isSuper ? 'opacity-60 cursor-not-allowed' : ''
              ]"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-between">
          <div :class="statusOk ? 'text-emerald-500 text-xs' : 'text-rose-500 text-xs'">{{ status }}</div>
          <div class="flex items-center gap-2">
            <button
              v-if="isEdit"
              @click="borrarUsuario"
              class="px-4 py-3 rounded-xl bg-rose-600 text-white font-black uppercase tracking-widest text-xs shadow-lg"
            >
              Eliminar
            </button>
            <button
              @click="guardarUsuario"
              :disabled="guardando"
              class="px-6 py-3 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {{ guardando ? 'Guardando...' : 'Guardar Usuario' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
