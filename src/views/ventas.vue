<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import { getSession, normalizeRole } from '../auth'

type MotoVentaEstado =
  | 'en_apronte'
  | 'pedido_a_proveedor'
  | 'pendiente_de_pedir'
  | 'en_deposito'
  | 'en_armado'
  | 'lista_para_entregar'
  | 'cliente_avisado'
  | 'entregada'

type MotoVenta = {
  id: string
  createdAt: string
  updatedAt: string
  apronteId: number | null
  marca: string
  modelo: string
  cliente: string
  telefono: string
  comentario: string
  vendedor: string
  estado: MotoVentaEstado
}

type FinancieraEstado = 'pendiente' | 'rechazado' | 'aprobado' | 'sin_consultar'

type CreditoConsulta = {
  id: string
  createdAt: string
  updatedAt: string
  localidad: string
  telefono: string
  montoSolicitado: number
  observaciones: string
  concretaVenta: boolean
  financieras: Record<string, FinancieraEstado>
}

type ApronteLite = {
  id: number
  nombre: string
  telefono: string
  marca: string
  modelo: string
}

type VentasConfig = {
  diasAlertaRegistro: number
  diasAlertaActualizacion: number
}

const STORAGE_MOTOS = 'rr_ventas_motos'
const STORAGE_CREDITOS = 'rr_ventas_creditos'
const STORAGE_FINANCIERAS = 'rr_ventas_financieras'
const STORAGE_VENDEDORES = 'rr_ventas_vendedores'
const STORAGE_CONFIG = 'rr_ventas_config'

const route = useRoute()
const session = getSession()
const userRole = normalizeRole(session?.role)
const puedeQuitarMotos = userRole === 'superadmin' || userRole === 'administrador'

const parseJson = <T>(raw: string | null, fallback: T) => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const nowIso = () => new Date().toISOString()
const normalizarTelefono = (value: string) => String(value || '').replace(/\D/g, '')
const normalizarTexto = (value: string) => String(value || '').trim().toLowerCase()
const diasDesde = (isoDate: string) => {
  const ts = new Date(isoDate).getTime()
  if (!Number.isFinite(ts)) return 0
  return Math.max(0, Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24)))
}

const estadoLabel: Record<MotoVentaEstado, string> = {
  en_apronte: 'En apronte',
  pedido_a_proveedor: 'Pedido a proveedor',
  pendiente_de_pedir: 'Pendiente de pedir',
  en_deposito: 'En deposito',
  en_armado: 'En armado',
  lista_para_entregar: 'Lista para entregar',
  cliente_avisado: 'Cliente avisado',
  entregada: 'Entregada'
}

const estadoClass = (estado: MotoVentaEstado) => {
  const map: Record<MotoVentaEstado, string> = {
    en_apronte: 'estado estado-cyan',
    pedido_a_proveedor: 'estado estado-indigo',
    pendiente_de_pedir: 'estado estado-amber',
    en_deposito: 'estado estado-sky',
    en_armado: 'estado estado-violet',
    lista_para_entregar: 'estado estado-lime',
    cliente_avisado: 'estado estado-emerald',
    entregada: 'estado estado-green'
  }
  return map[estado] || 'estado estado-gray'
}

const estadoCreditoClass = (estado: FinancieraEstado) => {
  if (estado === 'aprobado') return 'estado estado-green'
  if (estado === 'rechazado') return 'estado estado-rose'
  if (estado === 'pendiente') return 'estado estado-amber'
  return 'estado estado-gray'
}

const motos = ref<MotoVenta[]>(parseJson(localStorage.getItem(STORAGE_MOTOS), []))
const creditos = ref<CreditoConsulta[]>(parseJson(localStorage.getItem(STORAGE_CREDITOS), []))
const financierasDisponibles = ref<string[]>(parseJson(localStorage.getItem(STORAGE_FINANCIERAS), ['Creditel', 'Pronto', 'OCA']))
const vendedores = ref<string[]>(parseJson(localStorage.getItem(STORAGE_VENDEDORES), ['Rodrigo']))
const aprontesDisponibles = ref<ApronteLite[]>([])
const config = ref<VentasConfig>(
  parseJson(localStorage.getItem(STORAGE_CONFIG), {
    diasAlertaRegistro: 7,
    diasAlertaActualizacion: 3
  })
)

const filtroEstadoMotos = ref<'pendientes' | 'entregadas' | 'todos'>('pendientes')
const panelActivo = computed<'motos' | 'creditos' | 'metricas'>(() => {
  if (route.path.includes('/ventas/creditos')) return 'creditos'
  if (route.path.includes('/ventas/metricas')) return 'metricas'
  return 'motos'
})

const mesExporte = ref(new Date().toISOString().slice(0, 7))

const nuevoVendedor = ref('')
const nuevaFinanciera = ref('')
const nuevaMoto = ref({
  apronteId: null as number | null,
  marca: '',
  modelo: '',
  cliente: '',
  telefono: '',
  comentario: '',
  vendedor: vendedores.value[0] || '',
  estado: 'en_apronte' as MotoVentaEstado
})
const nuevoCredito = ref({
  localidad: '',
  telefono: '',
  montoSolicitado: 0,
  observaciones: '',
  concretaVenta: false,
  financieras: {} as Record<string, FinancieraEstado>
})

const editandoMoto = ref<MotoVenta | null>(null)
const editFecha = ref('')
const editandoCredito = ref<CreditoConsulta | null>(null)

const persist = () => {
  localStorage.setItem(STORAGE_MOTOS, JSON.stringify(motos.value))
  localStorage.setItem(STORAGE_CREDITOS, JSON.stringify(creditos.value))
  localStorage.setItem(STORAGE_FINANCIERAS, JSON.stringify(financierasDisponibles.value))
  localStorage.setItem(STORAGE_VENDEDORES, JSON.stringify(vendedores.value))
  localStorage.setItem(STORAGE_CONFIG, JSON.stringify(config.value))
}

