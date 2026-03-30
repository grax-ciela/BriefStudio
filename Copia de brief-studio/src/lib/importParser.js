// ─────────────────────────────────────────────────────────────────────────────
// importParser.js
// Motor de parsing para importación de CSV / Google Sheets
// ─────────────────────────────────────────────────────────────────────────────
import Papa from 'papaparse'
import { MARCA_ACTIVA } from './config.js'

// ─── 1. NORMALIZACIÓN ────────────────────────────────────────────────────────

/**
 * Normaliza un header para comparación:
 * - Minúsculas
 * - Sin acentos
 * - Guiones, underscores y puntos → espacios
 * - Espacios múltiples colapsados
 * - Trim
 *
 * Ejemplo: "Ángulo del contenido " → "angulo del contenido"
 */
export function normalizarHeader(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .toLowerCase()
    .normalize('NFD')                          // descompone acentos: á → a + ́
    .replace(/[\u0300-\u036f]/g, '')           // elimina los diacríticos
    .replace(/[-_./]+/g, ' ')                  // guiones/underscores/puntos/barras → espacio
    .replace(/\s+/g, ' ')                      // colapsa espacios
    .trim()
}


// ─── 2. DICCIONARIO DE ALIAS ──────────────────────────────────────────────────

/**
 * Por cada campo del sistema, lista de nombres posibles que un humano
 * podría usar en su Google Sheet. Todos en minúsculas y ya normalizados.
 */
export const ALIAS_DICT = {
  // ── Campos de BATCH ──
  marca: [
    'marca', 'brand', 'producto', 'cliente', 'account',
  ],
  nombre_batch: [
    'nombre batch', 'batch', 'batch #', 'batch#', 'lote', 'campana', 'campaign',
    'grupo', 'paquete', 'nombre de batch', 'nombre del batch', 'numero de batch',
  ],
  fecha: [
    'fecha', 'date', 'fecha lanzamiento', 'fecha de lanzamiento',
    'launch date', 'fecha publicacion', 'fecha de publicacion',
  ],
  deseo: [
    'deseo', 'objetivo', 'goal', 'meta', 'proposito', 'intencion',
    'intencion creativa', 'objetivo creativo', 'deseo del cliente',
  ],

  // ── Campos de BRIEF ──
  concepto: [
    'concepto', 'concept', 'idea', 'titulo', 'title',
    'nombre del brief', 'brief name', 'nombre brief',
    'concepto idea', 'concepto   idea', 'nombre de la idea',
  ],
  angulo: [
    'angulo', 'angle', 'enfoque', 'perspectiva',
    'direccion', 'direccion creativa', 'creative direction',
    'angulo del contenido', 'angulo creativo', 'angulo de contenido',
    'angulo creativo del contenido',
  ],
  hipotesis: [
    'hipotesis', 'hypothesis', 'razon', 'razon del angulo',
    'por que', 'why', 'justificacion', 'fundamento',
    // Pregunta larga usada en Brief Studio
    'que estas creando o probando y que te da confianza de que esta prueba mejorara el rendimiento general',
    'que estas creando o probando',
    'que te da confianza',
    'confianza de que esta prueba',
  ],
  guion: [
    'guion', 'script', 'contenido', 'descripcion', 'copy',
    'texto', 'desarrollo', 'narrative', 'narrativa',
  ],
  referencia: [
    'referencia', 'reference', 'ref', 'link', 'url',
    'ejemplo', 'inspo', 'inspiracion', 'moodboard',
    'url de referencia', 'link de referencia', 'link referencia',
    'link al ad', 'link ad', 'ad link',
  ],
  formato: [
    'formato', 'format', 'tipo', 'type', 'tipo de contenido',
    'content type', 'formato de contenido',
  ],

  // ── Campos de HOOKS ──
  hook1: [
    'hook1', 'hook 1', 'hook_1', 'gancho 1', 'gancho1',
    'hook uno', 'primer hook', 'hook a',
  ],
  hook2: [
    'hook2', 'hook 2', 'hook_2', 'gancho 2', 'gancho2',
    'hook dos', 'segundo hook', 'hook b',
  ],
  hook3: [
    'hook3', 'hook 3', 'hook_3', 'gancho 3', 'gancho3',
    'hook tres', 'tercer hook', 'hook c',
  ],
  hook4: [
    'hook4', 'hook 4', 'hook_4', 'gancho 4', 'gancho4',
    'hook cuatro', 'cuarto hook', 'hook d',
  ],
  estado_hook: [
    'estado', 'estado hook', 'tipo hook', 'tipo de hook',
    'state', 'shooting', 'edicion', 'fase', 'status',
  ],
}

