import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  crearEstadoInicial,
  cargarYMapear,
  construirPreview,
  ejecutarImport,
  CAMPOS_OBLIGATORIOS,
} from '../lib/importParser'
import { supabase } from '../lib/supabaseClient'
import { MARCA_ACTIVA } from '../lib/config'

// Colores por nivel de confianza
const CONFIANZA_ESTILOS = {
  alta:        { bg: '#d1fae5', color: '#065f46', label: 'Alta' },
  media:       { bg: '#fef3c7', color: '#92400e', label: 'Media' },
  baja:        { bg: '#fee2e2', color: '#991b1b', label: 'Baja' },
  ignorado:    { bg: '#f3f4f6', color: '#9ca3af', label: 'Ignorado' },
  desconocida: { bg: '#f3f4f6', color: '#374151', label: '—' },
}

// Marcas disponibles con GIDs de Asana
const MARCAS_ASANA = [
  { value: '', label: '— Selecciona una marca —', gid: null },
  { value: 'mycocos_cl',   label: 'MyCOCOS® CL',   gid: '1210839779313156' },
  { value: 'myhuevos_mx',  label: 'MyHUEVOS® MX',  gid: '1210839779313157' },
  { value: 'myhuevos_col', label: 'MyHUEVOS® COL',  gid: '1210839779313158' },
  { value: 'mennt_cl',     label: 'MENNT® CL',      gid: '1210839779313159' },
]

// Todos los campos del sistema disponibles para mapear manualmente
const TODOS_LOS_CAMPOS = [
  { value: '', label: '— ignorar columna —' },
  { value: 'marca',        label: 'Marca' },
  { value: 'nombre_batch', label: 'Nombre del batch' },
  { value: 'fecha',        label: 'Fecha' },
  { value: 'deseo',        label: 'Deseo / objetivo' },
  { value: 'concepto',    label: 'Concepto' },
  { value: 'angulo',      label: 'Ángulo' },
  { value: 'hipotesis',   label: 'Hipótesis' },
  { value: 'guion',       label: 'Guión' },
  { value: 'referencia',  label: 'Referencia' },
  { value: 'formato',     label: 'Formato' },
  { value: 'hook1',       label: 'Hook 1' },
  { value: 'hook2',       label: 'Hook 2' },
  { value: 'hook3',       label: 'Hook 3' },
  { value: 'hook4',       label: 'Hook 4' },
  { value: 'estado_hook', label: 'Estado del hook' },
  { value: 'produccion',  label: 'Producción (grabación/edición)' },
  { value: 'link_brief',  label: 'Link al Brief' },
  { value: 'objetivo',    label: 'Objetivo' },
  { value: 'plataforma',  label: 'Plataforma' },
]

