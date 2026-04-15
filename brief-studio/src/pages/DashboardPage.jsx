import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { TODAS_LAS_MARCAS } from '../lib/config'
import { Send, Film, Scissors, Clock, BarChart2, TrendingUp, Users } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────
function formatFechaRelativa(fechaStr) {
  if (!fechaStr) return '—'
  const diff = Date.now() - new Date(fechaStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

function labelMarca(valor) {
  const found = TODAS_LAS_MARCAS.find(
    (m) => valor?.toLowerCase().includes(m.value.replace('_cl', '').replace('_mx', '').replace('_col', ''))
  )
  return found?.label || valor || '—'
}

// ── Componente KPI Card ───────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = 'var(--color-primary)' }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem 1.5rem',
      display: 'flex', alignItems: 'flex-start', gap: '1rem',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.2rem' }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Equipo (mismos slugs que asignado_override en briefs) ────────
const EQUIPO = [
  { value: 'christian', label: 'Christian Torres' },
  { value: 'tamara',    label: 'Tamara Peñaloza' },
  { value: 'rafa',      label: 'Rafael Azuaje' },
  { value: 'diego',     label: 'Diego Martin' },
  { value: 'javiera',   label: 'Javiera Ahumada' },
  { value: 'ignacia',   label: 'Ignacia Vergara' },
  { value: 'felex',     label: 'Felex' },
  { value: 'graciela',  label: 'Graciela' },
  { value: 'eduardo',   label: 'Eduardo' },
  { value: 'dakota',    label: 'Dakota' },
  { value: 'fauadz',    label: 'Fauadz' },
]

// ── Barra de carga por persona (datos desde Asana) ───────────────
function EquipoBar({ nombre, activas, completadas, max }) {
  const total   = activas + completadas
  const pctBar  = max > 0 ? Math.round((activas / max) * 100) : 0
  const pctComp = total > 0 ? Math.round((completadas / total) * 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>{nombre}</span>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          {completadas > 0 && (
            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
              ✓ {completadas} completada{completadas !== 1 ? 's' : ''}
            </span>
          )}
          <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
            {activas} activa{activas !== 1 ? 's' : ''}
          </span>
          <span style={{
            fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text)',
            background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            borderRadius: 99, padding: '0.1rem 0.5rem',
          }}>
            {total}
          </span>
        </div>
      </div>
      {/* Barra: ancho = activas relativo al max. Verde oscuro = completadas dentro */}
      <div style={{ height: 8, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pctBar}%`, background: 'var(--color-primary)', borderRadius: 99, display: 'flex', overflow: 'hidden', minWidth: pctBar > 0 ? 4 : 0 }}>
          <div style={{ width: `${pctComp}%`, background: '#4ade80', height: '100%' }} />
        </div>
      </div>
    </div>
  )
}

// ── Componente Barra de marca ─────────────────────────────────────
function MarcaBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>{label}</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{count} briefs ({pct}%)</span>
      </div>
      <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 99,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function DashboardPage() {
  const [briefs, setBriefs]         = useState([])
  const [batches, setBatches]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [cargaAsana, setCargaAsana] = useState([])
  const [cargaLoading, setCargaLoading] = useState(true)
  const [cargaError, setCargaError] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      const [briefRes, batchRes] = await Promise.all([
        supabase
          .from('briefs')
          .select('id, marca, enviado_asana, requiere_grabacion, requiere_edicion, created_at, concepto, batch_id, descartado'),
        supabase
          .from('batches')
          .select('id, marca, nombre, fecha')
          .order('fecha', { ascending: false }),
      ])
      if (!briefRes.error) setBriefs(briefRes.data || [])
      if (!batchRes.error) setBatches(batchRes.data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  useEffect(() => {
    const cargarCarga = async () => {
      setCargaLoading(true)
      setCargaError(null)
      const { data, error } = await supabase.functions.invoke('carga-equipo')
      if (error || !data?.ok) {
        setCargaError(error?.message || data?.error || 'Error al consultar Asana')
      } else {
        setCargaAsana(data.carga || [])
      }
      setCargaLoading(false)
    }
    cargarCarga()
  }, [])

  if (loading) return <div className="loading">Cargando dashboard...</div>

  // ── KPIs globales ──
  const activos = briefs.filter((b) => !b.descartado)
  const totalBriefs = activos.length
  const pendientesAsana = activos.filter((b) => !b.enviado_asana).length
  const grabaciones = activos.filter((b) => b.requiere_grabacion).length
  const ediciones = activos.filter((b) => b.requiere_edicion).length

  // ── Desglose por marca ──
  const COLORES_MARCA = ['#0B1D3A', '#10b981', '#f59e0b', '#a855f7']
  const porMarca = TODAS_LAS_MARCAS.map((m, i) => ({
    label: m.label,
    value: m.value,
    color: COLORES_MARCA[i] || '#6b7280',
    count: activos.filter((b) =>
      b.marca?.toLowerCase().includes(m.value.replace('_cl', '').replace('_mx', '').replace('_col', ''))
    ).length,
  })).filter((m) => m.count > 0)

  // ── Actividad reciente ──
  const recientes = [...activos]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Vista global multimarca — {batches.length} batches · {totalBriefs} briefs activos
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <KpiCard
          icon={<BarChart2 size={20} />}
          label="Briefs activos"
          value={totalBriefs}
          sub={`${batches.length} batches en total`}
          color="#0B1D3A"
        />
        <KpiCard
          icon={<Send size={20} />}
          label="Pendientes de Asana"
          value={pendientesAsana}
          sub={`${totalBriefs - pendientesAsana} ya enviados`}
          color="#f59e0b"
        />
        <KpiCard
          icon={<Film size={20} />}
          label="Grabaciones"
          value={grabaciones}
          sub="requieren shooting"
          color="#ef4444"
        />
        <KpiCard
          icon={<Scissors size={20} />}
          label="Ediciones"
          value={ediciones}
          sub="solo post-producción"
          color="#a855f7"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* ── Desglose por marca ── */}
        <div className="section-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <TrendingUp size={16} color="var(--color-text-muted)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Distribución por marca
            </span>
          </div>
          {porMarca.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Sin datos aún
            </p>
          ) : (
            porMarca.map((m) => (
              <MarcaBar key={m.value} label={m.label} count={m.count} total={totalBriefs} color={m.color} />
            ))
          )}
        </div>

        {/* ── Batches recientes ── */}
        <div className="section-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Clock size={16} color="var(--color-text-muted)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Batches recientes
            </span>
          </div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {batches.slice(0, 6).map((batch) => {
              const briefsDelBatch = activos.filter((b) => b.batch_id === batch.id)
              const enviados = briefsDelBatch.filter((b) => b.enviado_asana).length
              return (
                <div key={batch.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      {batch.nombre}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {labelMarca(batch.marca)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    padding: '0.15rem 0.5rem', borderRadius: 99,
                    background: enviados === briefsDelBatch.length && briefsDelBatch.length > 0
                      ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                    color: enviados === briefsDelBatch.length && briefsDelBatch.length > 0
                      ? '#059669' : '#b45309',
                  }}>
                    {enviados}/{briefsDelBatch.length} Asana
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Carga del equipo (desde Asana) ── */}
      <div className="section-block" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <Users size={16} color="var(--color-text-muted)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>
            Carga del equipo
          </span>
          <span style={{
            fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.45rem',
            borderRadius: 99, background: 'rgba(16,185,129,0.12)', color: '#059669',
            marginLeft: '0.25rem',
          }}>
            Live · Asana
          </span>
          {!cargaLoading && !cargaError && cargaAsana.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
              {cargaAsana.reduce((s, p) => s + p.activas, 0)} tareas activas ·{' '}
              {cargaAsana.reduce((s, p) => s + p.completadas, 0)} completadas
            </span>
          )}
        </div>

        {cargaLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
            Consultando Asana…
          </div>
        ) : cargaError ? (
          <p style={{ fontSize: '0.8125rem', color: '#991b1b', background: '#fee2e2', padding: '0.625rem 0.875rem', borderRadius: 8 }}>
            ⚠️ {cargaError}
          </p>
        ) : cargaAsana.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            No hay tareas asignadas en Asana creadas desde esta app.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.875rem' }}>
            {cargaAsana.map((persona) => (
              <EquipoBar
                key={persona.gid}
                nombre={persona.nombre}
                activas={persona.activas}
                completadas={persona.completadas}
                max={cargaAsana[0].activas || 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Actividad reciente ── */}
      <div className="section-block" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.375rem', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)' }}>
            Actividad reciente — últimos 10 briefs
          </span>
        </div>
        {recientes.length === 0 ? (
          <p style={{ padding: '1rem 1.375rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            Sin actividad reciente.
          </p>
        ) : (
          recientes.map((brief, i) => (
            <Link
              key={brief.id}
              to={`/briefs/${brief.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.75rem 1.375rem',
                borderBottom: i < recientes.length - 1 ? '1px solid var(--color-border)' : 'none',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {/* Indicador Asana */}
              <span style={{
                flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
                background: brief.enviado_asana ? '#4ade80' : '#f59e0b',
              }} />
              {/* Concepto */}
              <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {brief.concepto}
              </span>
              {/* Marca chip */}
              <span style={{
                flexShrink: 0,
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '0.15rem 0.5rem', borderRadius: 99,
                background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}>
                {brief.marca?.split('_')[0]?.toUpperCase() || '—'}
              </span>
              {/* Producción */}
              {brief.requiere_grabacion && (
                <span style={{ flexShrink: 0, fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>🎬</span>
              )}
              {brief.requiere_edicion && (
                <span style={{ flexShrink: 0, fontSize: '0.7rem', color: '#a855f7', fontWeight: 600 }}>✂️</span>
              )}
              {/* Tiempo relativo */}
              <span style={{ flexShrink: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {formatFechaRelativa(brief.created_at)}
              </span>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}
