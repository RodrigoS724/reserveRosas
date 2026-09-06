<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import {
  createDirectConversation,
  fetchInboxSnapshot,
  listMessages,
  markMessageAsRead,
  sendMessage,
  type ChatConversation,
  type ChatMessage,
  type ChatUser
} from '../api/chat'
import { getSession } from '../auth'

type InboxConversation = ChatConversation & {
  latestMessage?: ChatMessage | null
}

const session = ref(getSession())
const usuarios = ref<ChatUser[]>([])
const conversaciones = ref<InboxConversation[]>([])
const seleccionada = ref<InboxConversation | null>(null)
const mensajes = ref<ChatMessage[]>([])
const nuevoMensaje = ref('')
const busqueda = ref('')
const error = ref('')
const refrescando = ref(false)
const enviando = ref(false)
const cargandoInicial = ref(true)

let refreshTimer: number | null = null

const route = useRoute()
const router = useRouter()

const sessionUsername = computed(() => String(session.value?.username || '').trim())
const contactos = computed(() => usuarios.value.filter((u) => u.username !== sessionUsername.value))

const normalizedSearch = computed(() => busqueda.value.trim().toLowerCase())

const filteredConversations = computed(() => {
  const term = normalizedSearch.value
  const current = sessionUsername.value
  const list = [...conversaciones.value]

  list.sort((left, right) => {
    const leftTime = new Date(left.latestMessage?.created_at || left.updated_at).getTime()
    const rightTime = new Date(right.latestMessage?.created_at || right.updated_at).getTime()
    return rightTime - leftTime
  })

  if (!term) return list

  return list.filter((conversation) => {
    const title = conversationTitle(conversation, current).toLowerCase()
    const snippet = conversationSnippet(conversation, current).toLowerCase()
    return title.includes(term) || snippet.includes(term)
  })
})

const filteredContacts = computed(() => {
  const term = normalizedSearch.value
  const current = sessionUsername.value
  return contactos.value
    .filter((user) => {
      if (!term) return true
      const label = `${user.nombre || ''} ${user.username || ''}`.toLowerCase()
      return label.includes(term)
    })
    .sort((left, right) => {
      const leftName = String(left.nombre || left.username).toLowerCase()
      const rightName = String(right.nombre || right.username).toLowerCase()
      if (leftName < rightName) return -1
      if (leftName > rightName) return 1
      return 0
    })
    .filter((user) => user.username !== current)
})

const unreadCount = computed(() => {
  const current = sessionUsername.value
  return conversaciones.value.filter((conversation) => isConversationUnread(conversation, current)).length
})

function conversationTitle(conversation: InboxConversation, currentUsername: string) {
  if (conversation.kind === 'group') return conversation.title || 'Grupo'
  const other = conversation.members.find((member) => member.username !== currentUsername)
  return other?.display_name || other?.username || conversation.title || 'Mensaje directo'
}

function conversationSnippet(conversation: InboxConversation, currentUsername: string) {
  const message = conversation.latestMessage
  if (!message) return 'Sin mensajes'
  const author = message.sender_username === currentUsername ? 'Tú' : (message.sender_display_name || message.sender_username)
  return `${author}: ${message.body}`.slice(0, 140)
}

function conversationAvatar(conversation: InboxConversation, currentUsername: string) {
  const title = conversationTitle(conversation, currentUsername)
  return title.slice(0, 1).toUpperCase()
}

function isConversationUnread(conversation: InboxConversation, currentUsername: string) {
  const latest = conversation.latestMessage
  if (!latest || !currentUsername) return false
  const member = conversation.members.find((item) => item.username === currentUsername)
  const lastRead = Number(member?.last_read_message_id || 0)
  return latest.id > lastRead
}

function stopPolling() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function cargarUsuarios() {
  usuarios.value = (await api.obtenerUsuariosLogin()) || []
}

