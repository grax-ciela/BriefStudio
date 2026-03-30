import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { crearTareaAsana, descartarTareaAsana } from '../lib/asana'
import { MARCA_ACTIVA } from '../lib/config'
import Modal from '../components/Modal'
import DropdownMenu from '../components/DropdownMenu'
import { Send, Trash2, FolderOpen, FileText, RotateCcw, X, ChevronDown, ChevronRight, Plus, ExternalLink, MoreVertical, Edit3, ArrowRightLeft, Loader2, Link2 } from 'lucide-react'

const CAMPOS = [
  { key: 'angulo',     label: 'Ángulo' },
  { key: 'hipotesis',  label: 'Hipótesis' },
  { key: 'guion',      label: 'Guión' },
  { key: 'referencia', label: 'Referencia' },
]

// ── Helper: extraer taskGid de asana_task_url ────────────────
function extraerTaskGid(url) {
  if (!url) return null
  const parts = url.split('/')
  return parts[parts.length - 1] || null
}

// ── Función para enviar brief a Asana ────────────────────────
async function enviarAAsana(brief, batchNombre, batchFormatos, setBriefs, { onMissingHook, silent } = {}) {
  console.log('🔴 [enviarAAsana] Brief completo:', { id: brief.id, concepto: brief.concepto, asignado_override: brief.asignado_override })
  console.log('🔴 [enviarAAsana] Todas las keys del brief:', Object.keys(brief))

  // Obtener el primer hook del brief
  const { data: hookData, error: hookError } = await supabase
    .from('hooks')
    .select('texto, estado')
    .eq('brief_id', brief.id)
    .order('orden', { ascending: true })
    .limit(1)
    .single()

  if (hookError || !hookData) {
    if (onMissingHook) onMissingHook(brief.id)
    else if (!silent) alert('⚠️ Falta agregar al menos un hook antes de enviar a Asana.')
    return { ok: false, sinHook: true }
  }

  // Obtener conteo total de hooks
  const { count: hooksCount } = await supabase
    .from('hooks')
    .select('id', { count: 'exact', head: true })
    .eq('brief_id', brief.id)

  const esStatic = batchFormatos?.length === 1 && batchFormatos[0]?.toLowerCase() === 'static'
  let produccion = ''
  if (esStatic) {
    produccion = 'Diseño Estático'
  } else {
    produccion = hookData.estado === 'shooting' ? 'Grabación + Edición' : 'Solo Edición'
  }

  try {
    const result = await crearTareaAsana({
      batch: batchNombre || '—',
      concepto: brief.concepto,
      formato: batchFormatos?.[0] || 'Video',
      marca: brief.marca,
      produccion,
      hook: hookData.texto,
      angulo: brief.angulo,
      deseo: brief.deseo,
      referencia: brief.referencia,
      hipotesis: brief.hipotesis,
      hooksCount: hooksCount || 1,
      assigneeOverride: (brief.asignado_override && brief.asignado_override.trim() !== '') ? brief.asignado_override : null,
      linkBrief: brief.link_brief || null,
    })

    await supabase
      .from('briefs')
      .update({ enviado_asana: true, asana_task_url: result.taskUrl })
      .eq('id', brief.id)

    setBriefs((prev) =>
      prev.map((b) => b.id === brief.id
        ? { ...b, enviado_asana: true, asana_task_url: result.taskUrl }
        : b
      )
    )

    if (!silent) alert(`✅ Tarea creada en Asana!\n\n${result.titulo}`)
    return { ok: true, titulo: result.titulo }
  } catch (err) {
    if (!silent) alert('❌ Error al crear tarea en Asana: ' + err.message)
    return { ok: false, error: err.message }
  }
}

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

async function toggleDescartado(brief, setBriefs, { onError } = {}) {
  const nuevoValor = !brief.descartado

  // Si estamos descartando y el brief tiene tarea en Asana, sincronizar
  if (nuevoValor && brief.enviado_asana && brief.asana_task_url) {
    const taskGid = extraerTaskGid(brief.asana_task_url)
    if (taskGid) {
      try {
        await descartarTareaAsana(taskGid, brief.concepto)
      } catch (err) {
        console.error('[BriefList] Error al descartar en Asana:', err)
        if (onError) onError(`No se pudo sincronizar con Asana: ${err.message}`)
        return
      }
    }
  }

  const { error } = await supabase
    .from('briefs')
    .update({ descartado: nuevoValor })
    .eq('id', brief.id)

  if (error) {
    console.log(error)
    if (onError) onError('Error al actualizar el brief')
    else alert('Error al actualizar el brief')
    return
  }

  setBriefs((prev) =>
    prev.map((b) => b.id === brief.id ? { ...b, descartado: nuevoValor } : b)
  )
}