const downloadText = (filename: string, content: string, type = 'text/plain;charset=utf-8') => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const toCsv = (rows: Record<string, any>[]) => {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const line = (v: any) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  for (const row of rows) lines.push(headers.map((h) => line(row[h])).join(','))
  return lines.join('\n')
}

const parseCsv = (text: string) => {
  const lines = String(text || '').split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return [] as Record<string, string>[]
  const headers = lines[0].split(',').map((h) => h.trim())
  const out: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = String(cols[idx] || '').trim().replace(/^"|"$/g, '')
    })
    out.push(row)
  }
  return out
}

const cargarAprontes = async () => {
  try {
    const data = await api.obtenerAprontes()
    aprontesDisponibles.value = Array.isArray(data)
      ? data.map((a: any) => ({
          id: Number(a.id),
          nombre: String(a.nombre || ''),
          telefono: String(a.telefono || ''),
          marca: String(a.marca || ''),
          modelo: String(a.modelo || '')
        }))
      : []
  } catch {
    aprontesDisponibles.value = []
  }
}

const resetMotoForm = () => {
  nuevaMoto.value = {
    apronteId: null,
    marca: '',
    modelo: '',
    cliente: '',
    telefono: '',
    comentario: '',
    vendedor: vendedores.value[0] || '',
    estado: 'en_apronte'
  }
}

const resetCreditoForm = () => {
  const financieras: Record<string, FinancieraEstado> = {}
  for (const f of financierasDisponibles.value) financieras[f] = 'sin_consultar'
  nuevoCredito.value = {
    localidad: '',
    telefono: '',
    montoSolicitado: 0,
    observaciones: '',
    concretaVenta: false,
    financieras
  }
}

const sincronizarChecksCredito = () => {
  const phones = new Set<string>()
  motos.value.forEach((m) => {
    const phone = normalizarTelefono(m.telefono)
    if (phone) phones.add(phone)
  })
  creditos.value = creditos.value.map((c) => {
    const phone = normalizarTelefono(c.telefono)
    if (!phone || !phones.has(phone) || c.concretaVenta) return c
    return { ...c, concretaVenta: true, updatedAt: nowIso() }
  })
}

const aplicarApronteSeleccionado = () => {
  const apronte = aprontesDisponibles.value.find((a) => a.id === Number(nuevaMoto.value.apronteId || 0))
  if (!apronte) return
  nuevaMoto.value.marca = normalizarTexto(apronte.marca || nuevaMoto.value.marca)
  nuevaMoto.value.modelo = normalizarTexto(apronte.modelo || nuevaMoto.value.modelo)
  nuevaMoto.value.cliente = String(apronte.nombre || nuevaMoto.value.cliente || '').trim()
  nuevaMoto.value.telefono = String(apronte.telefono || nuevaMoto.value.telefono || '').trim()
  if (!String(nuevaMoto.value.comentario || '').trim()) {
    nuevaMoto.value.comentario = `Vinculada a apronte #${apronte.id}`
  }
}

const agregarMoto = () => {
  if (!nuevaMoto.value.cliente || !nuevaMoto.value.marca || !nuevaMoto.value.modelo) return
  const stamp = nowIso()
  motos.value.unshift({
    id: crypto.randomUUID(),
    createdAt: stamp,
    updatedAt: stamp,
    apronteId: nuevaMoto.value.apronteId,
    marca: normalizarTexto(nuevaMoto.value.marca),
    modelo: normalizarTexto(nuevaMoto.value.modelo),
    cliente: String(nuevaMoto.value.cliente || '').trim(),
    telefono: String(nuevaMoto.value.telefono || '').trim(),
    comentario: String(nuevaMoto.value.comentario || '').trim(),
    vendedor: String(nuevaMoto.value.vendedor || '').trim(),
    estado: nuevaMoto.value.estado
  })
  sincronizarChecksCredito()
  resetMotoForm()
  persist()
}

const abrirEdicionMoto = (moto: MotoVenta) => {
  editandoMoto.value = JSON.parse(JSON.stringify(moto))
  editFecha.value = String(moto.createdAt || '').slice(0, 10)
}

const guardarMotoEditada = () => {
  if (!editandoMoto.value) return
  const isoDate = editFecha.value ? `${editFecha.value}T12:00:00.000Z` : editandoMoto.value.createdAt
  motos.value = motos.value.map((m) =>
    m.id === editandoMoto.value!.id
      ? {
          ...editandoMoto.value!,
          marca: normalizarTexto(editandoMoto.value!.marca),
          modelo: normalizarTexto(editandoMoto.value!.modelo),
          createdAt: new Date(isoDate).toISOString(),
          updatedAt: nowIso()
        }
      : m
  )
  sincronizarChecksCredito()
  persist()
  editandoMoto.value = null
}

const quitarMoto = (id: string) => {
  if (!puedeQuitarMotos) return
  motos.value = motos.value.filter((m) => m.id !== id)
  persist()
}

const actualizarMoto = (id: string, patch: Partial<MotoVenta>) => {
  motos.value = motos.value.map((m) =>
    m.id === id
      ? {
          ...m,
          ...patch,
          marca: patch.marca != null ? normalizarTexto(patch.marca) : m.marca,
          modelo: patch.modelo != null ? normalizarTexto(patch.modelo) : m.modelo,
          updatedAt: nowIso()
        }
      : m
  )
  sincronizarChecksCredito()
  persist()
}

const agregarVendedor = () => {
  const value = String(nuevoVendedor.value || '').trim()
  if (!value || vendedores.value.includes(value)) return
  vendedores.value.push(value)
  nuevoVendedor.value = ''
  persist()
}

const quitarVendedor = (name: string) => {
  vendedores.value = vendedores.value.filter((v) => v !== name)
  if (!vendedores.value.length) vendedores.value.push('Sin vendedor')
  persist()
}

const agregarFinanciera = () => {
  const value = String(nuevaFinanciera.value || '').trim()
  if (!value || financierasDisponibles.value.includes(value)) return
  financierasDisponibles.value.push(value)
  creditos.value.forEach((c) => {
    c.financieras[value] = 'sin_consultar'
    c.updatedAt = nowIso()
  })
  nuevaFinanciera.value = ''
  persist()
}

