/**
 * importParser.js — Motor de importación CSV → Briefs
 *
 * Exports compatibles con ImportPage.jsx:
 *   - crearEstadoInicial()
 *   - cargarYMapear(url)
 *   - construirPreview(filas, mapeo)  ← flatMap hook expansion aquí
 *   - ejecutarImport(preview, supabase)
 *   - CAMPOS_OBLIGATORIOS
 *
 * Reglas de negocio:
 *   1. Granularidad por HOOK: 1 fila con N hooks → N briefs independientes.
 *   2. Herencia: cada brief hereda Batch, Fecha, Concepto, Deseo, Ángulo.
 *   3. Formato: hooks detectados → "Video"; sin hooks → "Estático".
 *   4. Limpieza: texto del hook = título; resto de hipótesis = descripción.
 */

// ─────────────────────────────────────────────
// 1. CONSTANTES
// ─────────────────────────────────────────────

export const CAMPOS_OBLIGATORIOS = ['nombre_batch', 'concepto']

// ─────────────────────────────────────────────
// 2. NORMALIZACIÓN Y FUZZY MATCHING
// ─────────────────────────────────────────────

function normalizarTexto(str) {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!#()\-_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const HEADER_ALIASES = {
  'batch definitivo': 'nombre_batch',   // ← prioridad alta (Col D nueva)
  'batch':            'nombre_batch',
  'batch num':        'nombre_batch',
  'batch numero':     'nombre_batch',
  'no batch':         'nombre_batch',
  'numero de batch':  'nombre_batch',
  'n batch':          'nombre_batch',
  'nombre batch':     'nombre_batch',
  'nombre del batch': 'nombre_batch',

  'fecha':                'fecha',
  'fecha de publicacion': 'fecha',
  'fecha publicacion':    'fecha',
  'date':                 'fecha',

  'concepto':           'concepto',
  'concepto creativo':  'concepto',
  'concept':            'concepto',

  'deseo':                'deseo',
  'deseo del consumidor': 'deseo',
  'consumer desire':      'deseo',
  'insight':              'deseo',
  'deseo objetivo':       'deseo',

  'angulo':           'angulo',
  'angulo creativo':  'angulo',
  'angle':            'angulo',

  'hipotesis':                             'hipotesis',
  'hipotesis creativa':                    'hipotesis',
  'hipotesis creativa hooks de contenido': 'hipotesis',
  'hipotesis hooks':                       'hipotesis',
  'hypothesis':                            'hipotesis',
  'hooks':                                 'hipotesis',
  'pregunta':                              'hipotesis',
  'que estas creando o probando':          'hipotesis',
  'que estas probando':                    'hipotesis',

  'hook 1':   'hook1',
  'hook1':    'hook1',
  'hook 2':   'hook2',
  'hook2':    'hook2',
  'hook 3':   'hook3',
  'hook3':    'hook3',
  'hook 4':   'hook4',
  'hook4':    'hook4',

  'guion':    'guion',
  'script':   'guion',

  'referencia':        'referencia',
  'referencia visual': 'referencia',
  'ref':               'referencia',

  'formato':  'formato',
  'format':   'formato',
  'tipo':     'formato',

  'marca':    'marca',
  'brand':    'marca',

  'estado':           'estado_hook',
  'estado del hook':  'estado_hook',
  'status':           'estado_hook',

  'plataforma':   'plataforma',
  'plataformas':  'plataforma',
  'platform':     'plataforma',
  'red social':   'plataforma',
  'canal':        'plataforma',

  'objetivo':            'objetivo',
  'objetivo de campana': 'objetivo',
  'goal':                'objetivo',

  'etapa':            'etapa_funnel',
  'etapa del funnel': 'etapa_funnel',
  'funnel':           'etapa_funnel',

  'link al ad':     'link_ad',
  'link':           'link_ad',

  'link al brief':        'link_brief',
  'link brief':           'link_brief',
  'link del brief':       'link_brief',
  'brief link':           'link_brief',
  'documento':            'link_brief',
  'link al documento':    'link_brief',
  'doc':                  'link_brief',
  'resultado':      'resultado',
  'resultados':     'resultado',
  'aprendizajes':   'aprendizajes',
  'learnings':      'aprendizajes',
  'copy':           'copy',
  'texto':          'copy',
  'cta':            'cta',
  'call to action': 'cta',
}

