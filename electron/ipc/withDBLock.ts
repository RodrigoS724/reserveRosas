// main/ipc/withDbLock.ts
let locked = false

export function withDbLock<T>(fn: () => T): T {
  if (locked) {
    throw new Error('DB ocupada, intente nuevamente')
  }

  locked = true
  try {
    return fn()
  } finally {
    locked = false
  }
}
