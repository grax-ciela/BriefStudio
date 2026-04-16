import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ASANA_BASE   = "https://app.asana.com/api/1.0"
const PROJECT_GID  = "1210839779273759"

// ── Custom Field GIDs (mismo set que crear-tarea-asana) ────────────
const CF = {
  FORMATO:    "1210839880551587",
  PLATAFORMA: "1210839779313149",
  MARCA:      "1210839779313155",
  HOOKS:      "1211538112282998",
  OBJETIVO:   "1210839779313163",
  FUNNEL:     "1210839779313172",
  PRIORIDAD:  "1210839779313179",
}

const FORMATO_OPTS: Record<string, string> = {
  "video":           "1210839880551588",
  "imagen/gráfico":  "1210839880551590",
  "static":          "1210839880551590",
  "motion graphic":  "1210839880551591",
  "carrusel":        "1210839779313162",
  "ugc":             "1210839880551589",
}

const MARCA_OPTS: Record<string, string> = {
  "mycocos":     "1210839779313156",
  "mycocos® cl": "1210839779313156",
  "mennt":       "1210839779313159",
  "mennt® cl":   "1210839779313159",
}

const OBJETIVO_OPTS: Record<string, string> = {
  "conversión":      "1210839779313164",
  "tráfico":         "1210839779313165",
  "interacción":     "1210839779313166",
  "reproducción":    "1210839779313167",
  "leads":           "1210839779313168",
  "performance max": "1210839779313169",
  "alcance":         "1211114956599207",
  "orgánico":        "1211373800439511",
  "b2b":             "1211840884990565",
}

// ── Notas ultra-estructuradas ────────────────────────────────────
function buildNotes(p: {
  linkBrief?:  string | null
  objetivo?:   string
  concepto:    string
  angulo?:     string
  deseo?:      string
  hook?:       string
  hooksCount?: number
  produccion?: string
  formato?:    string
  marcaLabel?: string
  batch?:      string
  referencia?: string
}): string {
  const L: string[] = []

  if (p.linkBrief) {
    L.push(`🔗 LINK AL BRIEF: ${p.linkBrief}`)
    L.push("")
  }

  L.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  L.push("")

  L.push("📌 [OBJETIVO]")
  L.push(p.objetivo?.trim() || "No especificado")
  L.push("")

  L.push("🎯 [ESTRATEGIA]")
  L.push(`Concepto: ${p.concepto}`)
  if (p.angulo?.trim())  L.push(`Ángulo: ${p.angulo}`)
  if (p.deseo?.trim())   L.push(`Deseo del usuario: ${p.deseo}`)
  if (p.hook?.trim())    L.push(`Hook principal: ${p.hook}`)
  if (p.hooksCount)      L.push(`Total de hooks: ${p.hooksCount}`)
  L.push("")

  L.push("📋 [INSTRUCCIONES DE PRODUCCIÓN]")
  if (p.produccion?.trim()) L.push(`Producción: ${p.produccion}`)
  L.push(`Formato: ${p.formato || "Video"}`)
  if (p.marcaLabel)         L.push(`Marca: ${p.marcaLabel}`)
  L.push(`Batch: ${p.batch || "—"}`)
  L.push("")

  L.push("🔗 [REFERENCIAS]")
  L.push(p.referencia?.trim() || "Sin referencias")
  L.push("")

  L.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  L.push("✅ Validado por Brief Studio")

  return L.join("\n")
}

function norm(s: string): string {
  return (s || "").trim().toLowerCase().replace(/®/g, "").replace(/\s+cl$/i, "").replace(/\s+/g, " ")
}

function findOpt(opts: Record<string, string>, input: string): string | null {
  const n = norm(input)
  for (const [key, gid] of Object.entries(opts)) {
    if (n.includes(key) || key.includes(n)) return gid
  }
  return null
}

async function asanaRequest(path: string, method: string, body?: unknown) {
  const pat = Deno.env.get("ASANA_PAT")
  if (!pat) throw new Error("ASANA_PAT no configurado como secret")

  const res = await fetch(`${ASANA_BASE}${path}`, {
    method,
    headers: { "Authorization": `Bearer ${pat}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()
  if (data.errors) throw new Error(JSON.stringify(data.errors))
  return data
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const {
      taskGid,
      concepto,
      batch,
      marca,
      formato,
      produccion,
      hook,
      angulo,
      deseo,
      referencia,
      hooksCount,
      objetivo,
      linkBrief,
    } = await req.json()

    if (!taskGid || !concepto) {
      return new Response(
        JSON.stringify({ error: "Faltan campos: taskGid, concepto" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      )
    }

    // ── Título ───────────────────────────────────────────────────
    const marcaList = (marca || "").split(",").map((s: string) => s.trim()).filter(Boolean)
    const marcaLabel = marcaList.length > 1 ? marcaList.join(" + ") : (marca || "")
    const titulo = `[${batch || "—"}] - ${concepto} - ${marcaLabel}`

    // ── Notas estructuradas ───────────────────────────────────────
    const notes = buildNotes({
      linkBrief,
      objetivo,
      concepto,
      angulo,
      deseo,
      hook,
      hooksCount: typeof hooksCount === "number" ? hooksCount : undefined,
      produccion,
      formato,
      marcaLabel,
      batch,
      referencia,
    })

    // ── Custom Fields ─────────────────────────────────────────────
    const customFields: Record<string, unknown> = {}

    const fmtNorm = norm(formato || "video")
    const fmtGid  = findOpt(FORMATO_OPTS, fmtNorm)
    if (fmtGid) customFields[CF.FORMATO] = fmtGid

    // Multi-marca
    const mGids = marcaList.map((m: string) => findOpt(MARCA_OPTS, m)).filter(Boolean)
    if (mGids.length > 0) customFields[CF.MARCA] = mGids

    if (typeof hooksCount === "number") customFields[CF.HOOKS] = hooksCount

    if (objetivo) {
      const oGid = findOpt(OBJETIVO_OPTS, objetivo)
      if (oGid) customFields[CF.OBJETIVO] = [oGid]
    }

    // ── PUT /tasks/:taskGid ───────────────────────────────────────
    const updateData: Record<string, unknown> = {
      name: titulo,
      notes,
      custom_fields: customFields,
    }

    await asanaRequest(`/tasks/${taskGid}`, "PUT", { data: updateData })

    return new Response(
      JSON.stringify({ ok: true, titulo }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  }
})