// ── Fila de brief reutilizable ────────────────────────────────────
function FilaBrief({ brief, batch, index, total, setBriefs, mostrarDescartados, navigate, onMissingHook, onMoverBatch }) {
  const estaDescartado = brief.descartado

  if (estaDescartado && !mostrarDescartados) return null

  const handleEnviarAsana = async () => {
    await enviarAAsana(
      brief,
      batch?.nombre || '—',
      batch?.formatos || [],
      setBriefs,
      { onMissingHook }
    )
  }

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

      {/* Link al Brief (doc original) */}
      {!estaDescartado && brief.link_brief && (
        <a
          href={brief.link_brief}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-link-brief"
          title="Abrir documento del brief"
          onClick={(e) => e.stopPropagation()}
        >
          <Link2 size={12} /> Doc
        </a>
      )}

      {/* Botón Asana / Badge asignado + enlace */}
      {!estaDescartado && (
        brief.enviado_asana
          ? <span style={{ display: 'inline-flex', alignItems: 'center', margin: '0 0.5rem' }}>
              <span className="badge-asignado">ASIGNADO</span>
              {brief.asana_task_url && (
                <a href={brief.asana_task_url} target="_blank" rel="noopener noreferrer"
                   className="btn-asana-link" title="Ver en Asana">
                  <ExternalLink size={12} />
                </a>
              )}
            </span>
          : <button
              type="button"
              className="btn-asana"
              style={{ margin: '0 0.5rem' }}
              onClick={handleEnviarAsana}
            >
              <Send size={12} /> Asana
            </button>
      )}

      {estaDescartado && (
        <button
          type="button"
          onClick={() => toggleDescartado(brief, setBriefs)}
          className="btn-descartar"
          title="Restaurar idea"
        >
          <RotateCcw size={12} /> Restaurar
        </button>
      )}

      <div style={{ padding: '0 0.5rem', flexShrink: 0 }}>
        <DropdownMenu
          trigger={<MoreVertical size={16} />}
          items={[
            { icon: <Edit3 size={14} />, label: 'Editar Brief', onClick: () => navigate(`/briefs/${brief.id}/edit`) },
            { icon: <ArrowRightLeft size={14} />, label: 'Mover a otro Batch', onClick: () => onMoverBatch(brief) },
            ...(!estaDescartado ? [{ icon: <X size={14} />, label: 'Descartar', onClick: () => toggleDescartado(brief, setBriefs) }] : []),
            { icon: <Trash2 size={14} />, label: 'Eliminar', danger: true, onClick: () => eliminarBriefDeBD(brief.id, setBriefs) },
          ]}
        />
      </div>
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
  const [modalValidacion, setModalValidacion] = useState(null) // { briefId }
  const [modalMover, setModalMover] = useState(null) // { briefId, batchIdActual }
  const [batchDestino, setBatchDestino] = useState('')
  const [enviandoBatch, setEnviandoBatch] = useState({}) // { batchId: true }
  const [modalResultado, setModalResultado] = useState(null) // { batchNombre, enviados, sinHook, errores }

  const enviarTodoBatch = useCallback(async (batch) => {
    const pendientes = briefs.filter(
      (b) => b.batch_id === batch.id && !b.descartado && !b.enviado_asana
    )
    if (pendientes.length === 0) return

    setEnviandoBatch((prev) => ({ ...prev, [batch.id]: true }))

    let enviados = 0, sinHook = 0, errores = 0

    for (const brief of pendientes) {
      const res = await enviarAAsana(brief, batch.nombre, batch.formatos, setBriefs, { silent: true })
      if (res?.sinHook) sinHook++
      else if (res?.ok) enviados++
      else errores++
    }

    setEnviandoBatch((prev) => ({ ...prev, [batch.id]: false }))
    setModalResultado({ batchNombre: batch.nombre, enviados, sinHook, errores })
  }, [briefs])

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
        supabase.from('batches').select('*').ilike('marca', `%${MARCA_ACTIVA}%`).order('fecha', { ascending: false }),
        supabase.from('briefs').select('*').ilike('marca', `%${MARCA_ACTIVA}%`).order('numero', { ascending: true }),
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
      <div className="empty-state-icon"><FolderOpen size={40} /></div>
      <p className="empty-state-text">No hay batches todavía.<br />Crea el primero para empezar.</p>
      <Link to="/batches/new"><button className="btn btn-primary"><Plus size={15} /> Nuevo batch</button></Link>
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

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)',
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-pill)', padding: '0.2rem 0.625rem',
                }}>
                  {activos.length} {activos.length === 1 ? 'brief' : 'briefs'}
                </span>
                {activos.some((b) => !b.enviado_asana) && (
                  <button
                    className="btn-enviar-todo"
                    disabled={!!enviandoBatch[batch.id]}
                    onClick={() => enviarTodoBatch(batch)}
                  >
                    {enviandoBatch[batch.id]
                      ? <><Loader2 size={13} className="spin" /> Enviando...</>
                      : <><Send size={13} /> Enviar todo a Asana</>
                    }
                  </button>
                )}
                <Link to={`/briefs/new?batch_id=${batch.id}`}>
                  <button className="btn btn-primary btn-sm">+ Brief</button>
                </Link>
                <button
                  className="btn btn-danger btn-sm"
                  disabled={eliminandoBatch === batch.id}
                  onClick={() => eliminarBatch(batch)}
                >
                  {eliminandoBatch === batch.id ? '...' : <Trash2 size={14} />}
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
                    batch={batch}
                    index={index}
                    total={activos.length}
                    setBriefs={setBriefs}
                    mostrarDescartados={false}
                    navigate={navigate}
                    onMissingHook={(briefId) => setModalValidacion({ briefId })}
                    onMoverBatch={(b) => { setModalMover({ briefId: b.id, batchIdActual: b.batch_id }); setBatchDestino('') }}
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
                  {verDescartados ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {verDescartados ? 'Ocultar' : 'Ver'} {descartados.length} {descartados.length === 1 ? 'idea descartada' : 'ideas descartadas'}
                </button>

                {verDescartados && (
                  <div>
                    {descartados.map((brief, index) => (
                      <FilaBrief
                        key={brief.id}
                        brief={brief}
                        batch={batch}
                        index={index}
                        total={descartados.length}
                        setBriefs={setBriefs}
                        mostrarDescartados={true}
                        navigate={navigate}
                        onMissingHook={(briefId) => setModalValidacion({ briefId })}
                        onMoverBatch={(b) => { setModalMover({ briefId: b.id, batchIdActual: b.batch_id }); setBatchDestino('') }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {/* ── Modal Validación (falta hook) ── */}
      <Modal
        open={!!modalValidacion}
        onClose={() => setModalValidacion(null)}
        title="Faltan datos obligatorios"
        footer={
          <>
            <button className="btn-ghost-dark" onClick={() => setModalValidacion(null)}>Cancelar</button>
            <button className="btn-crema" onClick={() => { navigate(`/briefs/${modalValidacion?.briefId}/edit`); setModalValidacion(null) }}>
              <Edit3 size={14} /> Editar Brief
            </button>
          </>
        }
      >
        <p>No podemos enviar este brief a Asana todavía.</p>
        <p style={{ marginTop: '0.5rem' }}>Agrega al menos un <strong>hook</strong> antes de enviar.</p>
      </Modal>

      {/* ── Modal Resultado Envío Masivo ── */}
      <Modal
        open={!!modalResultado}
        onClose={() => setModalResultado(null)}
        title="Envío a Asana completado"
        footer={
          <button className="btn-crema" onClick={() => setModalResultado(null)}>Listo</button>
        }
      >
        <p style={{ marginBottom: '0.75rem' }}>
          Batch: <strong>{modalResultado?.batchNombre}</strong>
        </p>
        {modalResultado?.enviados > 0 && (
          <p style={{ color: '#4ade80', marginBottom: '0.375rem' }}>
            ✅ {modalResultado.enviados} {modalResultado.enviados === 1 ? 'tarea creada' : 'tareas creadas'} en Asana
          </p>
        )}
        {modalResultado?.sinHook > 0 && (
          <p style={{ color: '#facc15', marginBottom: '0.375rem' }}>
            ⚠️ {modalResultado.sinHook} {modalResultado.sinHook === 1 ? 'brief omitido' : 'briefs omitidos'} por falta de hook
          </p>
        )}
        {modalResultado?.errores > 0 && (
          <p style={{ color: '#f87171' }}>
            ❌ {modalResultado.errores} {modalResultado.errores === 1 ? 'error' : 'errores'} al enviar
          </p>
        )}
      </Modal>

      {/* ── Modal Mover a otro Batch ── */}
      <Modal
        open={!!modalMover}
        onClose={() => setModalMover(null)}
        title="Mover a otro batch"
        footer={
          <>
            <button className="btn-ghost-dark" onClick={() => setModalMover(null)}>Cancelar</button>
            <button
              className="btn-crema"
              disabled={!batchDestino}
              onClick={async () => {
                const { error } = await supabase
                  .from('briefs')
                  .update({ batch_id: batchDestino })
                  .eq('id', modalMover.briefId)
                if (error) { alert('Error al mover: ' + error.message); return }
                setBriefs((prev) => prev.map((b) => b.id === modalMover.briefId ? { ...b, batch_id: batchDestino } : b))
                setModalMover(null)
              }}
            >
              Mover
            </button>
          </>
        }
      >
        <p style={{ marginBottom: '0.75rem' }}>Selecciona el batch de destino:</p>
        <select
          className="select-override"
          style={{ width: '100%', maxWidth: '100%', padding: '0.5rem' }}
          value={batchDestino}
          onChange={(e) => setBatchDestino(e.target.value)}
        >
          <option value="">— Selecciona un batch —</option>
          {batches.filter((b) => b.id !== modalMover?.batchIdActual).map((b) => (
            <option key={b.id} value={b.id}>{b.nombre} ({b.marca})</option>
          ))}
        </select>
      </Modal>
    </div>
  )
}

// ── Vista por brief ──────────────────────────────────────────────
function VistaPorBrief({ navigate }) {
  const [briefs, setBriefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [verDescartados, setVerDescartados] = useState(false)
  const [modalValidacion, setModalValidacion] = useState(null)
  const onMissingHook = (briefId) => setModalValidacion({ briefId })


  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from('briefs')
        .select('*, batch:batches(nombre, fecha, formatos)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[BriefListPage] Error al cargar briefs:', error)
        alert(`Error al cargar briefs: ${error.message}`)
        setLoading(false)
        return
      }
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
      <div className="empty-state-icon"><FileText size={40} /></div>
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
          {/* Link al Brief (doc original) */}
          {brief.link_brief && (
            <a
              href={brief.link_brief}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-link-brief"
              style={{ alignSelf: 'center' }}
              title="Abrir documento del brief"
            >
              <Link2 size={12} /> Doc
            </a>
          )}
          {/* Botón Asana / Badge asignado + enlace */}
          {brief.enviado_asana
            ? <span style={{ display: 'inline-flex', alignItems: 'center', alignSelf: 'center', margin: '0 0.5rem' }}>
                <span className="badge-asignado">ASIGNADO</span>
                {brief.asana_task_url && (
                  <a href={brief.asana_task_url} target="_blank" rel="noopener noreferrer"
                     className="btn-asana-link" title="Ver en Asana">
                    <ExternalLink size={12} />
                  </a>
                )}
              </span>
            : <button
                type="button"
                className="btn-asana"
                style={{ alignSelf: 'center', margin: '0 0.5rem' }}
                onClick={() => enviarAAsana(
                  brief,
                  brief.batch?.nombre || '—',
                  brief.batch?.formatos || [],
                  setBriefs,
                  { onMissingHook }
                )}
              >
                <Send size={12} /> Asana
              </button>
          }
          <div style={{ alignSelf: 'center', padding: '0 0.5rem' }}>
            <DropdownMenu
              trigger={<MoreVertical size={16} />}
              items={[
                { icon: <Edit3 size={14} />, label: 'Editar Brief', onClick: () => navigate(`/briefs/${brief.id}/edit`) },
                { icon: <X size={14} />, label: 'Descartar', onClick: () => toggleDescartado(brief, setBriefs) },
                { icon: <Trash2 size={14} />, label: 'Eliminar', danger: true, onClick: () => eliminarBriefDeBD(brief.id, setBriefs) },
              ]}
            />
          </div>
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
            onClick={() => toggleDescartado(brief, setBriefs)}
            className="btn-descartar btn-descartar--card"
            title="Restaurar idea"
          >
            ↩ Restaurar
          </button>
        </div>
      ))}

      {/* ── Modal Validación ── */}
      <Modal
        open={!!modalValidacion}
        onClose={() => setModalValidacion(null)}
        title="Faltan datos obligatorios"
        footer={
          <>
            <button className="btn-ghost-dark" onClick={() => setModalValidacion(null)}>Cancelar</button>
            <button className="btn-crema" onClick={() => { navigate(`/briefs/${modalValidacion?.briefId}/edit`); setModalValidacion(null) }}>
              <Edit3 size={14} /> Editar Brief
            </button>
          </>
        }
      >
        <p>No podemos enviar este brief a Asana todavía.</p>
        <p style={{ marginTop: '0.5rem' }}>Agrega al menos un <strong>hook</strong> antes de enviar.</p>
      </Modal>
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
          <h1 className="page-title">Briefs</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Gestión de briefs y hooks de contenido
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/batches/new')}>
            <Plus size={14} /> Batch
          </button>
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

      {vista === 'batch' ? <VistaPorBatch navigate={navigate} /> : <VistaPorBrief navigate={navigate} />}
    </main>
  )
}
