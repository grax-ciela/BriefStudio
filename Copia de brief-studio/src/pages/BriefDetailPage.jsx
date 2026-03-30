import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function BriefDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [brief, setBrief] = useState(null)
  const [hooks, setHooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarAsana, setMostrarAsana] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [guardandoDescarte, setGuardandoDescarte] = useState(false)

  useEffect(() => {
    const cargarDetalle = async () => {
      const { data: briefData, error: briefError } = await supabase
        .from('briefs')
        .select('*, batch:batches(nombre, fecha)')
        .eq('id', id)
        .single()

      if (briefError) {
        console.log(briefError)
        alert('Error al cargar el brief')
        setLoading(false)
        return
      }

      const { data: hooksData, error: hooksError } = await supabase
        .from('hooks')
        .select('*')
        .eq('brief_id', id)
        .order('orden', { ascending: true })

      if (hooksError) {
        console.log(hooksError)
        alert('Error al cargar los hooks')
        setLoading(false)
        return
      }

      setBrief(briefData)
      setHooks(hooksData || [])
      setLoading(false)
    }

    cargarDetalle()
  }, [id])

  const hooksShooting = hooks.filter((hook) => hook.estado === 'shooting')
  const hooksEdicion = hooks.filter((hook) => hook.estado === 'edicion')

  const batchNombre = brief?.batch?.nombre || brief?.batch || '—'
  const fechaLanzamiento = brief?.batch?.fecha

  const textoAsana = useMemo(() => {
    if (!brief) return ''

    const seccionShooting =
      hooksShooting.length > 0
        ? `HOOKS — Equipo Shooting (requiere shooting):\n${hooksShooting.map((h) => `- ${h.texto}`).join('\n')}\n\n`
        : ''

    const seccionEdicion =
      hooksEdicion.length > 0
        ? `HOOKS — Equipo Edición (material grabado):\n${hooksEdicion.map((h) => `- ${h.texto}`).join('\n')}\n\n`
        : ''

    return `TAREA: ${brief.concepto}
Marca: ${brief.marca}
Batch: ${batchNombre}${brief.numero ? ` · Brief #${brief.numero}` : ''}
Ángulo: ${brief.angulo || '—'}
Referencia: ${brief.referencia || '—'}

${seccionShooting}${seccionEdicion}GUIÓN:
${brief.guion || '—'}`
  }, [brief, batchNombre, hooksShooting, hooksEdicion])

  const eliminarBrief = async () => {
    const ok = window.confirm(
      `¿Eliminar permanentemente el brief "${brief.concepto}"?\n\nSe eliminarán también sus hooks. Esta acción no se puede deshacer.`
    )
    if (!ok) return
    const { error } = await supabase.from('briefs').delete().eq('id', id)
    if (error) { alert('Error al eliminar: ' + error.message); return }
    navigate('/')
  }

  const handleDescarte = async () => {
    setGuardandoDescarte(true)
    const nuevoValor = !brief.descartado
    const { error } = await supabase
      .from('briefs')
      .update({ descartado: nuevoValor })
      .eq('id', id)

    if (error) {
      console.log(error)
      alert('Error al actualizar el brief')
    } else {
      setBrief((prev) => ({ ...prev, descartado: nuevoValor }))
    }
    setGuardandoDescarte(false)
  }

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(textoAsana)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (error) {
      console.log(error)
      alert('No se pudo copiar el texto')
    }
  }

  if (loading) {
    return <div className="page loading">Cargando brief...</div>
  }

  if (!brief) {
    return (
      <div className="page">
        <button className="back-link" onClick={() => navigate('/')}>← Volver</button>
        <p style={{ color: 'var(--color-text-secondary)' }}>No se encontró el brief.</p>
      </div>
    )
  }

  return (
    <main className="page">
      <button className="back-link" onClick={() => navigate('/')}>
        ← Volver
      </button>

      {/* ── Banner descartado ── */}
      {brief.descartado && (
        <div style={{
          background: '#F3F4F6',
          border: '1px solid #D1D5DB',
          borderRadius: 'var(--radius-md)',
          padding: '0.625rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          fontSize: '0.875rem',
          color: '#6B7280',
        }}>
          <span>Esta idea fue descartada.</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDescarte}
            disabled={guardandoDescarte}
            style={{ marginLeft: 'auto' }}
          >
            ↩ Restaurar idea
          </button>
        </div>
      )}

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
          <div className="meta-chip">
            {brief.marca}
            {batchNombre !== '—' && ` · ${batchNombre}`}
            {brief.numero && (
              <span style={{ marginLeft: '0.375rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>
                #{brief.numero}
              </span>
            )}
          </div>

          {fechaLanzamiento && (
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
              Lanzamiento: <strong style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {new Date(fechaLanzamiento + 'T00:00:00').toLocaleDateString('es-CL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
            </span>
          )}
        </div>
        <h1 className="brief-title">{brief.concepto}</h1>
      </div>

      <div style={{ display: 'grid', gap: '1.125rem' }}>

        {/* ── Dirección creativa ── */}
        <div className="section-block">
          <div className="section-header">
            <span className="section-title">Dirección creativa</span>
          </div>

          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div className="detail-field">
              <span className="field-label">Ángulo</span>
              {brief.angulo
                ? <p className="field-value">{brief.angulo}</p>
                : <p className="field-value field-value--empty">Sin ángulo definido</p>
              }
            </div>

            <div className="detail-field">
              <span className="field-label">Deseo</span>
              {brief.deseo
                ? <p className="field-value">{brief.deseo}</p>
                : <p className="field-value field-value--empty">Sin deseo definido</p>
              }
            </div>

            <div className="detail-field">
              <span className="field-label">Referencia</span>
              {brief.referencia
                ? <p className="field-value">{brief.referencia}</p>
                : <p className="field-value field-value--empty">Sin referencia</p>
              }
            </div>

            <div className="detail-field">
              <span className="field-label">
                ¿Qué estás creando o probando y qué te da confianza de que esta prueba mejorará el rendimiento general?
              </span>
              {brief.hipotesis
                ? <p className="field-value">{brief.hipotesis}</p>
                : <p className="field-value field-value--empty">Sin hipótesis definida</p>
              }
            </div>

            <div className="detail-field">
              <span className="field-label">Guión</span>
              {brief.guion
                ? <p className="field-value">{brief.guion}</p>
                : <p className="field-value field-value--empty">Sin guión</p>
              }
            </div>
          </div>
        </div>

        {/* ── Hooks ── */}
        {hooks.length > 0 && (
          <div className="section-block">
            <div className="section-header">
              <span className="section-title">Hooks</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                {hooks.length} {hooks.length === 1 ? 'hook' : 'hooks'}
              </span>
            </div>

            <div>
              {hooksShooting.length > 0 && (
                <div style={{ marginBottom: hooksEdicion.length > 0 ? '1.25rem' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                    <span className="badge badge-shooting">Shooting</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      Requiere grabación
                    </span>
                  </div>
                  <div>
                    {hooksShooting.map((hook) => (
                      <div key={hook.id} className="hook-item">
                        <span className="hook-item-text">{hook.texto}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hooksEdicion.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                    <span className="badge badge-edicion">Material grabado</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      Listo para edición
                    </span>
                  </div>
                  <div>
                    {hooksEdicion.map((hook) => (
                      <div key={hook.id} className="hook-item">
                        <span className="hook-item-text">{hook.texto}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {hooks.length === 0 && (
          <div className="section-block">
            <div className="section-header">
              <span className="section-title">Hooks</span>
            </div>
            <p className="field-value field-value--empty">Sin hooks definidos</p>
          </div>
        )}
      </div>

      {/* ── Acciones ── */}
      <div className="action-bar" style={{ marginTop: '2rem' }}>
        <Link to={`/briefs/${id}/edit`}>
          <button className="btn btn-secondary">Editar brief</button>
        </Link>
        <button className="btn btn-primary" type="button" onClick={() => setMostrarAsana(true)}>
          Generar salida Asana
        </button>
        {!brief.descartado && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleDescarte}
            disabled={guardandoDescarte}
            style={{ color: '#B91C1C' }}
          >
            × Descartar idea
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={eliminarBrief}
          style={{ marginLeft: 'auto', color: '#e53e3e', border: '1px solid #e53e3e' }}
        >
          🗑 Eliminar brief
        </button>
      </div>

      {/* ── Modal Asana ── */}
      {mostrarAsana && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setMostrarAsana(false) }}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Salida para Asana</span>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setMostrarAsana(false)}>
                ✕ Cerrar
              </button>
            </div>

            <div className="modal-body">
              <textarea
                className="input textarea textarea-mono"
                readOnly
                value={textoAsana}
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className={`btn ${copiado ? 'btn-copied' : 'btn-primary'}`}
                onClick={copiarTexto}
              >
                {copiado ? '✓ Copiado' : 'Copiar texto'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setMostrarAsana(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
