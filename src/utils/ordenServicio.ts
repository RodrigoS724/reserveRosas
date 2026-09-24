export type Checklist = Record<string, boolean>

export type TrabajoRow = {
  cantidad: string
  descripcion: string
  costo: string
  importe: string
}

export type OrdenServicioInput = {
  fechaIngreso?: string
  fechaSalida?: string
  nombre?: string
  cedula?: string
  correo?: string
  telefono?: string
  localidad?: string
  marca?: string
  modelo?: string
  color?: string
  matricula?: string
  numeroMotor?: string
  numeroServicios?: string
  comentarios?: string
  observaciones?: string
  checklistIngreso?: Checklist
  checklistEgreso?: Checklist
  trabajos?: TrabajoRow[]
  trabajoRealizado?: string
}

export const CHECK_ITEMS = [
  { key: 'espejos', label: 'Espejos' },
  { key: 'faro_delantero', label: 'Faro delantero' },
  { key: 'tapon_gasolina', label: 'Tapón de gasolina' },
  { key: 'luz_stop_trasero', label: 'Luz de stop trasero' },
  { key: 'cubiertas_completas', label: 'Cubiertas completas' },
  { key: 'tapon_radiadores', label: 'Tapón de radiadores' },
  { key: 'filtro_aire', label: 'Filtro de aire' },
  { key: 'bateria', label: 'Batería' },
  { key: 'llaves', label: 'Llaves' },
  { key: 'pedales', label: 'Pedales' }
] as const

export const normalizarTexto = (value: unknown) => String(value ?? '').trim()

export const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

export const formatChecklistLabels = (checks: Checklist | undefined | null) => {
  return CHECK_ITEMS.filter((item) => Boolean(checks?.[item.key])).map((item) => item.label).join(', ') || 'Sin marcar'
}

export const buildTrabajoRealizadoTexto = (input: OrdenServicioInput) => {
  const lines = [
    `Ingreso: ${normalizarTexto(input.fechaIngreso)}`,
    `Cliente: ${normalizarTexto(input.nombre)} - CI ${normalizarTexto(input.cedula)}`,
    `Correo: ${normalizarTexto(input.correo)}`,
    `Moto: ${normalizarTexto(input.marca)} ${normalizarTexto(input.modelo)}${input.color ? ` - ${normalizarTexto(input.color)}` : ''}`.trim(),
    `Matrícula: ${normalizarTexto(input.matricula)}`,
    `Motor: ${normalizarTexto(input.numeroMotor)}`,
    `Servicios: ${normalizarTexto(input.numeroServicios)}`,
    `Checklist ingreso: ${formatChecklistLabels(input.checklistIngreso)}`,
    `Comentarios: ${normalizarTexto(input.comentarios)}`,
    'Trabajos:'
  ]

  ;(input.trabajos || []).forEach((row, index) => {
    const contenido = [row?.cantidad, row?.descripcion, row?.costo, row?.importe].map((part) => normalizarTexto(part)).join(' | ')
    lines.push(`${index + 1}. ${contenido}`)
  })

  lines.push(`Observaciones: ${normalizarTexto(input.observaciones)}`)
  lines.push(`Entrega / salida: ${normalizarTexto(input.fechaSalida)}`)
  lines.push(`Checklist egreso: ${formatChecklistLabels(input.checklistEgreso)}`)
  return lines.join('\n')
}

const renderChecklist = (checks: Checklist | undefined | null) => {
  return CHECK_ITEMS.map((item) => `
      <div class="check-item">
        <span class="box">${checks?.[item.key] ? '✓' : ''}</span>
        <span>${escapeHtml(item.label)}</span>
      </div>`).join('')
}

const renderSignature = (label: string) => `
      <div class="signature">${escapeHtml(label)}</div>`