function calcularConfianza(headerNorm, alias) {
  if (headerNorm === alias) return { confianza: 'alta', puntuacion: 100, metodo: 'exacto' }
  if (headerNorm.includes(alias) || alias.includes(headerNorm)) {
    const longer = Math.max(headerNorm.length, alias.length)
    const shorter = Math.min(headerNorm.length, alias.length)
    const score = Math.round((shorter / longer) * 100)
    return { confianza: score >= 70 ? 'media' : 'baja', puntuacion: score, metodo: 'fuzzy' }
  }
  return null
}

function sugerirCampo(headerOriginal, camposYaUsados) {
  const norm = normalizarTexto(headerOriginal)
  if (!norm) return null

  if (HEADER_ALIASES[norm] && !camposYaUsados.has(HEADER_ALIASES[norm])) {
    return { campoSugerido: HEADER_ALIASES[norm], confianza: 'alta', puntuacion: 100, metodo: 'exacto' }
  }

  let mejor = null
  for (const [alias, campo] of Object.entries(HEADER_ALIASES)) {
    if (camposYaUsados.has(campo)) continue
    const r = calcularConfianza(norm, alias)
    if (r && (!mejor || r.puntuacion > mejor.puntuacion)) {
      mejor = { campoSugerido: campo, ...r }
    }
  }
  return mejor
}


// ─────────────────────────────────────────────
// 3. PARSEO DE CSV
// ─────────────────────────────────────────────

function parsearCSV(csvText) {
  const lines = []
  let row = []
  let cell = ''
  let inQ = false
  const t = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (c === '"') {
      if (inQ && t[i + 1] === '"') { cell += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) { row.push(cell); cell = '' }
    else if (c === '\n' && !inQ) { row.push(cell); cell = ''; lines.push(row); row = [] }
    else cell += c
  }
  row.push(cell)
  if (row.some(c => c.trim())) lines.push(row)
  return lines.filter(r => r.some(c => c.trim()))
}


// ─────────────────────────────────────────────
// 4. EXTRACCIÓN DE HOOKS DESDE HIPÓTESIS
// ─────────────────────────────────────────────

/**
 * @returns {{ descripcion: string, hooks: Array<{ orden: number, texto: string }> }}
 */
function extraerHooksDeTexto(texto) {
  if (!texto || typeof texto !== 'string') return { descripcion: '', hooks: [] }

  // Normalizar saltos de línea invisibles de Google Sheets
  texto = texto.replace(/\r/g, '')

  // ── ÚNICO patrón válido: requiere la palabra "hook" antes del número ──
  // "Hook 1:", "Hook1.", "Ideas de hook 1:", "Idea de hook 2-", etc.
  // NUNCA detecta listas numeradas ("1. Título", "2. Testimonial") como hooks.
  const hookRegex = /(?:ideas?\s+de\s+)?hook\s*\d+\s*[:.\-–—]\s*/gi

  const partes = texto.split(hookRegex).map(s => s.trim()).filter(Boolean)
  if (partes.length >= 2) {
    const pos = texto.search(/(?:ideas?\s+de\s+)?hook\s*1\s*[:.\-–—]/i)
    const desc = pos > 0 ? texto.slice(0, pos).trim() : ''
    const hTexts = pos >= 0
      ? texto.slice(pos).split(hookRegex).map(s => s.trim()).filter(Boolean)
      : partes
    return { descripcion: desc, hooks: hTexts.map((t, i) => ({ orden: i + 1, texto: t })) }
  }

  // Sin "Hook N:" explícito → toda la celda es descripción, 0 hooks.
  // Las listas numeradas (1. Título, 2. Testimonial) son contenido, no hooks.
  return { descripcion: texto.trim(), hooks: [] }
}