const quitarFinanciera = (name: string) => {
  financierasDisponibles.value = financierasDisponibles.value.filter((f) => f !== name)
  creditos.value.forEach((c) => {
    delete c.financieras[name]
    c.updatedAt = nowIso()
  })
  persist()
}

const agregarCredito = () => {
  if (!nuevoCredito.value.localidad || !nuevoCredito.value.telefono) return
  const financieras: Record<string, FinancieraEstado> = {}
  financierasDisponibles.value.forEach((f) => {
    financieras[f] = nuevoCredito.value.financieras[f] || 'sin_consultar'
  })
  creditos.value.unshift({
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    localidad: String(nuevoCredito.value.localidad || '').trim(),
    telefono: String(nuevoCredito.value.telefono || '').trim(),
    montoSolicitado: Number(nuevoCredito.value.montoSolicitado || 0),
    observaciones: String(nuevoCredito.value.observaciones || '').trim(),
    concretaVenta: Boolean(nuevoCredito.value.concretaVenta),
    financieras
  })
  sincronizarChecksCredito()
  resetCreditoForm()
  persist()
}

const quitarCredito = (id: string) => {
  creditos.value = creditos.value.filter((c) => c.id !== id)
  persist()
}

const abrirEdicionCredito = (credito: CreditoConsulta) => {
  editandoCredito.value = JSON.parse(JSON.stringify(credito))
}

const guardarCreditoEditado = () => {
  if (!editandoCredito.value) return
  const id = editandoCredito.value.id
  const patch: Partial<CreditoConsulta> = {
    localidad: String(editandoCredito.value.localidad || '').trim(),
    telefono: String(editandoCredito.value.telefono || '').trim(),
    montoSolicitado: Number(editandoCredito.value.montoSolicitado || 0),
    observaciones: String(editandoCredito.value.observaciones || '').trim(),
    concretaVenta: Boolean(editandoCredito.value.concretaVenta),
    financieras: { ...(editandoCredito.value.financieras || {}) }
  }
  actualizarCredito(id, patch)
  editandoCredito.value = null
}

const quitarCreditoDesdeModal = () => {
  if (!editandoCredito.value) return
  quitarCredito(editandoCredito.value.id)
  editandoCredito.value = null
}

const actualizarCredito = (id: string, patch: Partial<CreditoConsulta>) => {
  creditos.value = creditos.value.map((c) =>
    c.id === id
      ? {
          ...c,
          ...patch,
          updatedAt: nowIso()
        }
      : c
  )
  persist()
}

const actualizarEstadoFinanciera = (creditoId: string, financiera: string, estado: FinancieraEstado) => {
  creditos.value = creditos.value.map((c) =>
    c.id === creditoId
      ? { ...c, updatedAt: nowIso(), financieras: { ...c.financieras, [financiera]: estado } }
      : c
  )
  persist()
}

const motosFiltradas = computed(() => {
  if (filtroEstadoMotos.value === 'entregadas') {
    return motos.value.filter((m) => m.estado === 'entregada')
  }
  if (filtroEstadoMotos.value === 'pendientes') {
    return motos.value.filter((m) => m.estado !== 'entregada')
  }
  return motos.value
})

const totalAlertas = computed(() =>
  motosFiltradas.value.filter(
    (m) => diasDesde(m.createdAt) >= config.value.diasAlertaRegistro || diasDesde(m.updatedAt) >= config.value.diasAlertaActualizacion
  ).length
)