export const buildOrdenServicioPrintHtml = (input: OrdenServicioInput & { folio?: string | number }) => {
  const trabajoRealizado = normalizarTexto(input.trabajoRealizado) || buildTrabajoRealizadoTexto(input)
  const trabajoHtml = escapeHtml(trabajoRealizado).replace(/\n/g, '<br>')
  const folio = escapeHtml(input.folio ?? '---')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Orden de Servicio</title>
    <style>
      @page { size: A4; margin: 7mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #222; background: #fff; }
      .sheet { width: 100%; min-height: 282mm; padding: 2mm; }
      .header { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: end; margin-bottom: 8px; }
      .title { font-size: 24px; font-weight: 800; letter-spacing: .04em; }
      .subtitle { font-size: 10px; color: #555; margin-top: 2px; }
      .folio { text-align: right; font-size: 11px; font-weight: 700; }
      .folio .value { display: inline-block; margin-top: 4px; min-width: 84px; border: 1px solid #333; padding: 5px 10px; font-size: 16px; font-weight: 800; text-align: center; }
      .panel { border: 1px solid #444; margin-top: 8px; }
      .panel-title { background: #e5e7eb; border-bottom: 1px solid #444; padding: 5px 8px; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
      .panel-body { padding: 8px; }
      .grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
      .field { display: grid; grid-template-columns: 95px 1fr; gap: 6px; align-items: center; font-size: 11px; margin-bottom: 5px; }
      .field .label { font-weight: 700; }
      .field .line { min-height: 17px; border-bottom: 1px solid #444; padding-bottom: 2px; word-break: break-word; }
      .checklist { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px 10px; }
      .check-item { display: flex; align-items: center; gap: 6px; font-size: 10px; line-height: 1.2; }
      .box { width: 12px; height: 12px; border: 1px solid #444; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; flex: none; }
      .text-box { min-height: 58px; border: 1px solid #444; padding: 6px 8px; font-size: 11px; line-height: 1.45; white-space: normal; }
      .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 10px; }
      .signature { border-top: 1px solid #222; padding-top: 18px; text-align: center; font-size: 10px; font-weight: 700; min-height: 34px; }
      .note { font-size: 10px; color: #555; margin-top: 6px; }
      .spacer { height: 4px; }
    </style>
  </head>
  <body onload="window.focus();window.print();">
    <div class="sheet">
      <div class="header">
        <div>
          <div class="title">Orden de Servicio</div>
          <div class="subtitle">Ingreso y egreso en una sola hoja imprimible</div>
        </div>
        <div class="folio">FOLIO<div class="value">${folio}</div></div>
      </div>

      <div class="panel">
        <div class="panel-title">Ingreso</div>
        <div class="panel-body">
          <div class="grid-two">
            <div>
              <div class="field"><span class="label">Moto:</span><span class="line">${escapeHtml([input.marca, input.modelo].filter(Boolean).join(' '))}</span></div>
              <div class="field"><span class="label">Color:</span><span class="line">${escapeHtml(input.color)}</span></div>
              <div class="field"><span class="label">Matrícula:</span><span class="line">${escapeHtml(input.matricula)}</span></div>
              <div class="field"><span class="label">Motor:</span><span class="line">${escapeHtml(input.numeroMotor)}</span></div>
            </div>
            <div>
              <div class="field"><span class="label">Fecha ingreso:</span><span class="line">${escapeHtml(input.fechaIngreso)}</span></div>
              <div class="field"><span class="label">Nombre:</span><span class="line">${escapeHtml(input.nombre)}</span></div>
              <div class="field"><span class="label">Teléfono:</span><span class="line">${escapeHtml(input.telefono)}</span></div>
              <div class="field"><span class="label">Correo:</span><span class="line">${escapeHtml(input.correo)}</span></div>
              <div class="field"><span class="label">Localidad:</span><span class="line">${escapeHtml(input.localidad)}</span></div>
            </div>
          </div>

          <div class="spacer"></div>
          <div class="panel-title" style="margin:0 -8px 8px;">Checklist de ingreso</div>
          <div class="checklist">${renderChecklist(input.checklistIngreso)}</div>

          <div class="signatures">
            ${renderSignature('Firma del prestador del servicio')}
            ${renderSignature('Firma del cliente')}
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">Egreso</div>
        <div class="panel-body">
          <div class="field" style="grid-template-columns: 150px 1fr; align-items: start;">
            <span class="label">Descripción del trabajo:</span>
            <span class="text-box">${trabajoHtml}</span>
          </div>
          <div class="grid-two">
            <div>
              <div class="field"><span class="label">Observaciones:</span><span class="line">${escapeHtml(input.observaciones)}</span></div>
            </div>
            <div>
              <div class="field"><span class="label">Fecha de entrega:</span><span class="line">${escapeHtml(input.fechaSalida)}</span></div>
              <div class="field"><span class="label">Comentario final:</span><span class="line">${escapeHtml(input.comentarios)}</span></div>
            </div>
          </div>

          <div class="spacer"></div>
          <div class="panel-title" style="margin:0 -8px 8px;">Checklist de egreso</div>
          <div class="checklist">${renderChecklist(input.checklistEgreso)}</div>

          <div class="signatures">
            ${renderSignature('Firma del prestador del servicio')}
            ${renderSignature('Firma del cliente')}
          </div>
          <div class="note">La impresión está pensada para completar y firmar en una sola hoja.</div>
        </div>
      </div>
    </div>
  </body>
</html>`
}