// ─────────────────────────────────────────────
// 5. FETCH DE GOOGLE SHEETS
// ─────────────────────────────────────────────

// Proxies CORS públicos (se intentan en orden)
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

/**
 * Parsea URL de Google Sheets en sus 3 formatos comunes:
 *
 * 1. "Publicar en la web" (formato /d/e/2PACX-xxx/pub)
 *    → Ya es una URL de descarga directa, solo hay que asegurar output=csv
 *
 * 2. URL normal de edición (formato /d/SHEET_ID/edit)
 *    → Construir /export?format=csv o /pub?output=csv
 *
 * 3. URL ya formateada con /export o /pub
 *    → Usarla directo
 */
function parsearUrlGoogleSheet(url) {
  const u = url.trim()

  // ── Formato 1: "Publicar en la web" → /d/e/2PACX-.../pub?... ──
  // Estas URLs ya son de descarga directa. Solo asegurar que tengan output=csv.
  const pubWebMatch = u.match(/\/spreadsheets\/d\/e\/(2PACX[^/]+)\/pub/)
  if (pubWebMatch) {
    const pubId = pubWebMatch[1]
    const gidMatch = u.match(/gid=(\d+)/)
    const gid = gidMatch ? gidMatch[1] : '0'
    // Reconstruir URL limpia con output=csv
    const directUrl = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?gid=${gid}&single=true&output=csv`
    console.log('[importParser] Detectada URL de "Publicar en la web":', directUrl)
    return { tipo: 'pub_web', urls: [directUrl] }
  }

  // ── Formato 2/3: URL normal con /d/SHEET_ID/ ──
  const normalMatch = u.match(/\/d\/([a-zA-Z0-9_-]{20,})/)
  if (normalMatch) {
    const sheetId = normalMatch[1]
    const gidMatch = u.match(/gid=(\d+)/)
    const gid = gidMatch ? gidMatch[1] : '0'
    return {
      tipo: 'normal',
      urls: [
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/pub?gid=${gid}&single=true&output=csv`,
      ],
    }
  }

  throw new Error(
    'URL de Google Sheet inválida. Formatos aceptados:\n' +
    '• https://docs.google.com/spreadsheets/d/SHEET_ID/edit\n' +
    '• https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?...output=csv'
  )
}

/**
 * Intenta hacer fetch a una URL. Si falla por CORS, reintenta con proxies.
 * Valida que la respuesta sea CSV real (no HTML de login de Google).
 */
async function fetchConFallbackCORS(url) {
  // Intentar directo primero
  try {
    const r = await fetch(url, { redirect: 'follow' })
    if (r.ok) {
      const text = await r.text()
      if (esCSVValido(text)) return text
      console.warn('[importParser] Respuesta no es CSV válido (directo):', url)
    }
  } catch (e) {
    console.warn('[importParser] Fetch directo falló:', e.message)
  }

  // Intentar cada proxy CORS
  for (const proxyFn of CORS_PROXIES) {
    const proxyUrl = proxyFn(url)
    try {
      console.log('[importParser] Intentando proxy CORS:', proxyUrl.slice(0, 60) + '...')
      const r = await fetch(proxyUrl)
      if (r.ok) {
        const text = await r.text()
        if (esCSVValido(text)) return text
        console.warn('[importParser] Proxy devolvió HTML en vez de CSV')
      }
    } catch (e) {
      console.warn('[importParser] Proxy falló:', e.message)
    }
  }

  return null
}

/**
 * Verifica que el texto sea CSV real y no una página HTML de Google.
 */