async function cargarConversaciones(preservarSeleccion = true) {
  if (!sessionUsername.value) return
  const snapshot = (await fetchInboxSnapshot(sessionUsername.value)) as InboxConversation[]
  conversaciones.value = snapshot

  if (!snapshot.length) {
    seleccionada.value = null
    mensajes.value = []
    return
  }

  if (!preservarSeleccion || !seleccionada.value) {
    seleccionada.value = snapshot[0]
  } else {
    const next = snapshot.find((conversation) => conversation.id === seleccionada.value?.id)
    seleccionada.value = next || snapshot[0]
  }
}

async function cargarMensajes(conversationId: number) {
  mensajes.value = await listMessages(conversationId, { limit: 100 })
  const ultimo = mensajes.value[mensajes.value.length - 1]
  if (ultimo) {
    await markMessageAsRead(ultimo.id, sessionUsername.value)
  }
}

async function abrirConversacion(conversation: InboxConversation) {
  seleccionada.value = conversation
  mensajes.value = []
  await cargarMensajes(conversation.id)
  await cargarConversaciones(true)
}

async function abrirDM(usuario: ChatUser) {
  error.value = ''
  if (!usuario?.username) return

  const existente = conversaciones.value.find((conversation) =>
    conversation.kind === 'direct' && conversation.members.some((member) => member.username === usuario.username)
  )

  if (existente) {
    await abrirConversacion(existente)
    return
  }

  const conversation = await createDirectConversation([usuario])
  await cargarConversaciones(false)
  const actual = conversaciones.value.find((item) => item.id === conversation.id) || conversation
  await abrirConversacion(actual)
  await router.replace({ query: { ...route.query, user: usuario.username } })
}

async function abrirDMDesdeQuery(username: unknown) {
  const target = String(username || '').trim()
  if (!target) return
  const usuario = contactos.value.find((item) => item.username === target)
  if (usuario) {
    await abrirDM(usuario)
  }
}

async function enviarMensaje() {
  if (!seleccionada.value) return
  const body = String(nuevoMensaje.value || '').trim()
  if (!body) return

  enviando.value = true
  try {
    await sendMessage(seleccionada.value.id, body)
    nuevoMensaje.value = ''
    await cargarMensajes(seleccionada.value.id)
    await cargarConversaciones(true)
  } catch (err: any) {
    error.value = err?.message || 'No se pudo enviar el mensaje'
  } finally {
    enviando.value = false
  }
}

async function refrescar() {
  if (!seleccionada.value) return
  refrescando.value = true
  try {
    await cargarMensajes(seleccionada.value.id)
    await cargarConversaciones(true)
  } finally {
    refrescando.value = false
  }
}

function startPolling() {
  stopPolling()
  if (!sessionUsername.value) return

  refreshTimer = window.setInterval(async () => {
    if (!sessionUsername.value) return
    try {
      await cargarConversaciones(true)
      if (seleccionada.value) {
        await cargarMensajes(seleccionada.value.id)
      }
    } catch {}
  }, 5000)
}

watch(session, async (value) => {
  if (!value?.username) {
    stopPolling()
    conversaciones.value = []
    mensajes.value = []
    seleccionada.value = null
    return
  }

  cargandoInicial.value = true
  try {
    await cargarUsuarios()
    await cargarConversaciones(false)
    const initialUser = route.query.user
    if (typeof initialUser === 'string' && initialUser) {
      await abrirDMDesdeQuery(initialUser)
    } else if (seleccionada.value) {
      await cargarMensajes(seleccionada.value.id)
    }
    startPolling()
  } finally {
    cargandoInicial.value = false
  }
}, { immediate: true })

watch(() => route.query.user, async (value) => {
  if (typeof value === 'string' && value && value !== seleccionada.value?.members.find((member) => member.username !== sessionUsername.value)?.username) {
    await abrirDMDesdeQuery(value)
  }
})

