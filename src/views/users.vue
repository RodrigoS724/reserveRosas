<script setup lang="ts">
import { onMounted, ref, computed, toRaw } from 'vue'
import { PermissionsLabels, getSession, normalizeRole, setSession, type SessionRole } from '../auth'
import { api } from '../api'

type UserForm = {
  id?: number
  nombre: string
  username: string
  password?: string
  role: SessionRole
  permissions: string[]
  activo: number
  es_mecanico_default: boolean
}

const usuarios = ref<UserForm[]>([])
const seleccion = ref<UserForm | null>(null)
const status = ref('')
const statusOk = ref(true)
const guardando = ref(false)

const roles = [
  { value: 'superadmin', label: 'SuperAdmin', desc: 'Control total del sistema' },
  { value: 'administrador', label: 'Administrador', desc: 'Control operativo amplio sin configuracion DB' },
  { value: 'ventas', label: 'Ventas', desc: 'Gestion comercial de reservas y aprontes' },
  { value: 'caja', label: 'Caja', desc: 'Gestion operativa y habilitacion de aprontes de ventas' },
  { value: 'taller', label: 'Taller', desc: 'Solo lectura operativa con cambio de estados' },
  { value: 'mecanico', label: 'Mecanico', desc: 'Ve solo lo asignado y trabaja su cola diaria' }
]

const permisosCatalogo = Object.entries(PermissionsLabels).map(([key, label]) => ({
  key,
  label
}))

const form = ref<UserForm>({
  nombre: '',
  username: '',
  password: '',
  role: 'ventas',
  permissions: ['agenda', 'reservas', 'aprontes', 'clientes', 'mecanicos', 'historial'],
  activo: 1,
  es_mecanico_default: false
})

const isEdit = computed(() => Boolean(form.value.id))
const permisosDisponibles = computed(() => permisosCatalogo)

const cargarUsuarios = async () => {
  const data = await api.listarUsuarios()
  usuarios.value = (data || []).map((u: any) => ({
    ...u,
    role: normalizeRole(u.role)
  }))
}

const resetForm = () => {
  form.value = {
    nombre: '',
    username: '',
    password: '',
    role: 'ventas',
    permissions: ['agenda', 'reservas', 'aprontes', 'clientes', 'mecanicos', 'historial'],
    activo: 1,
    es_mecanico_default: false
  }
  seleccion.value = null
}

const seleccionarUsuario = (u: any) => {
  seleccion.value = u
  form.value = {
    id: u.id,
    nombre: u.nombre,
    username: u.username,
    role: normalizeRole(u.role),
    permissions: Array.isArray(u.permissions) ? [...u.permissions] : [],
    activo: u.activo ?? 1,
    es_mecanico_default: Boolean(u.es_mecanico_default)
  }
}

const togglePermiso = (perm: string) => {
  const set = new Set(form.value.permissions || [])
  if (set.has(perm)) {
    set.delete(perm)
  } else {
    set.add(perm)
  }
  form.value.permissions = Array.from(set)
}

const aplicarPermisosPorRol = () => {
  if (form.value.role === 'superadmin') {
    form.value.permissions = permisosCatalogo.map((p) => p.key)
    return
  }
  if (form.value.role === 'administrador') {
    form.value.permissions = ['agenda', 'reservas', 'aprontes', 'clientes', 'historial', 'ajustes', 'vehiculos', 'usuarios', 'auditoria', 'mecanicos']
    return
  }
  if (form.value.role === 'ventas' || form.value.role === 'caja') {
    form.value.permissions = ['agenda', 'reservas', 'aprontes', 'clientes', 'historial', 'mecanicos']
    return
  }
  if (form.value.role === 'mecanico') {
    form.value.permissions = []
    return
  }
  form.value.es_mecanico_default = false
  form.value.permissions = ['reservas', 'aprontes', 'historial']
}