function esCSVValido(text) {
  if (!text || text.length < 5) return false
  const trimmed = text.trim()
  // Si empieza con < es HTML (login page, error page, etc.)
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
    return false
  }
  // Verificar que tiene al menos una coma (es CSV)
  if (!trimmed.includes(',')) return false
  return true
}

/**
 * Descarga CSV desde Google Sheets con manejo inteligente de URLs y CORS.
 */
async function fetchGoogleSheet(url) {
  const parsed = parsearUrlGoogleSheet(url)

  for (const csvUrl of parsed.urls) {
    const text = await fetchConFallbackCORS(csvUrl)
    if (text) {
      console.log(`[importParser] CSV descargado OK (${text.length} bytes)`)
      return text
    }
  }

  throw new Error(
    'No se pudo acceder al Google Sheet.\n\n' +
    'Opciones para solucionarlo:\n' +
    '1. Archivo → Compartir → Publicar en la web → Seleccionar pestaña → CSV → Publicar\n' +
    '2. Usar la URL que empieza con https://docs.google.com/spreadsheets/d/e/2PACX-.../pub\n' +
    '3. Asegúrate de que el enlace esté compartido como "Cualquiera con el enlace"'
  )
}


// ─────────────────────────────────────────────
// 6. API PÚBLICA
// ─────────────────────────────────────────────

/**
 * Estado inicial del flujo de importación.
 */
export function crearEstadoInicial() {
  return {
    fase: 'idle',
    csv: null,
    mapeo: [],
    preview: null,
  }
}

/**
 * Paso 1: Descarga CSV desde URL y sugiere mapeo automático.
 */
export async function cargarYMapear(url) {
  const csvText = await fetchGoogleSheet(url)
  const rows = parsearCSV(csvText)

  if (rows.length < 2) throw new Error('El CSV no contiene datos (solo headers o está vacío).')

  const headers = rows[0].map(h => h.trim())
  const filas = rows.slice(1)

  const camposUsados = new Set()
  const mapeo = headers.map((headerOriginal) => {
    const s = sugerirCampo(headerOriginal, camposUsados)
    if (s) {
      camposUsados.add(s.campoSugerido)
      return { headerOriginal, campoSugerido: s.campoSugerido, confianza: s.confianza, puntuacion: s.puntuacion, metodo: s.metodo, ignorar: false }
    }
    return { headerOriginal, campoSugerido: null, confianza: 'desconocida', puntuacion: 0, metodo: null, ignorar: false }
  })

  // ── Prioridad "BATCH DEFINITIVO" sobre "BATCH #" ──
  // Si existe una columna con "batch definitivo" en el header, se fuerza como
  // nombre_batch y la columna vieja (BATCH #) se desasigna para evitar conflicto.
  const idxDefinitivo = mapeo.findIndex(
    (m) => normalizarTexto(m.headerOriginal).includes('batch definitivo')
  )
  if (idxDefinitivo !== -1) {
    // Desasignar cualquier columna que haya reclamado nombre_batch antes
    const idxBatchViejo = mapeo.findIndex(
      (m, i) => m.campoSugerido === 'nombre_batch' && i !== idxDefinitivo
    )
    if (idxBatchViejo !== -1) {
      mapeo[idxBatchViejo] = { ...mapeo[idxBatchViejo], campoSugerido: null, confianza: 'ignorado' }
      console.log(`[importParser] "BATCH DEFINITIVO" tiene prioridad — desasignando "${mapeo[idxBatchViejo].headerOriginal}"`)
    }
    // Forzar nombre_batch en la columna definitiva
    mapeo[idxDefinitivo] = {
      ...mapeo[idxDefinitivo],
      campoSugerido: 'nombre_batch',
      confianza: 'alta',
      puntuacion: 100,
      metodo: 'prioridad',
    }
    console.log(`[importParser] batch_id → columna "${mapeo[idxDefinitivo].headerOriginal}" (índice ${idxDefinitivo})`)
  }

  console.log('[importParser] Mapeo:', mapeo.map(m => `"${m.headerOriginal}" → ${m.campoSugerido || '?'} [${m.confianza}]`).join(', '))

  return { csv: { headers, filas, totalFilas: filas.length }, mapeo }
}

