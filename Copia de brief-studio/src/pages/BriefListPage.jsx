import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MARCA_ACTIVA } from '../lib/config'

const CAMPOS = [
  { key: 'angulo',     label: 'Ángulo' },
  { key: 'hipotesis',  label: 'Hipótesis' },
  { key: 'guion',      label: 'Guión' },
  { key: 'referencia', label: 'Referencia' },
]

function TagsFaltantes({ brief }) {
  const faltantes = CAMPOS.filter((c) => !brief[c.key]?.trim())
  if (faltantes.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
      {faltantes.map((c) => (
        <span key={c.key} className="tag-faltante">Falta {c.label}</span>
      ))}
    </div>
  )
}

function formatFecha(fechaStr) {
  if (!fechaStr) return null
  return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

async function toggleDescartado(briefId, valorActual, setBriefs) {
  const nuevoValor = !valorActual
  const { error } = await supabase
    .from('briefs')
    .update({ descartado: nuevoValor })
    .eq('id', briefId)

  if (error) {
    console.log(error)
    alert('Error al actualizar el brief')
    return
  }

  setBriefs((prev) =>
    prev.map((b) => b.id === briefId ? { ...b, descartado: nuevoValor } : b)
  )
}

// ── Fila de brief reutilizable ────────────────────────────────────
function FilaBrief({ brief, index, total, setBriefs, mostrarDescartados }) {
  const estaDescartado = brief.descartado

  if (estaDescartado && !mostrarDescartados) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: index < total - 1 ? '1px solid var(--color-border)' : 'none',
        opacity: estaDescartado ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <Link
        to={`/briefs/${brief.id}`}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
          padding: '0.875rem 0 0.875rem 1.375rem',
          textDecoration: 'none',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          minWidth: '1.5rem',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          #{brief.numero || index + 1}
        </span>
        <div style={{ flex: 1 }}>
          <span style={{
            fontSize: '0.9375rem',
            fontWeight: 500,
            color: 'var(--color-text)',
            textDecoration: estaDescartado ? 'line-through' : 'none',
          }}>
            {brief.concepto}
          </span>
          {!estaDescartado && <TagsFaltantes brief={brief} />}
          {estaDescartado && (
            <div style={{ marginTop: '0.25rem' }}>
              <span className="tag-descartado">Descartado</span>
            </div>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggleDescartado(brief.id, estaDescartado, setBriefs)}
        className="btn-descartar"
        title={estaDescartado ? 'Restaurar idea' : 'Descartar idea'}
      >
        {estaDescartado ? '↩ Restaurar' : '× Descartar'}
      </button>
      <button
        type="button"
        onClick={() => eliminarBriefDeBD(brief.id, setBriefs)}
        title="Eliminar brief permanentemente"
        style={{
          padding: '0 0.75rem',
          background: 'transparent',
          border: 'none',
          borderLeft: '1px solid var(--color-border)',
          color: '#e53e3e',
          cursor: 'pointer',
          fontSize: '0.8125rem',
          fontFamily: 'inherit',
          alignSelf: 'stretch',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        🗑
      </button>
    </div>
  )
}

async function eliminarBriefDeBD(briefId, setBriefs) {
  const ok = window.confirm('¿Eliminar este brief permanentemente?\nSe eliminarán también sus hooks. Esta acción no se puede deshacer.')
  if (!ok) return
  const { error } = await supabase.from('briefs').delete().eq('id', briefId)
  if (error) { alert('Error al eliminar: ' + error.message); return }
  setBriefs((prev) => prev.filter((b) => b.id !== briefId))
}

// ── Vista por batch ──────────────────────────────────────────────
function VistaPorBatch({ navigate }) {
  const [batches, setBatches] = useState([])
  const [briefs, setBriefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [descartadosVisibles, setDescartadosVisibles] = useState({})
  const [eliminandoBatch, setEliminandoBatch] = useState(null)

  const eliminarBatch = async (batch) => {
    const ok = window.confirm(
      `¿Eliminar el batch "${batch.nombre}"?\n\nSe eliminarán también todos sus briefs y hooks. Esta acción no se puede deshacer.`
    )
    if (!ok) return
    setEliminandoBatch(batch.id)
    const { error } = await supabase.from('batches').delete().eq('id', batch.id)
    if (error) { alert('Error al eliminar: ' + error.message) }
    else {
      setBatches((prev) => prev.filter((b) => b.id !== batch.id))
      setBriefs((prev) => prev.filter((b) => b.batch_id !== batch.id))
    }
    setEliminandoBatch(null)
  }

  useEffect(() => {
    const cargar = async () => {
      const [batchRes, briefRes] = await Promise.all([
        supabase.from('batches').select('*').ilike('marca', MARCA_ACTIVA).order('fecha', { ascending: false }),
        supabase.from('briefs').select('*').ilike('marca', MARCA_ACTIVA).order('numero', { ascending: true }),
      ])

      if (batchRes.error) { alert('Error al cargar batches'); return }
      if (briefRes.error) { alert('Error al cargar briefs'); return }

      setBatches(batchRes.data || [])
      setBriefs(briefRes.data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  if (loading) return <div className="loading">Cargando...</div>

  if (batches.length === 0) return (
    <div className="empty-state">
      <div className="empty-state-icon">🗂️</div>
      <p className="empty-state-text">No hay batches todavía.<br />Crea el primero para empezar.</p>
      <Link to="/batches/new"><button className="btn btn-primary">+ Nuevo batch</button></Link>
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: '1.75rem' }}>
      {batches.map((batch) => {
        const todosLosBriefs = briefs
          .filter((b) => b.batch_id === batch.id)
          .sort((a, b) => (a.numero || 0) - (b.numero || 0))

        const activos = todosLosBriefs.filter((b) => !b.descartado)
        const descartados = todosLosBriefs.filter((b) => b.descartado)
        const verDescartados = descartadosVisibles[batch.id] || false

        return (
          <div key={batch.id} className="section-block" style={{ padding: 0, overflow: 'hidden' }}>
            {/* ── Header del batch ── */}
            <div style={{
              padding: '1rem 1.375rem',
              borderBottom: todosLosBriefs.length > 0 ? '1px solid var(--color-border)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {batch.marca}
                  </span>
                  {batch.formatos?.map((f) => <span key={f} className="formato-chip">{f}</span>)}
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{batch.nombre}</span>
                {batch.fecha && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    Lanzamiento: {formatFecha(batch.fecha)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)',
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-pill)', padding: '0.2rem 0.625rem',
                }}>
                  {activos.length} {activos.length === 1 ? 'brief' : 'briefs'}
                </span>
                <Link to={`/briefs/new?batch_id=${batch.id}`}>
                  <button className="btn btn-primary btn-sm">+ Brief</button>
                </Link>
                <button
                  className="btn btn-sm"
                  disabled={eliminandoBatch === batch.id}
                  onClick={() => eliminarBatch(batch)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #e53e3e',
                    color: '#e53e3e',
                    opacity: eliminandoBatch === batch.id ? 0.5 : 1,
                  }}
                >
                  {eliminandoBatch === batch.id ? '…' : '🗑'}
                </button>
              </div>
            </div>

            {/* ── Briefs activos ── */}
            {activos.length > 0 && (
              <div>
                {activos.map((brief, index) => (
                  <FilaBrief
                    key={brief.id}
                    brief={brief}
                    index={index}
                    total={activos.length}
                    setBriefs={setBriefs}
                    mostrarDescartados={false}
                  />
                ))}
              </div>
            )}

            {activos.length === 0 && descartados.length === 0 && (
              <div style={{ padding: '1rem 1.375rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sin briefs todavía</p>
              </div>
            )}

            {/* ── Toggle descartados ── */}
            {descartados.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setDescartadosVisibles((prev) => ({ ...prev, [batch.id]: !prev[batch.id] }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem 1.375rem',
                    background: 'none',
                    border: 'none',
                    borderTop: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>{verDescartados ? '▾' : '▸'}</span>
                  {verDescartados ? 'Ocultar' : 'Ver'} {descartados.length} {descartados.length === 1 ? 'idea descartada' : 'ideas descartadas'}
                </button>

                {verDescartados && (
                  <div>
                    {descartados.map((brief, index) => (
                      <FilaBrief
                        key={brief.id}
                        brief={brief}
                        index={index}
                        total={descartados.length}
                        setBriefs={setBriefs}
                        mostrarDescartados={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Vista por brief ──────────────────────────────────────────────
function VistaPorBrief() {
  const [briefs, setBriefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [verDescartados, setVerDescartados] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from('briefs')
        .select('*, batch:batches(nombre, fecha)')
        .order('created_at', { ascending: false })

      if (error) { alert('Error al cargar briefs'); return }
      setBriefs(data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  if (loading) return <div className="loading">Cargando briefs...</div>

  const activos = briefs.filter((b) => !b.descartado)
  const descartados = briefs.filter((b) => b.descartado)

  if (briefs.length === 0) return (
    <div className="empty-state">
      <div className="empty-state-icon">📋</div>
      <p className="empty-state-text">No hay briefs todavía.</p>
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {activos.map((brief) => (
        <div key={brief.id} style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          <Link to={`/briefs/${brief.id}`} className="card-link" style={{ flex: 1 }}>
            <div className="meta-chip" style={{ marginBottom: '0.5rem' }}>
              {brief.marca}
              {brief.batch?.nombre && ` · ${brief.batch.nombre}`}
              {brief.numero && (
                <span style={{ marginLeft: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                  #{brief.numero}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4 }}>
              {brief.concepto}
            </h2>
            <TagsFaltantes brief={brief} />
          </Link>
          <button
            type="button"
            onClick={() => toggleDescartado(brief.id, false, setBriefs)}
            className="btn-descartar btn-descartar--card"
            title="Descartar idea"
          >
            × Descartar
          </button>
        </div>
      ))}

      {descartados.length > 0 && (
        <button
          type="button"
          onClick={() => setVerDescartados((v) => !v)}
          style={{
            background: 'none', border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '0.75rem 1rem',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem',
            color: 'var(--color-text-muted)', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          <span>{verDescartados ? '▾' : '▸'}</span>
          {verDescartados ? 'Ocultar' : 'Ver'} {descartados.length} {descartados.length === 1 ? 'idea descartada' : 'ideas descartadas'}
        </button>
      )}

      {verDescartados && descartados.map((brief) => (
        <div key={brief.id} style={{ display: 'flex', alignItems: 'stretch', opacity: 0.5 }}>
          <Link to={`/briefs/${brief.id}`} className="card-link" style={{ flex: 1 }}>
            <div className="meta-chip" style={{ marginBottom: '0.5rem' }}>
              {brief.marca}
              {brief.batch?.nombre && ` · ${brief.batch.nombre}`}
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4, textDecoration: 'line-through' }}>
              {brief.concepto}
            </h2>
            <span className="tag-descartado" style={{ marginTop: '0.375rem', display: 'inline-block' }}>Descartado</span>
          </Link>
          <button
            type="button"
            onClick={() => toggleDescartado(brief.id, true, setBriefs)}
            className="btn-descartar btn-descartar--card"
            title="Restaurar idea"
          >
            ↩ Restaurar
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────
export default function BriefListPage() {
  const navigate = useNavigate()
  const [vista, setVista] = useState('batch')

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Brief Studio <span style={{ fontSize: '0.75em', fontWeight: 400, color: '#6b7280' }}>· {MARCA_ACTIVA}</span></h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Gestión de briefs y hooks de contenido
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/batches/new')}>+ Batch</button>
          <Link to="/briefs/new"><button className="btn btn-primary">+ Brief</button></Link>
        </div>
      </div>

      <div style={{ display: 'flex', marginBottom: '1.5rem' }}>
        <div className="hook-toggle">
          <button type="button" className={`hook-toggle-btn ${vista === 'batch' ? 'active-vista' : ''}`} onClick={() => setVista('batch')}>
            Por batch
          </button>
          <button type="button" className={`hook-toggle-btn ${vista === 'brief' ? 'active-vista' : ''}`} onClick={() => setVista('brief')}>
            Por brief
          </button>
        </div>
      </div>

      {vista === 'batch' ? <VistaPorBatch navigate={navigate} /> : <VistaPorBrief />}
    </main>
  )
}
