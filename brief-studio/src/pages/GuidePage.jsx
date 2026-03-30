export default function GuidePage() {
  return (
    <main className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Guía de Uso</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Dos formas de trabajar con Brief Studio
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '2.5rem', maxWidth: '720px' }}>

        {/* ── Flujo A: Importación Masiva ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span style={styles.flowBadge}>Flujo A</span>
            <h2 style={styles.flowTitle}>Importación masiva desde Google Sheets</h2>
          </div>
          <p style={styles.flowDesc}>
            Ideal cuando ya tienes un Google Sheet con todos los briefs del período. Se importan en segundos y quedan listos para enviar a Asana.
          </p>

          <div style={styles.stepsGrid}>
            <Step n="1" title="Prepara tu Google Sheet">
              Asegúrate de que la hoja tenga columnas para <strong>batch</strong>, <strong>concepto</strong>, <strong>hook</strong>, ángulo y deseo. Publica el archivo en la web (Archivo → Compartir → Publicar en la web → CSV).
              <a
                href="https://docs.google.com/spreadsheets/d/1Wsr2tPVXlIMOte6obgZs4DiCdd25q64Y/copy"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.templateLink}
              >
                📄 Usar template oficial
              </a>
            </Step>
            <Step n="2" title="Pega la URL en Importar CSV">
              Ve a <strong>Importar CSV</strong> en el menú lateral, selecciona la marca y pega la URL del sheet. La app cargará un preview con todos los briefs detectados.
            </Step>
            <Step n="3" title="Revisa antes de importar">
              Verifica que los campos estén bien mapeados. Puedes desmarcar filas que no quieras importar. Si hay errores de formato, se muestran advertencias en naranja.
            </Step>
            <Step n="4" title="Asignación manual (opcional)">
              Si un batch necesita ir a una persona específica (en lugar del asignado automático), usa el selector <strong>"Asignación manual"</strong> en el encabezado del batch antes de importar.
            </Step>
            <Step n="5" title="Importar y enviar a Asana">
              Haz clic en <strong>"Importar seleccionados"</strong>. Los briefs aparecerán en el dashboard. Desde ahí, usa el botón verde <strong>"Enviar todo a Asana"</strong> en cada batch para crear todas las tareas de una vez.
            </Step>
          </div>
        </section>

        <div style={{ borderTop: '1px solid var(--color-border)' }} />

        {/* ── Flujo B: Creación Manual ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span style={{ ...styles.flowBadge, background: 'rgba(11,29,58,0.07)', color: 'var(--color-primary)' }}>Flujo B</span>
            <h2 style={styles.flowTitle}>Creación manual de briefs</h2>
          </div>
          <p style={styles.flowDesc}>
            Útil para añadir ideas sueltas en cualquier momento, sin necesidad de un sheet.
          </p>

          <div style={styles.stepsGrid}>
            <Step n="1" title="Crea un Batch">
              Un batch es el contenedor de ideas de un período o campaña. Haz clic en <strong>"+ Batch"</strong> en la cabecera del dashboard, asígnale un nombre, marca y fecha de lanzamiento.
            </Step>
            <Step n="2" title='Añade Briefs con "+ Brief"'>
              Dentro de cada batch, haz clic en <strong>"+ Brief"</strong>. Completa el concepto, ángulo, deseo e hipótesis. Puedes añadir hasta 4 hooks — cada hook genera un brief independiente.
            </Step>
            <Step n="3" title="Envía a Asana">
              Cuando el batch esté listo, usa el botón verde <strong>"Enviar todo a Asana"</strong> para procesar todos los briefs del lote. O usa el botón amarillo <strong>"Asana"</strong> en cada fila para envíos uno a uno.
            </Step>
          </div>
        </section>

        <div style={{ borderTop: '1px solid var(--color-border)' }} />

        {/* ── Referencia de estados ── */}
        <section>
          <h2 style={{ ...styles.flowTitle, marginBottom: '1rem' }}>Estados de un brief</h2>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            <StatusRow color="#F0C645" label="Botón Asana (amarillo)" desc="El brief aún no fue enviado a Asana. Tiene hooks completos y está listo." />
            <StatusRow color="#10b981" label="Enviar todo a Asana (verde)" desc="Envía todos los briefs pendientes del batch de una vez." />
            <StatusRow color="#4ade80" label="Badge ASIGNADO" desc="El brief ya tiene tarea en Asana. Haz clic en el ícono externo para abrirla." />
            <StatusRow color="#f87171" label="Tags FALTA..." desc="Campos opcionales vacíos (guión, referencia). No bloquean el envío, son recordatorios." />
            <StatusRow color="#94a3b8" label="Descartado" desc="La idea fue descartada. Si tenía tarea en Asana, se marcó como completada automáticamente." />
          </div>
        </section>

        {/* ── Soporte ── */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.2rem' }}>
              ¿Tienes dudas técnicas?
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Contacta a Grax — la app fue construida y es mantenida por ella.
            </p>
          </div>
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em',
            color: 'var(--color-primary)', background: 'rgba(11,29,58,0.06)',
            padding: '0.35rem 0.875rem', borderRadius: 'var(--radius-pill)',
          }}>
            By Grax
          </span>
        </div>

      </div>
    </main>
  )
}

function Step({ n, title, children }) {
  return (
    <div style={styles.stepCard}>
      <div style={styles.stepNumber}>{n}</div>
      <div>
        <p style={styles.stepTitle}>{title}</p>
        <p style={styles.stepBody}>{children}</p>
      </div>
    </div>
  )
}

function StatusRow({ color, label, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <span style={{
        flexShrink: 0,
        marginTop: '0.15rem',
        width: '10px', height: '10px',
        borderRadius: '50%',
        background: color,
      }} />
      <div>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>{label}</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}> — {desc}</span>
      </div>
    </div>
  )
}

const styles = {
  flowBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '0.25rem 0.625rem',
    borderRadius: 'var(--radius-pill)',
    background: 'rgba(240,198,69,0.18)',
    color: '#92700a',
    flexShrink: 0,
  },
  flowTitle: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  flowDesc: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    marginBottom: '1.25rem',
    lineHeight: 1.6,
  },
  stepsGrid: {
    display: 'grid',
    gap: '0.75rem',
  },
  stepCard: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    padding: '1rem 1.25rem',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
  },
  stepNumber: {
    flexShrink: 0,
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--color-primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8125rem',
    fontWeight: 700,
  },
  stepTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    marginBottom: '0.25rem',
  },
  stepBody: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  templateLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    marginTop: '0.75rem',
    padding: '0.35rem 0.875rem',
    background: 'rgba(11,29,58,0.07)',
    color: 'var(--color-primary)',
    borderRadius: 'var(--radius-pill)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'background 0.15s',
  },
}