/**
 * Paso 2: Construye preview con expansión flatMap de hooks.
 *
 * UNA fila CSV con N hooks → N briefs independientes (formato: Video).
 * UNA fila CSV sin hooks → 1 brief (formato: Estático).
 */
export function construirPreview(filas, mapeo) {
  const errores = []
  const advertencias = []

  // Índice: campo → posición de columna
  const colIndex = {}
  mapeo.forEach((m, idx) => {
    if (!m.ignorar && m.campoSugerido) colIndex[m.campoSugerido] = idx
  })

  // Verificar obligatorios
  for (const campo of CAMPOS_OBLIGATORIOS) {
    if (!(campo in colIndex)) {
      errores.push({ fila: 0, mensaje: `Falta campo obligatorio: "${campo}"` })
    }
  }
  if (errores.length > 0) {
    return { batchesNuevos: [], briefsNuevos: [], hooksNuevos: [], errores, advertencias }
  }

  const val = (fila, campo) => {
    const idx = colIndex[campo]
    return idx !== undefined ? (fila[idx] || '').trim() : ''
  }

  // ─────────────────────────────────────────
  // FILTRO DE INTEGRIDAD: Anti-Briefs-Fantasma
  // ─────────────────────────────────────────
  const MIN_CAMPOS_NO_VACIOS = 3
  const totalAntes = filas.length

  // Anotar índice original para trazabilidad post-filtro
  filas.forEach((fila, i) => { fila._origIdx = i })

  const filasValidas = filas.filter((fila) => {
    // Contar campos mapeados que tienen valor real
    const valoresReales = mapeo
      .filter(m => !m.ignorar && m.campoSugerido)
      .map(m => (fila[mapeo.indexOf(m)] || '').trim())
      .filter(v => v !== '')
    // Campos críticos: concepto Y nombre_batch deben existir
    const concepto = val(fila, 'concepto')
    const batch = val(fila, 'nombre_batch')
    return valoresReales.length >= MIN_CAMPOS_NO_VACIOS && concepto && batch
  })

  const filasDescartadas = totalAntes - filasValidas.length
  if (filasDescartadas > 0) {
    console.log(`[importParser] Filtro integridad: ${filasDescartadas} filas fantasma descartadas de ${totalAntes} totales → ${filasValidas.length} filas válidas`)
    advertencias.push({
      fila: 0,
      mensaje: `Se descartaron ${filasDescartadas} filas vacías o incompletas (menos de ${MIN_CAMPOS_NO_VACIOS} campos con datos, o sin concepto/batch).`,
    })
  }

  // ─────────────────────────────────────────
  // FLATMAP: Expansión de hooks → briefs
  // ─────────────────────────────────────────
  let idCounter = 1
  const allBriefs = []
  const allHooks = []

  filasValidas.forEach((fila, fi) => {
    const concepto = val(fila, 'concepto')
    const batchNombre = val(fila, 'nombre_batch')

    const base = {
      marca:        val(fila, 'marca'),
      nombre_batch: batchNombre,
      fecha:        val(fila, 'fecha'),
      deseo:        val(fila, 'deseo'),
      concepto,
      angulo:       val(fila, 'angulo'),
      guion:        val(fila, 'guion'),
      referencia:   val(fila, 'referencia'),
      estado_hook:  val(fila, 'estado_hook'),
      plataforma:   val(fila, 'plataforma'),
      objetivo:     val(fila, 'objetivo'),
      link_brief:   val(fila, 'link_brief'),
      _filaCSV:     fila._origIdx + 2,
    }

    // Formato explícito del CSV (necesario antes de decidir prioridad de hooks)
    const formatoCSV = val(fila, 'formato')
    const esVideo = (formatoCSV || '').toLowerCase().includes('video')

    // Extraer hooks de hipótesis (solo detecta "Hook N:" explícito)
    const hipotesis = val(fila, 'hipotesis')
    const { descripcion, hooks: hooksEmbed } = extraerHooksDeTexto(hipotesis)

    // Hooks de columnas separadas (hook1..hook4)
    const hooksSep = []
    for (let h = 1; h <= 4; h++) {
      const t = val(fila, `hook${h}`)
      if (t) hooksSep.push({ orden: h, texto: t })
    }

    // Prioridad según formato:
    //   Video  → hipótesis ("Hook 1: ... Hook 2: ...") primero; columnas como fallback
    //   Static → columnas dedicadas primero; hipótesis como fallback
    const hooksFinal = esVideo
      ? (hooksEmbed.length > 0 ? hooksEmbed : hooksSep)
      : (hooksSep.length > 0 ? hooksSep : hooksEmbed)

    if (hooksFinal.length > 0) {
      // ── N hooks → N briefs (formato heredado del CSV, default Video) ──
      hooksFinal.forEach((hook) => {
        const briefId = `preview-${idCounter++}`
        const hookObj = { id: `hook-${briefId}-${hook.orden}`, orden: hook.orden, texto: hook.texto, briefId }
        allHooks.push(hookObj)
        allBriefs.push({
          ...base,
          id: briefId,
          titulo: hook.texto,
          descripcion: descripcion || hipotesis,
          formato: formatoCSV || 'Video',
          hooks: [hookObj],
          hook_number: hook.orden,
        })
      })
    } else if ((formatoCSV || '').toLowerCase().includes('video')) {
      // ── VIDEO SIN HOOKS PARSEABLES: 1 brief de video por defecto ──
      const briefId = `preview-${idCounter++}`
      allBriefs.push({
        ...base,
        id: briefId,
        titulo: concepto || base.angulo || 'Sin título',
        descripcion: hipotesis || '',
        formato: 'Video',
        hooks: [],
        hook_number: null,
      })
    } else {
      // ── ESTÁTICO: 1 brief ──
      allBriefs.push({
        ...base,
        id: `preview-${idCounter++}`,
        titulo: concepto || base.angulo || 'Sin título',
        descripcion: hipotesis || '',
        formato: formatoCSV || 'Estático',
        hooks: [],
        hook_number: null,
      })
    }
  })

  // Agrupar por batch
  const batchMap = new Map()
  allBriefs.forEach((b) => {
    const key = b.nombre_batch || '(Sin Batch)'
    if (!batchMap.has(key)) batchMap.set(key, { nombre: key, marca: b.marca, fecha: b.fecha, briefs: [] })
    batchMap.get(key).briefs.push(b)
  })

  // Advertencias de campos opcionales vacíos
  const opcionales = ['angulo', 'deseo']
  allBriefs.forEach((b) => {
    opcionales.forEach((c) => {
      if (!b[c]) advertencias.push({ fila: b._filaCSV, mensaje: `Fila ${b._filaCSV}: "${c}" vacío para "${b.concepto || b.titulo}"` })
    })
  })

  console.log(`[importParser] Preview: ${batchMap.size} batches, ${allBriefs.length} briefs, ${allHooks.length} hooks`)

  return {
    batchesNuevos: [...batchMap.values()],
    briefsNuevos: allBriefs,
    hooksNuevos: allHooks,
    errores,
    advertencias,
  }
}