const guardarUsuario = async () => {
  guardando.value = true
  status.value = 'Guardando...'
  statusOk.value = true
  try {
    if (!form.value.nombre.trim()) {
      throw new Error('El nombre es obligatorio')
    }
    if (!form.value.username.trim()) {
      throw new Error('El usuario es obligatorio')
    }
    const payload = {
      id: form.value.id,
      nombre: form.value.nombre.trim(),
      username: form.value.username.trim(),
      role: form.value.role,
      permissions: form.value.permissions,
      activo: form.value.activo,
      es_mecanico_default: form.value.role === 'mecanico' ? Number(form.value.es_mecanico_default) : 0,
      actor_username: getSession()?.username,
      actor_role: getSession()?.role
    }
    const payloadPlain = JSON.parse(JSON.stringify(toRaw(payload)))
    if (!isEdit.value) {
      const existente = usuarios.value.find(
        u => u.username.toLowerCase() === payload.username.toLowerCase()
      )
      if (existente) {
        status.value = 'El usuario ya existe. Se cargó para editar.'
        statusOk.value = false
        seleccionarUsuario(existente)
        return
      }
    }
    if (isEdit.value) {
      const res = await api.actualizarUsuario(payloadPlain)
      if (!res.ok) throw new Error(res.error || 'Error al actualizar usuario')
      if (form.value.password && form.value.id) {
        const passRes = await api.actualizarPasswordUsuario(
          JSON.parse(JSON.stringify({
          id: form.value.id,
          password: form.value.password,
          actor: {
            username: getSession()?.username,
            role: getSession()?.role
          }
          }))
        )
        if (!passRes.ok) throw new Error(passRes.error || 'Error al actualizar contraseña')
      }
    } else {
      if (!form.value.password) {
        throw new Error('La contraseña es obligatoria para crear usuario')
      }
      const res = await api.crearUsuario(
        JSON.parse(JSON.stringify({
          ...payloadPlain,
          password: form.value.password
        }))
      )
      if (!res.ok) throw new Error(res.error || 'Error al crear usuario')
    }
    status.value = 'Usuario guardado.'
    statusOk.value = true
    await cargarUsuarios()
    // If the updated user is the currently logged-in user, refresh their session
    const currentSession = getSession()
    if (currentSession && payloadPlain.username === currentSession.username) {
      setSession({ ...currentSession, permissions: payloadPlain.permissions, role: payloadPlain.role })
      window.location.reload()
    }
    if (!isEdit.value) resetForm()
  } catch (error: any) {
    status.value = error.message || 'Error al guardar'
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
    const res = await api.borrarUsuario(
      JSON.parse(JSON.stringify({
      id: form.value.id,
      actor: {
        username: getSession()?.username,
        role: getSession()?.role
      }
      }))
    )
    if (!res.ok) throw new Error(res.error || 'Error al eliminar usuario')
    status.value = 'Usuario eliminado.'
    statusOk.value = true
    await cargarUsuarios()
    resetForm()
  } catch (error: any) {
    status.value = error.message || 'Error al eliminar'
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
  <div class="h-screen flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 bg-gray-50 dark:bg-[#0f172a] gap-6 overflow-y-auto overflow-x-hidden">
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
                {{ roles.find(r => r.value === u.role)?.label || 'Nivel' }}{{ u.es_mecanico_default ? ' · Default' : '' }}
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
            <input v-model="form.password" type="password" placeholder="PIN de 4 digitos o contraseña"
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
          <div v-if="form.role === 'mecanico'" class="flex items-end">
            <label class="flex items-center gap-3 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
              <input v-model="form.es_mecanico_default" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span>Mecanico por defecto</span>
            </label>
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
          <label class="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-3 block">Permisos (control manual)</label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              v-for="p in permisosDisponibles"
              :key="p.key"
              type="button"
              @click="togglePermiso(p.key)"
              :class="[
                'px-4 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all',
                form.permissions.includes(p.key) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600' : 'border-gray-200 dark:border-gray-800 text-gray-400'
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
              {{ guardando ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear usuario') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

