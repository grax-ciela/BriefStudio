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

    // ── Notas ────────────────────────────────────────────────────
    const descParts: string[] = []
    if (linkBrief) {
      descParts.push(`\ud83d\udd17 Link al Brief: ${linkBrief}`)
      descParts.push("")
    }
    descParts.push("---")
    descParts.push("DETALLES DEL BRIEF:")
    descParts.push(`- BATCH: ${batch || "—"}`)
    descParts.push(`- CONCEPTO: ${concepto}`)
    if (hook) descParts.push(`- HOOK: ${hook}`)
    if (angulo) descParts.push(`- ÁNGULO: ${angulo}`)
    if (deseo) descParts.push(`- DESEO: ${deseo}`)
    if (produccion) descParts.push(`- PRODUCCIÓN: ${produccion}`)
    if (referencia) descParts.push(`- REFERENCIA: ${referencia}`)

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
      notes: descParts.join("\n"),
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