// Campos obligatorios — el import no puede proceder sin estos mapeados
export const CAMPOS_OBLIGATORIOS = ['concepto', 'nombre_batch']

// Campos que pertenecen a cada entidad
export const CAMPOS_POR_ENTIDAD = {
  batch: ['marca', 'nombre_batch', 'fecha', 'deseo'],
  brief: ['concepto', 'angulo', 'hipotesis', 'guion', 'referencia', 'formato'],
  hook:  ['hook1', 'hook2', 'hook3', 'hook4', 'estado_hook'],
}


// ─── 3. FUZZY MATCHING (Levenshtein) ─────────────────────────────────────────

/**
 * Distancia de Levenshtein entre dos strings.
 */
function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

/**
 * Porcentaje de similitud entre dos strings (0–100).
 */
function similitud(a, b) {
  if (!a && !b) return 100
  if (!a || !b) return 0
  const dist = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)
  return Math.round((1 - dist / maxLen) * 100)
}

// Umbrales acordados
const UMBRAL_ALTA   = 85
const UMBRAL_MEDIA  = 65

/**
 * Dado un header normalizado, busca el mejor campo del sistema.
 * Retorna: { campo, confianza, metodo, puntuacion }
 *
 * Estrategia:
 * 1. Match exacto con algún alias → confianza "alta", método "exacto"
 * 2. Fuzzy sobre todos los alias → confianza según umbral, método "alias" o "fuzzy"
 * 3. Sin match útil → { campo: null, confianza: 'desconocida', ... }
 */
// Detección por keyword: si el header CONTIENE estas palabras clave,
// se puede inferir el campo con confianza media aunque el fuzzy falle.
// Formato: { patron: RegExp, campo: string }
const KEYWORD_RULES = [
  { patron: /\bhook\s*1\b/,    campo: 'hook1' },
  { patron: /\bhook\s*2\b/,    campo: 'hook2' },
  { patron: /\bhook\s*3\b/,    campo: 'hook3' },
  { patron: /\bhook\s*4\b/,    campo: 'hook4' },
  // "hook" genérico sin número → hook1 por defecto (usuario puede cambiar)
  { patron: /\bhook\b/,        campo: 'hook1' },
  { patron: /\bhooks\b/,       campo: 'hook1' },
  { patron: /\bgancho\b/,      campo: 'hook1' },
  { patron: /\bhipotesis\b/,   campo: 'hipotesis' },
  { patron: /\bconfianza\b/,   campo: 'hipotesis' },
  { patron: /\bprobando\b/,    campo: 'hipotesis' },
  { patron: /\bcreando\b/,     campo: 'hipotesis' },
  { patron: /\bguion\b/,       campo: 'guion' },
  { patron: /\bscript\b/,      campo: 'guion' },
  { patron: /\bangulo\b/,      campo: 'angulo' },
  { patron: /\bconcepto\b/,    campo: 'concepto' },
  { patron: /\bmarca\b/,       campo: 'marca' },
]

export function buscarCampo(headerNormalizado) {
  let mejorCampo     = null
  let mejorPuntuacion = 0
  let mejorMetodo    = 'ninguno'

  for (const [campo, aliases] of Object.entries(ALIAS_DICT)) {
    for (const alias of aliases) {
      // Paso 1: match exacto
      if (headerNormalizado === alias) {
        return {
          campo,
          confianza: 'alta',
          metodo: 'exacto',
          puntuacion: 100,
        }
      }

      // Paso 2: fuzzy
      const puntaje = similitud(headerNormalizado, alias)
      if (puntaje > mejorPuntuacion) {
        mejorPuntuacion = puntaje
        mejorCampo = campo
        mejorMetodo = 'fuzzy'
      }
    }
  }

  // Evaluar resultado fuzzy
  if (mejorPuntuacion >= UMBRAL_ALTA) {
    return { campo: mejorCampo, confianza: 'alta',  metodo: mejorMetodo, puntuacion: mejorPuntuacion }
  }
  if (mejorPuntuacion >= UMBRAL_MEDIA) {
    return { campo: mejorCampo, confianza: 'media', metodo: mejorMetodo, puntuacion: mejorPuntuacion }
  }

  // Paso 3: keyword contains — para headers largos o con preguntas
  // Se aplica solo si el fuzzy no dio resultado útil
  for (const rule of KEYWORD_RULES) {
    if (rule.patron.test(headerNormalizado)) {
      return {
        campo: rule.campo,
        confianza: 'media',
        metodo: 'keyword',
        puntuacion: 70,
      }
    }
  }

  return { campo: null, confianza: 'desconocida', metodo: 'ninguno', puntuacion: mejorPuntuacion }
}