/**
 * Convierte fechas del CSV al formato ISO YYYY-MM-DD que espera Supabase.
 *   "6/4"    → "2026-04-06"
 *   "13/4"   → "2026-04-13"
 *   "6/4/25" → "2025-04-06"
 *   "2026-04-13" → "2026-04-13"  (ya formateada, la devuelve igual)
 */
function limpiarFecha(fechaStr) {
  if (!fechaStr) return null
  const s = String(fechaStr).trim()
  if (!s) return null
  // Ya es YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // DD/MM o D/M (con año opcional: D/M/YY o D/M/YYYY)
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?$/)
  if (m) {
    const day   = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const rawYear = m[3]
    const year = rawYear
      ? (rawYear.length <= 2 ? `20${rawYear}` : rawYear)
      : String(new Date().getFullYear())
    return `${year}-${month}-${day}`
  }
  return null  // formato desconocido → null (Supabase acepta null en DATE)
}

/**
 * Paso 3: Importar a Supabase.
 *
 * @param {object} preview      - Resultado de construirPreview()
 * @param {object} supabase     - Cliente Supabase
 * @param {string} marcaDefault - Marca activa de la app (fallback: 'mycocos')
 *
 * Campos enviados a `briefs`:
 *   marca, batch_id, numero, concepto, angulo, deseo,
 *   referencia, hipotesis, guion, formato
 */