const getMonthKey = (dateLike: string) => {
  const d = new Date(dateLike)
  if (!Number.isFinite(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const estadoCreditoConsolidado = (credito: CreditoConsulta) => {
  const estados = Object.values(credito.financieras || {})
  if (estados.includes('aprobado')) return 'aprobado'
  if (estados.includes('rechazado')) return 'rechazado'
  if (estados.includes('pendiente')) return 'pendiente'
  return 'sin_consultar'
}

const now = computed(() => new Date())
const mesActual = computed(() => getMonthKey(now.value.toISOString()))
const anioActual = computed(() => now.value.getFullYear())
const quarterActual = computed(() => Math.floor(now.value.getMonth() / 3) + 1)
const quarterStart = computed(() => (quarterActual.value - 1) * 3)

const motosMesActual = computed(() => motos.value.filter((m) => getMonthKey(m.createdAt) === mesActual.value).length)
const creditosMesActual = computed(() => creditos.value.filter((c) => getMonthKey(c.createdAt) === mesActual.value).length)
const creditosAprobadosMes = computed(() =>
  creditos.value.filter((c) => getMonthKey(c.createdAt) === mesActual.value && estadoCreditoConsolidado(c) === 'aprobado').length
)
const creditosRechazadosMes = computed(() =>
  creditos.value.filter((c) => getMonthKey(c.createdAt) === mesActual.value && estadoCreditoConsolidado(c) === 'rechazado').length
)

const serieTrimestre = computed(() => {
  return [0, 1, 2].map((idx) => {
    const month = quarterStart.value + idx
    const key = `${anioActual.value}-${String(month + 1).padStart(2, '0')}`
    const creditosMes = creditos.value.filter((c) => getMonthKey(c.createdAt) === key)
    return {
      key,
      label: new Date(anioActual.value, month, 1).toLocaleDateString('es-UY', { month: 'short' }),
      motos: motos.value.filter((m) => getMonthKey(m.createdAt) === key).length,
      creditos: creditosMes.length,
      aprobados: creditosMes.filter((c) => estadoCreditoConsolidado(c) === 'aprobado').length,
      rechazados: creditosMes.filter((c) => estadoCreditoConsolidado(c) === 'rechazado').length
    }
  })
})

const maxBarValue = computed(() => Math.max(1, ...serieTrimestre.value.flatMap((m) => [m.motos, m.creditos])))
const resumenTrimestre = computed(() => ({
  motos: serieTrimestre.value.reduce((a, x) => a + x.motos, 0),
  creditos: serieTrimestre.value.reduce((a, x) => a + x.creditos, 0),
  aprobados: serieTrimestre.value.reduce((a, x) => a + x.aprobados, 0),
  rechazados: serieTrimestre.value.reduce((a, x) => a + x.rechazados, 0)
}))
const proyeccion = computed(() => {
  const mesDentroTrimestre = (now.value.getMonth() % 3) + 1
  return {
    motos: Math.round((resumenTrimestre.value.motos / mesDentroTrimestre) * 3),
    creditos: Math.round((resumenTrimestre.value.creditos / mesDentroTrimestre) * 3)
  }
})

const monthLabel = computed(() => {
  const [y, m] = mesExporte.value.split('-').map(Number)
  const d = new Date(Number.isFinite(y) ? y : now.value.getFullYear(), (Number.isFinite(m) ? m - 1 : now.value.getMonth()), 1)
  return d.toLocaleDateString('es-UY', { month: 'long', year: 'numeric' })
})

const monthKeySeleccionado = computed(() => String(mesExporte.value || '').trim())
const motosMesSeleccionado = computed(() => motos.value.filter((m) => getMonthKey(m.createdAt) === monthKeySeleccionado.value))
const creditosMesSeleccionado = computed(() => creditos.value.filter((c) => getMonthKey(c.createdAt) === monthKeySeleccionado.value))

const diasDelMesSeleccionado = computed(() => {
  const [yearRaw, monthRaw] = monthKeySeleccionado.value.split('-').map(Number)
  const year = Number.isFinite(yearRaw) ? yearRaw : now.value.getFullYear()
  const month = Number.isFinite(monthRaw) ? monthRaw : now.value.getMonth() + 1
  return new Date(year, month, 0).getDate()
})

const diario = computed(() => {
  const [yearRaw, monthRaw] = monthKeySeleccionado.value.split('-').map(Number)
  const year = Number.isFinite(yearRaw) ? yearRaw : now.value.getFullYear()
  const month = Number.isFinite(monthRaw) ? monthRaw : now.value.getMonth() + 1
  const days = new Date(year, month, 0).getDate()
  const result: Array<{ fecha: string; motos: number; creditos: number }> = []

  for (let day = 1; day <= days; day += 1) {
    const fecha = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    result.push({ fecha, motos: 0, creditos: 0 })
  }

  for (const m of motosMesSeleccionado.value) {
    const day = new Date(m.createdAt).getDate()
    if (day >= 1 && day <= result.length) result[day - 1].motos += 1
  }
  for (const c of creditosMesSeleccionado.value) {
    const day = new Date(c.createdAt).getDate()
    if (day >= 1 && day <= result.length) result[day - 1].creditos += 1
  }

  return result
})

const maxDiario = computed(() => Math.max(1, ...diario.value.map((d) => Math.max(d.motos, d.creditos))))
const motosPreviewMes = computed(() => motosMesSeleccionado.value.slice(0, 30))
const creditosPreviewMes = computed(() => creditosMesSeleccionado.value.slice(0, 30))

const formatNumber = (n: number) => new Intl.NumberFormat('es-UY').format(n || 0)
const formatFechaCorta = (iso: string) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' })
}

const exportarMotosJson = () => downloadText(`ventas-motos-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(motos.value, null, 2), 'application/json')
const exportarMotosCsv = () => {
  const rows = motos.value.map((m) => ({
    id: m.id,
    fecha: String(m.createdAt).slice(0, 10),
    apronteId: m.apronteId ?? '',
    marca: m.marca,
    modelo: m.modelo,
    cliente: m.cliente,
    telefono: m.telefono,
    comentario: m.comentario,
    vendedor: m.vendedor,
    estado: m.estado
  }))
  downloadText(`ventas-motos-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows), 'text/csv;charset=utf-8')
}
const importarMotosArchivo = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const text = await file.text()
  if (file.name.toLowerCase().endsWith('.json')) {
    const arr = parseJson<any[]>(text, [])
    if (Array.isArray(arr)) {
      arr.forEach((m) => {
        motos.value.push({
          id: String(m.id || crypto.randomUUID()),
          createdAt: String(m.createdAt || m.fecha || nowIso()),
          updatedAt: nowIso(),
          apronteId: Number(m.apronteId || 0) || null,
          marca: normalizarTexto(m.marca),
          modelo: normalizarTexto(m.modelo),
          cliente: String(m.cliente || ''),
          telefono: String(m.telefono || ''),
          comentario: String(m.comentario || ''),
          vendedor: String(m.vendedor || ''),
          estado: (String(m.estado || 'en_apronte') as MotoVentaEstado)
        })
      })
    }
  } else {
    const rows = parseCsv(text)
    rows.forEach((r) => {
      motos.value.push({
        id: String(r.id || crypto.randomUUID()),
        createdAt: r.fecha ? new Date(`${r.fecha}T12:00:00.000Z`).toISOString() : nowIso(),
        updatedAt: nowIso(),
        apronteId: Number(r.apronteId || 0) || null,
        marca: normalizarTexto(r.marca),
        modelo: normalizarTexto(r.modelo),
        cliente: String(r.cliente || ''),
        telefono: String(r.telefono || ''),
        comentario: String(r.comentario || ''),
        vendedor: String(r.vendedor || ''),
        estado: (String(r.estado || 'en_apronte') as MotoVentaEstado)
      })
    })
  }
  sincronizarChecksCredito()
  persist()
  input.value = ''
}

