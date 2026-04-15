// ─────────────────────────────────────────────────────────────────────────────
// config.js — Configuración de marcas
// MARCA_ACTIVA: default para formularios (no filtra el dashboard ni la lista)
// TODAS_LAS_MARCAS: catálogo completo para selectores y KPIs
// ─────────────────────────────────────────────────────────────────────────────

export const MARCA_ACTIVA = 'mycocos_cl'

export const TODAS_LAS_MARCAS = [
  { value: 'mycocos_cl',   label: 'MyCOCOS® CL',  color: '#0B1D3A' },
  { value: 'myhuevos_mx',  label: 'MyHUEVOS® MX', color: '#10b981' },
  { value: 'myhuevos_col', label: 'MyHUEVOS® COL',color: '#f59e0b' },
  { value: 'mennt_cl',     label: 'MENNT® CL',     color: '#a855f7' },
]

/** 'mycocos_cl,mennt_cl' → ['mycocos_cl', 'mennt_cl'] */
export function parseMarcas(str) {
  if (!str) return []
  return str.split(',').map((s) => s.trim()).filter(Boolean)
}

/** ['mycocos_cl', 'mennt_cl'] → 'mycocos_cl,mennt_cl' */
export function serializeMarcas(arr) {
  return arr.join(',')
}

export function getMarcaLabel(value) {
  return TODAS_LAS_MARCAS.find((m) => m.value === value)?.label || value
}

export function getMarcaColor(value) {
  return TODAS_LAS_MARCAS.find((m) => m.value === value)?.color || '#6b7280'
}

/**
 * Normaliza un string crudo del CSV a un valor interno reconocido.
 * Soporta separadores: coma, punto y coma, slash, &, +
 */
export function parseMarcasCSV(raw) {
  if (!raw) return []
  return raw
    .split(/[,;\/|&+]/)
    .map((s) => {
      const r = s.toLowerCase().trim().replace(/®/g, '').replace(/\s+/g, ' ')
      if (r.includes('mycocos') || r.includes('cocos'))                                   return 'mycocos_cl'
      if ((r.includes('myhuevos') || r.includes('huevos')) && (r.includes('mx') || r.includes('mexi'))) return 'myhuevos_mx'
      if ((r.includes('myhuevos') || r.includes('huevos')) && (r.includes('col') || r.includes('colom'))) return 'myhuevos_col'
      if (r.includes('mennt'))                                                             return 'mennt_cl'
      return s.trim() // fallback: valor tal cual
    })
    .filter(Boolean)
}