// ─── 4. SUGERENCIA DE MAPEO ───────────────────────────────────────────────────

/**
 * Recibe el array de headers originales del CSV.
 * Retorna el array de objetos ColumnMapping, uno por columna.
 *
 * Estructura de cada ColumnMapping:
 * {
 *   headerOriginal:    string,   // tal como viene del CSV
 *   headerNormalizado: string,   // tras normalización
 *   campoSugerido:     string|null,
 *   confianza:         'alta' | 'media' | 'baja' | 'desconocida',
 *   metodo:            'exacto' | 'fuzzy' | 'ninguno',
 *   puntuacion:        number,   // 0–100
 *   ignorar:           boolean,  // el usuario puede marcarlo para saltarlo
 * }
 */
export function sugerirMapeo(headersOriginales) {
  return headersOriginales.map((headerOriginal) => {
    const headerNormalizado = normalizarHeader(headerOriginal)
    const { campo, confianza, metodo, puntuacion } = buscarCampo(headerNormalizado)

    return {
      headerOriginal,
      headerNormalizado,
      campoSugerido: campo,
      confianza,
      metodo,
      puntuacion,
      ignorar: false,
    }
  })
}


// ─── 5. NORMALIZACIÓN DE FECHA ────────────────────────────────────────────────

/**
 * Convierte formatos de fecha humanos a YYYY-MM-DD para PostgreSQL.
 * Acepta: "6/4", "6/4/2025", "13/04/2025", "2025-04-06"
 * Asume formato DD/MM (o DD/MM/YYYY) — contexto latinoamericano.
 * Retorna null si el string está vacío o no puede parsearse.
 */
export function normalizarFecha(str) {
  if (!str || typeof str !== 'string') return null
  const s = str.trim()
  if (!s) return null

  // Ya está en formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // Formato D/M, D/M/YYYY, DD/MM, DD/MM/YYYY
  const partes = s.split('/')
  if (partes.length >= 2) {
    const dia  = partes[0].padStart(2, '0')
    const mes  = partes[1].padStart(2, '0')
    const anio = partes[2]
      ? partes[2].padStart(4, '0')
      : new Date().getFullYear().toString()
    const fecha = `${anio}-${mes}-${dia}`
    // Validar que sea una fecha real
    const d = new Date(fecha)
    if (!isNaN(d.getTime())) return fecha
  }

  return null // no se pudo parsear — insertar null
}


// ─── 6. ESTADO INICIAL DEL FLUJO ─────────────────────────────────────────────

/**
 * Estado inicial del flujo de importación.
 * Úsalo con useState(crearEstadoInicial()) en el componente.
 */
export function crearEstadoInicial() {
  return {
    fase: 'idle', // idle | cargando | mapeando | previsualizando | importando | listo

    csv: {
      filas: [],
      headers: [],
      totalFilas: 0,
    },

    mapeo: [], // array de ColumnMapping

    preview: {
      batchesNuevos: [],
      briefsNuevos: [],
      hooksNuevos: [],
      errores: [],
      advertencias: [],
    },
  }
}


// ─── 6. CARGA Y PARSEO DEL CSV ────────────────────────────────────────────────

/**
 * Convierte una URL de Google Sheets pública al endpoint de export CSV.
 * Soporta:
 *   - /edit?gid=123456          → extrae gid de query string
 *   - /edit#gid=123456          → extrae gid del hash
 *   - /edit?gid=123#gid=456     → usa el gid del query string (más confiable)
 *   - /export?format=csv        → devuelve tal cual
 */
