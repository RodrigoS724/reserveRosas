import { initDatabase } from '../db/database'
import { tryMysql } from '../db/mysql'

function normalizarTexto(value: any, maxLen = 100) {
  const text = String(value || '').trim().toLowerCase()
  return text.length > maxLen ? text.slice(0, maxLen) : text
}

export async function obtenerMarcasMoto() {
  const mysqlResult = await tryMysql(async (pool) => {
    const [rows]: any = await pool.execute(
      `SELECT DISTINCT marca
       FROM motos_catalogo
       WHERE marca IS NOT NULL AND marca <> ''
       ORDER BY marca`
    )
    return (rows || []).map((r: any) => String(r?.marca || '').trim().toLowerCase()).filter(Boolean)
  })

  if (mysqlResult.ok) return mysqlResult.value

  const db = initDatabase()
  const rows = db.prepare(
    `SELECT DISTINCT marca
     FROM motos_catalogo
     WHERE marca IS NOT NULL AND marca <> ''
     ORDER BY marca`
  ).all() as { marca: string }[]
  return (rows || []).map((r) => String(r?.marca || '').trim().toLowerCase()).filter(Boolean)
}

export async function obtenerModelosMoto(marca?: string) {
  const marcaNormalizada = normalizarTexto(marca, 100)

  const mysqlResult = await tryMysql(async (pool) => {
    if (marcaNormalizada) {
      const [rows]: any = await pool.execute(
        `SELECT DISTINCT modelo
         FROM motos_catalogo
         WHERE LOWER(marca) = ? AND modelo IS NOT NULL AND modelo <> ''
         ORDER BY modelo`,
        [marcaNormalizada]
      )
      return (rows || []).map((r: any) => String(r?.modelo || '').trim().toLowerCase()).filter(Boolean)
    }
    const [rows]: any = await pool.execute(
      `SELECT DISTINCT modelo
       FROM motos_catalogo
       WHERE modelo IS NOT NULL AND modelo <> ''
       ORDER BY modelo`
    )
    return (rows || []).map((r: any) => String(r?.modelo || '').trim().toLowerCase()).filter(Boolean)
  })

  if (mysqlResult.ok) return mysqlResult.value

  const db = initDatabase()
  if (marcaNormalizada) {
    const rows = db.prepare(
      `SELECT DISTINCT modelo
       FROM motos_catalogo
       WHERE LOWER(marca) = ? AND modelo IS NOT NULL AND modelo <> ''
       ORDER BY modelo`
    ).all(marcaNormalizada) as { modelo: string }[]
    return (rows || []).map((r) => String(r?.modelo || '').trim().toLowerCase()).filter(Boolean)
  }

  const rows = db.prepare(
    `SELECT DISTINCT modelo
     FROM motos_catalogo
     WHERE modelo IS NOT NULL AND modelo <> ''
     ORDER BY modelo`
  ).all() as { modelo: string }[]
  return (rows || []).map((r) => String(r?.modelo || '').trim().toLowerCase()).filter(Boolean)
}
