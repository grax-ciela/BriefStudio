import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { MARCA_ACTIVA, TODAS_LAS_MARCAS } from '../lib/config'

const MARCAS = TODAS_LAS_MARCAS.map((m) => m.value)

const FORMATOS_OPCIONES = ['ESTATICO', 'VIDEO', 'PROMO', 'REEL', 'HISTORIA']

export default function BatchFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const esEdicion = Boolean(id)

  const [marca, setMarca] = useState(MARCA_ACTIVA)
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState('')
  const [deseo, setDeseo] = useState('')
  const [formatos, setFormatos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(esEdicion)

  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  const minFecha = manana.toISOString().split('T')[0]

  const toggleFormato = (formato) => {
    setFormatos((prev) =>
      prev.includes(formato)
        ? prev.filter((f) => f !== formato)
        : [...prev, formato]
    )
  }

  useEffect(() => {
    if (!esEdicion) return

    const cargar = async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.log(error)
        alert('Error al cargar el batch')
        setCargando(false)
        return
      }

      setMarca(data.marca)
      setNombre(data.nombre)
      setFecha(data.fecha || '')
      setDeseo(data.deseo || '')
      setFormatos(data.formatos || [])
      setCargando(false)
    }

    cargar()
  }, [id, esEdicion])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!nombre.trim()) {
      alert('El nombre del batch es obligatorio')
      return
    }

    if (!fecha) {
      alert('La fecha de lanzamiento es obligatoria')
      return
    }

    if (fecha < minFecha) {
      alert('La fecha de lanzamiento debe ser en el futuro')
      return
    }

    setGuardando(true)

    const payload = {
      marca,
      nombre: nombre.trim(),
      fecha,
      deseo: deseo.trim() || null,
      formatos,
    }

    let error

    if (esEdicion) {
      ;({ error } = await supabase.from('batches').update(payload).eq('id', id))
    } else {
      ;({ error } = await supabase.from('batches').insert([payload]))
    }

    if (error) {
      console.log(error)
      alert('Error al guardar el batch')
      setGuardando(false)
      return
    }

    setGuardando(false)
    navigate('/batches')
  }

  if (cargando) {
    return <div className="page loading">Cargando...</div>
  }

  return (
    <main className="page">
      <button className="back-link" onClick={() => navigate('/batches')}>
        ← Volver a batches
      </button>

      <h1 className="page-title" style={{ marginBottom: '1.75rem' }}>
        {esEdicion ? 'Editar batch' : 'Nuevo batch'}
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>

        {/* ── Datos del batch ── */}
        <div className="section-block">
          <div className="section-header">
            <span className="section-title">Datos del batch</span>
          </div>

          <div className="field-group">
            <div className="field">
              <label className="field-label" htmlFor="marca">Marca</label>
              <select
                id="marca"
                className="select"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
              >
                {MARCAS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="nombre">
                Nombre del batch <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <input
                id="nombre"
                className="input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej. Batch 12"
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="fecha">
                Fecha de lanzamiento <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <input
                id="fecha"
                type="date"
                className="input"
                value={fecha}
                min={minFecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Formatos ── */}
        <div className="section-block">
          <div className="section-header">
            <span className="section-title">Formatos</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
              Selecciona los que aplican
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {FORMATOS_OPCIONES.map((f) => {
              const activo = formatos.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFormato(f)}
                  className={activo ? 'formato-pill formato-pill--active' : 'formato-pill'}
                >
                  {activo && <span style={{ fontSize: '0.75rem' }}>✓</span>}
                  {f}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Dirección creativa ── */}
        <div className="section-block">
          <div className="section-header">
            <span className="section-title">Dirección creativa</span>
          </div>

          <div className="field-group">
            <div className="field">
              <label className="field-label" htmlFor="deseo">Deseo</label>
              <textarea
                id="deseo"
                className="textarea"
                value={deseo}
                onChange={(e) => setDeseo(e.target.value)}
                placeholder="¿Qué quieres lograr con este batch?"
                rows={4}
              />
            </div>

          </div>
        </div>

        {/* ── Acciones ── */}
        <div className="action-bar">
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear batch'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/batches')}>
            Cancelar
          </button>
        </div>
      </form>
    </main>
  )
}
