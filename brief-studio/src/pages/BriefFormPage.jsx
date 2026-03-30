import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { MARCA_ACTIVA } from "../lib/config"

const MARCAS = [MARCA_ACTIVA]

const HOOKS_INICIALES = [
  { texto: "", estado: "shooting" },
  { texto: "", estado: "shooting" },
  { texto: "", estado: "shooting" },
  { texto: "", estado: "shooting" },
]

function formatFecha(fechaStr) {
  if (!fechaStr) return null
  return new Date(fechaStr + "T00:00:00").toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default function BriefFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const batchIdParam = searchParams.get("batch_id")

  const esEdicion = Boolean(id)

  const [marca, setMarca] = useState(MARCA_ACTIVA)
  const [batchId, setBatchId] = useState(batchIdParam || "")
  const [batches, setBatches] = useState([])
  const [cargandoBatches, setCargandoBatches] = useState(false)
  const [concepto, setConcepto] = useState("")
  const [angulo, setAngulo] = useState("")
  const [deseo, setDeseo] = useState("")
  const [referencia, setReferencia] = useState("")
  const [hipotesis, setHipotesis] = useState("")
  const [guion, setGuion] = useState("")
  const [hooks, setHooks] = useState(HOOKS_INICIALES)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(esEdicion)

  // Derivado: hooks con texto (determina cuántos briefs se crearán)
  const hooksConTexto = hooks.filter((h) => h.texto.trim().length > 0)

  // Batch seleccionado (objeto completo)
  const batchSeleccionado = batches.find((b) => b.id === batchId) || null

  // ── Si viene batch_id por URL, cargar su marca primero ──
  useEffect(() => {
    if (!batchIdParam || esEdicion) return

    const cargarBatchInicial = async () => {
      const { data } = await supabase
        .from("batches")
        .select("marca")
        .eq("id", batchIdParam)
        .single()

      if (data) setMarca(data.marca)
    }

    cargarBatchInicial()
  }, [batchIdParam, esEdicion])

  // ── Cargar batches cuando cambia la marca ──
  useEffect(() => {
    const cargarBatches = async () => {
      setCargandoBatches(true)
      const { data, error } = await supabase
        .from("batches")
        .select("*")
        .eq("marca", marca)
        .order("fecha", { ascending: false })

      if (!error) {
        setBatches(data || [])
        // Si venimos de un batch específico, mantenerlo seleccionado
        if (!esEdicion && !batchIdParam) setBatchId("")
      }
      setCargandoBatches(false)
    }

    cargarBatches()
  }, [marca, esEdicion, batchIdParam])

  // ── Cargar datos del brief en edición ──
  useEffect(() => {
    if (!esEdicion) return

    const cargarDatos = async () => {
      const { data: brief, error: errorBrief } = await supabase
        .from("briefs")
        .select("*")
        .eq("id", id)
        .single()

      if (errorBrief) {
        console.log(errorBrief)
        alert("Error al cargar el brief")
        setCargando(false)
        return
      }

      const { data: hooksData, error: errorHooks } = await supabase
        .from("hooks")
        .select("*")
        .eq("brief_id", id)
        .order("orden", { ascending: true })

      if (errorHooks) {
        console.log(errorHooks)
        alert("Error al cargar hooks")
        setCargando(false)
        return
      }

      setMarca(brief.marca)
      setBatchId(brief.batch_id || "")
      setConcepto(brief.concepto)
      setAngulo(brief.angulo || "")
      setDeseo(brief.deseo || "")
      setReferencia(brief.referencia || "")
      setHipotesis(brief.hipotesis || "")
      setGuion(brief.guion || "")

      const hooksFormateados = HOOKS_INICIALES.map((_, index) => {
        const hook = hooksData?.find((h) => h.orden === index + 1)
        return hook
          ? { texto: hook.texto, estado: hook.estado }
          : { texto: "", estado: "shooting" }
      })

      setHooks(hooksFormateados)
      setCargando(false)
    }

    cargarDatos()
  }, [id, esEdicion])

  const actualizarHook = (index, campo, valor) => {
    const copia = [...hooks]
    copia[index] = { ...copia[index], [campo]: valor }
    setHooks(copia)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!batchId) {
      alert("Debes seleccionar un batch")
      return
    }

    if (!concepto.trim()) {
      alert("El concepto es obligatorio")
      return
    }

    setGuardando(true)

    let briefId = id

    if (esEdicion) {
      const { error } = await supabase
        .from("briefs")
        .update({
          marca,
          batch_id: batchId,
          concepto: concepto.trim(),
          angulo: angulo.trim() || null,
          deseo: deseo.trim() || null,
          referencia: referencia.trim() || null,
          hipotesis: hipotesis.trim() || null,
          guion: guion.trim() || null,
        })
        .eq("id", id)

      if (error) {
        console.log(error)
        alert("Error al actualizar el brief")
        setGuardando(false)
        return
      }
    } else {
      // ── CREACIÓN ATÓMICA: 1 hook = 1 brief ──
      // Obtener el contador actual del batch una sola vez
      const { count } = await supabase
        .from("briefs")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batchId)

      const baseCompartida = {
        marca,
        batch_id: batchId,
        concepto: concepto.trim(),
        angulo: angulo.trim() || null,
        deseo: deseo.trim() || null,
        referencia: referencia.trim() || null,
        hipotesis: hipotesis.trim() || null,
        guion: guion.trim() || null,
      }

      if (hooksConTexto.length === 0) {
        // Sin hooks → crear 1 brief vacío (comportamiento original)
        const { data: brief, error } = await supabase
          .from("briefs")
          .insert([{ ...baseCompartida, numero: (count || 0) + 1 }])
          .select()
          .single()

        if (error) {
          console.log(error)
          alert("Error al guardar el brief")
          setGuardando(false)
          return
        }
        briefId = brief.id
      } else {
        // Con hooks → crear N briefs, uno por hook
        let numeroBase = count || 0
        let primerBriefId = null

        for (const hook of hooksConTexto) {
          numeroBase++

          const { data: brief, error: errBrief } = await supabase
            .from("briefs")
            .insert([{ ...baseCompartida, numero: numeroBase }])
            .select()
            .single()

          if (errBrief) {
            console.log(errBrief)
            alert(`Error al guardar brief para hook "${hook.texto.substring(0, 40)}..."`)
            setGuardando(false)
            return
          }

          if (!primerBriefId) primerBriefId = brief.id

          // Cada brief tiene exactamente 1 hook (orden 1)
          const { error: errHook } = await supabase.from("hooks").insert({
            brief_id: brief.id,
            texto: hook.texto,
            estado: hook.estado,
            orden: 1,
          })

          if (errHook) console.warn("Error al guardar hook:", errHook.message)
        }

        briefId = primerBriefId
      }
    }

    // ── EDICIÓN: actualizar hooks del brief existente ──
    if (esEdicion) {
      const hooksParaGuardar = hooks
        .map((hook, index) => ({
          brief_id: briefId,
          texto: hook.texto.trim(),
          estado: hook.estado,
          orden: index + 1,
        }))
        .filter((hook) => hook.texto.length > 0)

      await supabase.from("hooks").delete().eq("brief_id", briefId)

      if (hooksParaGuardar.length > 0) {
        const { error } = await supabase.from("hooks").insert(hooksParaGuardar)
        if (error) {
          console.log(error)
          alert("Error al guardar hooks")
          setGuardando(false)
          return
        }
      }
    }

    setGuardando(false)
    navigate(`/briefs/${briefId}`)
  }

  if (cargando) {
    return <div className="page loading">Cargando...</div>
  }

  return (
    <main className="page">
      <button className="back-link" onClick={() => navigate("/")}>
        ← Volver
      </button>

      <h1 className="page-title" style={{ marginBottom: "1.75rem" }}>
        {esEdicion ? "Editar brief" : "Nuevo brief"}
      </h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.25rem" }}>

        {/* ── Datos del brief ── */}
        <div className="section-block">
          <div className="section-header">
            <span className="section-title">Datos del brief</span>
          </div>

          <div className="field-group">
            {/* Marca */}
            <div className="field">
              <label className="field-label" htmlFor="marca">Marca</label>
              <select
                id="marca"
                className="select"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
              >
                {MARCAS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>

            {/* Batch */}
            <div className="field">
              <label className="field-label" htmlFor="batch">
                Batch <span style={{ color: "var(--color-primary)" }}>*</span>
              </label>

              {cargandoBatches ? (
                <div className="input" style={{ color: "var(--color-text-muted)" }}>
                  Cargando batches...
                </div>
              ) : batches.length === 0 ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5625rem 0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-bg)",
                }}>
                  <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                    No hay batches para {marca}
                  </span>
                  <Link to="/batches/new" style={{ marginLeft: "auto" }}>
                    <button type="button" className="btn btn-secondary btn-sm">
                      + Crear batch
                    </button>
                  </Link>
                </div>
              ) : (
                <select
                  id="batch"
                  className="select"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                >
                  <option value="">Selecciona un batch...</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Fecha de lanzamiento (solo lectura, viene del batch) */}
            {batchSeleccionado?.fecha && (
              <div className="field">
                <span className="field-label">Fecha de lanzamiento</span>
                <div style={{
                  fontSize: "0.9375rem",
                  color: "var(--color-text-secondary)",
                  padding: "0.5rem 0",
                }}>
                  📅 {formatFecha(batchSeleccionado.fecha)}
                </div>
              </div>
            )}

            {/* Concepto */}
            <div className="field">
              <label className="field-label" htmlFor="concepto">
                Concepto <span style={{ color: "var(--color-primary)" }}>*</span>
              </label>
              <input
                id="concepto"
                className="input"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Nombre del concepto"
              />
            </div>
          </div>
        </div>

        {/* ── Dirección creativa ── */}
        <div className="section-block">
          <div className="section-header">
            <span className="section-title">Dirección creativa</span>
          </div>

          <div className="field-group">
            <div className="field">
              <label className="field-label" htmlFor="angulo">Ángulo</label>
              <textarea
                id="angulo"
                className="textarea"
                value={angulo}
                onChange={(e) => setAngulo(e.target.value)}
                placeholder="Describe el ángulo del contenido"
                rows={3}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="deseo">Deseo</label>
              <textarea
                id="deseo"
                className="textarea"
                value={deseo}
                onChange={(e) => setDeseo(e.target.value)}
                placeholder="¿Qué deseo del cliente activa este contenido?"
                rows={2}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="referencia">Referencia</label>
              <input
                id="referencia"
                className="input"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Link o descripción de referencia"
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="hipotesis">
                ¿Qué estás creando o probando y qué te da confianza de que esta prueba mejorará el rendimiento general?
              </label>
              <textarea
                id="hipotesis"
                className="textarea"
                value={hipotesis}
                onChange={(e) => setHipotesis(e.target.value)}
                placeholder="Describe tu hipótesis..."
                rows={3}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="guion">Guión</label>
              <textarea
                id="guion"
                className="textarea"
                value={guion}
                onChange={(e) => setGuion(e.target.value)}
                placeholder="Guión del contenido"
                rows={6}
              />
            </div>
          </div>
        </div>

        {/* ── Hooks ── */}
        <div className="section-block">
          <div className="section-header">
            <span className="section-title">Hooks</span>
            {!esEdicion && hooksConTexto.length > 0 ? (
              <span style={{ fontSize: "0.8125rem", color: "var(--color-primary)", fontWeight: 600, marginLeft: "auto" }}>
                {hooksConTexto.length} brief{hooksConTexto.length > 1 ? "s" : ""} independiente{hooksConTexto.length > 1 ? "s" : ""} se crearán
              </span>
            ) : (
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginLeft: "auto" }}>
                Cada hook genera un brief independiente
              </span>
            )}
          </div>

          <div style={{ display: "grid", gap: "0.75rem" }}>
            {hooks.map((hook, index) => (
              <div key={index} className={`hook-card${hook.texto.trim() ? " hook-card--filled" : ""}`}>
                <div className="hook-card-header">
                  <span className="hook-number">Hook {index + 1}</span>

                  <div className="hook-toggle">
                    <button
                      type="button"
                      className={`hook-toggle-btn ${hook.estado === "shooting" ? "active-shooting" : ""}`}
                      onClick={() => actualizarHook(index, "estado", "shooting")}
                    >
                      Shooting
                    </button>
                    <button
                      type="button"
                      className={`hook-toggle-btn ${hook.estado === "edicion" ? "active-edicion" : ""}`}
                      onClick={() => actualizarHook(index, "estado", "edicion")}
                    >
                      Material grabado
                    </button>
                  </div>
                </div>

                <input
                  className="input"
                  value={hook.texto}
                  onChange={(e) => actualizarHook(index, "texto", e.target.value)}
                  placeholder={`Escribe el hook ${index + 1}...`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Acciones ── */}
        <div className="action-bar">
          <button type="submit" className="btn btn-primary" disabled={guardando || !batchId}>
            {guardando
            ? "Guardando..."
            : esEdicion
              ? "Guardar cambios"
              : hooksConTexto.length > 1
                ? `Crear ${hooksConTexto.length} briefs`
                : "Crear brief"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/")}>
            Cancelar
          </button>
        </div>
      </form>
    </main>
  )
}
