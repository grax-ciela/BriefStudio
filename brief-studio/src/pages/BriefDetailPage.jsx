import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { crearTareaAsana, descartarTareaAsana } from '../lib/asana'
import Modal from '../components/Modal'
import { ArrowLeft, Send, Edit3, Trash2, Archive, RotateCcw, ExternalLink } from 'lucide-react'

export default function BriefDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [brief, setBrief] = useState(null)
  const [hooks, setHooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [guardandoDescarte, setGuardandoDescarte] = useState(false)
  const [modalValidacion, setModalValidacion] = useState(false)

  useEffect(() => {
    const cargarDetalle = async () => {
      const { data: briefData, error: briefError } = await supabase
        .from('briefs')
        .select('*, batch:batches(nombre, fecha, formatos)')
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

  const enviarAsana = async () => {
    if (hooks.length === 0) {
      setModalValidacion(true)
      return
    }

    setEnviando(true)

    try {
      const formatos = brief.batch?.formatos || []
      const esStatic = formatos.length === 1 && formatos[0]?.toLowerCase() === 'static'
      const primerHook = hooks[0]

      let produccion = ''
      if (esStatic) {
        produccion = 'Diseño Estático'
      } else {
        produccion = primerHook.estado === 'shooting'
          ? 'Grabación + Edición'
          : 'Solo Edición'
      }

      const result = await crearTareaAsana({
        batch: batchNombre,
        concepto: brief.concepto,
        formato: formatos[0] || 'Video',
        marca: brief.marca,
        produccion,
        hook: primerHook.texto,
        angulo: brief.angulo,
        deseo: brief.deseo,
        referencia: brief.referencia,
        hipotesis: brief.hipotesis,
        hooksCount: hooks.length,
        assigneeOverride: brief.asignado_override || null,
      })

      await supabase
        .from('briefs')
        .update({ enviado_asana: true, asana_task_url: result.taskUrl })
        .eq('id', id)

      setBrief((prev) => ({ ...prev, enviado_asana: true, asana_task_url: result.taskUrl }))
      alert(`Tarea creada en Asana!\n\n${result.titulo}\n\n${result.taskUrl}`)
    } catch (err) {
      alert('Error al crear tarea en Asana: ' + err.message)
    } finally {
      setEnviando(false)
    }
  }

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

    // Si estamos descartando y tiene tarea en Asana, sincronizar
    if (nuevoValor && brief.enviado_asana && brief.asana_task_url) {
      const parts = brief.asana_task_url.split('/')
      const taskGid = parts[parts.length - 1]
      if (taskGid) {
        try {
          await descartarTareaAsana(taskGid, brief.concepto)
        } catch (err) {
          console.error('[BriefDetail] Error al descartar en Asana:', err)
          alert('No se pudo sincronizar con Asana: ' + err.message)
          setGuardandoDescarte(false)
          return
        }
      }
    }

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

  if (loading) {
    return <div className="page loading">Cargando brief...</div>
  }

  if (!brief) {
    return (
      <div className="page">
        <button className="back-link" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Volver
        </button>
        <p style={{ color: 'var(--color-text-secondary)' }}>No se encontró el brief.</p>
      </div>
    )
  }

  return (
    <main className="page">
      <button className="back-link" onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> Volver
      </button>

      {/* ── Banner descartado ── */}
      {brief.descartado && (
        <div style={{
          background: 'var(--color-surface-hover)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.625rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
        }}>
          <span>Esta idea fue descartada.</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDescarte}
            disabled={guardandoDescarte}
            style={{ marginLeft: 'auto' }}
          >
            <RotateCcw size={13} /> Restaurar
          </button>
        </div>
      )}

      {/* ── Título ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span className="meta-chip">
            {brief.marca}
            {batchNombre !== '—' && ` · ${batchNombre}`}
          </span>
          {brief.enviado_asana && (
            <span className="badge-asignado">ASIGNADO EN ASANA</span>
          )}
        </div>
        <h1 className="brief-title">{brief.concepto}</h1>
      </div>

      {/* ── Layout 3 columnas ── */}
      <div className="detail-layout">

        {/* === COLUMNA IZQUIERDA: Meta-datos === */}
        <div className="detail-sidebar">
          <div className="card">
            <div className="detail-field">
              <span className="field-label">Marca</span>
              <p className="field-value">{brief.marca}</p>
            </div>
            <div className="detail-field">
              <span className="field-label">Batch</span>
              <p className="field-value">{batchNombre}</p>
            </div>
            {brief.batch?.formatos && (
              <div className="detail-field">
                <span className="field-label">Formato</span>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {brief.batch.formatos.map((f) => (
                    <span key={f} className="formato-chip">{f}</span>
                  ))}
                </div>
              </div>
            )}
            {brief.numero && (
              <div className="detail-field">
                <span className="field-label">Número</span>
                <p className="field-value">#{brief.numero}</p>
              </div>
            )}
            {fechaLanzamiento && (
              <div className="detail-field">
                <span className="field-label">Lanzamiento</span>
                <p className="field-value" style={{ fontSize: '0.875rem' }}>
                  {new Date(fechaLanzamiento + 'T00:00:00').toLocaleDateString('es-CL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* === COLUMNA CENTRAL: Cuerpo creativo === */}
        <div className="detail-main">
          {/* Dirección creativa */}
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

              {/* Hipótesis destacada */}
              <div className="golden-box">
                <span className="field-label">
                  Razonamiento estratégico
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

          {/* Hooks */}
          {hooks.length > 0 && (
            <div className="section-block">
              <div className="section-header">
                <span className="section-title">Hooks</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {hooks.length} {hooks.length === 1 ? 'hook' : 'hooks'}
                </span>
              </div>

              <div>
                {hooksShooting.length > 0 && (
                  <div style={{ marginBottom: hooksEdicion.length > 0 ? '1.25rem' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                      <span className="badge badge-shooting">Shooting</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
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

        {/* === COLUMNA DERECHA: Panel de control === */}
        <div className="detail-control">
          <div className="card">
            {/* Acción Asana */}
            {brief.enviado_asana ? (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <span className="badge-asignado" style={{ fontSize: '0.75rem' }}>ASIGNADO EN ASANA</span>
                {brief.asana_task_url && (
                  <a href={brief.asana_task_url} target="_blank" rel="noopener noreferrer"
                     className="btn btn-secondary"
                     style={{ width: '100%', textAlign: 'center', textDecoration: 'none', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                    <ExternalLink size={15} /> Ver tarea en Asana
                  </a>
                )}
              </div>
            ) : (
              <button
                className="btn btn-primary"
                type="button"
                onClick={enviarAsana}
                disabled={enviando}
              >
                <Send size={15} />
                {enviando ? 'Enviando...' : 'Sincronizar Asana'}
              </button>
            )}

            <hr className="divider" />

            <Link to={`/briefs/${id}/edit`} style={{ display: 'contents' }}>
              <button className="btn btn-secondary">
                <Edit3 size={15} /> Editar brief
              </button>
            </Link>

            <hr className="divider" />

            {!brief.descartado && (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={handleDescarte}
                disabled={guardandoDescarte}
              >
                <Archive size={15} /> Descartar idea
              </button>
            )}

            <button
              className="btn btn-danger"
              type="button"
              onClick={eliminarBrief}
            >
              <Trash2 size={15} /> Eliminar brief
            </button>
          </div>
        </div>

      </div>
      {/* ── Modal Validación (falta hook) ── */}
      <Modal
        open={modalValidacion}
        onClose={() => setModalValidacion(false)}
        title="Faltan datos obligatorios"
        footer={
          <>
            <button className="btn-ghost-dark" onClick={() => setModalValidacion(false)}>Cancelar</button>
            <button className="btn-crema" onClick={() => { navigate(`/briefs/${id}/edit`); setModalValidacion(false) }}>
              <Edit3 size={14} /> Editar Brief
            </button>
          </>
        }
      >
        <p>No podemos enviar este brief a Asana todavía.</p>
        <p style={{ marginTop: '0.5rem' }}>Agrega al menos un <strong>hook</strong> antes de enviar.</p>
      </Modal>
    </main>
  )
}