export async function ejecutarImport(preview, supabase, marcaDefault = 'mycocos') {
  const creados = []
  const fallidos = []

  for (const batch of preview.batchesNuevos) {
    let batchId = null

    // Marca efectiva: del batch > de los briefs > argumento > fallback
    const marcaEfectiva = batch.marca
      || preview.briefsNuevos.find(b => b.nombre_batch === batch.nombre)?.marca
      || marcaDefault

    // Fecha en formato ISO para Supabase
    const fechaISO = limpiarFecha(batch.fecha)

    // ── 1. SELECT primero (evita el problema de .single() sobre duplicados) ──
    const { data: existente } = await supabase
      .from('batches')
      .select('id')
      .eq('nombre', batch.nombre)
      .maybeSingle()       // devuelve null si no existe, sin tirar error

    if (existente?.id) {
      batchId = existente.id
      console.log(`[importParser] Batch existente: "${batch.nombre}" → ${batchId}`)
    } else {
      // ── 2. INSERT solo si no existía ──
      const batchPayload = { nombre: batch.nombre, marca: marcaEfectiva, fecha: fechaISO }
      console.log('[importParser] 📦 INSERT batch payload:', JSON.stringify(batchPayload))

      const { data: insertado, error: insertErr } = await supabase
        .from('batches')
        .insert(batchPayload)
        .select('id')
        .single()

      if (insertErr) {
        console.error('[importParser] ❌ ERROR DETALLADO DE SUPABASE (batch):', insertErr)
        console.error('[importParser] Código:', insertErr.code, '| Status:', insertErr.status || 'N/A', '| Detalles:', insertErr.details)
        fallidos.push({
          concepto: `Batch: ${batch.nombre}`,
          error: `No se pudo crear el batch — ${insertErr.message} (code: ${insertErr.code || 'N/A'})`,
        })
        continue
      }
      batchId = insertado.id
      console.log(`[importParser] ✅ Batch creado: "${batch.nombre}" (${marcaEfectiva}, ${fechaISO}) → ${batchId}`)
    }

    // Guardia final: si no tenemos ID no insertamos briefs (evita FK violation)
    if (!batchId) {
      fallidos.push({ concepto: `Batch: ${batch.nombre}`, error: 'ID de batch nulo' })
      continue
    }

    // ── 2. Calcular número base para este batch ──
    const { count: countActual } = await supabase
      .from('briefs')
      .select('*', { count: 'exact', head: true })
      .eq('batch_id', batchId)

    let numeroBase = countActual || 0

    // ── 3. Insertar briefs ──
    for (const brief of batch.briefs) {
      try {
        numeroBase++

        // Limpiar valor de formato: quitar emojis y normalizar a texto simple
        const formatoLimpio = (brief.formato || 'Estático')
          .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')   // emojis
          .replace(/[\u2600-\u27FF]/gu, '')           // símbolos misc
          .trim() || 'Estático'

        const briefPayload = {
          marca:      brief.marca || marcaEfectiva,
          batch_id:   batchId,
          numero:     numeroBase,
          concepto:   (brief.concepto || brief.titulo || '').trim(),
          angulo:     brief.angulo     || null,
          deseo:      brief.deseo      || null,
          hipotesis:  brief.descripcion || null,
          guion:      brief.guion      || null,
          referencia:  brief.referencia || null,
          link_brief:  brief.link_brief || null,
          formato:     formatoLimpio,
          ...(brief.asignado_override ? { asignado_override: brief.asignado_override } : {}),
        }
        console.log(`🔴 [importParser] brief.asignado_override recibido:`, brief.asignado_override)
        console.log(`🔴 [importParser] 📦 INSERT brief #${numeroBase} payload:`, JSON.stringify(briefPayload))

        const { data, error } = await supabase
          .from('briefs')
          .insert(briefPayload)
          .select('id, asignado_override')
          .single()

        if (error) {
          console.error('[importParser] ❌ ERROR DETALLADO DE SUPABASE (brief):', error)
          console.error('[importParser] Código:', error.code, '| Status:', error.status || 'N/A', '| Detalles:', error.details)
          throw error
        }
        console.log(`🔴 [importParser] ✅ Brief insertado: id=${data.id}, concepto="${briefPayload.concepto}", asignado_override en BD: "${data.asignado_override}"`)
        if (brief.asignado_override && !data.asignado_override) {
          console.error(`🔴🔴🔴 [importParser] ¡¡LA COLUMNA asignado_override NO SE GUARDÓ!! Enviaste "${brief.asignado_override}" pero la BD devolvió null. ¿Existe la columna en la tabla briefs?`)
        }


        // ── 4. Insertar hook(s) vinculado(s) al brief ──
        if (brief.hooks.length > 0) {
          const { error: hErr } = await supabase
            .from('hooks')
            .insert(brief.hooks.map(h => ({
              brief_id: data.id,
              orden:    h.orden,
              texto:    h.texto,
              estado:   brief.estado_hook || 'shooting',
            })))
          if (hErr) console.warn('[importParser] Hook insert error:', hErr.message)
        }

        creados.push({ concepto: brief.concepto || brief.titulo, id: data.id })
      } catch (err) {
        console.error('[importParser] Error al insertar brief:', err)
        fallidos.push({
          concepto: brief.titulo || brief.concepto,
          error: err.message || JSON.stringify(err),
        })
      }
    }
  }

  // ── Diagnóstico: verificar que los datos persisten (detección de RLS) ──
  if (creados.length > 0) {
    const testId = creados[0].id
    const { data: verificacion, error: verErr } = await supabase
      .from('briefs')
      .select('id, marca, batch_id, asignado_override')
      .eq('id', testId)
      .maybeSingle()

    if (verErr) {
      console.error('[importParser] 🔒 VERIFICACIÓN POST-INSERT FALLÓ (posible RLS):', verErr)
    } else if (!verificacion) {
      console.error('[importParser] 🔒 BRIEF INSERTADO PERO NO SE PUEDE LEER — RLS está bloqueando SELECT. El INSERT "funciona" pero los datos son invisibles.')
    } else {
      console.log('[importParser] ✅ Verificación post-insert OK. Brief leído:', JSON.stringify(verificacion))
      console.log(`🔴 [importParser] VERIFICACIÓN asignado_override en BD: "${verificacion.asignado_override}" (${verificacion.asignado_override ? '✅ GUARDADO' : '❌ NULL'})`)
    }
  }

  console.log(`[importParser] 🏁 RESUMEN: ${creados.length} creados, ${fallidos.length} fallidos`)
  if (fallidos.length > 0) {
    console.error('[importParser] Fallidos:', JSON.stringify(fallidos, null, 2))
  }
  return { creados, fallidos }
}