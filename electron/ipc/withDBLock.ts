// main/ipc/withDbLock.ts

interface QueuedOperation<T> {
  id: string
  fn: () => T | Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
  createdAt: number
}

let isLocked = false
const queue: QueuedOperation<any>[] = []
let operationCounter = 0

/**
 * Async lock manager with queue for database operations
 * Ensures only one DB operation runs at a time
 * Other operations wait in queue instead of failing
 * Handles both sync and async functions
 */
export async function withDbLock<T>(fn: () => T | Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = `op_${++operationCounter}`
    const now = Date.now()
    queue.push({ id, fn, resolve, reject, createdAt: now })
    console.log(`[Lock] ${id} encolada. Cola: ${queue.length} operaciones. Locked: ${isLocked}`)
    processQueue()
  })
}

async function processQueue(): Promise<void> {
  if (isLocked) {
    console.log(`[Lock] Sistema bloqueado, esperando liberación...`)
    return
  }

  if (queue.length === 0) {
    console.log(`[Lock] Cola vacía, nada que procesar`)
    return
  }

  isLocked = true
  const operation = queue.shift()!
  const now = Date.now()
  const waitTime = now - operation.createdAt
  
  console.log(`[Lock] INICIANDO ${operation.id} (esperó ${waitTime}ms). Quedan: ${queue.length}`)

  try {
    // Ejecutar la operación (puede ser sync o async)
    const result = operation.fn()
    
    // Si es una Promise, esperar a que se resuelva
    if (result instanceof Promise) {
      const resolvedResult = await result
      operation.resolve(resolvedResult)
    } else {
      operation.resolve(result)
    }
    
    console.log(`[Lock] ${operation.id} completada exitosamente`)
  } catch (error: any) {
    console.error(`[Lock] ${operation.id} ERROR:`, error?.message || error)
    operation.reject(error instanceof Error ? error : new Error(String(error)))
  } finally {
    isLocked = false
    console.log(`[Lock] ${operation.id} liberada. Quedan: ${queue.length}`)
    
    // Procesar el siguiente sin delay
    if (queue.length > 0) {
      console.log(`[Lock] Procesando siguiente...`)
      // Usar setImmediate para no bloquear el event loop
      setImmediate(() => processQueue())
    }
  }
}
