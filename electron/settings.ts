export type AppSettings = {
  soundEnabled: boolean
  theme: 'dark' | 'light'
}

let settings: AppSettings = {
  soundEnabled: true,
  theme: 'dark'
}

export function setSettings(partial: Partial<AppSettings>) {
  settings = { ...settings, ...partial }
}

export function getSettings() {
  return settings
}
