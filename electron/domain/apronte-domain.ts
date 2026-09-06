type LegacyApronteInput = Record<string, any>

function cleanText(value: any, maxLen = 255) {
  const text = String(value || '').trim()
  return text.length > maxLen ? text.slice(0, maxLen) : text
}

function cleanOptionalDate(value: any) {
  const text = String(value || '').trim()
  return text || null
}

function normalizeEstado(value: any) {
  const raw = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')

  if (!raw) return 'APRONTE'
  if (raw === 'LISTO PARA ENTREGAR') return 'LISTA PARA ENTREGAR'
  if (raw === 'ENTREGADA ESPERA DE GARATIA') return 'ENTREGADA ESPERA DE GARANTIA'
  if (raw === 'ENTREGADA ESPERA GARANTIA') return 'ENTREGADA ESPERA DE GARANTIA'
  if (raw === 'ESPERA DE GARANTIA') return 'ENTREGADA ESPERA DE GARANTIA'
  return raw
}

function readSection(input: LegacyApronteInput, sectionName: string) {
  const section = input?.[sectionName]
  return section && typeof section === 'object' ? section : {}
}

export class Cliente {
  cedula: string
  nombre: string
  telefono: string
  localidad: string

  constructor(data: LegacyApronteInput = {}) {
    const cliente = readSection(data, 'cliente')
    this.cedula = cleanText(cliente.cedula ?? data.cedula ?? '', 50)
    this.nombre = cleanText(cliente.nombre ?? data.nombre ?? '', 255)
    this.telefono = cleanText(cliente.telefono ?? data.telefono ?? '', 30)
    this.localidad = cleanText(cliente.localidad ?? data.localidad ?? '', 100)
  }
}

export class Vehiculo {
  matricula: string
  marca: string
  modelo: string
  numeroMotor: string

  constructor(data: LegacyApronteInput = {}) {
    const vehiculo = readSection(data, 'vehiculo')
    this.matricula = cleanText(vehiculo.matricula ?? data.matricula ?? '', 50)
    this.marca = cleanText(vehiculo.marca ?? data.marca ?? '', 100)
    this.modelo = cleanText(vehiculo.modelo ?? data.modelo ?? '', 100)
    this.numeroMotor = cleanText(vehiculo.numero_motor ?? vehiculo.numeroMotor ?? data.numero_motor ?? '', 100)
  }
}

export class Apronte {
  nombre: string
  telefono: string
  localidad: string
  observaciones: string
  marca: string
  modelo: string
  numeroMotor: string
  factura: string
  estado: string
  repuestosGarantia: string
  correoAlertaGarantia: string
  diasAlertaGarantia: number
  fechaAlertaGarantia: string | null

  constructor(data: LegacyApronteInput = {}) {
    const apronte = readSection(data, 'apronte')
    this.nombre = cleanText(apronte.nombre ?? data.nombre ?? '', 255)
    this.telefono = cleanText(apronte.telefono ?? data.telefono ?? '', 30)
    this.localidad = cleanText(apronte.localidad ?? data.localidad ?? '', 100)
    this.observaciones = cleanText(apronte.observaciones ?? data.observaciones ?? '', 500)
    this.marca = cleanText(apronte.marca ?? data.marca ?? '', 100)
    this.modelo = cleanText(apronte.modelo ?? data.modelo ?? '', 100)
    this.numeroMotor = cleanText(apronte.numero_motor ?? apronte.numeroMotor ?? data.numero_motor ?? '', 100)
    this.factura = cleanText(apronte.factura ?? data.factura ?? '', 100)
    this.estado = normalizeEstado(apronte.estado ?? data.estado)
    this.repuestosGarantia = cleanText(apronte.repuestos_garantia ?? data.repuestos_garantia ?? '', 1000)
    this.correoAlertaGarantia = cleanText(apronte.correo_alerta_garantia ?? data.correo_alerta_garantia ?? '', 255)
    this.diasAlertaGarantia = Number(apronte.dias_alerta_garantia ?? data.dias_alerta_garantia ?? 7) || 7
    this.fechaAlertaGarantia = cleanOptionalDate(apronte.fecha_alerta_garantia ?? data.fecha_alerta_garantia)
  }
}

export function buildApronteDomain(input: LegacyApronteInput = {}) {
  return {
    cliente: new Cliente(input),
    vehiculo: new Vehiculo(input),
    apronte: new Apronte(input)
  }
}