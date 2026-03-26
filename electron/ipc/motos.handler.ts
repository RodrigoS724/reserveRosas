import { safeHandle } from './safeHandle'
import { obtenerMarcasMoto, obtenerModelosMoto } from '../services/motos.service'

export function registrarHandlersMotos() {
  safeHandle('motos:marcas', async () => obtenerMarcasMoto())
  safeHandle('motos:modelos', async (_event, marca?: string) => obtenerModelosMoto(marca))
}
