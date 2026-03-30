import { useState } from 'react'
import {
  crearEstadoInicial,
  cargarYMapear,
  construirPreview,
  ejecutarImport,
  CAMPOS_OBLIGATORIOS,
} from '../lib/importParser'
import { supabase } from '../lib/supabaseClient'

// Colores por nivel de confianza
const CONFIANZA_ESTILOS = {
  alta:        { bg: '#d1fae5', color: '#065f46', label: 'Alta' },
  media:       { bg: '#fef3c7', color: '#92400e', label: 'Media' },
  baja:        { bg: '#fee2e2', color: '#991b1b', label: 'Baja' },
  desconocida: { bg: '#f3f4f6', color: '#374151', label: '—' },
}

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
            background: i <= actual ? '#111' : '#e5e7eb',
            color: i <= actual ? '#fff' : '#9ca3af',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.75rem',
          }}>{i + 1}</span>
          <span style={{ color: i <= actual ? '#111' : '#9ca3af', fontWeight: i === actual ? 600 : 400 }}>
            {label}
          </span>
          {i < labels.length - 1 && (
            <span style={{ color: '#d1d5db', marginLeft: '0.3rem' }}>›</span>
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
  async function handleImportar() {
    setImportando(true)
    setError(null)
    try {
      const res = await ejecutarImport(estado.preview, supabase)
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

      {/* ── PASO 1: URL ── */}
      {(estado.fase === 'idle' || estado.fase === 'cargando' || estado.fase === 'mapeando') && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCargar()}
            disabled={estado.fase === 'mapeando'}
            style={{
              flex: 1, padding: '0.6rem 0.75rem',
              border: '1px solid #d1d5db', borderRadius: 6,
              fontSize: '0.875rem',
              background: estado.fase === 'mapeando' ? '#f9fafb' : '#fff',
            }}
          />
          <button
            onClick={handleCargar}
            disabled={estado.fase === 'cargando' || estado.fase === 'mapeando' || !url.trim()}
            className="btn-primary"
          >
            {estado.fase === 'cargando' ? 'Cargando…' : 'Cargar'}
          </button>
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2', color: '#991b1b',
          padding: '0.75rem 1rem', borderRadius: 6,
          fontSize: '0.875rem', marginBottom: '1rem',
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

          <a href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
            Ver briefs →
          </a>
        </div>
      )}
    </div>
  )
}

// ── Componente de Preview ────────────────────────────────────────────────────
function PreviewPanel({ preview, importando, onVolver, onImportar }) {
  const { batchesNuevos, briefsNuevos, hooksNuevos, errores, advertencias } = preview
  const hayErrores = errores.length > 0

  return (
    <div>
      {/* Resumen de totales */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Batches', n: batchesNuevos.length, color: '#dbeafe', text: '#1e40af' },
          { label: 'Briefs',  n: briefsNuevos.length,  color: '#ede9fe', text: '#5b21b6' },
          { label: 'Hooks',   n: hooksNuevos.length,   color: '#d1fae5', text: '#065f46' },
          { label: errores.length === 1 ? 'Error' : 'Errores', n: errores.length, color: '#fee2e2', text: '#991b1b' },
        ].map(({ label, n, color, text }) => (
          <div key={label} style={{
            flex: 1, minWidth: 100,
            background: color, color: text,
            padding: '0.75rem 1rem', borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{n}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Errores */}
      {errores.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.875rem', color: '#991b1b' }}>
            Filas con errores (se saltarán)
          </div>
          {errores.map((e, i) => (
            <div key={i} style={{
              background: '#fee2e2', color: '#991b1b',
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
          <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: '#92400e', fontWeight: 600 }}>
            ⚠️ {advertencias.length} advertencia{advertencias.length !== 1 ? 's' : ''} (campos opcionales vacíos)
          </summary>
          <div style={{ marginTop: '0.5rem' }}>
            {advertencias.map((a, i) => (
              <div key={i} style={{
                background: '#fef3c7', color: '#92400e',
                padding: '0.3rem 0.75rem', borderRadius: 4,
                fontSize: '0.8rem', marginBottom: '0.2rem',
              }}>
                {a.mensaje}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Vista previa de batches y briefs */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>
          Lo que se creará:
        </div>
        {batchesNuevos.map((batch, bi) => (
          <div key={bi} style={{
            border: '1px solid #e5e7eb', borderRadius: 8,
            marginBottom: '0.75rem', overflow: 'hidden',
          }}>
            {/* Header del batch */}
            <div style={{
              background: '#f9fafb', padding: '0.6rem 1rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex', gap: '0.75rem', alignItems: 'baseline',
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{batch.nombre}</span>
              {batch.marca && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{batch.marca}</span>}
              {batch.fecha && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{batch.fecha}</span>}
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#6b7280' }}>
                {batch.briefs.length} brief{batch.briefs.length !== 1 ? 's' : ''}
              </span>
            </div>
            {/* Briefs del batch */}
            {batch.briefs.map((brief, ri) => (
              <div key={ri} style={{
                padding: '0.6rem 1rem',
                borderBottom: ri < batch.briefs.length - 1 ? '1px solid #f3f4f6' : 'none',
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', minWidth: 20, paddingTop: 2 }}>
                  #{ri + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{brief.concepto}</div>
                  {brief.angulo && (
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.15rem' }}>
                      {brief.angulo}
                    </div>
                  )}
                  {brief.hooks.length > 0 && (
                    <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {brief.hooks.map((h, hi) => (
                        <span key={hi} style={{
                          background: '#ede9fe', color: '#5b21b6',
                          padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.75rem',
                        }}>
                          Hook {h.orden}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button
          onClick={onVolver}
          style={{
            padding: '0.6rem 1.2rem', borderRadius: 6, border: '1px solid #d1d5db',
            background: '#fff', cursor: 'pointer', fontSize: '0.875rem',
          }}
        >
          ← Editar mapeo
        </button>
        <button
          className="btn-primary"
          disabled={batchesNuevos.length === 0 || importando}
          onClick={onImportar}
        >
          {importando
            ? 'Importando…'
            : `Importar ${briefsNuevos.length} brief${briefsNuevos.length !== 1 ? 's' : ''} →`}
        </button>
      </div>
    </div>
  )
}
