/**
 * ImportPage.jsx — Página de importación CSV → Briefs
 *
 * Consume el nuevo output de importParser.js: { briefs, stats, errors }
 * donde briefs ya viene expandido (1 fila CSV → N briefs si tiene hooks).
 *
 * Features:
 *   - Importar desde archivo CSV local o URL de Google Sheet
 *   - Previsualización agrupada por batch_id
 *   - Badges de formato (Video / Estático)
 *   - Banner de errores/warnings del parser
 *   - Contador de briefs reales (post-expansión)
 *   - Confirmar para guardar en el estado de la app
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { procesarCSV, fetchGoogleSheet } from '../lib/importParser';

// ─────────────────────────────────────────────
// Estilos inline (reemplazar con tu sistema de UI)
// ─────────────────────────────────────────────
const styles = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#6b7280',
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  inputGroup: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: 200,
    padding: '0.625rem 0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: '0.9rem',
  },
  button: {
    padding: '0.625rem 1.25rem',
    borderRadius: 8,
    border: 'none',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  btnPrimary: {
    background: '#2563eb',
    color: '#fff',
  },
  btnSecondary: {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  },
  btnSuccess: {
    background: '#059669',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  divider: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '0.85rem',
    margin: '1rem 0',
  },
  // Banners
  bannerError: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '0.875rem 1rem',
    marginBottom: '1rem',
    color: '#991b1b',
    fontSize: '0.9rem',
  },
  bannerWarning: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 8,
    padding: '0.875rem 1rem',
    marginBottom: '1rem',
    color: '#92400e',
    fontSize: '0.9rem',
  },
  bannerSuccess: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: '0.875rem 1rem',
    marginBottom: '1rem',
    color: '#166534',
    fontSize: '0.9rem',
  },
  // Stats
  statsRow: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
    marginBottom: '1.25rem',
  },
  statBox: {
    textAlign: 'center',
    padding: '0.75rem 1.25rem',
    background: '#f9fafb',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    minWidth: 100,
  },
  statNumber: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#111827',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: 2,
  },
  // Preview table
  batchGroup: {
    marginBottom: '1.25rem',
  },
  batchHeader: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#4b5563',
    padding: '0.5rem 0.75rem',
    background: '#f3f4f6',
    borderRadius: '8px 8px 0 0',
    border: '1px solid #e5e7eb',
    borderBottom: 'none',
  },
  briefRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 0.75rem',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '0.875rem',
  },
  briefRowContainer: {
    border: '1px solid #e5e7eb',
    borderRadius: '0 0 8px 8px',
    overflow: 'hidden',
  },
  badge: {
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: 999,
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    flexShrink: 0,
  },
  badgeVideo: {
    background: '#dbeafe',
    color: '#1e40af',
  },
  badgeStatic: {
    background: '#f3e8ff',
    color: '#6b21a8',
  },
  hookNum: {
    fontSize: '0.7rem',
    color: '#9ca3af',
    width: 50,
    flexShrink: 0,
  },
  briefTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  briefMeta: {
    color: '#9ca3af',
    fontSize: '0.8rem',
    flexShrink: 0,
  },
  loader: {
    textAlign: 'center',
    padding: '2rem',
    color: '#6b7280',
  },
};

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export default function ImportPage() {
  const navigate = useNavigate();

  // Estado
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  // Resultado del parser
  const [briefs, setBriefs] = useState([]);
  const [stats, setStats] = useState(null);
  const [errors, setErrors] = useState([]);

  // Estado de guardado
  const [saved, setSaved] = useState(false);

  // ─────────────────────────────────────────
  // Handler: Procesar resultado del parser
  // ─────────────────────────────────────────
  const handleParseResult = useCallback((result) => {
    setBriefs(result.briefs);       // ← usa result.briefs, no el objeto completo
    setStats(result.stats);
    setErrors(result.errors || []);
    setSaved(false);
  }, []);

  // ─────────────────────────────────────────
  // Handler: Importar desde archivo CSV local
  // ─────────────────────────────────────────
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingMsg('Leyendo archivo...');
    setBriefs([]);
    setStats(null);
    setErrors([]);

    try {
      const text = await file.text();
      setLoadingMsg('Procesando CSV...');
      const result = procesarCSV(text);
      handleParseResult(result);
    } catch (err) {
      setErrors([`Error al leer archivo: ${err.message}`]);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }

    // Reset file input para permitir re-subir el mismo archivo
    e.target.value = '';
  }, [handleParseResult]);

  // ─────────────────────────────────────────
  // Handler: Importar desde Google Sheet URL
  // ─────────────────────────────────────────
  const handleFetchSheet = useCallback(async () => {
    if (!sheetUrl.trim()) return;

    setLoading(true);
    setLoadingMsg('Conectando con Google Sheets...');
    setBriefs([]);
    setStats(null);
    setErrors([]);

    try {
      setLoadingMsg('Descargando datos...');
      const csvText = await fetchGoogleSheet(sheetUrl);

      setLoadingMsg('Procesando CSV...');
      const result = procesarCSV(csvText);
      handleParseResult(result);
    } catch (err) {
      setErrors([`Error al importar: ${err.message}`]);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }, [sheetUrl, handleParseResult]);

  // ─────────────────────────────────────────
  // Handler: Confirmar y guardar briefs
  // ─────────────────────────────────────────
  const handleConfirmImport = useCallback(() => {
    if (briefs.length === 0) return;

    // TODO: Aquí conectar con tu store/context/Supabase
    // Ejemplo: addBriefs(briefs);
    console.log('[ImportPage] Guardando briefs:', briefs);

    setSaved(true);

    // Opcional: navegar al listado después de guardar
    // setTimeout(() => navigate('/briefs'), 1500);
  }, [briefs, navigate]);

  // ─────────────────────────────────────────
  // Agrupar briefs por batch_id para preview
  // ─────────────────────────────────────────
  const groupedByBatch = React.useMemo(() => {
    const groups = {};
    briefs.forEach((brief) => {
      const key = brief.batch_id || '(Sin Batch)';
      if (!groups[key]) groups[key] = [];
      groups[key].push(brief);
    });
    return groups;
  }, [briefs]);

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📥 Importar Briefs</h1>
        <p style={styles.subtitle}>
          Desde un archivo CSV o Google Sheet. Los hooks se expanden automáticamente en briefs individuales.
        </p>
      </div>

      {/* ── Input: Archivo CSV ── */}
      <div style={styles.card}>
        <div style={styles.inputGroup}>
          <label
            style={{
              ...styles.button,
              ...styles.btnSecondary,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            📄 Elegir archivo CSV
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={loading}
            />
          </label>
          <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
            .csv, .tsv o .txt
          </span>
        </div>

        <div style={styles.divider}>— o importar desde URL —</div>

        <div style={styles.inputGroup}>
          <input
            type="text"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            style={styles.input}
            disabled={loading}
          />
          <button
            onClick={handleFetchSheet}
            disabled={loading || !sheetUrl.trim()}
            style={{
              ...styles.button,
              ...styles.btnPrimary,
              ...(loading || !sheetUrl.trim() ? styles.btnDisabled : {}),
            }}
          >
            {loading ? '⏳ Importando...' : '🔗 Importar Sheet'}
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={styles.loader}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          {loadingMsg}
        </div>
      )}

      {/* ── Errores del parser ── */}
      {errors.length > 0 && (
        <div style={briefs.length > 0 ? styles.bannerWarning : styles.bannerError}>
          <strong>{briefs.length > 0 ? '⚠️ Advertencias:' : '❌ Errores:'}</strong>
          <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Stats ── */}
      {stats && briefs.length > 0 && (
        <div style={styles.card}>
          <div style={styles.statsRow}>
            <div style={styles.statBox}>
              <div style={styles.statNumber}>{stats.totalBriefs}</div>
              <div style={styles.statLabel}>Briefs a crear</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statNumber, color: '#2563eb' }}>
                {stats.videoBriefs}
              </div>
              <div style={styles.statLabel}>Video (hooks)</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statNumber, color: '#7c3aed' }}>
                {stats.staticBriefs}
              </div>
              <div style={styles.statLabel}>Estáticos</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statNumber}>{stats.validRows}</div>
              <div style={styles.statLabel}>Filas CSV</div>
            </div>
            {stats.skippedRows > 0 && (
              <div style={styles.statBox}>
                <div style={{ ...styles.statNumber, color: '#dc2626' }}>
                  {stats.skippedRows}
                </div>
                <div style={styles.statLabel}>Filas omitidas</div>
              </div>
            )}
          </div>

          {/* ── Preview agrupado por batch ── */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Previsualización ({briefs.length} briefs)
          </h3>

          {Object.entries(groupedByBatch).map(([batchId, batchBriefs]) => (
            <div key={batchId} style={styles.batchGroup}>
              <div style={styles.batchHeader}>
                📦 Batch: {batchId}
                <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 8 }}>
                  ({batchBriefs.length} brief{batchBriefs.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div style={styles.briefRowContainer}>
                {batchBriefs.map((brief, idx) => (
                  <div
                    key={brief.id || idx}
                    style={{
                      ...styles.briefRow,
                      background: idx % 2 === 0 ? '#fff' : '#fafafa',
                    }}
                  >
                    {/* Hook number */}
                    <span style={styles.hookNum}>
                      {brief.hook_number ? `Hook ${brief.hook_number}` : '—'}
                    </span>

                    {/* Badge formato */}
                    <span
                      style={{
                        ...styles.badge,
                        ...(brief.formato === 'Video'
                          ? styles.badgeVideo
                          : styles.badgeStatic),
                      }}
                    >
                      {brief.formato}
                    </span>

                    {/* Título */}
                    <span style={styles.briefTitle} title={brief.titulo}>
                      {brief.titulo}
                    </span>

                    {/* Meta: plataforma / concepto */}
                    {brief.plataforma && (
                      <span style={styles.briefMeta}>📱 {brief.plataforma}</span>
                    )}
                    {brief.concepto && brief.formato === 'Video' && (
                      <span style={styles.briefMeta} title={brief.concepto}>
                        💡 {brief.concepto.length > 25
                          ? brief.concepto.slice(0, 25) + '...'
                          : brief.concepto}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* ── Botón confirmar ── */}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleConfirmImport}
              disabled={saved}
              style={{
                ...styles.button,
                ...styles.btnSuccess,
                ...(saved ? styles.btnDisabled : {}),
                fontSize: '1rem',
                padding: '0.75rem 2rem',
              }}
            >
              {saved ? '✅ Guardado' : `✅ Confirmar importación (${briefs.length} briefs)`}
            </button>

            {saved && (
              <button
                onClick={() => navigate('/briefs')}
                style={{
                  ...styles.button,
                  ...styles.btnSecondary,
                  fontSize: '1rem',
                  padding: '0.75rem 1.5rem',
                }}
              >
                Ver briefs →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Estado vacío post-import ── */}
      {!loading && stats && briefs.length === 0 && errors.length === 0 && (
        <div style={{ ...styles.card, textAlign: 'center', color: '#6b7280' }}>
          No se encontraron briefs en el archivo. Verifica que el CSV tenga los headers correctos.
        </div>
      )}

      {/* ── Banner de éxito ── */}
      {saved && (
        <div style={styles.bannerSuccess}>
          ✅ <strong>{briefs.length} briefs</strong> importados exitosamente.
          {stats.videoBriefs > 0 && ` (${stats.videoBriefs} de video con hooks expandidos)`}
        </div>
      )}
    </div>
  );
}