const exportarCreditosJson = () => downloadText(`ventas-creditos-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(creditos.value, null, 2), 'application/json')
const exportarCreditosCsv = () => {
  const rows = creditos.value.map((c) => ({
    id: c.id,
    fecha: String(c.createdAt).slice(0, 10),
    localidad: c.localidad,
    telefono: c.telefono,
    monto: c.montoSolicitado,
    observaciones: c.observaciones || '',
    concretaVenta: c.concretaVenta ? '1' : '0',
    financieras: JSON.stringify(c.financieras || {})
  }))
  downloadText(`ventas-creditos-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows), 'text/csv;charset=utf-8')
}
const importarCreditosArchivo = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const text = await file.text()
  if (file.name.toLowerCase().endsWith('.json')) {
    const arr = parseJson<any[]>(text, [])
    if (Array.isArray(arr)) {
      arr.forEach((c) => {
        creditos.value.push({
          id: String(c.id || crypto.randomUUID()),
          createdAt: String(c.createdAt || nowIso()),
          updatedAt: nowIso(),
          localidad: String(c.localidad || ''),
          telefono: String(c.telefono || ''),
          montoSolicitado: Number(c.montoSolicitado || 0),
          observaciones: String(c.observaciones || ''),
          concretaVenta: Boolean(c.concretaVenta),
          financieras: typeof c.financieras === 'object' && c.financieras ? c.financieras : {}
        })
      })
    }
  } else {
    const rows = parseCsv(text)
    rows.forEach((r) => {
      creditos.value.push({
        id: String(r.id || crypto.randomUUID()),
        createdAt: r.fecha ? new Date(`${r.fecha}T12:00:00.000Z`).toISOString() : nowIso(),
        updatedAt: nowIso(),
        localidad: String(r.localidad || ''),
        telefono: String(r.telefono || ''),
        montoSolicitado: Number(r.monto || 0),
        observaciones: String(r.observaciones || ''),
        concretaVenta: String(r.concretaVenta || '').trim() === '1',
        financieras: parseJson<Record<string, FinancieraEstado>>(String(r.financieras || '{}'), {})
      })
    })
  }
  sincronizarChecksCredito()
  persist()
  input.value = ''
}

watch(() => config.value, persist, { deep: true })

onMounted(() => {
  if (!nuevoCredito.value.financieras || !Object.keys(nuevoCredito.value.financieras).length) resetCreditoForm()
  cargarAprontes()
  sincronizarChecksCredito()
})
</script>

