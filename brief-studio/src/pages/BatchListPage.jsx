import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { MARCA_ACTIVA } from '../lib/config'

const MARCAS = ['MyCOCOS® CL', 'MyHUEVOS® MX', 'MyHUEVOS® COL', 'MENNT® CL']

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function BatchListPage() {
  const navigate = useNavigate()
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState(new Set())
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [eliminandoMasivo, setEliminandoMasivo] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*, briefs(count)')
        .ilike('marca', `%${MARCA_ACTIVA}%`)
        .order('fecha', { ascending: false })

      if (error) {
        console.log(error)
        alert('Error al cargar batches')
      } else {
        setBatches(data || [])
      }

      setLoading(false)
    }

    cargar()
  }, [])

  const eliminarBatch = async (batch) => {
    const ok = window.confirm(
      `¿Eliminar el batch "${batch.nombre}"?\n\nSe eliminarán también todos sus briefs y hooks. Esta acción no se puede deshacer.`
    )
    if (!ok) return

    setEliminando((prev) => new Set([...prev, batch.id]))

    const { error } = await supabase.from('batches').delete().eq('id', batch.id)

    if (error) {
      alert('Error al eliminar el batch: ' + error.message)
    } else {
      setBatches((prev) => prev.filter((b) => b.id !== batch.id))
    }

    setEliminando((prev) => {
      const next = new Set(prev)
      next.delete(batch.id)
      return next
    })
  }

  const toggleSeleccion = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTodos = (items) => {
    const ids = items.map((b) => b.id)
    const todosSeleccionados = ids.every((id) => seleccionados.has(id))
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (todosSeleccionados) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const eliminarSeleccionados = async () => {
    if (seleccionados.size === 0) return
    const nombres = batches
      .filter((b) => seleccionados.has(b.id))
      .map((b) => `• ${b.nombre}`)
      .join('\n')

    const ok = window.confirm(
      `¿Eliminar ${seleccionados.size} batch${seleccionados.size > 1 ? 'es' : ''}?\n\n${nombres}\n\nSe eliminarán también todos sus briefs y hooks. Esta acción no se puede deshacer.`
    )
    if (!ok) return

    setEliminandoMasivo(true)

    const ids = [...seleccionados]
    const { error } = await supabase.from('batches').delete().in('id', ids)

    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      setBatches((prev) => prev.filter((b) => !ids.includes(b.id)))
      setSeleccionados(new Set())
      setModoSeleccion(false)
    }

    setEliminandoMasivo(false)
  }

  const batchesPorMarca = MARCAS.map((marca) => ({
    marca,
    items: batches.filter((b) => b.marca === marca),
  })).filter((g) => g.items.length > 0)

  const hayBatches = batches.length > 0

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Batches</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Gestión de batches por marca
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Ver briefs
          </button>

          {hayBatches && !modoSeleccion && (
            <button
              className="btn btn-secondary"
              onClick={() => setModoSeleccion(true)}
            >
              Seleccionar
            </button>
          )}

          {modoSeleccion && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => { setModoSeleccion(false); setSeleccionados(new Set()) }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                disabled={seleccionados.size === 0 || eliminandoMasivo}
                onClick={eliminarSeleccionados}
                style={{
                  background: seleccionados.size > 0 ? 'var(--color-error, #e53e3e)' : undefined,
                  color: seleccionados.size > 0 ? '#fff' : undefined,
                  opacity: seleccionados.size === 0 ? 0.45 : 1,
                  border: 'none',
                }}
              >
                {eliminandoMasivo ? 'Eliminando…' : `Eliminar${seleccionados.size > 0 ? ` (${seleccionados.size})` : ''}`}
              </button>
            </>
          )}

          {!modoSeleccion && (
            <Link to="/batches/new">
              <button className="btn btn-primary">+ Nuevo batch</button>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading">Cargando batches...</div>
      ) : !hayBatches ? (
        <div className="empty-state">
          <div className="empty-state-icon">🗂️</div>
          <p className="empty-state-text">
            No hay batches todavía.<br />Crea el primero para empezar.
          </p>
          <Link to="/batches/new">
            <button className="btn btn-primary">+ Nuevo batch</button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {batchesPorMarca.map(({ marca, items }) => (
            <div key={marca}>
              {/* ── Encabezado de marca ── */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.875rem',
              }}>
                {modoSeleccion && (
                  <input
                    type="checkbox"
                    title="Seleccionar todos"
                    checked={items.every((b) => seleccionados.has(b.id))}
                    onChange={() => toggleTodos(items)}
                    style={{ cursor: 'pointer', width: '1rem', height: '1rem', flexShrink: 0 }}
                  />
                )}
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                }}>
                  {marca}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  background: 'var(--color-border)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '0.1rem 0.5rem',
                  fontWeight: 500,
                }}>
                  {items.length} {items.length === 1 ? 'batch' : 'batches'}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              </div>

              {/* ── Cards de batch ── */}
              <div style={{ display: 'grid', gap: '0.625rem' }}>
                {items.map((batch) => {
                  const cantidadBriefs = batch.briefs?.[0]?.count ?? 0

                  return (
                    <div
                      key={batch.id}
                      className="batch-card"
                      style={modoSeleccion && seleccionados.has(batch.id) ? {
                        outline: '2px solid var(--color-primary, #6c63ff)',
                        outlineOffset: '2px',
                      } : {}}
                    >
                      <div className="batch-card-body">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                          {modoSeleccion && (
                            <input
                              type="checkbox"
                              checked={seleccionados.has(batch.id)}
                              onChange={() => toggleSeleccion(batch.id)}
                              style={{ cursor: 'pointer', width: '1rem', height: '1rem', marginTop: '0.2rem', flexShrink: 0 }}
                            />
                          )}
                          <div>
                            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.35 }}>
                              {batch.nombre}
                            </h2>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                              Lanzamiento: {formatFecha(batch.fecha)}
                            </p>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: 'var(--color-text-secondary)',
                              background: 'var(--color-bg)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-pill)',
                              padding: '0.2rem 0.625rem',
                            }}>
                              {cantidadBriefs} {cantidadBriefs === 1 ? 'brief' : 'briefs'}
                            </span>
                          </div>
                        </div>

                        {/* Formatos */}
                        {batch.formatos?.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                            {batch.formatos.map((f) => (
                              <span key={f} className="formato-chip">{f}</span>
                            ))}
                          </div>
                        )}

                        {/* Deseo */}
                        {batch.deseo && (
                          <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--color-text-secondary)',
                            marginTop: '0.75rem',
                            lineHeight: 1.55,
                            borderTop: '1px solid var(--color-border)',
                            paddingTop: '0.75rem',
                          }}>
                            {batch.deseo}
                          </p>
                        )}
                      </div>

                      <div className="batch-card-footer">
                        {modoSeleccion ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => toggleSeleccion(batch.id)}
                          >
                            {seleccionados.has(batch.id) ? '✓ Seleccionado' : 'Seleccionar'}
                          </button>
                        ) : (
                          <>
                            <Link to={`/batches/${batch.id}/edit`}>
                              <button className="btn btn-secondary btn-sm">Editar</button>
                            </Link>
                            <Link to={`/briefs/new?batch_id=${batch.id}`}>
                              <button className="btn btn-primary btn-sm">+ Nuevo brief</button>
                            </Link>
                          </>
                        )}
                        <button
                          className="btn btn-sm"
                          disabled={eliminando.has(batch.id)}
                          onClick={() => eliminando.has(batch.id) ? null : eliminarBatch(batch)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--color-error, #e53e3e)',
                            color: 'var(--color-error, #e53e3e)',
                            marginLeft: 'auto',
                            opacity: eliminando.has(batch.id) ? 0.5 : 1,
                          }}
                        >
                          {eliminando.has(batch.id) ? 'Eliminando…' : '🗑 Eliminar batch'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
