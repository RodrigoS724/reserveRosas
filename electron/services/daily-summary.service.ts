import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { obtenerReservasPorFecha } from './reserva.service'

export type DailySummaryConfig = {
  enabled: boolean
  sendTime: string
  recipients: string[]
  lastSentDate: string
}

const CONFIG_FILENAME = 'daily-summary.json'
const DEFAULT_CONFIG: DailySummaryConfig = {
  enabled: false,
  sendTime: '07:30',
  recipients: [],
  lastSentDate: ''
}

let schedulerStarted = false
let schedulerTimer: NodeJS.Timeout | null = null

function getConfigPath() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, CONFIG_FILENAME)
}

function normalizeTime(raw: string) {
  const value = String(raw || '').trim()
  if (!/^\d{2}:\d{2}$/.test(value)) return DEFAULT_CONFIG.sendTime
  const [h, m] = value.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return DEFAULT_CONFIG.sendTime
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function normalizeRecipients(list: string[]) {
  const unique = new Set<string>()
  for (const item of list || []) {
    const email = String(item || '').trim().toLowerCase()
    if (!email) continue
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue
    unique.add(email)
  }
  return Array.from(unique)
}

function todayDateIso() {
  return new Date().toISOString().split('T')[0]
}

export function getDailySummaryConfig(): DailySummaryConfig {
  try {
    const configPath = getConfigPath()
    if (!fs.existsSync(configPath)) {
      return { ...DEFAULT_CONFIG }
    }
    const raw = fs.readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_CONFIG }
    }
    return {
      enabled: Boolean(parsed.enabled),
      sendTime: normalizeTime(String(parsed.sendTime || DEFAULT_CONFIG.sendTime)),
      recipients: normalizeRecipients(Array.isArray(parsed.recipients) ? parsed.recipients : []),
      lastSentDate: String(parsed.lastSentDate || '')
    }
  } catch (error) {
    console.warn('[ResumenDiario] No se pudo leer config:', error)
    return { ...DEFAULT_CONFIG }
  }
}

function saveConfigRaw(config: DailySummaryConfig) {
  const configPath = getConfigPath()
  const dir = path.dirname(configPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

export function setDailySummaryConfig(partial: Partial<DailySummaryConfig>) {
  const current = getDailySummaryConfig()
  const merged: DailySummaryConfig = {
    enabled: typeof partial.enabled === 'boolean' ? partial.enabled : current.enabled,
    sendTime: partial.sendTime ? normalizeTime(partial.sendTime) : current.sendTime,
    recipients: Array.isArray(partial.recipients) ? normalizeRecipients(partial.recipients) : current.recipients,
    lastSentDate: typeof partial.lastSentDate === 'string' ? partial.lastSentDate : current.lastSentDate
  }
  saveConfigRaw(merged)
  return merged
}

function parseSmtpPort() {
  const raw = Number(process.env.SMTP_PORT || '587')
  return Number.isFinite(raw) ? raw : 587
}

function smtpSecureByPort(port: number) {
  const env = (process.env.SMTP_SECURE || '').toLowerCase()
  if (env === '1' || env === 'true' || env === 'yes') return true
  if (env === '0' || env === 'false' || env === 'no') return false
  return port === 465
}

function smtpRejectUnauthorized() {
  const env = (process.env.SMTP_TLS_REJECT_UNAUTHORIZED || '').toLowerCase()
  if (env === '0' || env === 'false' || env === 'no') return false
  if (env === '1' || env === 'true' || env === 'yes') return true
  return true
}

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST || '').trim()
  const user = String(process.env.SMTP_USER || '').trim()
  const pass = String(process.env.SMTP_PASS || '').trim()
  const from = String(process.env.SMTP_FROM || user).trim()
  const port = parseSmtpPort()
  const secure = smtpSecureByPort(port)
  const rejectUnauthorized = smtpRejectUnauthorized()
  return { host, port, secure, user, pass, from, rejectUnauthorized }
}

function buildSummaryText(dateIso: string, reservas: any[]) {
  const header = [
    `Resumen diario de reservas (${dateIso})`,
    `Total: ${reservas.length}`,
    ''
  ]

  const rows = reservas.map((r) => {
    const hora = r?.hora ? String(r.hora) : '--:--'
    const nombre = r?.nombre ? String(r.nombre) : 'Sin nombre'
    const telefono = r?.telefono ? String(r.telefono) : '-'
    const matricula = r?.matricula ? String(r.matricula) : '-'
    const estado = r?.estado ? String(r.estado) : 'Pendiente'
    return `${hora} | ${nombre} | ${telefono} | ${matricula} | ${estado}`
  })

  if (rows.length === 0) {
    rows.push('Sin reservas para esta fecha.')
  }

  return [...header, ...rows].join('\n')
}

async function sendDailySummaryEmail(dateIso: string) {
  const cfg = getDailySummaryConfig()
  if (!cfg.enabled) return { ok: false, reason: 'disabled' as const }
  if (!cfg.recipients.length) return { ok: false, reason: 'no_recipients' as const }

  const smtp = getSmtpConfig()
  if (!smtp.host || !smtp.user || !smtp.pass || !smtp.from) {
    return { ok: false, reason: 'smtp_missing' as const }
  }

  const reservasDia = await obtenerReservasPorFecha(dateIso)
  const reservas = (reservasDia || []).filter((r) => {
    const estado = String(r?.estado || '').trim().toLowerCase()
    return estado !== 'cancelada'
  })
  const text = buildSummaryText(dateIso, reservas)

  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    tls: {
      rejectUnauthorized: smtp.rejectUnauthorized
    },
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  })

  await transporter.sendMail({
    from: smtp.from,
    to: cfg.recipients.join(','),
    subject: `Resumen diario de reservas - ${dateIso}`,
    text
  })

  setDailySummaryConfig({ lastSentDate: dateIso })
  return { ok: true as const, count: reservas.length }
}

function shouldRunNow(cfg: DailySummaryConfig) {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const nowTime = `${hh}:${mm}`
  return nowTime === cfg.sendTime
}

async function schedulerTick() {
  const cfg = getDailySummaryConfig()
  if (!cfg.enabled) return
  if (!shouldRunNow(cfg)) return

  const today = todayDateIso()
  if (cfg.lastSentDate === today) return

  try {
    const result = await sendDailySummaryEmail(today)
    if (!result.ok) {
      console.warn('[ResumenDiario] Envio omitido:', result.reason)
      return
    }
    console.log(`[ResumenDiario] Correo enviado. Reservas: ${result.count}`)
  } catch (error) {
    console.error('[ResumenDiario] Error enviando resumen diario:', error)
  }
}

export function startDailySummaryScheduler() {
  if (schedulerStarted) return
  schedulerStarted = true
  schedulerTick()
  schedulerTimer = setInterval(schedulerTick, 60 * 1000)
}

export function stopDailySummaryScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
  schedulerStarted = false
}

export async function sendDailySummaryNow(dateIso: string) {
  const date = String(dateIso || todayDateIso()).trim()
  const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayDateIso()
  const previous = getDailySummaryConfig()

  if (!previous.enabled) {
    setDailySummaryConfig({ enabled: true })
  }
  try {
    return await sendDailySummaryEmail(normalizedDate)
  } finally {
    if (!previous.enabled) {
      setDailySummaryConfig({ enabled: false })
    }
  }
}