<template>
  <div class="h-screen overflow-auto bg-[#07132c] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 space-y-6 text-slate-100">
    <header class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-gray-100">Panel de Ventas</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ panelActivo === 'motos' ? 'Panel 1 - Motos vendidas' : panelActivo === 'creditos' ? 'Panel 2 - Creditos' : 'Panel 3 - Registros de venta' }}
        </p>
      </div>
      <div class="rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 px-5 py-3 text-sm font-bold">
        Alertas activas: {{ totalAlertas }}
      </div>
    </header>

    <section v-if="panelActivo === 'motos'" class="rounded-xl border border-slate-700/60 bg-[#091a3a] shadow-sm p-4 sm:p-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-black text-slate-100">Panel 1 - Motos vendidas</h2>
        <div class="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-300">
          <span>Alerta por registro (dias):</span>
          <input v-model.number="config.diasAlertaRegistro" type="number" min="1" class="w-20 rounded-lg border border-slate-600 bg-[#0b1f46] px-3 py-2" />
          <span>Alerta por ultima actualizacion (dias):</span>
          <input v-model.number="config.diasAlertaActualizacion" type="number" min="1" class="w-20 rounded-lg border border-slate-600 bg-[#0b1f46] px-3 py-2" />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select v-model="filtroEstadoMotos" class="input">
          <option value="pendientes">Pendientes (oculta entregadas)</option>
          <option value="entregadas">Solo entregadas</option>
          <option value="todos">Todos</option>
        </select>
        <button class="btn" @click="exportarMotosCsv">Exportar CSV</button>
        <button class="btn" @click="exportarMotosJson">Exportar JSON</button>
        <label class="btn cursor-pointer">Importar CSV/JSON<input type="file" class="hidden" accept=".csv,.json" @change="importarMotosArchivo" /></label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <select v-model="nuevaMoto.apronteId" class="input" @change="aplicarApronteSeleccionado">
          <option :value="null">Sin apronte asociado</option>
          <option v-for="a in aprontesDisponibles" :key="a.id" :value="a.id">
            #{{ a.id }} - {{ a.nombre }} - {{ a.marca }} {{ a.modelo }}
          </option>
        </select>
        <input v-model="nuevaMoto.marca" placeholder="Marca" class="input" />
        <input v-model="nuevaMoto.modelo" placeholder="Modelo" class="input" />
        <input v-model="nuevaMoto.cliente" placeholder="Nombre de cliente" class="input" />
        <input v-model="nuevaMoto.telefono" placeholder="Telefono" class="input" />
        <input v-model="nuevaMoto.comentario" placeholder="Comentario" class="input md:col-span-2" />
        <select v-model="nuevaMoto.vendedor" class="input">
          <option v-for="v in vendedores" :key="v" :value="v">{{ v }}</option>
        </select>
        <select v-model="nuevaMoto.estado" class="input">
          <option value="en_apronte">En apronte</option>
          <option value="pedido_a_proveedor">Pedido a proveedor</option>
          <option value="pendiente_de_pedir">Pendiente de pedir</option>
          <option value="en_deposito">En deposito</option>
          <option value="en_armado">En armado</option>
          <option value="lista_para_entregar">Lista para entregar</option>
          <option value="cliente_avisado">Cliente avisado</option>
          <option value="entregada">Entregada</option>
        </select>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <input v-model="nuevoVendedor" placeholder="Agregar vendedor" class="input max-w-xs" />
        <button class="btn" @click="agregarVendedor">Agregar vendedor</button>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="v in vendedores"
            :key="v"
            class="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200"
            @click="quitarVendedor(v)"
          >
            {{ v }} x
          </button>
        </div>
      </div>

      <button class="btn" @click="agregarMoto">Agregar moto</button>

      <div class="overflow-auto rounded-xl border border-slate-700/70">
        <table class="min-w-full text-sm">
          <thead class="bg-[#0b1f46] text-slate-300">
            <tr>
              <th class="th">Fecha registro</th>
              <th class="th">Apronte</th>
              <th class="th">Marca / Modelo</th>
              <th class="th">Cliente</th>
              <th class="th">Telefono</th>
              <th class="th">Comentario</th>
              <th class="th">Vendedor</th>
              <th class="th">Estado</th>
              <th class="th">Dias registro</th>
              <th class="th">Dias actualizacion</th>
              <th class="th">Acciones</th>
              <th class="th"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in motosFiltradas"
              :key="m.id"
              class="border-t border-slate-800/80"
              :class="(diasDesde(m.createdAt) >= config.diasAlertaRegistro || diasDesde(m.updatedAt) >= config.diasAlertaActualizacion) ? 'bg-amber-500/10' : ''"
            >
              <td class="td">{{ new Date(m.createdAt).toLocaleDateString() }}</td>
              <td class="td font-semibold">{{ m.apronteId ? `#${m.apronteId}` : '-' }}</td>
              <td class="td">{{ m.marca }} / {{ m.modelo }}</td>
              <td class="td">{{ m.cliente }}</td>
              <td class="td">{{ m.telefono }}</td>
              <td class="td max-w-[220px] truncate">{{ m.comentario }}</td>
              <td class="td">
                <select :value="m.vendedor" class="input !py-1" @change="actualizarMoto(m.id, { vendedor: String(($event.target as HTMLSelectElement).value) })">
                  <option v-for="v in vendedores" :key="v" :value="v">{{ v }}</option>
                </select>
              </td>
              <td class="td">
                <select :value="m.estado" class="input !py-1 estado-select" @change="actualizarMoto(m.id, { estado: ($event.target as HTMLSelectElement).value as MotoVentaEstado })">
                  <option v-for="(label, key) in estadoLabel" :key="key" :value="key">{{ label }}</option>
                </select>
              </td>
              <td class="td font-bold">{{ diasDesde(m.createdAt) }}</td>
              <td class="td font-bold">{{ diasDesde(m.updatedAt) }}</td>
              <td class="td">
                <button class="btn" @click="abrirEdicionMoto(m)">Editar</button>
                <button class="btn-danger ml-2" :disabled="!puedeQuitarMotos" @click="quitarMoto(m.id)">Quitar</button>
              </td>
            </tr>
            <tr v-if="!motosFiltradas.length">
              <td colspan="12" class="py-6 text-center text-slate-400">Sin motos para este filtro</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="panelActivo === 'creditos'" class="rounded-xl border border-slate-700/60 bg-[#091a3a] shadow-sm p-4 sm:p-6 space-y-4">
      <h2 class="text-xl font-black text-slate-100">Panel 2 - Consultas de credito</h2>

      <div class="flex flex-wrap items-center gap-2">
        <button class="btn" @click="exportarCreditosCsv">Exportar CSV</button>
        <button class="btn" @click="exportarCreditosJson">Exportar JSON</button>
        <label class="btn cursor-pointer">Importar CSV/JSON<input type="file" class="hidden" accept=".csv,.json" @change="importarCreditosArchivo" /></label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <input v-model="nuevoCredito.localidad" placeholder="Localidad" class="input" />
        <input v-model="nuevoCredito.telefono" placeholder="Telefono" class="input" />
        <input v-model.number="nuevoCredito.montoSolicitado" type="number" min="0" placeholder="Monto solicitado" class="input" />
        <input v-model="nuevoCredito.observaciones" placeholder="Observaciones" class="input" />
        <label class="check-wrap md:col-span-2 xl:col-span-1">
          <input v-model="nuevoCredito.concretaVenta" type="checkbox" class="checkbox-modern" />
          Se concreto la venta
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <input v-model="nuevaFinanciera" placeholder="Agregar financiera" class="input max-w-xs" />
        <button class="btn" @click="agregarFinanciera">Agregar financiera</button>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="f in financierasDisponibles"
            :key="f"
            class="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200"
            @click="quitarFinanciera(f)"
          >
            {{ f }} x
          </button>
        </div>
      </div>

      <button class="btn" @click="agregarCredito">Agregar consulta de credito</button>

      <div class="overflow-auto rounded-xl border border-slate-700/70">
        <table class="min-w-full text-sm">
          <thead class="bg-[#0b1f46] text-slate-300">
            <tr>
              <th class="th">Fecha</th>
              <th class="th">Localidad</th>
              <th class="th">Telefono</th>
              <th class="th">Monto</th>
              <th class="th">Observaciones</th>
              <th v-for="f in financierasDisponibles" :key="f" class="th">{{ f }}</th>
              <th class="th">Venta</th>
              <th class="th">Dias ultima act.</th>
              <th class="th"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in creditos" :key="c.id" class="border-t border-slate-800/80">
              <td class="td">{{ new Date(c.createdAt).toLocaleDateString() }}</td>
              <td class="td">{{ c.localidad }}</td>
              <td class="td">{{ c.telefono }}</td>
              <td class="td">{{ c.montoSolicitado }}</td>
              <td class="td max-w-[220px] truncate">{{ c.observaciones || '-' }}</td>
              <td v-for="f in financierasDisponibles" :key="`${c.id}-${f}`" class="td">
                <select
                  :value="c.financieras[f] || 'sin_consultar'"
                  class="input !py-1 estado-select"
                  @change="actualizarEstadoFinanciera(c.id, f, ($event.target as HTMLSelectElement).value as FinancieraEstado)"
                >
                  <option value="sin_consultar">Sin consultar</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="rechazado">Rechazado</option>
                  <option value="aprobado">Aprobado</option>
                </select>
              </td>
              <td class="td">
                <label class="check-wrap !px-0 !py-0">
                  <input :checked="c.concretaVenta" type="checkbox" class="checkbox-modern" @change="actualizarCredito(c.id, { concretaVenta: ($event.target as HTMLInputElement).checked })" />
                </label>
              </td>
                            <td :colspan="9 + financierasDisponibles.length" class="py-6 text-center text-slate-400">Sin consultas de credito</td>
              <td class="td font-bold">{{ diasDesde(c.updatedAt) }}</td>
              <td class="td">
                <button class="btn" @click="abrirEdicionCredito(c)">Modificar</button>
              </td>
            </tr>
            <tr v-if="!creditos.length">
              <td :colspan="9 + financierasDisponibles.length" class="py-6 text-center text-slate-400">Sin consultas de credito</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="panelActivo === 'metricas'" class="rounded-xl border border-slate-700/60 bg-[#091a3a] shadow-sm p-4 sm:p-6 space-y-6">
      <h2 class="text-xl font-black text-slate-100">Panel 3 - Registros de venta</h2>

      <div class="flex flex-wrap items-center gap-2">
        <input v-model="mesExporte" type="month" class="input" />
      </div>

      <div class="text-sm text-slate-300">Mes seleccionado: <strong class="capitalize">{{ monthLabel }}</strong></div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div class="metric-card">
          <p class="metric-label">Motos vendidas del mes</p>
          <p class="metric-value">{{ formatNumber(motosMesSeleccionado.length) }}</p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Creditos del mes</p>
          <p class="metric-value">{{ formatNumber(creditosMesSeleccionado.length) }}</p>
        </div>
        <div class="metric-card metric-ok">
          <p class="metric-label">Creditos aprobados</p>
          <p class="metric-value">{{ formatNumber(creditosAprobadosMes) }}</p>
        </div>
        <div class="metric-card metric-bad">
          <p class="metric-label">Creditos rechazados</p>
          <p class="metric-value">{{ formatNumber(creditosRechazadosMes) }}</p>
        </div>
      </div>

      <div class="rounded-xl border border-slate-700/70 bg-[#07132c] p-4 sm:p-5">
        <h3 class="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Motos vs creditos por dia</h3>
        <div class="space-y-4">
          <div class="h-56 flex items-end gap-1">
            <div v-for="d in diario" :key="d.fecha" class="flex-1 flex flex-col items-center">
              <div class="w-full flex items-end gap-1 h-44">
                <div class="flex-1 rounded-md bg-gradient-to-t from-cyan-500 to-sky-400" :style="{ height: (((d.motos || 0) / maxDiario) * 100).toFixed(1) + '%' }"></div>
                <div class="flex-1 rounded-md bg-gradient-to-t from-emerald-500 to-lime-400" :style="{ height: (((d.creditos || 0) / maxDiario) * 100).toFixed(1) + '%' }"></div>
              </div>
              <span class="text-[10px] text-slate-400 mt-1">{{ formatFechaCorta(d.fecha) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-xl border border-slate-700/70 bg-[#07132c] p-4">
          <h3 class="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Resumen comercial trimestral</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span>Total motos vendidas</span><strong>{{ formatNumber(resumenTrimestre.motos) }}</strong></div>
            <div class="flex justify-between"><span>Total creditos gestionados</span><strong>{{ formatNumber(resumenTrimestre.creditos) }}</strong></div>
            <div class="flex justify-between text-emerald-300"><span>Aprobados (mes)</span><strong>{{ formatNumber(creditosAprobadosMes) }}</strong></div>
            <div class="flex justify-between text-rose-300"><span>Rechazados (mes)</span><strong>{{ formatNumber(creditosRechazadosMes) }}</strong></div>
          </div>
        </div>

        <div class="rounded-xl border border-slate-700/70 bg-[#07132c] p-4">
          <h3 class="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Proyeccion proximo trimestre</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span>Motos estimadas</span><strong>{{ formatNumber(proyeccion.motos) }}</strong></div>
            <div class="flex justify-between"><span>Creditos estimados</span><strong>{{ formatNumber(proyeccion.creditos) }}</strong></div>
          </div>
          <p class="text-xs text-slate-400 mt-3">
            Estimacion lineal basada en el ritmo del trimestre actual.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div class="rounded-xl border border-slate-700/70 bg-[#07132c] p-4">
          <h3 class="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Motos vendidas del mes</h3>
          <div class="overflow-auto max-h-80">
            <table class="w-full text-left text-sm">
              <thead class="text-[11px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th class="py-2">Fecha</th>
                  <th>Cliente</th>
                  <th>Moto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                <tr v-for="m in motosPreviewMes" :key="`mv-${m.id}`">
                  <td class="py-2 text-xs font-bold text-slate-200">{{ new Date(m.createdAt).toLocaleDateString() }}</td>
                  <td class="text-xs text-slate-300">{{ m.cliente }}</td>
                  <td class="text-xs text-slate-300">{{ m.marca }} {{ m.modelo }}</td>
                  <td><span :class="estadoClass(m.estado)">{{ estadoLabel[m.estado] }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-xl border border-slate-700/70 bg-[#07132c] p-4">
          <h3 class="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Creditos del mes</h3>
          <div class="overflow-auto max-h-80">
            <table class="w-full text-left text-sm">
              <thead class="text-[11px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th class="py-2">Fecha</th>
                  <th>Localidad</th>
                  <th>Monto</th>
                  <th>Observaciones</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                <tr v-for="c in creditosPreviewMes" :key="`cv-${c.id}`">
                  <td class="py-2 text-xs font-bold text-slate-200">{{ new Date(c.createdAt).toLocaleDateString() }}</td>
                  <td class="text-xs text-slate-300">{{ c.localidad }}</td>
                  <td class="text-xs text-slate-300">{{ c.montoSolicitado }}</td>
                  <td class="text-xs text-slate-300 max-w-[180px] truncate">{{ c.observaciones || '-' }}</td>
                  <td>
                    <span :class="estadoCreditoClass(estadoCreditoConsolidado(c) as FinancieraEstado)">{{ estadoCreditoConsolidado(c) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <div v-if="editandoMoto" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div class="w-full max-w-3xl rounded-xl border border-slate-700 bg-[#0b1f46] p-5 space-y-4">
        <h3 class="text-lg font-black">Editar moto vendida</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input v-model="editFecha" type="date" class="input" />
          <input v-model="editandoMoto.marca" placeholder="Marca" class="input" />
          <input v-model="editandoMoto.modelo" placeholder="Modelo" class="input" />
          <input v-model="editandoMoto.cliente" placeholder="Cliente" class="input" />
          <input v-model="editandoMoto.telefono" placeholder="Telefono" class="input" />
          <input v-model="editandoMoto.vendedor" placeholder="Vendedor" class="input" />
          <select v-model="editandoMoto.estado" class="input">
            <option v-for="(label, key) in estadoLabel" :key="key" :value="key">{{ label }}</option>
          </select>
          <input v-model="editandoMoto.comentario" placeholder="Comentario" class="input md:col-span-2" />
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn" @click="editandoMoto = null">Cancelar</button>
          <button class="btn" @click="guardarMotoEditada">Guardar cambios</button>
        </div>
      </div>
    </div>

    <div v-if="editandoCredito" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div class="w-full max-w-2xl rounded-xl border border-slate-700 bg-[#0b1f46] p-5 space-y-4">
        <h3 class="text-lg font-black">Modificar credito</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input v-model="editandoCredito.localidad" placeholder="Localidad" class="input" />
          <input v-model="editandoCredito.telefono" placeholder="Telefono" class="input" />
          <input v-model.number="editandoCredito.montoSolicitado" type="number" min="0" placeholder="Monto solicitado" class="input" />
          <label class="check-wrap md:justify-self-start">
            <input v-model="editandoCredito.concretaVenta" type="checkbox" class="checkbox-modern" />
            Se concreto la venta
          </label>
          <textarea v-model="editandoCredito.observaciones" placeholder="Observaciones" class="input md:col-span-2 min-h-[96px] resize-y"></textarea>
        </div>

        <div class="space-y-2">
          <p class="text-xs uppercase tracking-widest font-black text-slate-400">Estado por financiera</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div v-for="f in financierasDisponibles" :key="`edit-${f}`" class="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-[#0a1c3e] px-3 py-2">
              <span class="text-xs font-bold text-slate-200">{{ f }}</span>
              <select v-model="editandoCredito.financieras[f]" class="input !py-1 estado-select !w-44">
                <option value="sin_consultar">Sin consultar</option>
                <option value="pendiente">Pendiente</option>
                <option value="rechazado">Rechazado</option>
                <option value="aprobado">Aprobado</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex justify-between gap-2 pt-1">
          <button class="btn-danger" @click="quitarCreditoDesdeModal">Quitar</button>
          <div class="flex gap-2">
            <button class="btn" @click="editandoCredito = null">Cancelar</button>
            <button class="btn" @click="guardarCreditoEditado">Guardar cambios</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input {
  border: 1px solid #334155;
  background: #0b1f46;
  color: #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.7rem 0.9rem;
  font-size: 0.875rem;
}

.btn {
  border: none;
  border-radius: 0.5rem;
  padding: 0.7rem 1rem;
  font-weight: 700;
  font-size: 0.82rem;
  color: #ffffff;
  background: #2563eb;
}

.btn:hover {
  background: #1d4ed8;
}

.btn-danger {
  border: none;
  border-radius: 0.5rem;
  padding: 0.7rem 1rem;
  font-weight: 700;
  font-size: 0.82rem;
  color: #ffffff;
  background: #dc2626;
}

.btn-danger:hover {
  background: #b91c1c;
}

.th {
  text-align: left;
  padding: 0.7rem 0.85rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.td {
  padding: 0.7rem 0.85rem;
  vertical-align: middle;
}

.estado {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  padding: 0.15rem 0.45rem;
  border-radius: 0.4rem;
  border: 1px solid transparent;
  text-transform: uppercase;
}
.estado-cyan { color: #67e8f9; border-color: #0891b2; background: rgba(8, 145, 178, 0.2); }
.estado-indigo { color: #a5b4fc; border-color: #4f46e5; background: rgba(79, 70, 229, 0.2); }
.estado-amber { color: #fcd34d; border-color: #d97706; background: rgba(217, 119, 6, 0.2); }
.estado-sky { color: #7dd3fc; border-color: #0284c7; background: rgba(2, 132, 199, 0.2); }
.estado-violet { color: #c4b5fd; border-color: #7c3aed; background: rgba(124, 58, 237, 0.2); }
.estado-lime { color: #d9f99d; border-color: #65a30d; background: rgba(101, 163, 13, 0.2); }
.estado-emerald { color: #86efac; border-color: #059669; background: rgba(5, 150, 105, 0.2); }
.estado-green { color: #bbf7d0; border-color: #16a34a; background: rgba(22, 163, 74, 0.2); }
.estado-rose { color: #fda4af; border-color: #e11d48; background: rgba(225, 29, 72, 0.2); }
.estado-gray { color: #cbd5e1; border-color: #475569; background: rgba(71, 85, 105, 0.25); }

.metric-card {
  border-radius: 0.7rem;
  border: 1px solid rgba(71, 85, 105, 0.7);
  background: #07132c;
  padding: 1rem;
}
.metric-ok { border-color: rgba(16, 185, 129, 0.6); }
.metric-bad { border-color: rgba(244, 63, 94, 0.6); }
.metric-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
  color: #94a3b8;
}
.metric-value {
  margin-top: 0.45rem;
  font-size: 1.9rem;
  font-weight: 900;
}

.estado-select {
  border-color: #0ea5e9;
  background: linear-gradient(180deg, #0d2d60 0%, #0b2450 100%);
  color: #dbeafe;
}

.check-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid #334155;
  background: #0b1f46;
  border-radius: 0.5rem;
  padding: 0.62rem 0.85rem;
  color: #dbeafe;
  font-size: 0.84rem;
  font-weight: 700;
}

.checkbox-modern {
  appearance: none;
  width: 1rem;
  height: 1rem;
  border-radius: 0.2rem;
  border: 1px solid #64748b;
  background: #081a3a;
  display: inline-grid;
  place-content: center;
  cursor: pointer;
}

.checkbox-modern::before {
  content: '';
  width: 0.58rem;
  height: 0.58rem;
  transform: scale(0);
  transition: transform 120ms ease-in-out;
  box-shadow: inset 1rem 1rem #22c55e;
  clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0, 43% 62%);
}

.checkbox-modern:checked {
  border-color: #22c55e;
  background: #0b2f1b;
}

.checkbox-modern:checked::before {
  transform: scale(1);
}
</style>
