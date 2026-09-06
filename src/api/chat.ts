import { getSession, type SessionUser } from '../auth'

export type ChatMember = {
  id: number
  conversation_id: number
  user_id: number | null
  username: string
  display_name: string | null
  member_role: string
  joined_at: string
  last_read_message_id: number | null
  last_read_at: string | null
}

export type ChatMessage = {
  id: number
  conversation_id: number
  sender_user_id: number | null
  sender_username: string
  sender_display_name: string | null
  body: string
  metadata: any | null
  reply_to_message_id: number | null
  edited_at: string | null
  deleted_at: string | null
  created_at: string
}

export type ChatConversation = {
  id: number
  kind: 'direct' | 'group'
  title: string | null
  direct_key: string | null
  created_by_user_id: number | null
  created_by_username: string | null
  created_at: string
  updated_at: string
  members: ChatMember[]
}

export type ChatUser = {
  id?: number
  username: string
  nombre?: string
  role?: string
}

const RAW_BASE = String(import.meta.env.VITE_CHAT_API_URL || 'http://localhost:3015').trim()
const BASE_URL = RAW_BASE.replace(/\/+$/, '')
const API_TOKEN = String(import.meta.env.VITE_CHAT_API_TOKEN || '').trim()

function getCurrentSession(): SessionUser | null {
  return getSession()
}

function buildHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`
    headers['X-API-KEY'] = API_TOKEN
  }

  return headers
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE_URL) {
    throw new Error('VITE_CHAT_API_URL no configurada')
  }

  const fetchFn = globalThis.fetch
  if (typeof fetchFn !== 'function') {
    throw new Error('Fetch no disponible')
  }

  const response = await fetchFn(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(),
      ...(init.headers || {})
    }
  })

  const raw = await response.text()
  let payload: any = null
  try {
    payload = raw ? JSON.parse(raw) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || raw || `HTTP ${response.status}`
    throw new Error(message)
  }

  if (payload && typeof payload === 'object') {
    if (payload.ok === false) {
      throw new Error(payload.error || payload.message || 'Operacion rechazada')
    }
    if ('data' in payload) {
      return payload.data as T
    }
  }

  return payload as T
}

function buildConversationMembers(session: SessionUser | null, participants: ChatUser[]) {
  const items = participants
    .filter((participant) => String(participant.username || '').trim())
    .map((participant) => ({
      userId: participant.id ?? null,
      username: String(participant.username || '').trim(),
      displayName: String(participant.nombre || participant.username || '').trim()
    }))

  const currentUsername = String(session?.username || '').trim()
  if (session && currentUsername && !items.some((item) => item.username.toLowerCase() === currentUsername.toLowerCase())) {
    items.unshift({
      userId: session.id,
      username: currentUsername,
      displayName: session.nombre || currentUsername
    })
  }

  return items
}

export async function listConversations(username?: string) {
  const session = getCurrentSession()
  const targetUsername = String(username || session?.username || '').trim()
  if (!targetUsername) {
    return []
  }
  return request<ChatConversation[]>(`/api/conversations?username=${encodeURIComponent(targetUsername)}`)
}

export async function listMessages(conversationId: number, options: { beforeId?: number; sinceId?: number; limit?: number } = {}) {
  const search = new URLSearchParams()
  if (options.beforeId) search.set('beforeId', String(options.beforeId))
  if (options.sinceId) search.set('sinceId', String(options.sinceId))
  if (options.limit) search.set('limit', String(options.limit))
  const query = search.toString()
  return request<ChatMessage[]>(`/api/conversations/${conversationId}/messages${query ? `?${query}` : ''}`)
}

export async function latestMessage(conversationId: number) {
  const messages = await listMessages(conversationId, { limit: 1 })
  return messages[0] || null
}

export async function createDirectConversation(participants: ChatUser[]) {
  const session = getCurrentSession()
  return request<ChatConversation>('/api/conversations/direct', {
    method: 'POST',
    body: JSON.stringify({
      participants: buildConversationMembers(session, participants),
      createdByUserId: session?.id || null,
      createdByUsername: session?.username || null
    })
  })
}

export async function createGroupConversation(title: string, participants: ChatUser[]) {
  const session = getCurrentSession()
  return request<ChatConversation>('/api/conversations/group', {
    method: 'POST',
    body: JSON.stringify({
      title,
      participants: buildConversationMembers(session, participants),
      createdByUserId: session?.id || null,
      createdByUsername: session?.username || null
    })
  })
}

export async function addConversationMembers(conversationId: number, members: ChatUser[]) {
  return request<{ inserted: number; conversation: ChatConversation }>(`/api/conversations/${conversationId}/members`, {
    method: 'POST',
    body: JSON.stringify({
      members: members.map((member) => ({
        userId: member.id ?? null,
        username: member.username,
        displayName: member.nombre || member.username
      }))
    })
  })
}

export async function sendMessage(conversationId: number, body: string) {
  const session = getCurrentSession()
  return request<ChatMessage>(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      body,
      senderUserId: session?.id || null,
      senderUsername: session?.username || '',
      senderDisplayName: session?.nombre || session?.username || ''
    })
  })
}

export async function markMessageAsRead(messageId: number, username?: string) {
  const session = getCurrentSession()
  return request<{ ok: boolean }>(`/api/messages/${messageId}/read`, {
    method: 'POST',
    body: JSON.stringify({
      username: String(username || session?.username || '').trim()
    })
  })
}

export async function fetchInboxSnapshot(username?: string) {
  const session = getCurrentSession()
  const targetUsername = String(username || session?.username || '').trim()
  if (!targetUsername) return []

  const conversations = await listConversations(targetUsername)
  const latest = await Promise.all(conversations.map(async (conversation) => ({
    conversationId: conversation.id,
    latestMessage: await latestMessage(conversation.id)
  })))

  return conversations.map((conversation) => ({
    ...conversation,
    latestMessage: latest.find((entry) => entry.conversationId === conversation.id)?.latestMessage || null
  }))
}