export function normalizarUrlSheet(url) {
  // Ya es un link de pub o export — devolver sin tocar
  if (url.includes('/pub') || url.includes('/export')) return url

  // Extraer el ID del spreadsheet
  const matchId = url.match(/\/spreadsheets\/d\/([^/?#]+)/)
  if (!matchId) return url

  const spreadsheetId = matchId[1]

  // Intentar extraer gid del query string (?gid=XXXXX) primero,
  // luego del hash (#gid=XXXXX) como fallback
  const matchGidQuery = url.match(/[?&]gid=(\d+)/)
  const matchGidHash  = url.match(/#gid=(\d+)/)
  const gid = matchGidQuery?.[1] ?? matchGidHash?.[1]

  // /pub es el endpoint correcto para sheets publicados — no requiere autenticación
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/pub?single=true&output=csv`
  return gid ? `${base}&gid=${gid}` : base
}

/**
 * Carga un CSV desde una URL y lo parsea con PapaParse.
 * Retorna { headers, filas, totalFilas } o lanza un error.
 *
 * Requiere que PapaParse esté instalado: npm install papaparse
 */
export async function cargarCSV(url) {
  const csvUrl = normalizarUrlSheet(url)

  return new Promise((resolve, reject) => {
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          console.warn('[importParser] Advertencias al parsear CSV:', result.errors)
        }

        const headers = result.meta.fields ?? []
        const filas   = result.data

        resolve({
          headers,
          filas,
          totalFilas: filas.length,
        })
      },
      error: (error) => {
        reject(new Error(
          'No se pudo acceder al Google Sheet. ' +
          'Asegúrate de que el sheet esté publicado en la web: ' +
          'Archivo → Compartir → Publicar en la web → selecciona la hoja → CSV → Publicar. ' +
          `(Detalle: ${error.message})`
        ))
      },
    })
  })
}


// ─── 7. FUNCIÓN PRINCIPAL: cargarYMapear ─────────────────────────────────────

/**
 * Combina carga de CSV + sugerencia de mapeo.
 * Pensado para llamarse desde el componente de importación.
 *
 * Retorna: { csv: { headers, filas, totalFilas }, mapeo: ColumnMapping[] }
 */
export async function cargarYMapear(url) {
  const csv    = await cargarCSV(url)
  const mapeo  = sugerirMapeo(csv.headers)

  // Log de diagnóstico en desarrollo
  if (import.meta.env.DEV) {
    console.group('[importParser] Resultado del mapeo')
    mapeo.forEach((m) => {
      const icono = m.confianza === 'alta' ? '✅' : m.confianza === 'media' ? '⚠️' : '❓'
      console.log(
        `${icono} "${m.headerOriginal}" → ${m.campoSugerido ?? 'sin mapear'} (${m.confianza}, ${m.puntuacion}%)`
      )
    })
    console.groupEnd()
  }

  return { csv, mapeo }
}


// ─── 8. VALIDACIÓN Y CONSTRUCCIÓN DE PREVIEW ─────────────────────────────────

/**
 * Construye un índice { headerOriginal → campoSugerido } a partir del mapeo
 * para lookups rápidos al recorrer filas.
 */
function buildLookup(mapeo) {
  const lookup = {}
  for (const col of mapeo) {
    if (!col.ignorar && col.campoSugerido) {
      lookup[col.headerOriginal] = col.campoSugerido
    }
  }
  return lookup
}

/**
 * Dado el mapeo confirmado y las filas del CSV, valida y agrupa los datos
 * en batches → briefs → hooks listos para insertar en Supabase.
 *
 * Retorna:
 * {
 *   batchesNuevos:  [{ nombre, marca, fecha, deseo, briefs: [...] }]
 *   briefsNuevos:   [{ concepto, angulo, hipotesis, guion, referencia, formato, hooks: [...], _batchNombre }]
 *   hooksNuevos:    [{ texto, orden, _conceptoBrief }]
 *   errores:        [{ fila, campo, mensaje, severidad }]
 *   advertencias:   [{ fila, campo, mensaje, severidad }]
 * }
 */
export function construirPreview(filas, mapeo) {
  const lookup      = buildLookup(mapeo)
  const errores     = []
  const advertencias = []

  // Índice de batches por "nombre_batch|marca" para agrupar sin duplicar
  const batchIndex = {}

  filas.forEach((fila, idx) => {
    const numFila = idx + 2 // +2 porque fila 1 es el header en el sheet

    // ── Extraer valores usando el lookup ─────────────────────────────────────
    const get = (campo) => {
      const header = Object.keys(lookup).find((h) => lookup[h] === campo)
      return header ? (fila[header] ?? '').toString().trim() : ''
    }

    const nombreBatch = get('nombre_batch')
    const marca       = get('marca')
    const concepto    = get('concepto')
    const fecha       = get('fecha')
    const deseo       = get('deseo')
    const angulo      = get('angulo')
    const hipotesis   = get('hipotesis')
    const guion       = get('guion')
    const referencia  = get('referencia')
    const formato     = get('formato')
    const hook1       = get('hook1')
    const hook2       = get('hook2')
    const hook3       = get('hook3')
    const hook4       = get('hook4')

    // ── Fila casi vacía: menos de 2 campos con contenido → ignorar silenciosamente
    const todosLosValores = [nombreBatch, marca, concepto, fecha, deseo, angulo, hipotesis, guion, referencia, formato, hook1, hook2, hook3, hook4]
    const camposLlenos = todosLosValores.filter(Boolean).length
    if (camposLlenos < 2) return

    // ── Validaciones de campos obligatorios ──────────────────────────────────
    if (!nombreBatch) {
      errores.push({
        fila: numFila,
        campo: 'nombre_batch',
        mensaje: `Fila ${numFila}: falta el nombre del batch (campo obligatorio).`,
        severidad: 'error',
      })
      return
    }
    if (!concepto) {
      errores.push({
        fila: numFila,
        campo: 'concepto',
        mensaje: `Fila ${numFila}: falta el concepto del brief (campo obligatorio).`,
        severidad: 'error',
      })
      return
    }

    // ── Advertencias por campos opcionales vacíos ────────────────────────────
    if (!angulo)    advertencias.push({ fila: numFila, campo: 'angulo',    mensaje: `Fila ${numFila}: ángulo vacío.`,    severidad: 'advertencia' })
    if (!hipotesis) advertencias.push({ fila: numFila, campo: 'hipotesis', mensaje: `Fila ${numFila}: hipótesis vacía.`, severidad: 'advertencia' })
    if (!guion)     advertencias.push({ fila: numFila, campo: 'guion',     mensaje: `Fila ${numFila}: guión vacío.`,     severidad: 'advertencia' })

    // ── Agrupar en batch ─────────────────────────────────────────────────────
    const batchKey = `${nombreBatch}|${marca}`.toLowerCase()

    if (!batchIndex[batchKey]) {
      batchIndex[batchKey] = {
        nombre: nombreBatch,
        marca,
        fecha,
        deseo,
        briefs: [],
        _key: batchKey,
      }
    }

    // ── Cada hook no vacío → un brief independiente ──────────────────────────
    const hooksNoVacios = [hook1, hook2, hook3, hook4].filter(Boolean)

    const briefBase = { concepto, angulo, hipotesis, deseo, guion, referencia, formato }

    if (hooksNoVacios.length === 0) {
      batchIndex[batchKey].briefs.push({ ...briefBase, hooks: [], _fila: numFila })
    } else {
      hooksNoVacios.forEach((textoHook) => {
        batchIndex[batchKey].briefs.push({
          ...briefBase,
          hooks: [{ texto: textoHook, orden: 1 }],
          _fila: numFila,
        })
      })
    }
  })

  const batchesNuevos = Object.values(batchIndex)

  // Vista plana de briefs y hooks (útil para el resumen del preview)
  const briefsNuevos = batchesNuevos.flatMap((b) =>
    b.briefs.map((br) => ({ ...br, _batchNombre: b.nombre }))
  )
  const hooksNuevos = briefsNuevos.flatMap((br) =>
    br.hooks.map((h) => ({ ...h, _conceptoBrief: br.concepto }))
  )

  return {
    batchesNuevos,
    briefsNuevos,
    hooksNuevos,
    errores,
    advertencias,
  }
}


// ─── 9. INSERT REAL A SUPABASE ────────────────────────────────────────────────

/**
 * Ejecuta el import completo a Supabase en orden:
 *   batch (crear o reutilizar) → brief (con numero auto) → hooks
 *
 * Recibe el preview ya construido y el cliente de Supabase.
 *
 * Retorna:
 * {
 *   creados:  [{ concepto, batchNombre, hooksCount }]  // briefs insertados OK
 *   fallidos: [{ concepto, batchNombre, error }]       // briefs que fallaron
 * }
 */
export async function ejecutarImport(preview, supabase) {
  const creados  = []
  const fallidos = []

  for (const batch of preview.batchesNuevos) {
    console.log(`[import] Procesando batch: "${batch.nombre}"`)

    // ── Paso 1: resolver batch (crear o reutilizar) ───────────────────────────
    let batchId

    // Usar MARCA_ACTIVA si el sheet no tiene marca detectada
    const marcaFinal = batch.marca || MARCA_ACTIVA

    // Buscar batch existente por nombre + marca
    let query = supabase.from('batches').select('id')
      .ilike('nombre', batch.nombre)
      .ilike('marca', marcaFinal)

    const { data: batchExistente, error: errorBusqueda } = await query.maybeSingle()

    console.log(`[import] Búsqueda batch:`, { batchExistente, errorBusqueda })

    if (errorBusqueda) {
      for (const brief of batch.briefs) {
        fallidos.push({
          concepto: brief.concepto,
          batchNombre: batch.nombre,
          error: `No se pudo verificar el batch: ${errorBusqueda.message}`,
        })
      }
      continue
    }

    if (batchExistente) {
      console.log(`[import] Reutilizando batch existente: ${batchExistente.id}`)
      batchId = batchExistente.id
    } else {
      console.log(`[import] Creando batch nuevo...`)
      // Crear batch nuevo
      const { data: batchNuevo, error: errorBatch } = await supabase
        .from('batches')
        .insert([{
          nombre:   batch.nombre,
          marca:    marcaFinal,
          fecha:    normalizarFecha(batch.fecha),
          deseo:    batch.deseo || null,
          formatos: [],
        }])
        .select('id')
        .single()

      console.log(`[import] Resultado creación batch:`, { batchNuevo, errorBatch })

      if (errorBatch) {
        for (const brief of batch.briefs) {
          fallidos.push({
            concepto: brief.concepto,
            batchNombre: batch.nombre,
            error: `No se pudo crear el batch: ${errorBatch.message}`,
          })
        }
        continue
      }

      batchId = batchNuevo.id
    }

    // ── Paso 2: contar briefs existentes en este batch (para numero) ──────────
    const { count: countActual } = await supabase
      .from('briefs')
      .select('*', { count: 'exact', head: true })
      .eq('batch_id', batchId)

    const offsetNumero = countActual ?? 0

    // ── Paso 3: insertar cada brief y sus hooks ───────────────────────────────
    for (let i = 0; i < batch.briefs.length; i++) {
      const brief = batch.briefs[i]

      const { data: briefNuevo, error: errorBrief } = await supabase
        .from('briefs')
        .insert([{
          batch_id:   batchId,
          marca:      marcaFinal,
          numero:     offsetNumero + i + 1,
          concepto:   brief.concepto,
          angulo:     brief.angulo     || null,
          hipotesis:  brief.hipotesis  || null,
          deseo:      brief.deseo      || null,
          guion:      brief.guion      || null,
          referencia: brief.referencia || null,
          descartado: false,
        }])
        .select('id')
        .single()

      if (errorBrief) {
        fallidos.push({
          concepto: brief.concepto,
          batchNombre: batch.nombre,
          error: errorBrief.message,
        })
        continue // saltar hooks, seguir con el próximo brief
      }

      // ── Paso 4: insertar hooks del brief ─────────────────────────────────
      if (brief.hooks.length > 0) {
        const hooksPayload = brief.hooks.map((h) => ({
          brief_id: briefNuevo.id,
          texto:    h.texto,
          orden:    h.orden,
          estado:   'shooting',
        }))

        const { error: errorHooks } = await supabase
          .from('hooks')
          .insert(hooksPayload)

        if (errorHooks) {
          // Brief ya creado, pero hooks fallaron — reportar como advertencia parcial
          creados.push({
            concepto:    brief.concepto,
            batchNombre: batch.nombre,
            hooksCount:  0,
            advertencia: `Hooks no guardados: ${errorHooks.message}`,
          })
          continue
        }
      }

      creados.push({
        concepto:    brief.concepto,
        batchNombre: batch.nombre,
        hooksCount:  brief.hooks.length,
      })
    }
  }

  return { creados, fallidos }
}
