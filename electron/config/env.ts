import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

const ENV_FILENAME = 'mysql.env'
const ENV_KEYS = [
  'MYSQL_HOST',
  'MYSQL_PORT',
  'MYSQL_USER',
  'MYSQL_PASSWORD',
  'MYSQL_DATABASE'
]

export function getEnvFilePath() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, ENV_FILENAME)
}

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = content.split(/\ra\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key) {
      result[key] = value
    }
  }
  return result
}

function seedFromProcessEnv(): string {
  const lines: string[] = []
  for (const key of ENV_KEYS) {
    const value = process.env[key]
    if (value !== undefined && value !== '') {
      lines.push(`${key}=${value}`)
    }
  }
  return lines.join('\n')
}

export function loadUserEnv() {
  const envPath = getEnvFilePath()
  if (!fs.existsSync(envPath)) {
    const seeded = seedFromProcessEnv()
    if (seeded) {
      writeUserEnvText(seeded)
    } else {
      return
    }
  }
  const content = fs.readFileSync(envPath, 'utf-8')
  const parsed = parseEnv(content)
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value
  }
}

export function readUserEnvText(): string {
  const envPath = getEnvFilePath()
  if (!fs.existsSync(envPath)) {
    return ''
  }
  return fs.readFileSync(envPath, 'utf-8')
}

export function writeUserEnvText(text: string) {
  const envPath = getEnvFilePath()
  const dir = path.dirname(envPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(envPath, text, 'utf-8')
}