// ── Indicador de pasos ───────────────────────────────────────────────────────
function PasoIndicador({ fase }) {
  const pasos = ['idle', 'mapeando', 'previsualizando', 'listo']
  const labels = ['URL', 'Mapeo', 'Preview', 'Listo']
  const actual = pasos.indexOf(fase) === -1 ? 0 : pasos.indexOf(fase)
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
      {labels.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%',
            background: i <= actual ? 'var(--color-primary, #0B1D3A)' : 'var(--color-border, #E2E8F0)',
            color: i <= actual ? '#fff' : 'var(--color-text-muted, #A0AEC0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.75rem',
          }}>{i + 1}</span>
          <span style={{ color: i <= actual ? 'var(--color-text, #1A202C)' : 'var(--color-text-muted, #A0AEC0)', fontWeight: i === actual ? 600 : 400 }}>
            {label}
          </span>
          {i < labels.length - 1 && (
            <span style={{ color: 'var(--color-border, #E2E8F0)', marginLeft: '0.3rem' }}>›</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ImportPage() {
  const [estado, setEstado]       = useState(crearEstadoInicial())
  const [url, setUrl]             = useState('')
  const [error, setError]         = useState(null)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [marcaSeleccionada, setMarcaSeleccionada] = useState('')

  const marcaObj = MARCAS_ASANA.find(m => m.value === marcaSeleccionada)
  const marcaLabel = marcaObj?.label || ''
  const marcaGid = marcaObj?.gid || null
  const hayMarcaSeleccionada = !!marcaSeleccionada

  // ── Paso 1: Cargar CSV y sugerir mapeo ──────────────────────────────────────
  async function handleCargar() {
    if (!url.trim()) return
    setError(null)
    setEstado((e) => ({ ...e, fase: 'cargando' }))
    try {
      const { csv, mapeo } = await cargarYMapear(url.trim())
      setEstado((e) => ({ ...e, fase: 'mapeando', csv, mapeo }))
    } catch (err) {
      setError(err.message)
      setEstado((e) => ({ ...e, fase: 'idle' }))
    }
  }

  // ── Paso 2: Edición del mapeo ───────────────────────────────────────────────
  function handleCambiarCampo(idx, nuevoCampo) {
    setEstado((e) => {
      const nuevoMapeo = [...e.mapeo]
      nuevoMapeo[idx] = {
        ...nuevoMapeo[idx],
        campoSugerido: nuevoCampo || null,
        confianza: nuevoCampo ? 'alta' : 'desconocida',
        metodo: 'manual',
      }
      return { ...e, mapeo: nuevoMapeo }
    })
  }

  function handleIgnorar(idx) {
    setEstado((e) => {
      const nuevoMapeo = [...e.mapeo]
      nuevoMapeo[idx] = { ...nuevoMapeo[idx], ignorar: !nuevoMapeo[idx].ignorar }
      return { ...e, mapeo: nuevoMapeo }
    })
  }

  // ── Paso 3: Construir preview ───────────────────────────────────────────────
  function handleContinuar() {
    const preview = construirPreview(estado.csv.filas, estado.mapeo)
    setEstado((e) => ({ ...e, fase: 'previsualizando', preview }))
  }

  // ── Paso 4: Ejecutar import real a Supabase ─────────────────────────────────
  async function handleImportar(filteredPreview) {
    setImportando(true)
    setError(null)
    try {
      const previewToImport = filteredPreview || estado.preview
      // Usa la marca seleccionada como default (value = slug para Supabase)
      const marcaDefault = marcaSeleccionada || MARCA_ACTIVA
      console.log('[ImportPage] 🚀 Iniciando import con marca:', marcaDefault, '| Marca label:', marcaLabel)
      const res = await ejecutarImport(previewToImport, supabase, marcaDefault)
      // Guardar el GID de marca de Asana en el resultado para uso posterior
      res.asana_brand_gid = marcaGid
      res.asana_brand_label = marcaLabel
      console.log('[ImportPage] 📊 Resultado:', res.creados.length, 'creados,', res.fallidos.length, 'fallidos')

      // NO avanzar a "listo" si no se creó ningún brief
      if (res.creados.length === 0 && res.fallidos.length > 0) {
        const errMsgs = res.fallidos.map(f => `• ${f.concepto}: ${f.error}`).join('\n')
        setError(`Todos los briefs fallaron. Revisa la consola del navegador (F12) para detalles.\n\n${errMsgs}`)
        console.error('[ImportPage] ❌ IMPORT FALLÓ COMPLETAMENTE. Ningún brief guardado.')
        return
      }

      setResultado(res)
      setEstado((e) => ({ ...e, fase: 'listo' }))
    } catch (err) {
      setError(`Error inesperado: ${err.message}`)
    } finally {
      setImportando(false)
    }
  }

  // ── Verificaciones de mapeo ─────────────────────────────────────────────────
  const camposMapeados = estado.mapeo
    .filter((m) => !m.ignorar && m.campoSugerido)
    .map((m) => m.campoSugerido)

  const faltanObligatorios = CAMPOS_OBLIGATORIOS.filter(
    (c) => !camposMapeados.includes(c)
  )
  const puedeAvanzar = faltanObligatorios.length === 0

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Importar desde Google Sheets
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        Pega la URL de tu Google Sheet público. El sistema detectará las columnas automáticamente.
      </p>

      <PasoIndicador fase={estado.fase} />

      {/* ── SELECTOR DE MARCA ── */}
      {(estado.fase === 'idle' || estado.fase === 'cargando' || estado.fase === 'mapeando') && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block', fontSize: '0.8125rem', fontWeight: 600,
            color: 'var(--color-text-secondary, #4A5568)',
            marginBottom: '0.375rem',
          }}>
            Marca *
          </label>
          <select
            value={marcaSeleccionada}
            onChange={(e) => setMarcaSeleccionada(e.target.value)}
            disabled={estado.fase === 'mapeando'}
            className="select"
            style={{ maxWidth: 320 }}
          >
            {MARCAS_ASANA.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {!hayMarcaSeleccionada && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #A0AEC0)', marginTop: '0.25rem' }}>
              Selecciona una marca para habilitar la importación
            </p>
          )}
        </div>
      )}

      {/* ── PASO 1: URL ── */}
      {(estado.fase === 'idle' || estado.fase === 'cargando' || estado.fase === 'mapeando') && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && hayMarcaSeleccionada && handleCargar()}
            disabled={estado.fase === 'mapeando' || !hayMarcaSeleccionada}
            style={{
              flex: 1, padding: '0.6rem 0.75rem',
              border: '1px solid var(--color-border, #d1d5db)', borderRadius: 6,
              fontSize: '0.875rem',
              background: (!hayMarcaSeleccionada || estado.fase === 'mapeando') ? 'var(--color-bg, #f9fafb)' : 'var(--color-surface, #fff)',
              color: 'var(--color-text, #1A202C)',
            }}
          />
          <button
            onClick={handleCargar}
            disabled={estado.fase === 'cargando' || estado.fase === 'mapeando' || !url.trim() || !hayMarcaSeleccionada}
            className="btn btn-primary"
          >
            {estado.fase === 'cargando' ? 'Cargando…' : 'Cargar'}
          </button>
        </div>
      )}

      {/* Indicador de progreso durante carga */}
      {estado.fase === 'cargando' && (
        <div style={{
          background: 'var(--color-bg, #f0f4f8)', color: 'var(--color-text-secondary, #4A5568)',
          padding: '0.75rem 1rem', borderRadius: 6,
          fontSize: '0.875rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '1rem' }}>&#9696;</span>
          Conectando con Google Sheets... Esto puede tomar unos segundos.
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2', color: '#991b1b',
          padding: '0.75rem 1rem', borderRadius: 6,
          fontSize: '0.875rem', marginBottom: '1rem',
          whiteSpace: 'pre-line',
        }}>
          {error}
        </div>
      )}

      {/* ── PASO 2: TABLA DE MAPEO ── */}
      {estado.fase === 'mapeando' && (
        <>
          <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Se detectaron <strong>{estado.csv.headers.length} columnas</strong> y{' '}
            <strong>{estado.csv.totalFilas} filas</strong>.
            Revisa el mapeo antes de continuar.
          </div>

          {faltanObligatorios.length > 0 && (
            <div style={{
              background: '#fef3c7', color: '#92400e',
              padding: '0.6rem 1rem', borderRadius: 6,
              fontSize: '0.85rem', marginBottom: '1rem',
            }}>
              ⚠️ Faltan campos obligatorios: <strong>{faltanObligatorios.join(', ')}</strong>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontWeight: 600 }}>Columna en tu Sheet</th>
                <th style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontWeight: 600 }}>Campo en Brief Studio</th>
                <th style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontWeight: 600 }}>Confianza</th>
                <th style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontWeight: 600 }}>Ignorar</th>
              </tr>
            </thead>
            <tbody>
              {estado.mapeo.map((col, idx) => {
                const estiloConfianza = CONFIANZA_ESTILOS[col.confianza]
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6', opacity: col.ignorar ? 0.4 : 1 }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={col.headerOriginal}>
                      {col.headerOriginal}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <select
                        value={col.campoSugerido ?? ''}
                        onChange={(e) => handleCambiarCampo(idx, e.target.value)}
                        disabled={col.ignorar}
                        style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.85rem', width: '100%' }}
                      >
                        {TODOS_LOS_CAMPOS.map((op) => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <span style={{
                        display: 'inline-block',
                        background: estiloConfianza.bg, color: estiloConfianza.color,
                        padding: '0.2rem 0.5rem', borderRadius: 4,
                        fontSize: '0.78rem', fontWeight: 600,
                      }}>
                        {estiloConfianza.label}
                        {col.puntuacion > 0 && col.confianza !== 'alta' && col.metodo !== 'exacto'
                          ? ` (${col.puntuacion}%)`
                          : ''}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                      <input type="checkbox" checked={col.ignorar} onChange={() => handleIgnorar(idx)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" disabled={!puedeAvanzar} onClick={handleContinuar}>
              Ver preview →
            </button>
          </div>
        </>
      )}

      {/* ── PASO 3: PREVIEW ── */}
      {estado.fase === 'previsualizando' && (
        <PreviewPanel
          preview={estado.preview}
          importando={importando}
          onVolver={() => setEstado((e) => ({ ...e, fase: 'mapeando' }))}
          onImportar={handleImportar}
        />
      )}

      {/* ── LISTO ── */}
      {estado.fase === 'listo' && resultado && (
        <div style={{ padding: '1rem 0' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Importación completada
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            {resultado.creados.length} brief{resultado.creados.length !== 1 ? 's' : ''} guardado{resultado.creados.length !== 1 ? 's' : ''}
            {resultado.fallidos.length > 0 && ` · ${resultado.fallidos.length} con error`}
          </p>

          {resultado.fallidos.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.4rem' }}>
                No se pudieron guardar:
              </div>
              {resultado.fallidos.map((f, i) => (
                <div key={i} style={{
                  background: '#fee2e2', color: '#991b1b',
                  padding: '0.4rem 0.75rem', borderRadius: 4,
                  fontSize: '0.825rem', marginBottom: '0.25rem',
                }}>
                  "{f.concepto}" — {f.error}
                </div>
              ))}
            </div>
          )}

          <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>
            Ver briefs →
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Checkbox estilizado ──────────────────────────────────────────────────────
function Checkbox({ checked, onChange, style }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
        border: checked ? '2px solid var(--color-primary, #0B1D3A)' : '2px solid var(--color-border, #E2E8F0)',
        background: checked ? 'var(--color-primary, #0B1D3A)' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.15s', padding: 0,
        ...style,
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

// ── Equipo para asignación extraordinaria ────────────────────────────────────
const EQUIPO_OVERRIDE = [
  { value: '', label: '— Asignación automática —', gid: null },
  { value: 'christian', label: 'Christian Torres (Friquiton)', gid: '1207592291188665' },
  { value: 'tamara',    label: 'Tamara Peñaloza',             gid: '1209248334964443' },
  { value: 'rafa',      label: 'Rafael Azuaje (Rafa)',         gid: '1211060457213910' },
  { value: 'diego',     label: 'Diego Martin',                 gid: '1213483686471887' },
  { value: 'javiera',   label: 'Javiera Ahumada (Javi)',       gid: '1207207427326115' },
  { value: 'ignacia',   label: 'Ignacia Vergara (Ina)',        gid: '1206322141323221' },
  { value: 'felex',     label: 'Felex',                        gid: '1201852562999880' },
  { value: 'graciela',  label: 'Graciela',                     gid: '1198217449925374' },
  { value: 'eduardo',   label: 'Eduardo',                      gid: '1198565290227364' },
  { value: 'dakota',    label: 'Dakota',                       gid: '1213786362764165' },
  { value: 'fauadz',   label: 'Fauadz',                       gid: '1198216603476155' },
]

// ── Componente de Preview ────────────────────────────────────────────────────
function PreviewPanel({ preview, importando, onVolver, onImportar }) {
  const { batchesNuevos, briefsNuevos, hooksNuevos, errores, advertencias } = preview

  // Estado de asignación extraordinaria por batch
  const [overrides, setOverrides] = useState({})

  // Estado de producción editable por brief: { "bi-ri": { grabacion: bool, edicion: bool, diseno: bool } }
  const [produccionState, setProduccionState] = useState(() => {
    const initial = {}
    batchesNuevos.forEach((batch, bi) => {
      batch.briefs.forEach((brief, ri) => {
        // Detectar automáticamente desde campo "produccion" del CSV (excluyentes)
        const prod = (brief.produccion || '').toLowerCase()
        const grabacion = /grab|film|shoot|record/i.test(prod)
        const edicion = !grabacion && /edic|edit|post/i.test(prod)
        const diseno = !grabacion && !edicion && /dise[ñn]|design|stat|graph/i.test(prod)
        initial[`${bi}-${ri}`] = { grabacion, edicion, diseno }
      })
    })
    return initial
  })

  // Estado de selección: Set de keys "batch-{bi}" y "brief-{bi}-{ri}"
  const [selected, setSelected] = useState(() => {
    const initial = new Set()
    batchesNuevos.forEach((batch, bi) => {
      initial.add(`batch-${bi}`)
      batch.briefs.forEach((_, ri) => initial.add(`brief-${bi}-${ri}`))
    })
    return initial
  })

  const toggleBatch = (bi, batch) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const batchKey = `batch-${bi}`
      const allSelected = batch.briefs.every((_, ri) => next.has(`brief-${bi}-${ri}`))

      if (allSelected) {
        // Deseleccionar todo el batch
        next.delete(batchKey)
        batch.briefs.forEach((_, ri) => next.delete(`brief-${bi}-${ri}`))
      } else {
        // Seleccionar todo el batch
        next.add(batchKey)
        batch.briefs.forEach((_, ri) => next.add(`brief-${bi}-${ri}`))
      }
      return next
    })
  }

  const toggleBrief = (bi, ri, batch) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const briefKey = `brief-${bi}-${ri}`

      if (next.has(briefKey)) {
        next.delete(briefKey)
      } else {
        next.add(briefKey)
      }

      // Actualizar estado del batch padre
      const allSelected = batch.briefs.every((_, i) => next.has(`brief-${bi}-${i}`))
      if (allSelected) {
        next.add(`batch-${bi}`)
      } else {
        next.delete(`batch-${bi}`)
      }

      return next
    })
  }

  // Toggle masivo de producción por batch (los 3 tipos son excluyentes)
  const toggleBatchProd = (bi, batch, field) => {
    setProduccionState((prev) => {
      const next = { ...prev }
      const selectedBriefs = batch.briefs
        .map((_, ri) => ({ ri, key: `${bi}-${ri}` }))
        .filter(({ ri }) => selected.has(`brief-${bi}-${ri}`))
      const allActive = selectedBriefs.every(({ key }) => next[key]?.[field])
      // Si todos activos → desactivar. Si no → activar este y desactivar los otros dos.
      selectedBriefs.forEach(({ key }) => {
        next[key] = { grabacion: false, edicion: false, diseno: false, [field]: !allActive }
      })
      return next
    })
  }

  // Contar seleccionados
  const selectedBriefCount = batchesNuevos.reduce((acc, batch, bi) =>
    acc + batch.briefs.filter((_, ri) => selected.has(`brief-${bi}-${ri}`)).length, 0
  )

  // Validación: cada brief seleccionado debe tener al menos un tipo de producción marcado
  const briefsSinProduccion = []
  const briefsSinLink = []
  batchesNuevos.forEach((batch, bi) => {
    batch.briefs.forEach((brief, ri) => {
      if (!selected.has(`brief-${bi}-${ri}`)) return
      const prod = produccionState[`${bi}-${ri}`] || { grabacion: false, edicion: false, diseno: false }
      if (!prod.grabacion && !prod.edicion && !prod.diseno) {
        briefsSinProduccion.push({ batch: batch.nombre, concepto: brief.concepto, bi, ri })
      }
      if (!brief.link_brief) {
        briefsSinLink.push({ batch: batch.nombre, concepto: brief.concepto, bi, ri })
      }
    })
  })
  const produccionValida = briefsSinProduccion.length === 0

  // Construir preview filtrado para importar (con override de asignación)
  const handleImportarSeleccionados = () => {
    console.log('🔴 [OVERRIDE DEBUG] Estado overrides:', JSON.stringify(overrides))

    const filteredBatches = batchesNuevos
      .map((batch, bi) => {
        // Buscar GID del override para este batch
        const overrideValue = overrides[bi]
        const overrideObj = EQUIPO_OVERRIDE.find((m) => m.value === overrideValue)
        const overrideGid = (overrideObj?.gid && overrideObj.gid.trim() !== '') ? overrideObj.gid : null

        console.log(`🔴 [OVERRIDE DEBUG] Batch #${bi} "${batch.nombre}":`, {
          selectorValue: overrideValue || '(vacío)',
          equipoMatch: overrideObj?.label || '(ninguno)',
          gidRaw: overrideObj?.gid,
          gidFinal: overrideGid,
        })

        if (overrideValue && !overrideGid) {
          console.warn(`⚠️ [OVERRIDE] Seleccionaste a "${overrideObj?.label}" pero su GID está vacío. La asignación será automática.`)
        }

        return {
          ...batch,
          briefs: batch.briefs
            .filter((_, ri) => selected.has(`brief-${bi}-${ri}`))
            .map((brief, ri) => {
              const prodKey = `${bi}-${batch.briefs.indexOf(brief)}`
              const prod = produccionState[prodKey] || { grabacion: false, edicion: false, diseno: false }
              return {
                ...brief,
                asignado_override: overrideGid,
                requiere_grabacion: prod.grabacion,
                requiere_edicion: prod.edicion,
                requiere_diseno: prod.diseno,
              }
            }),
        }
      })
      .filter((batch) => batch.briefs.length > 0)

    const filteredBriefs = []
    const filteredHooks = []
    filteredBatches.forEach((batch) => {
      batch.briefs.forEach((brief) => {
        filteredBriefs.push(brief)
        filteredHooks.push(...brief.hooks)
      })
    })

    console.log('🔴 [OVERRIDE DEBUG] Briefs a importar:', filteredBriefs.map(b => ({
      concepto: b.concepto,
      asignado_override: b.asignado_override,
    })))

    const filteredPreview = {
      ...preview,
      batchesNuevos: filteredBatches,
      briefsNuevos: filteredBriefs,
      hooksNuevos: filteredHooks,
    }

    onImportar(filteredPreview)
  }

  return (
    <div>
      {/* Resumen de totales */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Batches', n: batchesNuevos.length, bg: 'rgba(11,29,58,0.06)', text: 'var(--color-primary, #0B1D3A)' },
          { label: 'Seleccionados', n: selectedBriefCount, bg: 'var(--color-edicion-bg, #ECFDF5)', text: 'var(--color-edicion, #059669)' },
          { label: 'Total briefs', n: briefsNuevos.length, bg: 'rgba(107,114,128,0.08)', text: 'var(--color-text-secondary, #4A5568)' },
          { label: errores.length === 1 ? 'Error' : 'Errores', n: errores.length, bg: 'var(--color-danger-bg, #FEF2F2)', text: 'var(--color-danger, #DC2626)' },
        ].map(({ label, n, bg, text }) => (
          <div key={label} style={{
            flex: 1, minWidth: 100,
            background: bg, color: text,
            padding: '0.75rem 1rem', borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{n}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Errores */}
      {errores.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.875rem', color: 'var(--color-danger, #DC2626)' }}>
            Filas con errores (se saltarán)
          </div>
          {errores.map((e, i) => (
            <div key={i} style={{
              background: 'var(--color-danger-bg, #FEF2F2)', color: 'var(--color-danger, #DC2626)',
              padding: '0.4rem 0.75rem', borderRadius: 4,
              fontSize: '0.825rem', marginBottom: '0.25rem',
            }}>
              {e.mensaje}
            </div>
          ))}
        </div>
      )}

      {/* Advertencias */}
      {advertencias.length > 0 && (
        <details style={{ marginBottom: '1.25rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-shooting, #D97706)', fontWeight: 600 }}>
            {advertencias.length} advertencia{advertencias.length !== 1 ? 's' : ''} (campos opcionales vacíos)
          </summary>
          <div style={{ marginTop: '0.5rem' }}>
            {advertencias.map((a, i) => (
              <div key={i} style={{
                background: 'var(--color-shooting-bg, #FFFBEB)', color: 'var(--color-shooting, #D97706)',
                padding: '0.3rem 0.75rem', borderRadius: 4,
                fontSize: '0.8rem', marginBottom: '0.2rem',
              }}>
                {a.mensaje}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Vista previa de batches y briefs con selección */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--color-text, #1A202C)' }}>
          Selecciona los briefs a importar:
        </div>
        {batchesNuevos.map((batch, bi) => {
          const batchAllSelected = batch.briefs.every((_, ri) => selected.has(`brief-${bi}-${ri}`))
          const batchSomeSelected = batch.briefs.some((_, ri) => selected.has(`brief-${bi}-${ri}`))

          return (
            <div key={bi} style={{
              border: '1px solid var(--color-border, #E2E8F0)', borderRadius: 8,
              marginBottom: '0.75rem', overflow: 'hidden',
              background: 'var(--color-surface, #fff)',
            }}>
              {/* Header del batch con checkbox */}
              <div style={{
                background: 'var(--color-bg, #F8F9FC)', padding: '0.6rem 1rem',
                borderBottom: '1px solid var(--color-border, #E2E8F0)',
                display: 'flex', gap: '0.75rem', alignItems: 'center',
              }}>
                <Checkbox
                  checked={batchAllSelected}
                  onChange={() => toggleBatch(bi, batch)}
                />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text, #1A202C)' }}>{batch.nombre}</span>
                {batch.marca && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #A0AEC0)' }}>{batch.marca}</span>}
                {batch.fecha && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #A0AEC0)' }}>{batch.fecha}</span>}
                <select
                  className="select-override"
                  style={{ marginLeft: 'auto' }}
                  value={overrides[bi] || ''}
                  onChange={(e) => setOverrides((prev) => ({ ...prev, [bi]: e.target.value }))}
                  title="Asignación extraordinaria"
                >
                  {EQUIPO_OVERRIDE.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #A0AEC0)' }}>
                  {batch.briefs.filter((_, ri) => selected.has(`brief-${bi}-${ri}`)).length}/{batch.briefs.length} briefs
                </span>
              </div>
              {/* Toggles masivos de producción */}
              <div style={{
                padding: '0.35rem 1rem', borderBottom: '1px solid var(--color-border, #E2E8F0)',
                display: 'flex', gap: '0.5rem', alignItems: 'center',
                background: 'var(--color-bg, #F8F9FC)',
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #A0AEC0)', fontWeight: 600 }}>
                  Marcar todo:
                </span>
                <button type="button" onClick={() => toggleBatchProd(bi, batch, 'grabacion')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                    padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.68rem', fontWeight: 600,
                    border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontFamily: 'inherit',
                    background: 'rgba(239,68,68,0.06)', color: '#ef4444',
                  }}>
                  🎬 Grabar todos
                </button>
                <button type="button" onClick={() => toggleBatchProd(bi, batch, 'edicion')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                    padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.68rem', fontWeight: 600,
                    border: '1px solid rgba(168,85,247,0.3)', cursor: 'pointer', fontFamily: 'inherit',
                    background: 'rgba(168,85,247,0.06)', color: '#a855f7',
                  }}>
                  ✂️ Editar todos
                </button>
                <button type="button" onClick={() => toggleBatchProd(bi, batch, 'diseno')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                    padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.68rem', fontWeight: 600,
                    border: '1px solid rgba(14,165,233,0.3)', cursor: 'pointer', fontFamily: 'inherit',
                    background: 'rgba(14,165,233,0.06)', color: '#0ea5e9',
                  }}>
                  🎨 Diseñar todos
                </button>
              </div>
              {/* Briefs del batch con checkbox */}
              {batch.briefs.map((brief, ri) => {
                const isSelected = selected.has(`brief-${bi}-${ri}`)
                const prodKey = `${bi}-${ri}`
                const prod = produccionState[prodKey] || { grabacion: false, edicion: false, diseno: false }
                const toggleProd = (field) => {
                  setProduccionState((prev) => {
                    const current = prev[prodKey]?.[field]
                    // Los 3 tipos son excluyentes: activar uno desactiva los otros
                    return { ...prev, [prodKey]: { grabacion: false, edicion: false, diseno: false, [field]: !current } }
                  })
                }
                return (
                  <div key={ri} style={{
                    padding: '0.6rem 1rem',
                    borderBottom: ri < batch.briefs.length - 1 ? '1px solid var(--color-border, #E2E8F0)' : 'none',
                    display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                    opacity: isSelected ? 1 : 0.4,
                    transition: 'opacity 0.15s',
                  }}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleBrief(bi, ri, batch)}
                      style={{ marginTop: 2 }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #A0AEC0)', minWidth: 20, paddingTop: 2 }}>
                      #{ri + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text, #1A202C)' }}>{brief.concepto}</span>
                        {brief.link_brief ? (
                          <a href={brief.link_brief} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}
                            title={brief.link_brief}>
                            🔗 Doc
                          </a>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}
                            title="No se encontró link al documento original">
                            ⚠️ Sin doc
                          </span>
                        )}
                      </div>
                      {brief.angulo && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #4A5568)', marginTop: '0.15rem' }}>
                          {brief.angulo}
                        </div>
                      )}
                      {/* Hooks + Producción */}
                      <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {brief.hooks.map((h, hi) => (
                          <span key={hi} style={{
                            background: 'rgba(11,29,58,0.06)', color: 'var(--color-primary, #0B1D3A)',
                            padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 500,
                          }}>
                            Hook {h.orden}
                          </span>
                        ))}
                        {/* Alerta si no tiene producción marcada */}
                        {isSelected && !prod.grabacion && !prod.edicion && !prod.diseno && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                            fontSize: '0.68rem', color: '#dc2626', fontWeight: 600,
                          }}>
                            ⛔ Producción
                          </span>
                        )}
                        {/* Producción toggles (excluyentes) */}
                        <button type="button" onClick={() => toggleProd('grabacion')}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                            padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                            border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                            background: prod.grabacion ? 'rgba(239,68,68,0.1)' : 'transparent',
                            color: prod.grabacion ? '#ef4444' : '#a0aec0',
                            borderColor: prod.grabacion ? 'rgba(239,68,68,0.3)' : '#e2e8f0',
                          }}>
                          🎬 Grabar
                        </button>
                        <button type="button" onClick={() => toggleProd('edicion')}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                            padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                            border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                            background: prod.edicion ? 'rgba(168,85,247,0.1)' : 'transparent',
                            color: prod.edicion ? '#a855f7' : '#a0aec0',
                            borderColor: prod.edicion ? 'rgba(168,85,247,0.3)' : '#e2e8f0',
                          }}>
                          ✂️ Editar
                        </button>
                        <button type="button" onClick={() => toggleProd('diseno')}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                            padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                            border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                            background: prod.diseno ? 'rgba(14,165,233,0.1)' : 'transparent',
                            color: prod.diseno ? '#0ea5e9' : '#a0aec0',
                            borderColor: prod.diseno ? 'rgba(14,165,233,0.3)' : '#e2e8f0',
                          }}>
                          🎨 Diseñar
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Alertas de validación */}
      {!produccionValida && selectedBriefCount > 0 && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '0.75rem 1rem', marginBottom: '1rem',
          display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>⛔</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#991b1b', marginBottom: '0.25rem' }}>
              Debes definir si cada brief requiere Grabación o Edición antes de continuar
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
              {briefsSinProduccion.length} brief{briefsSinProduccion.length !== 1 ? 's' : ''} sin producción definida:
              {' '}{briefsSinProduccion.slice(0, 5).map(b => `"${b.concepto}"`).join(', ')}
              {briefsSinProduccion.length > 5 && ` y ${briefsSinProduccion.length - 5} más...`}
            </div>
          </div>
        </div>
      )}

      {briefsSinLink.length > 0 && selectedBriefCount > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fed7aa', borderRadius: 8,
          padding: '0.75rem 1rem', marginBottom: '1rem',
          display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#92400e' }}>
              {briefsSinLink.length} brief{briefsSinLink.length !== 1 ? 's' : ''} sin link al documento original
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a16207', marginTop: '0.15rem' }}>
              Puedes continuar, pero los briefs no tendrán enlace al documento fuente.
            </div>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button
          onClick={onVolver}
          className="btn btn-secondary"
        >
          ← Editar mapeo
        </button>
        <button
          className="btn btn-primary"
          disabled={selectedBriefCount === 0 || !produccionValida || importando}
          onClick={handleImportarSeleccionados}
          title={!produccionValida ? 'Define grabación o edición para cada brief' : ''}
        >
          {importando
            ? 'Importando...'
            : `Importar ${selectedBriefCount} brief${selectedBriefCount !== 1 ? 's' : ''} →`}
        </button>
      </div>
    </div>
  )
}