onMounted(async () => {
  session.value = getSession()
  await cargarUsuarios()
  await cargarConversaciones(false)
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<template>
  <div class="h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.12),_transparent_28%),linear-gradient(135deg,_#f8fafc,_#ecfeff_38%,_#e2e8f0)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.12),_transparent_28%),linear-gradient(135deg,_#07111c,_#0f172a_45%,_#0a1220)] text-slate-900 dark:text-slate-100">
    <div class="h-full w-full grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4 p-4 sm:p-6">
      <aside class="rounded-[2rem] border border-white/60 dark:border-white/10 bg-white/85 dark:bg-slate-900/75 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col min-h-[680px]">
        <div class="px-5 py-5 border-b border-slate-200/80 dark:border-slate-700/70">
          <p class="text-[10px] uppercase tracking-[0.35em] font-black text-cyan-600 dark:text-cyan-300">Direct Messages</p>
          <h1 class="mt-2 text-2xl font-black tracking-tight">Mensajes</h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Estilo Discord, sin grupos y con apertura directa de chats.</p>
        </div>

        <div class="px-5 py-4 border-b border-slate-200/80 dark:border-slate-700/70 space-y-3">
          <div>
            <label class="text-[10px] uppercase tracking-[0.25em] font-black text-slate-400 block mb-2">Buscar</label>
            <div class="relative">
              <input v-model="busqueda" type="text" class="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-950/55 px-4 py-3 pr-10 text-sm outline-none focus:border-cyan-500" placeholder="Buscar chat o persona" />
              <svg class="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
            </div>
          </div>
          <div class="rounded-2xl border border-cyan-200/70 dark:border-cyan-800/60 bg-cyan-50/80 dark:bg-cyan-500/10 px-4 py-3">
            <p class="text-[10px] uppercase tracking-[0.25em] font-black text-cyan-700 dark:text-cyan-300">Sesión</p>
            <p class="mt-1 text-sm font-bold truncate">{{ session?.nombre || session?.username || 'Sin sesión' }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 truncate">@{{ session?.username || 'sin-sesion' }}</p>
          </div>
        </div>

        <div class="flex-1 overflow-auto px-3 py-3 custom-scrollbar space-y-4">
          <section>
            <div class="flex items-center justify-between px-2 mb-2">
              <h2 class="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400">Chats directos</h2>
              <span class="text-[10px] font-black text-slate-500">{{ unreadCount }} sin leer</span>
            </div>

            <button
              v-for="conversation in filteredConversations"
              :key="conversation.id"
              @click="abrirConversacion(conversation)"
              class="w-full text-left rounded-[1.4rem] px-3 py-3 mb-2 transition-all border group"
              :class="seleccionada?.id === conversation.id ? 'border-cyan-500 bg-cyan-500/10 shadow-md' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white/80 dark:hover:bg-slate-950/45'"
            >
              <div class="flex items-center gap-3">
                <div class="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-white font-black flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  {{ conversationAvatar(conversation, sessionUsername) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="font-black truncate">{{ conversationTitle(conversation, sessionUsername) }}</p>
                    <span v-if="isConversationUnread(conversation, sessionUsername)" class="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500"></span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{{ conversationSnippet(conversation, sessionUsername) }}</p>
                </div>
              </div>
            </button>

            <div v-if="!filteredConversations.length" class="px-2 py-3 text-sm text-slate-500 dark:text-slate-400">
              No hay conversaciones todavía.
            </div>
          </section>

          <section>
            <div class="flex items-center justify-between px-2 mb-2">
              <h2 class="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400">Personas</h2>
              <span class="text-[10px] font-black text-slate-500">click para abrir</span>
            </div>

            <button
              v-for="user in filteredContacts"
              :key="user.username"
              @click="abrirDM(user)"
              class="w-full text-left rounded-[1.4rem] px-3 py-3 mb-2 transition-all border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/80 dark:hover:bg-emerald-500/10"
            >
              <div class="flex items-center gap-3">
                <div class="h-11 w-11 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white font-black flex items-center justify-center shadow-lg">
                  {{ String(user.nombre || user.username || '?').slice(0, 1).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="font-black truncate">{{ user.nombre || user.username }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400 truncate">@{{ user.username }}</p>
                </div>
              </div>
            </button>

            <div v-if="!filteredContacts.length" class="px-2 py-3 text-sm text-slate-500 dark:text-slate-400">
              Sin resultados.
            </div>
          </section>
        </div>
      </aside>

      <section class="rounded-[2rem] border border-white/60 dark:border-white/10 bg-white/85 dark:bg-slate-900/75 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col min-h-[680px]">
        <header class="px-6 py-5 border-b border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between gap-4">
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-[0.3em] font-black text-emerald-600 dark:text-emerald-300">Canal privado</p>
            <h2 class="mt-1 text-2xl font-black tracking-tight truncate">
              {{ seleccionada ? conversationTitle(seleccionada, sessionUsername) : 'Elegí una persona para abrir el chat' }}
            </h2>
            <p v-if="seleccionada" class="text-sm text-slate-500 dark:text-slate-400 truncate">
              {{ conversationSnippet(seleccionada, sessionUsername) }}
            </p>
          </div>

          <button
            @click="refrescar"
            :disabled="!seleccionada"
            class="rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-black uppercase tracking-[0.25em] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {{ refrescando ? 'Actualizando...' : 'Actualizar' }}
          </button>
        </header>

        <div class="flex-1 overflow-auto p-5 sm:p-6 custom-scrollbar">
          <div v-if="cargandoInicial" class="h-full min-h-[380px] flex items-center justify-center text-slate-500 dark:text-slate-400">
            Cargando mensajes...
          </div>

          <div v-else-if="!seleccionada" class="h-full min-h-[380px] flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
            <div class="h-16 w-16 rounded-3xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-4">
              <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.767 9.767 0 01-4-.81L3 20l1.26-3.8A7.962 7.962 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 class="text-xl font-black text-slate-700 dark:text-slate-100">No hay chat abierto</h3>
            <p class="mt-2 text-sm max-w-md">
              Elegí una persona de la lista izquierda para crear o abrir un mensaje directo.
            </p>
          </div>

          <template v-else>
            <div class="space-y-3">
              <article
                v-for="message in mensajes"
                :key="message.id"
                class="flex"
                :class="message.sender_username === sessionUsername ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[82%] rounded-[1.5rem] px-4 py-3 shadow-sm border"
                  :class="message.sender_username === sessionUsername
                    ? 'bg-emerald-600 text-white border-emerald-500/80 rounded-br-md'
                    : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-700 rounded-bl-md'"
                >
                  <div class="flex items-center gap-2 mb-1 text-[10px] uppercase tracking-[0.25em] font-black opacity-70">
                    <span>{{ message.sender_display_name || message.sender_username }}</span>
                    <span>·</span>
                    <span>{{ new Date(message.created_at).toLocaleString('es-UY') }}</span>
                    <span v-if="message.edited_at">· editado</span>
                  </div>
                  <p class="text-sm leading-relaxed whitespace-pre-wrap break-words">{{ message.body }}</p>
                </div>
              </article>
            </div>
          </template>
        </div>

        <footer class="p-5 sm:p-6 border-t border-slate-200/80 dark:border-slate-700/70">
          <div class="flex items-end gap-3">
            <textarea
              v-model="nuevoMensaje"
              rows="3"
              class="flex-1 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-4 py-3 text-sm outline-none resize-none focus:border-cyan-500"
              placeholder="Escribí un mensaje directo..."
              :disabled="!seleccionada"
              @keydown.enter.exact.prevent="enviarMensaje"
            ></textarea>
            <button
              @click="enviarMensaje"
              :disabled="!seleccionada || enviando"
              class="rounded-[1.5rem] bg-cyan-600 text-white px-5 py-4 text-xs font-black uppercase tracking-[0.25em] shadow-lg shadow-cyan-600/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {{ enviando ? 'Enviando...' : 'Enviar' }}
            </button>
          </div>
          <div v-if="error" class="mt-3 text-sm text-rose-500 font-medium">{{ error }}</div>
        </footer>
      </section>
    </div>
  </div>
</template>